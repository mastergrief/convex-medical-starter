/**
 * Flaky Test Detection Feature
 *
 * Runs commands multiple times and analyzes consistency to detect flaky tests.
 */

import { Page } from 'playwright';
import { BaseFeature, CommandHandler, CommandResult } from './base-feature';

/**
 * Type for the command executor function
 */
type CommandExecutor = (data: any) => Promise<CommandResult>;

/**
 * Individual test run result
 */
interface TestRun {
  iteration: number;
  success: boolean;
  result: unknown;
  duration: number;
  error?: string;
}

/**
 * Flakiness analysis report
 */
interface FlakinessReport {
  command: string;
  iterations: number;
  passCount: number;
  failCount: number;
  passRate: number;
  isFlaky: boolean;  // true if 0% < passRate < 100%
  runs: TestRun[];
  averageDuration: number;
  recommendation: string;
}

/**
 * Get recommendation based on pass rate
 */
function getRecommendation(passRate: number): string {
  if (passRate === 100) return 'STABLE: No flakiness detected';
  if (passRate >= 80) return 'LOW FLAKINESS: May need investigation';
  if (passRate >= 50) return 'MODERATE FLAKINESS: Investigate timing/selectors';
  if (passRate > 0) return 'HIGH FLAKINESS: Likely race condition or missing waits';
  return 'CONSISTENTLY FAILING: Check command syntax or page state';
}

/**
 * FlakyDetectionFeature - Runs commands multiple times to detect flakiness
 */
export class FlakyDetectionFeature extends BaseFeature {
  public readonly name = 'FlakyDetection';

  private commandExecutor: CommandExecutor | null = null;
  private lastReport: FlakinessReport | null = null;

  /**
   * Set the command executor callback
   * This must be called after construction to provide access to BrowserManager's handleCommand
   */
  setCommandExecutor(executor: CommandExecutor): void {
    this.commandExecutor = executor;
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['runTestMultipleTimes', this.runMultiple.bind(this)],
      ['analyzeFlakiness', this.analyze.bind(this)],
    ]);
  }

  /**
   * Run a command multiple times and collect results
   *
   * @param args - { iterations: number, command: string }
   */
  private async runMultiple(args: {
    iterations: number;
    command: string;
  }): Promise<CommandResult> {
    if (!this.commandExecutor) {
      return {
        status: 'error',
        message: 'Command executor not configured',
      };
    }

    const { iterations, command } = args;

    if (!iterations || iterations < 1) {
      return {
        status: 'error',
        message: 'iterations must be a positive integer',
      };
    }

    if (!command || typeof command !== 'string') {
      return {
        status: 'error',
        message: 'command must be a non-empty string',
      };
    }

    this.log(`Running command ${iterations} times: ${command}`);

    const runs: TestRun[] = [];
    let passCount = 0;
    let failCount = 0;
    let totalDuration = 0;

    for (let i = 1; i <= iterations; i++) {
      this.log(`  Iteration ${i}/${iterations}...`);
      const startTime = Date.now();

      try {
        // Parse the command to create the appropriate data object
        const cmdData = this.parseCommandString(command);
        const result = await this.commandExecutor(cmdData);
        const duration = Date.now() - startTime;
        totalDuration += duration;

        const success = result.status === 'ok';
        if (success) {
          passCount++;
        } else {
          failCount++;
        }

        runs.push({
          iteration: i,
          success,
          result: result.data,
          duration,
          error: success ? undefined : result.message,
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        totalDuration += duration;
        failCount++;

        runs.push({
          iteration: i,
          success: false,
          result: null,
          duration,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const passRate = (passCount / iterations) * 100;
    const isFlaky = passRate > 0 && passRate < 100;
    const averageDuration = totalDuration / iterations;

    this.lastReport = {
      command,
      iterations,
      passCount,
      failCount,
      passRate,
      isFlaky,
      runs,
      averageDuration,
      recommendation: getRecommendation(passRate),
    };

    return {
      status: 'ok',
      data: {
        command,
        iterations,
        passCount,
        failCount,
        passRate: Math.round(passRate * 100) / 100,
        isFlaky,
        averageDuration: Math.round(averageDuration),
        recommendation: this.lastReport.recommendation,
      },
    };
  }

  /**
   * Parse a command string into a command data object
   * Similar to the logic in MultiCommandFeature
   */
  private parseCommandString(cmdStr: string): any {
    const parts = cmdStr.split(/\s+/);
    const command = parts[0];
    const cmdArgs = parts.slice(1);
    const cmdData: any = { cmd: command };

    switch (command) {
      // Navigation & Timing
      case 'navigate':
        cmdData.url = cmdArgs[0];
        cmdArgs.forEach((arg) => {
          if (arg.startsWith('--waitUntil=')) cmdData.waitUntil = arg.split('=')[1];
        });
        break;
      case 'wait':
        cmdData.ms = parseInt(cmdArgs[0], 10);
        break;
      case 'waitForSelector':
        cmdData.selector = cmdArgs[0];
        cmdArgs.forEach((arg) => {
          if (arg.startsWith('--state=')) cmdData.state = arg.split('=')[1];
          if (arg.startsWith('--timeout=')) cmdData.timeout = parseInt(arg.split('=')[1]);
        });
        break;

      // Interaction
      case 'click':
      case 'dblclick':
      case 'hover':
        cmdData.selector = cmdArgs[0];
        break;
      case 'type':
        cmdData.selector = cmdArgs[0];
        cmdData.text = cmdArgs.slice(1).join(' ').replace(/^["']|["']$/g, '');
        break;
      case 'pressKey':
        cmdData.key = cmdArgs[0];
        break;
      case 'pressKeyCombo':
        cmdData.keys = cmdArgs[0];
        break;
      case 'drag':
        cmdData.source = cmdArgs[0];
        cmdData.target = cmdArgs[1];
        if (cmdArgs.includes('--cdp')) cmdData.useCdp = true;
        break;
      case 'selectOption':
        cmdData.selector = cmdArgs[0];
        cmdData.value = cmdArgs[1];
        break;

      // Capture & Inspection
      case 'snapshot':
        cmdArgs.forEach((arg) => {
          if (arg.startsWith('--file=')) cmdData.file = arg.split('=')[1];
          if (arg === '--full') cmdData.full = true;
          if (arg === '--forms') cmdData.forms = true;
        });
        if (cmdArgs[0] && !cmdArgs[0].startsWith('--')) cmdData.selector = cmdArgs[0];
        break;
      case 'screenshot':
        cmdData.path = cmdArgs[0];
        break;

      // Status
      case 'status':
        if (cmdArgs.includes('--verbose')) cmdData.verbose = true;
        break;

      // Console
      case 'console':
        cmdData.count = cmdArgs[0] ? parseInt(cmdArgs[0], 10) : 5;
        break;
      case 'clearConsole':
      case 'changes':
        // No arguments needed
        break;

      // Network
      case 'network':
        cmdArgs.forEach((arg) => {
          if (arg.startsWith('--filter=')) cmdData.filter = arg.split('=')[1];
          if (arg.startsWith('--method=')) cmdData.method = arg.split('=')[1];
          if (arg.startsWith('--status=')) cmdData.status = parseInt(arg.split('=')[1]);
          if (arg.startsWith('--limit=')) cmdData.limit = parseInt(arg.split('=')[1]);
        });
        break;
      case 'networkClear':
        // No arguments needed
        break;

      // Evaluate
      case 'evaluate':
        cmdData.code = cmdArgs.join(' ');
        break;

      // Viewport
      case 'resize':
        cmdData.width = parseInt(cmdArgs[0]);
        cmdData.height = parseInt(cmdArgs[1]);
        break;

      default:
        // For unknown commands, pass through with basic arg handling
        if (cmdArgs.length > 0) {
          cmdData.args = cmdArgs;
        }
        break;
    }

    return cmdData;
  }

  /**
   * Return the last flakiness report
   *
   * @param args - { format?: 'json' | 'summary' | 'detailed' }
   */
  private async analyze(args: {
    format?: 'json' | 'summary' | 'detailed';
  }): Promise<CommandResult> {
    if (!this.lastReport) {
      return {
        status: 'error',
        message: 'No flakiness test has been run yet. Use runTestMultipleTimes first.',
      };
    }

    const format = args.format || 'summary';

    if (format === 'json') {
      return {
        status: 'ok',
        data: {
          format: 'json',
          report: this.lastReport,
        },
      };
    }

    if (format === 'detailed') {
      return {
        status: 'ok',
        data: {
          format: 'detailed',
          command: this.lastReport.command,
          iterations: this.lastReport.iterations,
          passCount: this.lastReport.passCount,
          failCount: this.lastReport.failCount,
          passRate: Math.round(this.lastReport.passRate * 100) / 100,
          isFlaky: this.lastReport.isFlaky,
          averageDuration: Math.round(this.lastReport.averageDuration),
          recommendation: this.lastReport.recommendation,
          runs: this.lastReport.runs,
        },
      };
    }

    // Summary format (default)
    return {
      status: 'ok',
      data: {
        format: 'summary',
        command: this.lastReport.command,
        iterations: this.lastReport.iterations,
        passCount: this.lastReport.passCount,
        failCount: this.lastReport.failCount,
        passRate: Math.round(this.lastReport.passRate * 100) / 100,
        isFlaky: this.lastReport.isFlaky,
        averageDuration: Math.round(this.lastReport.averageDuration),
        recommendation: this.lastReport.recommendation,
      },
    };
  }
}
