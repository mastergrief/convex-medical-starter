/**
 * Phase 2: Multi-Command Execution Feature
 *
 * Executes multiple commands in sequence using && separator.
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';

/**
 * Command Executor Function Type
 * Function that executes a command and returns its response
 */
type CommandExecutor = (cmdData: any) => Promise<any>;


/**
 * Commands that are read-only and can safely execute in parallel.
 * These commands do not modify page state or have side effects.
 */
const PARALLEL_SAFE_COMMANDS = new Set([
  // Capture/inspection commands
  'snapshot',
  'console',
  'network',
  'status',
  'changes',

  // Content capture
  'getPageHTML',
  'getPageText',
  'getElementHTML',
  'getElementText',

  // DOM inspection
  'getComputedStyle',
  'getElementVisibility',
  'getOverlayingElements',
  'countElements',

  // Event inspection
  'getEventLog',

  // State inspection (read-only)
  'listMocks',
  'listSchemas',
  'listBaselines',
  'listScreenshotBaselines',
  'listStates',
  'listAborts',
  'getMockHistory',

  // Performance
  'getPerformanceMetrics',

  // Buffer stats
  'getConsoleBufferStats',
  'getNetworkBufferStats',
  'getEventBufferStats',
]);

/**
 * Parsed command structure
 */
interface ParsedCommand {
  raw: string;           // Original command string
  command: string;       // Command name
  cmdData: any;          // Parsed arguments
}

/**
 * Batch of commands for execution
 */
interface CommandBatch {
  commands: ParsedCommand[];
  parallel: boolean;
}

/**
 * Group commands into batches for execution.
 * Consecutive parallel-safe commands are grouped together.
 * Sequential commands (state-changing) are in their own single-item batches.
 */
function groupIntoBatches(commands: ParsedCommand[]): CommandBatch[] {
  const batches: CommandBatch[] = [];
  let currentParallelBatch: ParsedCommand[] = [];

  for (const cmd of commands) {
    if (PARALLEL_SAFE_COMMANDS.has(cmd.command)) {
      // Add to current parallel batch
      currentParallelBatch.push(cmd);
    } else {
      // Flush any pending parallel batch
      if (currentParallelBatch.length > 0) {
        batches.push({ commands: currentParallelBatch, parallel: true });
        currentParallelBatch = [];
      }
      // Add sequential command as single-item batch
      batches.push({ commands: [cmd], parallel: false });
    }
  }

  // Flush remaining parallel commands
  if (currentParallelBatch.length > 0) {
    batches.push({ commands: currentParallelBatch, parallel: true });
  }

  return batches;
}

/**
 * Multi-Command Execution Feature
 *
 * Allows chaining multiple commands in a single call using the && separator.
 * Useful for:
 * - Setting up complex test scenarios
 * - Executing multi-step workflows
 * - Reducing round-trip latency for command sequences
 *
 * Example:
 * ```
 * exec "navigate http://localhost:5173 && wait 1000 && click e1 && snapshot"
 * ```
 *
 * Commands:
 * - exec: Execute multiple commands separated by &&
 */
export class MultiCommandFeature extends BaseFeature {
  public readonly name = 'MultiCommand';

  private commandExecutor: CommandExecutor | null = null;

  /**
   * Set the command executor callback
   * This must be called after construction to provide access to BrowserManager's handleCommand
   */
  setCommandExecutor(executor: CommandExecutor): void {
    this.commandExecutor = executor;
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['exec', this.executeMultiple.bind(this)]
    ]);
  }

  /**
   * Execute multiple commands in sequence
   */
  private async executeMultiple(args: { commands: string }): Promise<CommandResponse> {
    if (!this.commandExecutor) {
      return {
        status: 'error',
        message: 'Command executor not configured'
      };
    }

    const cmdList = args.commands.split('&&').map(cmd => cmd.trim());
    
    // Phase 1: Parse all commands first
    const parsedCommands: ParsedCommand[] = [];
    
    for (const cmd of cmdList) {
      const parts = cmd.split(/\s+/);
      const command = parts[0];
      const cmdArgs = parts.slice(1);
      const cmdData: any = { cmd: command };

      switch (command) {
        // Navigation & Timing
        case 'navigate':
          cmdData.url = cmdArgs[0];
          cmdArgs.forEach(arg => {
            if (arg.startsWith('--waitUntil=')) cmdData.waitUntil = arg.split('=')[1];
          });
          break;
        case 'wait':
          cmdData.ms = parseInt(cmdArgs[0], 10);
          break;
        case 'waitForSelector':
          cmdData.selector = cmdArgs[0];
          cmdArgs.forEach(arg => {
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
          // Join rest, handling quoted strings
          cmdData.text = cmdArgs.slice(1).join(' ').replace(/^["']|["']$/g, '');
          break;
        case 'pressKey':
          cmdData.key = cmdArgs[0];
          break;
        case 'pressKeyCombo':
          cmdData.keys = cmdArgs[0];
          break;
        case 'holdKey':
          cmdData.key = cmdArgs[0];
          cmdData.duration = cmdArgs[1] ? parseInt(cmdArgs[1]) : 100;
          break;
        case 'tapKey':
          cmdData.key = cmdArgs[0];
          cmdData.count = cmdArgs[1] ? parseInt(cmdArgs[1]) : 1;
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
        case 'fillForm':
          cmdData.fields = cmdArgs[0];
          break;
        case 'uploadFile':
          cmdData.selector = cmdArgs[0];
          cmdData.path = cmdArgs[1];
          break;

        // Capture & Inspection
        case 'snapshot':
          cmdArgs.forEach(arg => {
            if (arg.startsWith('--file=')) cmdData.file = arg.split('=')[1];
            if (arg === '--full') cmdData.full = true;
            if (arg === '--forms') cmdData.forms = true;
          });
          if (cmdArgs[0] && !cmdArgs[0].startsWith('--')) cmdData.selector = cmdArgs[0];
          break;
        case 'screenshot':
          cmdData.path = cmdArgs[0];
          break;
        case 'changes':
          // No arguments needed
          break;

        // Console
        case 'console':
          cmdData.count = cmdArgs[0] ? parseInt(cmdArgs[0]) : 5;
          break;
        case 'clearConsole':
          // No arguments needed
          break;
        case 'getConsoleBufferStats':
          // No arguments needed
          break;

        // Network
        case 'network':
          cmdArgs.forEach(arg => {
            if (arg.startsWith('--filter=')) cmdData.filter = arg.split('=')[1];
            if (arg.startsWith('--method=')) cmdData.method = arg.split('=')[1];
            if (arg.startsWith('--status=')) cmdData.status = parseInt(arg.split('=')[1]);
            if (arg.startsWith('--limit=')) cmdData.limit = parseInt(arg.split('=')[1]);
          });
          break;
        case 'networkClear':
          // No arguments needed
          break;
        case 'getNetworkBufferStats':
          // No arguments needed
          break;

        // Status
        case 'status':
          if (cmdArgs.includes('--verbose')) cmdData.verbose = true;
          break;

        // Content capture
        case 'getPageHTML':
        case 'getPageText':
          // No arguments needed
          break;
        case 'getElementHTML':
        case 'getElementText':
          cmdData.selector = cmdArgs[0];
          break;

        // DOM inspection
        case 'getComputedStyle':
          cmdData.selector = cmdArgs[0];
          cmdData.property = cmdArgs[1];
          break;
        case 'getElementVisibility':
        case 'getOverlayingElements':
          cmdData.selector = cmdArgs[0];
          break;
        case 'countElements':
          cmdData.selector = cmdArgs[0];
          break;

        // Event inspection
        case 'getEventLog':
          cmdArgs.forEach(arg => {
            if (arg.startsWith('--limit=')) cmdData.limit = parseInt(arg.split('=')[1]);
            if (arg.startsWith('--filter=')) cmdData.filter = arg.split('=')[1];
          });
          break;
        case 'clearEventLog':
          // No arguments needed
          break;
        case 'getEventBufferStats':
          // No arguments needed
          break;

        // State management
        case 'listMocks':
        case 'listSchemas':
        case 'listBaselines':
        case 'listScreenshotBaselines':
        case 'listStates':
        case 'listAborts':
          // No arguments needed
          break;
        case 'getMockHistory':
          cmdData.url = cmdArgs[0];
          break;

        // Performance
        case 'getPerformanceMetrics':
        case 'capturePerformanceMetrics':
          // No arguments needed
          break;

        // State save/restore
        case 'saveState':
        case 'restoreState':
        case 'deleteState':
          cmdData.name = cmdArgs[0];
          break;
        case 'saveSnapshotBaseline':
        case 'compareSnapshots':
        case 'saveScreenshotBaseline':
        case 'compareScreenshots':
          cmdData.name = cmdArgs[0];
          break;

        // Viewport
        case 'resize':
          cmdData.width = parseInt(cmdArgs[0]);
          cmdData.height = parseInt(cmdArgs[1]);
          break;

        // Evaluate
        case 'evaluate':
          cmdData.code = cmdArgs.join(' ');
          break;

        default:
          // For unknown commands, pass through with basic arg handling
          // This allows new commands to work without explicit parsing
          if (cmdArgs.length > 0) {
            cmdData.args = cmdArgs;
          }
          break;
      }

      parsedCommands.push({ raw: cmd, command, cmdData });
    }

    // Phase 2: Group into batches
    const batches = groupIntoBatches(parsedCommands);

    // Phase 3: Execute batches
    const results: any[] = [];

    for (const batch of batches) {
      if (batch.parallel && batch.commands.length > 1) {
        // Execute parallel batch concurrently
        this.log(`Executing ${batch.commands.length} commands in parallel`);
        const parallelResults = await Promise.all(
          batch.commands.map(async (cmd) => {
            this.log(`  [parallel] ${cmd.raw}`);
            const result = await this.commandExecutor!(cmd.cmdData);
            return { command: cmd.raw, result, parallel: true };
          })
        );
        results.push(...parallelResults);
      } else {
        // Execute sequential batch (or single parallel command)
        for (const cmd of batch.commands) {
          this.log(`Executing: ${cmd.raw}`);
          const result = await this.commandExecutor!(cmd.cmdData);
          results.push({ command: cmd.raw, result, parallel: batch.parallel });
        }
      }
    }

    return { status: 'ok', data: { results } };
  }
}
