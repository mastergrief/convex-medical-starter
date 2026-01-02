/**
 * Interactive REPL session for Browser-CLI
 * Provides command-line interface with tab completion and history
 */
import * as readline from 'readline';
import { parseCommand } from '../cli/commandParserModules';
import { ResponseFormatter } from '../cli/responseFormatterModules';
import { validateCommand } from '../cli/command-validator';
import { createCompleter } from './completer';
import type { OutputOptions } from '../cli/output-options';

export type SendCommandFn = (cmd: string, args: Record<string, unknown>) => Promise<unknown>;

interface SnapshotResponse {
  status: string;
  data?: {
    refs?: Record<string, string>;
    snapshot?: string;
  };
}

export class REPLSession {
  private rl: readline.Interface;
  private sendCommand: SendCommandFn;
  private lastRefs: string[] = [];
  private running = false;
  private commandHistory: string[] = [];
  private outputOptions: OutputOptions;

  constructor(sendCommand: SendCommandFn) {
    this.sendCommand = sendCommand;
    this.outputOptions = {
      quiet: false,
      json: false,
      raw: false,
      failFast: false,
      trace: false,
    };
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: createCompleter(() => this.lastRefs),
      historySize: 100,
      terminal: true,
    });
  }

  /**
   * Start the REPL session
   */
  async start(): Promise<void> {
    this.running = true;
    console.log('Browser CLI Interactive Mode');
    console.log('Type ".help" for commands, ".exit" to quit\n');

    this.prompt();
  }

  /**
   * Display prompt and wait for input
   */
  private prompt(): void {
    if (!this.running) return;

    this.rl.question('browser> ', async (input) => {
      await this.handleInput(input.trim());
      if (this.running) {
        this.prompt();
      }
    });
  }

  /**
   * Process user input
   */
  private async handleInput(input: string): Promise<void> {
    if (!input) return;

    // Add to history (excluding meta-commands and empty lines)
    if (!input.startsWith('.') && input.length > 0) {
      this.commandHistory.push(input);
    }

    // Handle meta-commands
    if (input.startsWith('.')) {
      await this.handleMetaCommand(input);
      return;
    }

    // Parse and execute browser command
    await this.executeCommand(input);
  }

  /**
   * Handle REPL meta-commands (.exit, .help, etc.)
   */
  private async handleMetaCommand(input: string): Promise<void> {
    const cmd = input.toLowerCase();

    switch (cmd) {
      case '.exit':
      case '.quit':
        this.running = false;
        this.rl.close();
        console.log('Goodbye!');
        process.exit(0);
        break;

      case '.clear':
        console.clear();
        break;

      case '.help':
        this.showHelp();
        break;

      case '.refs':
        if (this.lastRefs.length > 0) {
          console.log('Last snapshot refs:', this.lastRefs.join(', '));
        } else {
          console.log('No refs captured. Run "snapshot" first.');
        }
        break;

      case '.history':
        if (this.commandHistory.length > 0) {
          console.log('Command history:');
          this.commandHistory.slice(-20).forEach((cmd, i) => {
            console.log(`  ${i + 1}. ${cmd}`);
          });
        } else {
          console.log('No command history yet.');
        }
        break;

      default:
        console.log(`Unknown meta-command: ${input}`);
        console.log('Type ".help" for available commands.');
    }
  }

  /**
   * Execute a browser command
   */
  private async executeCommand(input: string): Promise<void> {
    try {
      const startTime = Date.now();

      // Parse command from input
      const args = this.parseInputToArgs(input);
      const parsed = parseCommand(args);

      // Validate the command
      validateCommand(parsed);

      // Send command to backend
      const backendCmd = parsed.backendCommand || parsed.command;
      const response = (await this.sendCommand(backendCmd, parsed.args)) as SnapshotResponse;
      const duration = Date.now() - startTime;

      // Update refs cache if this was a snapshot command
      if (parsed.command === 'snapshot' && response.data?.refs) {
        this.lastRefs = Object.keys(response.data.refs);
      }

      // Format and display output
      const output = await ResponseFormatter.format(
        parsed.command,
        response,
        args,
        parsed.args,
        this.outputOptions
      );
      console.log(output);
      console.log(`(${duration}ms)`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error(`Error: ${String(error)}`);
      }
    }
  }

  /**
   * Parse input string into args array, handling quoted strings
   */
  private parseInputToArgs(input: string): string[] {
    const args: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < input.length; i++) {
      const char = input[i];

      if (!inQuotes && (char === '"' || char === "'")) {
        inQuotes = true;
        quoteChar = char;
      } else if (inQuotes && char === quoteChar) {
        inQuotes = false;
        quoteChar = '';
      } else if (!inQuotes && char === ' ') {
        if (current.length > 0) {
          args.push(current);
          current = '';
        }
      } else {
        current += char;
      }
    }

    if (current.length > 0) {
      args.push(current);
    }

    return args;
  }

  /**
   * Display help information
   */
  private showHelp(): void {
    console.log(`
REPL Meta-Commands:
  .exit, .quit  - Exit REPL
  .clear        - Clear screen
  .help         - Show this help
  .refs         - Show last snapshot refs
  .history      - Show command history

Browser Commands:
  navigate <url>           - Navigate to URL
  snapshot [--full]        - Take accessibility snapshot
  screenshot <path>        - Take screenshot
  click <selector>         - Click element (e.g., e5, "role:button:Submit")
  dblclick <selector>      - Double-click element
  type <selector> <text>   - Type into element
  hover <selector>         - Hover over element
  pressKey <key>           - Press keyboard key
  wait <ms>                - Wait duration in milliseconds
  waitForSelector <sel>    - Wait for element
  evaluate <code>          - Execute JavaScript (read-only)

  status                   - Show browser status
  console                  - Show browser console
  network                  - Show network requests

  saveState <name>         - Save browser state
  restoreState <name>      - Restore browser state
  listStates               - List saved states

  assert <assertion>       - Run assertion
  exec "cmd1 && cmd2"      - Chain commands

Tab Completion:
  Press TAB for command and ref completion

Tips:
  - Run "snapshot" first to capture element refs (e1, e2, ...)
  - Use refs with click, type, hover: click e5
  - Semantic selectors: click "role:button:Submit"
  - Use "help <command>" for detailed command help
`);
  }

  /**
   * Close the REPL session
   */
  close(): void {
    this.running = false;
    this.rl.close();
  }

  /**
   * Get current refs (for external access)
   */
  getRefs(): string[] {
    return [...this.lastRefs];
  }
}

/**
 * Start a REPL session with the provided sendCommand function
 */
export async function startREPL(sendCommand: SendCommandFn): Promise<void> {
  const session = new REPLSession(sendCommand);
  await session.start();
}
