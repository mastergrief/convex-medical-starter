/**
 * Output Options Module
 * Provides global output formatting flags for all commands
 */

export interface OutputOptions {
  quiet: boolean; // Suppress emojis, headers
  json: boolean; // Force JSON output
  raw: boolean; // No formatting (data only)
  failFast: boolean; // Stop on first assertion failure
  trace: boolean; // Enable execution tracing
  logFormat?: 'text' | 'json' | 'silent'; // Log output format
}

export const DEFAULT_OUTPUT_OPTIONS: OutputOptions = {
  quiet: false,
  json: false,
  raw: false,
  failFast: false,
  trace: false,
  logFormat: 'text',
};

const OUTPUT_FLAGS = ['--quiet', '-q', '--json', '--raw', '--fail-fast', '--trace', '--log-format=text', '--log-format=json', '--log-format=silent'];

/**
 * Parse output formatting flags from command args
 */
export function parseOutputFlags(args: string[]): OutputOptions {
  // Parse log format from --log-format=X
  let logFormat: 'text' | 'json' | 'silent' = 'text';
  for (const arg of args) {
    if (arg.startsWith('--log-format=')) {
      const format = arg.split('=')[1];
      if (format === 'json' || format === 'text' || format === 'silent') {
        logFormat = format;
      }
    }
  }

  return {
    quiet: args.includes('--quiet') || args.includes('-q'),
    json: args.includes('--json'),
    raw: args.includes('--raw'),
    failFast: args.includes('--fail-fast'),
    trace: args.includes('--trace'),
    logFormat,
  };
}

/**
 * Remove output flags from args before command parsing
 */
export function stripOutputFlags(args: string[]): string[] {
  return args.filter((arg) => !OUTPUT_FLAGS.includes(arg) && !arg.startsWith('--log-format='));
}

/**
 * Check if any output flags are present
 */
export function hasOutputFlags(args: string[]): boolean {
  return args.some((arg) => OUTPUT_FLAGS.includes(arg));
}
