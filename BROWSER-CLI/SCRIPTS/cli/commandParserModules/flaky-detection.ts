/**
 * Flaky Detection Command Parsers
 *
 * Parses commands related to flaky test detection.
 */

import { ParsedCommand } from './types';

/**
 * Parse runTestMultipleTimes command
 * Usage: runTestMultipleTimes <iterations> "<command>"
 * Example: runTestMultipleTimes 5 "click e5 && snapshot"
 */
export function parseRunTestMultipleTimes(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('runTestMultipleTimes requires iterations count');
  }

  const iterations = parseInt(args[1], 10);
  if (isNaN(iterations) || iterations < 1) {
    throw new Error('iterations must be a positive integer');
  }

  // Join remaining args as the command (handles quoted strings)
  const command = args.slice(2).join(' ').replace(/^["']|["']$/g, '');
  if (!command) {
    throw new Error('runTestMultipleTimes requires a command string');
  }

  return {
    command: 'runTestMultipleTimes',
    args: { iterations, command },
  };
}

/**
 * Parse analyzeFlakiness command
 * Usage: analyzeFlakiness [--format=json|summary|detailed]
 */
export function parseAnalyzeFlakiness(args: string[]): ParsedCommand {
  let format: 'json' | 'summary' | 'detailed' = 'summary';

  for (const arg of args.slice(1)) {
    if (arg.startsWith('--format=')) {
      const value = arg.split('=')[1];
      if (value === 'json' || value === 'summary' || value === 'detailed') {
        format = value;
      } else {
        throw new Error('format must be one of: json, summary, detailed');
      }
    }
  }

  return {
    command: 'analyzeFlakiness',
    args: { format },
  };
}
