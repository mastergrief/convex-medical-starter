#!/usr/bin/env tsx
/**
 * Browser Command Client
 *
 * Sends commands to the browser-manager daemon via TCP socket.
 *
 * Usage:
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts start http://localhost:5173
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts navigate http://localhost:5173/calendar
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts snapshot [selector]
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts screenshot output.png
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts status
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts close
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { getHelpText } from './cli/help-text';
import { parseCommand } from './cli/commandParserModules';
import { validateCommand } from './cli/command-validator';
import { ResponseFormatter } from './cli/responseFormatterModules';
import { ErrorContext } from './cli/error-context';
import { getCommandHelp } from './cli/commandHelpModules';
import {
  listAllCommands,
  listCommandsByCategory,
  isValidCategory,
  getAvailableCategories,
} from './cli/commandHelpModules/discovery';
import { DEFAULT_PORT, PORT_FILE, STATE_DIR, INSTANCE_ID, TOKEN_FILE } from './core/constants';
import { parseOutputFlags, stripOutputFlags } from './cli/output-options';
import { JUnitReporter } from './cli/reporters/junit';
import { ConfigLoader, type BrowserConfig } from './core/config';
import { generateCompletion } from './cli/completion-generator';

/**
 * Exit codes for CLI operations
 */
import { getTracer } from './utils/tracer';

enum ExitCode {
  SUCCESS = 0,
  COMMAND_FAILED = 1,
  CONFIG_ERROR = 2,
}

function getPort(): number {
  if (fs.existsSync(PORT_FILE)) {
    return parseInt(fs.readFileSync(PORT_FILE, 'utf-8'));
  }
  return DEFAULT_PORT;
}

async function isManagerRunning(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const client = net.connect(port, '127.0.0.1', () => {
      client.end();
      resolve(true);
    });

    client.on('error', () => {
      resolve(false);
    });

    client.setTimeout(1000, () => {
      client.destroy();
      resolve(false);
    });
  });
}

async function startManager(): Promise<void> {
  const { spawn } = await import('child_process');
  const pathModule = await import('path');

  const instanceInfo = INSTANCE_ID !== 'default' ? ` (instance: ${INSTANCE_ID})` : '';
  console.log(`🚀 Starting browser manager${instanceInfo}...`);

  // Ensure state directory exists for non-default instances
  if (INSTANCE_ID !== 'default' && !fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }

  const managerPath = pathModule.join(process.cwd(), 'BROWSER-CLI', 'SCRIPTS', 'browser-manager.ts');

  // Start the manager in background, passing instance config via env
  const child = spawn('npx', ['tsx', managerPath], {
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      BROWSER_INSTANCE: INSTANCE_ID,
      BROWSER_PORT: String(DEFAULT_PORT)
    }
  });

  child.unref();

  // Wait for manager to be ready
  const port = getPort();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 500));
    if (await isManagerRunning(port)) {
      console.log(`✅ Browser manager ready on port ${port}`);
      return;
    }
    attempts++;
  }

  throw new Error('Failed to start browser manager');
}

async function ensureManagerRunning(): Promise<void> {
  const port = getPort();

  if (!(await isManagerRunning(port))) {
    await startManager();
  }
}

async function sendCommand(cmd: string, args: Record<string, any>): Promise<any> {
  const port = getPort();

  // Read session token for authentication
  const token = fs.existsSync(TOKEN_FILE)
    ? fs.readFileSync(TOKEN_FILE, 'utf-8').trim()
    : '';

  return new Promise((resolve, reject) => {
    const client = net.connect(port, '127.0.0.1', () => {
      const message = JSON.stringify({ token, cmd, ...args }) + '\n';
      client.write(message);
    });

    let buffer = '';

    client.on('data', (data) => {
      buffer += data.toString();

      if (buffer.includes('\n')) {
        const response = buffer.trim();
        try {
          const parsed = JSON.parse(response);
          client.end();
          resolve(parsed);
        } catch (error) {
          client.end();
          reject(new Error(`Failed to parse response: ${response}`));
        }
      }
    });

    client.on('error', (error: any) => {
      if (error.code === 'ECONNREFUSED') {
        reject(new Error(
          `Browser manager not running on port ${port}.\n` +
          `💡 Start it with: npx tsx BROWSER-CLI/SCRIPTS/browser-manager.ts &`
        ));
      } else {
        reject(new Error(`Connection error: ${error.message}`));
      }
    });

    client.on('end', () => {
      if (buffer && !buffer.includes('\n')) {
        reject(new Error('Connection closed before response received'));
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);

  // Parse global output flags early
  const outputOptions = parseOutputFlags(args);
  const cleanedArgs = stripOutputFlags(args);

  // Load configuration (CLI flags > env vars > file > defaults)
  const config = ConfigLoader.load();

  // Configure ErrorContext with screenshot directory from config
  ErrorContext.configure({ screenshotDir: config.screenshotDir });

  // Handle --completion flag (early exit)
  if (args.includes('--completion')) {
    const completionIndex = args.indexOf('--completion');
    const shell = args[completionIndex + 1] || 'bash';
    try {
      console.log(generateCompletion(shell));
      process.exit(ExitCode.SUCCESS);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(ExitCode.COMMAND_FAILED);
    }
  }

  // Handle --interactive / -i flag (start REPL mode)
  if (args.includes('--interactive') || args.includes('-i')) {
    await ensureManagerRunning();
    const { startREPL } = await import('./repl');
    await startREPL(sendCommand);
    return; // REPL handles exit
  }

  // Parse reporter flags
  const reporterArg = args.find((a) => a.startsWith('--reporter='));
  const reporterType = reporterArg?.split('=')[1];
  const junitOutputArg = args.find((a) => a.startsWith('--junit-output='));
  const junitOutputPath = junitOutputArg?.split('=')[1] || 'test-results.xml';

  // Remove reporter flags from cleanedArgs
  const commandArgs = cleanedArgs.filter(
    (a) => !a.startsWith('--reporter=') && !a.startsWith('--junit-output=')
  );

  // Show help if no command provided
  if (commandArgs.length === 0) {
    console.error(getHelpText());
    process.exit(ExitCode.COMMAND_FAILED);
  }

  // Check for --list flag
  if (commandArgs.includes('--list')) {
    const categoryArg = commandArgs.find((a) => !a.startsWith('--') && a !== '--list');
    if (categoryArg && isValidCategory(categoryArg)) {
      console.log(listCommandsByCategory(categoryArg));
    } else if (categoryArg) {
      console.error(
        `Unknown category: ${categoryArg}\nValid categories: ${getAvailableCategories().join(', ')}`
      );
      process.exit(ExitCode.COMMAND_FAILED);
    } else {
      console.log(listAllCommands());
    }
    process.exit(ExitCode.SUCCESS);
  }

  // Check for help <topic> pattern (e.g., "help selectors")
  if (commandArgs[0] === 'help' && commandArgs[1]) {
    console.log(getCommandHelp(commandArgs[1]));
    process.exit(ExitCode.SUCCESS);
  }

  // Check for --help flag
  if (commandArgs.includes('--help') || commandArgs.includes('-h')) {
    const command = commandArgs[0];
    if (command === '--help' || command === '-h') {
      // No command specified, show general help
      console.log(getHelpText());
    } else {
      // Show command-specific help
      console.log(getCommandHelp(command));
    }
    process.exit(ExitCode.SUCCESS);
  }

  // Initialize JUnit reporter if requested
  let junitReporter: JUnitReporter | null = null;
  if (reporterType === 'junit') {
    junitReporter = new JUnitReporter();
  }

  // Initialize tracer if --trace flag is enabled
  const tracer = outputOptions.trace ? getTracer() : null;

  try {
    // Parse command (use commandArgs without output/reporter flags)
    const parsed = parseCommand(commandArgs);

    // Validate command
    validateCommand(parsed);

    // Auto-start manager if not running
    await ensureManagerRunning();

    // Start trace before sending command
    const backendCmd = parsed.backendCommand || parsed.command;
    if (tracer) {
      tracer.start(`Command: ${backendCmd} ${JSON.stringify(parsed.args)}`);
    }

    // Send command to backend
    let response = await sendCommand(backendCmd, parsed.args);

    // Mark response received in trace
    if (tracer) {
      tracer.mark('Response received');
      tracer.end('Command complete');
    }

    // Phase 2: Handle snapshot baseline/comparison
    if (parsed.command === 'snapshot' && response.status === 'ok') {
      await ResponseFormatter.handleSnapshotComparison(
        parsed.args,
        response.data.snapshot,
        sendCommand
      );
    }

    // Format and display response (pass outputOptions)
    const output = await ResponseFormatter.format(
      parsed.command,
      response,
      commandArgs,
      parsed.args,
      outputOptions
    );
    console.log(output);

    // Output trace information if enabled
    if (tracer) {
      console.log('\n' + tracer.formatText());
    }

    // Fail-fast: exit immediately on assertion failure if flag enabled
    if (outputOptions.failFast && response.status !== 'ok') {
      process.exit(ExitCode.COMMAND_FAILED);
    }

    // Write JUnit report if reporter is enabled and assertion results are available
    if (junitReporter && response.data?.assertionResults) {
      junitReporter.importAssertions(response.data.assertionResults);
      junitReporter.writeToFile(junitOutputPath);
      const summary = junitReporter.getSummary();
      console.log(
        `\nJUnit report written to: ${junitOutputPath} (${summary.passed}/${summary.total} passed)`
      );
    }

    // Exit with error code if command failed
    if (response.status !== 'ok') {
      process.exit(ExitCode.COMMAND_FAILED);
    }
  } catch (error) {
    // Output trace even on error if enabled
    if (tracer) {
      tracer.mark('Error occurred');
      tracer.end('Command failed');
      console.log('\n' + tracer.formatText());
    }

    if (error instanceof Error) {
      if (error.message === 'NO_COMMAND') {
        console.error(getHelpText());
      } else {
        // Apply error context enhancement with optional screenshot capture
        if (config.screenshotOnFailure) {
          const enhanced = await ErrorContext.enhanceWithScreenshot(
            error,
            commandArgs[0] || '',
            {},
            sendCommand
          );
          console.error(enhanced);
        } else {
          const enhanced = ErrorContext.enhance(error, commandArgs[0] || '', {});
          console.error(enhanced);
        }
      }
    } else {
      console.error('Command failed:', error);
    }
    process.exit(ExitCode.COMMAND_FAILED);
  }
}

main();
