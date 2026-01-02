/**
 * Content command parsers
 * Commands: getPageHTML, getPageText, getElementHTML, getElementText
 */

import { ParsedCommand } from './types';

export function parseGetPageHTML(): ParsedCommand {
  return { command: 'getPageHTML', args: {} };
}

export function parseGetPageText(): ParsedCommand {
  return { command: 'getPageText', args: {} };
}

export function parseGetElementHTML(args: string[]): ParsedCommand {
  if (!args[1]) throw new Error('getElementHTML requires a selector');
  return { command: 'getElementHTML', args: { selector: args[1] } };
}

export function parseGetElementText(args: string[]): ParsedCommand {
  if (!args[1]) throw new Error('getElementText requires a selector');
  return { command: 'getElementText', args: { selector: args[1] } };
}
