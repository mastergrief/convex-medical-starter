/**
 * Navigation command parsing: start, navigate, wait, waitForSelector, resize
 */
import { ParsedCommand } from './types';
import { isRef, extractRef, isSemantic } from './selector-detection';

export function parseStart(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('start requires a URL');
  }
  return {
    command: 'start',
    args: { url: args[1] }
  };
}

export function parseNavigate(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('navigate requires a URL');
  }
  return {
    command: 'navigate',
    args: { url: args[1] }
  };
}

export function parseWait(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('wait requires milliseconds');
  }
  return {
    command: 'wait',
    args: { ms: parseInt(args[1], 10) }
  };
}

export function parseWaitForSelector(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('waitForSelector requires a selector');
  }

  const selector = args[1];
  const cmdArgs: Record<string, any> = {};
  let command = 'waitForSelector';

  if (isRef(selector)) {
    cmdArgs.ref = extractRef(selector);
    command = 'waitForSelectorByRef';
  } else if (isSemantic(selector)) {
    cmdArgs.selector = selector;
    command = 'waitForSelectorBySemantic';
  } else {
    cmdArgs.selector = selector;
  }

  return { command, args: cmdArgs };
}

export function parseResize(args: string[]): ParsedCommand {
  if (!args[1] || !args[2]) {
    throw new Error('resize requires width and height');
  }
  return {
    command: 'resize',
    args: {
      width: parseInt(args[1], 10),
      height: parseInt(args[2], 10)
    }
  };
}


/**
 * Parse setMobilePreset command
 * Usage: setMobilePreset "iPhone 14 Pro"
 */
export function parseSetMobilePreset(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('setMobilePreset requires a device name (e.g., "iPhone 14 Pro")');
  }
  return {
    command: 'setMobilePreset',
    args: { device: args[1] }
  };
}

/**
 * Parse listMobilePresets command
 * Usage: listMobilePresets
 */
export function parseListMobilePresets(): ParsedCommand {
  return {
    command: 'listMobilePresets',
    args: {}
  };
}

/**
 * Parse resetMobilePreset command
 * Usage: resetMobilePreset
 */
export function parseResetMobilePreset(): ParsedCommand {
  return {
    command: 'resetMobilePreset',
    args: {}
  };
}
