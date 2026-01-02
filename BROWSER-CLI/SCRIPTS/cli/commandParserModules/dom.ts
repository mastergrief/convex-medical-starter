/**
 * DOM inspection command parsing: getComputedStyle, getElementVisibility,
 * getOverlayingElements, countElements
 */
import { ParsedCommand } from './types';

export function parseGetComputedStyle(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('getComputedStyle requires a selector');
  }
  const properties = args[2] ? JSON.parse(args[2]) : undefined;
  return {
    command: 'getComputedStyle',
    args: { selector: args[1], properties },
  };
}

export function parseGetElementVisibility(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('getElementVisibility requires a selector');
  }
  return {
    command: 'getElementVisibility',
    args: { selector: args[1] },
  };
}

export function parseGetOverlayingElements(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('getOverlayingElements requires a selector');
  }
  return {
    command: 'getOverlayingElements',
    args: { selector: args[1] },
  };
}

export function parseCountElements(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('countElements requires a selector');
  }
  return {
    command: 'countElements',
    args: { selector: args[1] },
  };
}
