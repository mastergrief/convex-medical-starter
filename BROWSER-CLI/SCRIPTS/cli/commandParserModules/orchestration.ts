/**
 * Orchestration Command Parsers - Browser-CLI P3.6
 *
 * Parses CLI arguments for parallel test orchestration commands.
 */

import { ParsedCommand } from './types';

/**
 * Parse flags from args for orchestrate command
 */
function parseOrchestrationFlags(args: string[]): {
  instances?: number;
  basePort?: number;
  baseVitePort?: number;
  timeout?: number;
  continueOnFailure?: boolean;
  verbose?: boolean;
} {
  const result: ReturnType<typeof parseOrchestrationFlags> = {};

  for (const arg of args) {
    if (arg.startsWith('--instances=')) {
      const val = parseInt(arg.substring(12), 10);
      if (!isNaN(val) && val > 0) {
        result.instances = val;
      }
    } else if (arg.startsWith('--basePort=')) {
      const val = parseInt(arg.substring(11), 10);
      if (!isNaN(val) && val > 0) {
        result.basePort = val;
      }
    } else if (arg.startsWith('--baseVitePort=')) {
      const val = parseInt(arg.substring(15), 10);
      if (!isNaN(val) && val > 0) {
        result.baseVitePort = val;
      }
    } else if (arg.startsWith('--timeout=')) {
      const val = parseInt(arg.substring(10), 10);
      if (!isNaN(val) && val > 0) {
        result.timeout = val;
      }
    } else if (arg === '--continue' || arg === '--continueOnFailure') {
      result.continueOnFailure = true;
    } else if (arg === '--stopOnFailure') {
      result.continueOnFailure = false;
    } else if (arg === '--verbose' || arg === '-v') {
      result.verbose = true;
    }
  }

  return result;
}

/**
 * Parse orchestrate command.
 * Usage: orchestrate "tests/*.txt" [--instances=3] [--timeout=60000] [--verbose]
 */
export function parseOrchestrate(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error(
      'orchestrate requires a pattern argument. Usage: orchestrate "tests/*.txt" [--instances=3]'
    );
  }

  // Pattern is the first non-flag argument after command
  let pattern = args[1];

  // Remove quotes if present
  if (
    (pattern.startsWith('"') && pattern.endsWith('"')) ||
    (pattern.startsWith("'") && pattern.endsWith("'"))
  ) {
    pattern = pattern.slice(1, -1);
  }

  const flags = parseOrchestrationFlags(args.slice(2));

  return {
    command: 'orchestrate',
    args: {
      pattern,
      ...flags,
    },
    backendCommand: 'orchestrate',
  };
}

/**
 * Parse getOrchestrationStatus command.
 * Usage: getOrchestrationStatus [--format=json|summary]
 */
export function parseGetOrchestrationStatus(args: string[]): ParsedCommand {
  let format: 'json' | 'summary' | undefined;

  for (const arg of args) {
    if (arg.startsWith('--format=')) {
      const val = arg.substring(9);
      if (val === 'json' || val === 'summary') {
        format = val;
      }
    }
  }

  return {
    command: 'getOrchestrationStatus',
    args: { format },
    backendCommand: 'getOrchestrationStatus',
  };
}

/**
 * Parse abortOrchestration command.
 * Usage: abortOrchestration
 */
export function parseAbortOrchestration(): ParsedCommand {
  return {
    command: 'abortOrchestration',
    args: {},
    backendCommand: 'abortOrchestration',
  };
}
