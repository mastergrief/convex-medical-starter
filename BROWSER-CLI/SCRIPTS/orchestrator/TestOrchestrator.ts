/**
 * Test Orchestrator for Parallel E2E Test Execution
 * Coordinates multiple browser instances to run test files in parallel
 */

import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import glob from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { TestDistributor, TestDistribution } from './test-distributor';
import {
  ResultAggregator,
  AggregatedResults,
  TestResult,
} from './result-aggregator';

/**
 * Configuration for orchestrated test execution
 */
export interface OrchestrationConfig {
  /** Glob pattern for test files (e.g., "tests/*.txt") */
  testPattern: string;
  /** Number of parallel browser instances (default: 3) */
  instances: number;
  /** Starting Browser-CLI port (default: 3456) */
  basePort: number;
  /** Starting Vite dev server port (default: 5173) */
  baseVitePort: number;
  /** Timeout per test file in milliseconds (default: 60000) */
  testTimeout: number;
  /** Continue on test failure (default: true) */
  continueOnFailure: boolean;
  /** Verbose output (default: false) */
  verbose: boolean;
}

/**
 * Status of the orchestration process
 */
export interface OrchestrationStatus {
  /** Whether orchestration is currently running */
  running: boolean;
  /** Progress as percentage (0-100) */
  progress: number;
  /** Number of completed tests */
  completed: number;
  /** Total number of tests */
  total: number;
  /** Current phase description */
  phase: string;
  /** Active instances */
  activeInstances: string[];
  /** Whether abort was requested */
  aborted: boolean;
}

const DEFAULT_CONFIG: OrchestrationConfig = {
  testPattern: 'tests/*.txt',
  instances: 3,
  basePort: 3456,
  baseVitePort: 5173,
  testTimeout: 60000,
  continueOnFailure: true,
  verbose: false,
};

/**
 * TestOrchestrator coordinates parallel test execution across multiple browser instances
 */
export class TestOrchestrator {
  private config: OrchestrationConfig;
  private distributor: TestDistributor;
  private aggregator: ResultAggregator;
  private running = false;
  private aborted = false;
  private completed = 0;
  private total = 0;
  private phase = 'idle';
  private activeInstances: Set<string> = new Set();
  private processes: Map<string, ChildProcess> = new Map();

  constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.distributor = new TestDistributor({
      basePort: this.config.basePort,
      baseVitePort: this.config.baseVitePort,
    });
    this.aggregator = new ResultAggregator();
  }

  /**
   * Execute orchestrated parallel tests
   * @returns Aggregated results from all test executions
   */
  async orchestrate(): Promise<AggregatedResults> {
    if (this.running) {
      throw new Error('Orchestration already in progress');
    }

    this.running = true;
    this.aborted = false;
    this.completed = 0;
    this.aggregator.clear();
    this.phase = 'discovering';

    try {
      // Phase 1: Discover test files
      const testFiles = await this.discoverTests();
      this.total = testFiles.length;

      if (testFiles.length === 0) {
        this.phase = 'complete';
        this.running = false;
        return this.aggregator.getResults();
      }

      this.log(`Discovered ${testFiles.length} test file(s)`);

      // Phase 2: Distribute tests across instances
      this.phase = 'distributing';
      const distributions = this.distributor.distribute(
        testFiles,
        Math.min(this.config.instances, testFiles.length)
      );

      this.log(
        `Distributing across ${distributions.length} instance(s)`
      );

      // Phase 3: Execute tests in parallel
      this.phase = 'executing';
      this.aggregator.start();

      await this.executeParallel(distributions);

      this.aggregator.end();
      this.phase = 'complete';

      return this.aggregator.getResults();
    } finally {
      this.running = false;
      this.activeInstances.clear();
      this.processes.clear();
    }
  }

  /**
   * Get current orchestration status
   */
  getStatus(): OrchestrationStatus {
    return {
      running: this.running,
      progress: this.total > 0 ? Math.round((this.completed / this.total) * 100) : 0,
      completed: this.completed,
      total: this.total,
      phase: this.phase,
      activeInstances: Array.from(this.activeInstances),
      aborted: this.aborted,
    };
  }

  /**
   * Abort the current orchestration
   */
  abort(): void {
    if (!this.running) {
      return;
    }

    this.aborted = true;
    this.phase = 'aborting';

    // Kill all running processes
    for (const [instance, proc] of this.processes) {
      this.log(`Killing instance ${instance}`);
      proc.kill('SIGTERM');
    }

    this.processes.clear();
  }

  /**
   * Discover test files matching the configured pattern
   */
  private async discoverTests(): Promise<string[]> {
    const pattern = this.config.testPattern;
    const cwd = process.cwd();

    try {
      const files = glob.sync(pattern, { cwd, absolute: true });
      return files.sort();
    } catch (error) {
      this.log(`Error discovering tests: ${error}`);
      return [];
    }
  }

  /**
   * Execute tests in parallel across distributions
   */
  private async executeParallel(
    distributions: TestDistribution[]
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const distribution of distributions) {
      if (this.aborted) break;
      promises.push(this.executeInstance(distribution));
    }

    await Promise.all(promises);
  }

  /**
   * Execute all tests for a single instance
   */
  private async executeInstance(distribution: TestDistribution): Promise<void> {
    this.activeInstances.add(distribution.instance);
    const envVars = this.distributor.getEnvVars(distribution);

    this.log(
      `Instance ${distribution.instance}: ${distribution.tests.length} tests (port ${distribution.port})`
    );

    for (const testFile of distribution.tests) {
      if (this.aborted) break;

      const result = await this.executeTestFile(
        testFile,
        distribution.instance,
        envVars
      );
      this.aggregator.addResult(result);
      this.completed++;

      if (result.status !== 'pass' && !this.config.continueOnFailure) {
        this.log(`Stopping due to failure in ${testFile}`);
        this.abort();
        break;
      }
    }

    this.activeInstances.delete(distribution.instance);
  }

  /**
   * Execute a single test file
   */
  private async executeTestFile(
    testFile: string,
    instance: string,
    envVars: Record<string, string>
  ): Promise<TestResult> {
    const startTime = Date.now();
    const testName = path.basename(testFile);

    try {
      // Read test file content
      const content = await fs.promises.readFile(testFile, 'utf-8');
      const lines = content
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#'));

      if (lines.length === 0) {
        return {
          testFile,
          instance,
          status: 'pass',
          duration: Date.now() - startTime,
          commands: 0,
        };
      }

      this.log(`[${instance}] Running ${testName} (${lines.length} commands)`);

      // Execute each command
      for (let i = 0; i < lines.length; i++) {
        if (this.aborted) {
          return {
            testFile,
            instance,
            status: 'error',
            duration: Date.now() - startTime,
            commands: i,
            error: 'Aborted',
          };
        }

        const command = lines[i];
        const result = await this.executeCommand(command, envVars, instance);

        if (!result.success) {
          return {
            testFile,
            instance,
            status: 'fail',
            duration: Date.now() - startTime,
            commands: i + 1,
            error: result.error,
            failedCommand: command,
            failedLine: i + 1,
          };
        }
      }

      return {
        testFile,
        instance,
        status: 'pass',
        duration: Date.now() - startTime,
        commands: lines.length,
      };
    } catch (error) {
      return {
        testFile,
        instance,
        status: 'error',
        duration: Date.now() - startTime,
        commands: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute a single browser-cli command
   */
  private executeCommand(
    command: string,
    envVars: Record<string, string>,
    instance: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const browserCmdPath = path.join(
        __dirname,
        '..',
        'browser-cmd.ts'
      );

      const proc = spawn('npx', ['tsx', browserCmdPath, ...command.split(/\s+/)], {
        env: { ...process.env, ...envVars },
        cwd: process.cwd(),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.processes.set(instance, proc);

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        proc.kill('SIGTERM');
        resolve({ success: false, error: 'Command timeout' });
      }, this.config.testTimeout);

      proc.on('close', (code) => {
        clearTimeout(timeout);
        this.processes.delete(instance);

        if (code === 0) {
          // Check for error in output
          if (stdout.includes('Error:') || stdout.includes('status: "error"')) {
            resolve({
              success: false,
              error: stdout.slice(0, 500),
            });
          } else {
            resolve({ success: true });
          }
        } else {
          resolve({
            success: false,
            error: stderr || stdout || `Exit code ${code}`,
          });
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        this.processes.delete(instance);
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[Orchestrator] ${message}`);
    }
  }
}
