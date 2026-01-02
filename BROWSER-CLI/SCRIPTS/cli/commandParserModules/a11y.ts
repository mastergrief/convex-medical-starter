/**
 * Accessibility Audit Command Parsers - Phase 3.4 Browser-CLI Improvement
 *
 * Parses accessibility audit commands: auditAccessibility, getAccessibilityResults
 */

import { ParsedCommand } from './types';

/**
 * Parse auditAccessibility command:
 * auditAccessibility [--rules=wcag2aa|wcag21aa|best-practice] [--include=selector] [--exclude=selector]
 */
export function parseAuditAccessibility(args: string[]): ParsedCommand {
  const flags: Record<string, any> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--rules=')) flags.rules = arg.slice(8);
    else if (arg.startsWith('--include=')) flags.include = arg.slice(10);
    else if (arg.startsWith('--exclude=')) flags.exclude = arg.slice(10);
  }

  return { command: 'auditAccessibility', args: flags };
}

/**
 * Parse getAccessibilityResults command:
 * getAccessibilityResults [--format=json|summary|detailed]
 */
export function parseGetAccessibilityResults(args: string[]): ParsedCommand {
  const flags: Record<string, any> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--format=')) flags.format = arg.slice(9);
  }

  return { command: 'getAccessibilityResults', args: flags };
}
