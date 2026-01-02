/**
 * Event Commands Parser Module
 *
 * Parsing functions for browser event listener commands.
 */

import { ParsedCommand } from './types';

/**
 * Parse getEventLog command
 * Usage: getEventLog [count] [type]
 */
export function parseGetEventLog(args: string[]): ParsedCommand {
  const count = args[1] ? parseInt(args[1], 10) : undefined;
  const eventType = args[2];
  return { command: 'getEventLog', args: { count, eventType } };
}

/**
 * Parse clearEventLog command
 * Usage: clearEventLog
 */
export function parseClearEventLog(): ParsedCommand {
  return { command: 'clearEventLog', args: {} };
}

/**
 * Parse waitForEvent command
 * Usage: waitForEvent <type> [timeout]
 */
export function parseWaitForEvent(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error(
      'waitForEvent requires event type (popup|dialog|filechooser|pageerror|framenavigated)'
    );
  }
  const timeout = args[2] ? parseInt(args[2], 10) : undefined;
  return { command: 'waitForEvent', args: { eventType: args[1], timeout } };
}

/**
 * Parse dismissDialog command
 * Usage: dismissDialog
 */
export function parseDismissDialog(): ParsedCommand {
  return { command: 'dismissDialog', args: {} };
}

/**
 * Parse acceptDialog command
 * Usage: acceptDialog [text]
 */
export function parseAcceptDialog(args: string[]): ParsedCommand {
  return { command: 'acceptDialog', args: { promptText: args[1] } };
}
