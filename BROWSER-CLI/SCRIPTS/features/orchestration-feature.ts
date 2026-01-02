/**
 * Orchestration Feature
 * Provides commands for parallel test execution across multiple browser instances
 */

import { Page } from 'playwright';
import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';
import { TestOrchestrator, OrchestrationConfig } from '../orchestrator/TestOrchestrator';
import { AggregatedResults } from '../orchestrator/result-aggregator';

/**
 * OrchestrationFeature enables parallel E2E test execution
 * across multiple browser instances for faster test runs
 */
export class OrchestrationFeature extends BaseFeature {
  public readonly name = 'Orchestration';
  private orchestrator: TestOrchestrator | null = null;
  private lastResults: AggregatedResults | null = null;

  constructor(page: Page) {
    super(page);
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['orchestrate', this.orchestrate.bind(this)],
      ['getOrchestrationStatus', this.getOrchestrationStatus.bind(this)],
      ['abortOrchestration', this.abortOrchestration.bind(this)],
    ]);
  }

  /**
   * Start parallel test orchestration
   * Usage: orchestrate "tests/*.txt" [--instances=3] [--timeout=60000] [--verbose]
   */
  private async orchestrate(args: {
    pattern: string;
    instances?: number;
    basePort?: number;
    baseVitePort?: number;
    timeout?: number;
    continueOnFailure?: boolean;
    verbose?: boolean;
  }): Promise<CommandResponse> {
    try {
      if (this.orchestrator?.getStatus().running) {
        return {
          status: 'error',
          message: 'Orchestration already in progress. Use abortOrchestration to stop it.',
        };
      }

      const config: Partial<OrchestrationConfig> = {
        testPattern: args.pattern,
        instances: args.instances ?? 3,
        basePort: args.basePort ?? 3456,
        baseVitePort: args.baseVitePort ?? 5173,
        testTimeout: args.timeout ?? 60000,
        continueOnFailure: args.continueOnFailure ?? true,
        verbose: args.verbose ?? false,
      };

      this.orchestrator = new TestOrchestrator(config);
      this.log(`Starting orchestration: ${args.pattern} across ${config.instances} instances`);

      // Run orchestration
      const results = await this.orchestrator.orchestrate();
      this.lastResults = results;

      return {
        status: 'ok',
        data: {
          totalTests: results.totalTests,
          passed: results.passed,
          failed: results.failed,
          errors: results.errors,
          duration: results.duration,
          passRate: results.passRate,
          instances: results.instances,
          results: results.results,
          startTime: results.startTime,
          endTime: results.endTime,
        },
        code: this.generatePlaywrightCode(args),
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get current orchestration status or last results
   * Usage: getOrchestrationStatus [--format=json|summary]
   */
  private async getOrchestrationStatus(args: {
    format?: 'json' | 'summary';
  }): Promise<CommandResponse> {
    try {
      if (this.orchestrator?.getStatus().running) {
        const status = this.orchestrator.getStatus();
        return {
          status: 'ok',
          data: {
            running: true,
            phase: status.phase,
            progress: status.progress,
            completed: status.completed,
            total: status.total,
            activeInstances: status.activeInstances,
            aborted: status.aborted,
          },
        };
      }

      if (!this.lastResults) {
        return {
          status: 'ok',
          data: {
            running: false,
            message: 'No orchestration results available. Run orchestrate first.',
          },
        };
      }

      if (args.format === 'summary') {
        return {
          status: 'ok',
          data: {
            running: false,
            totalTests: this.lastResults.totalTests,
            passed: this.lastResults.passed,
            failed: this.lastResults.failed,
            errors: this.lastResults.errors,
            passRate: this.lastResults.passRate,
            duration: this.lastResults.duration,
            instances: this.lastResults.instances.length,
          },
        };
      }

      return {
        status: 'ok',
        data: {
          running: false,
          ...this.lastResults,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Abort running orchestration
   * Usage: abortOrchestration
   */
  private async abortOrchestration(): Promise<CommandResponse> {
    try {
      if (!this.orchestrator?.getStatus().running) {
        return {
          status: 'ok',
          data: { message: 'No orchestration running' },
        };
      }

      this.orchestrator.abort();
      this.log('Orchestration abort requested');

      return {
        status: 'ok',
        data: { message: 'Orchestration abort requested' },
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate Playwright code comment for transparency
   */
  private generatePlaywrightCode(args: {
    pattern: string;
    instances?: number;
  }): string {
    return `// Parallel test orchestration
// Pattern: ${args.pattern}
// Instances: ${args.instances ?? 3}
//
// Each instance runs with:
// - BROWSER_INSTANCE=inst{N}
// - BROWSER_PORT=${3456 + (args.instances ? 0 : 0)}-${3456 + (args.instances ?? 3) - 1}
// - VITE_PORT=${5173 + (args.instances ? 0 : 0)}-${5173 + (args.instances ?? 3) - 1}`;
  }

  async cleanup(): Promise<void> {
    if (this.orchestrator?.getStatus().running) {
      this.orchestrator.abort();
    }
    this.orchestrator = null;
    this.lastResults = null;
  }
}
