/**
 * Assertion Command Parsers - Phase 1d Browser-CLI Improvement
 *
 * Parses assertion commands: assert, assertCount, assertConsole, assertNetwork, assertPerformance
 */

import { ParsedCommand } from './types';

/**
 * Parse assert command: assert <selector> --visible|--hidden|--enabled|--disabled|--text="X" [--timeout=ms]
 */
export function parseAssert(args: string[]): ParsedCommand {
  const selector = args[1];
  const check = args[2]; // positional check: visible, hidden, enabled, disabled, text, value, checked
  const value = args[3]; // optional value for text/value checks
  const flags: Record<string, any> = { selector };

  // Support positional syntax: assert e5 visible
  if (check) {
    const checkLower = check.toLowerCase();
    if (checkLower === 'visible') flags.visible = true;
    else if (checkLower === 'hidden') flags.hidden = true;
    else if (checkLower === 'enabled') flags.enabled = true;
    else if (checkLower === 'disabled') flags.disabled = true;
    else if (checkLower === 'checked') flags.checked = true;
    else if (checkLower === 'text') flags.text = value || '';
    else if (checkLower === 'value') flags.value = value || '';
    // Also support flag syntax for backwards compat
    else if (check === '--visible') flags.visible = true;
    else if (check === '--hidden') flags.hidden = true;
    else if (check === '--enabled') flags.enabled = true;
    else if (check === '--disabled') flags.disabled = true;
    else if (check.startsWith('--text=')) flags.text = check.slice(7);
    else if (check.startsWith('--timeout=')) flags.timeout = parseInt(check.slice(10), 10);
  }

  // Parse remaining flags
  for (let i = 3; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--timeout=')) flags.timeout = parseInt(arg.slice(10), 10);
  }

  return { command: 'assert', args: flags };
}

/**
 * Parse assertCount command: assertCount <selector> --equals=N|--gt=N|--lt=N [--timeout=ms]
 */
export function parseAssertCount(args: string[]): ParsedCommand {
  const selector = args[1];
  const flags: Record<string, any> = { selector };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--equals=')) flags.equals = parseInt(arg.slice(9), 10);
    else if (arg.startsWith('--gt=')) flags.gt = parseInt(arg.slice(5), 10);
    else if (arg.startsWith('--lt=')) flags.lt = parseInt(arg.slice(5), 10);
    else if (arg.startsWith('--timeout=')) flags.timeout = parseInt(arg.slice(10), 10);
  }

  return { command: 'assertCount', args: flags };
}

/**
 * Parse assertConsole command: assertConsole --no-errors|--no-warnings
 */
export function parseAssertConsole(args: string[]): ParsedCommand {
  const flags: Record<string, any> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--no-errors') flags.noErrors = true;
    else if (arg === '--no-warnings') flags.noWarnings = true;
  }

  return { command: 'assertConsole', args: flags };
}

/**
 * Parse assertNetwork command: assertNetwork <pattern> --status=200|--method=POST
 */
export function parseAssertNetwork(args: string[]): ParsedCommand {
  const pattern = args[1];
  const flags: Record<string, any> = { pattern };

  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--status=')) flags.status = parseInt(arg.slice(9), 10);
    else if (arg.startsWith('--method=')) flags.method = arg.slice(9);
  }

  return { command: 'assertNetwork', args: flags };
}

/**
 * Parse assertPerformance command: assertPerformance --lcp=2500 --cls=0.1 --ttfb=600
 */
export function parseAssertPerformance(args: string[]): ParsedCommand {
  const flags: Record<string, any> = {};

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--lcp=')) flags.lcp = parseInt(arg.slice(6), 10);
    else if (arg.startsWith('--cls=')) flags.cls = parseFloat(arg.slice(6));
    else if (arg.startsWith('--ttfb=')) flags.ttfb = parseInt(arg.slice(7), 10);
  }

  return { command: 'assertPerformance', args: flags };
}

/**
 * Parse getAssertionResults command (no args)
 */
export function parseGetAssertionResults(): ParsedCommand {
  return { command: 'getAssertionResults', args: {} };
}

/**
 * Parse clearAssertionResults command (no args)
 */
export function parseClearAssertionResults(): ParsedCommand {
  return { command: 'clearAssertionResults', args: {} };
}
