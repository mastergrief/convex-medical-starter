/**
 * Interaction command parsing: click, dblclick, type, hover, drag, pressKey, fillForm, selectOption, uploadFile, handleDialog
 */
import { ParsedCommand } from './types';
import { isRef, extractRef, isSemantic, isSemanticForType } from './selector-detection';

export function parseClick(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('click requires a selector');
  }

  const selector = args[1];
  const cmdArgs: Record<string, any> = {};
  let command = 'click';

  if (isRef(selector)) {
    cmdArgs.ref = extractRef(selector);
    command = 'clickByRef';
  } else if (isSemantic(selector)) {
    cmdArgs.selector = selector;
    command = 'clickBySemantic';
  } else {
    cmdArgs.selector = selector;
  }

  return { command, args: cmdArgs };
}

export function parseHover(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('hover requires a selector');
  }

  const selector = args[1];
  const cmdArgs: Record<string, any> = {};
  let command = 'hover';

  if (isRef(selector)) {
    cmdArgs.ref = extractRef(selector);
    command = 'hoverByRef';
  } else if (isSemantic(selector)) {
    cmdArgs.selector = selector;
    command = 'hoverBySemantic';
  } else {
    cmdArgs.selector = selector;
  }

  return { command, args: cmdArgs };
}

export function parseDblclick(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('dblclick requires a selector');
  }

  const selector = args[1];
  const cmdArgs: Record<string, any> = {};
  let command = 'dblclick';

  if (isRef(selector)) {
    cmdArgs.ref = extractRef(selector);
    command = 'dblclickByRef';
  } else if (isSemantic(selector)) {
    cmdArgs.selector = selector;
    command = 'dblclickBySemantic';
  } else {
    cmdArgs.selector = selector;
  }

  // Optional button
  const buttonArg = args.find(arg => arg.startsWith('--button='));
  if (buttonArg) {
    cmdArgs.button = buttonArg.split('=')[1] as 'left' | 'right' | 'middle';
  }

  return { command, args: cmdArgs };
}

export function parseType(args: string[]): ParsedCommand {
  if (!args[1] || !args[2]) {
    throw new Error('type requires selector and text');
  }

  const selector = args[1];
  const cmdArgs: Record<string, any> = {};
  let command = 'type';

  if (isRef(selector)) {
    cmdArgs.ref = extractRef(selector);
    cmdArgs.text = args.slice(2).join(' ');
    command = 'typeByRef';
  } else if (isSemanticForType(selector)) {
    cmdArgs.selector = selector;
    cmdArgs.text = args.slice(2).join(' ');
    command = 'typeBySemantic';
  } else {
    cmdArgs.selector = selector;
    cmdArgs.text = args.slice(2).join(' ');
  }

  return { command, args: cmdArgs };
}

export function parsePressKey(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('pressKey requires a key name');
  }
  return {
    command: 'pressKey',
    args: { key: args[1] }
  };
}

export function parsePressKeyCombo(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('pressKeyCombo requires a key combination (e.g., Control+S)');
  }
  return {
    command: 'pressKeyCombo',
    args: { combo: args[1] }
  };
}

export function parseHoldKey(args: string[]): ParsedCommand {
  if (!args[1] || !args[2]) {
    throw new Error('holdKey requires a key and duration in ms');
  }
  const durationMs = parseInt(args[2], 10);
  if (isNaN(durationMs)) {
    throw new Error('holdKey duration must be a number');
  }
  return {
    command: 'holdKey',
    args: { key: args[1], durationMs }
  };
}

export function parseTapKey(args: string[]): ParsedCommand {
  if (!args[1] || !args[2]) {
    throw new Error('tapKey requires a key and count');
  }
  const count = parseInt(args[2], 10);
  if (isNaN(count)) {
    throw new Error('tapKey count must be a number');
  }
  const cmdArgs: Record<string, any> = { key: args[1], count };
  if (args[3]) {
    const delayMs = parseInt(args[3], 10);
    if (isNaN(delayMs)) {
      throw new Error('tapKey delay must be a number');
    }
    cmdArgs.delayMs = delayMs;
  }
  return {
    command: 'tapKey',
    args: cmdArgs
  };
}

export function parseDrag(args: string[]): ParsedCommand {
  // Check for --cdp flag first (can be anywhere in args)
  const hasCdpFlag = args.includes('--cdp');

  // Filter out flags to get positional arguments
  const dragPositionalArgs = args.filter(arg => !arg.startsWith('--'));
  // dragPositionalArgs[0] is 'drag', [1] is source, [2] is target

  if (!dragPositionalArgs[1] || !dragPositionalArgs[2]) {
    throw new Error('drag requires source and target selectors');
  }

  const sourceSelector = dragPositionalArgs[1];
  const targetSelector = dragPositionalArgs[2];
  const cmdArgs: Record<string, any> = {};
  let command = 'drag';

  const isSourceRef = /^e\d+$/.test(sourceSelector);
  const isTargetRef = /^e\d+$/.test(targetSelector);

  if (isSourceRef && isTargetRef) {
    // Both are refs - use dragByRef command
    cmdArgs.sourceRef = sourceSelector;
    cmdArgs.targetRef = targetSelector;

    // Check for --method flag
    const methodArg = args.find(arg => arg.startsWith('--method='));
    if (methodArg) {
      const method = methodArg.split('=')[1];
      if (['smart', 'coordinates', 'element', 'pointer', 'mouse', 'cdp'].includes(method)) {
        cmdArgs.method = method;
      } else {
        throw new Error('--method must be one of: smart, coordinates, element, pointer, mouse, cdp');
      }
    } else {
      cmdArgs.method = 'cdp'; // Default to CDP raw input
    }

    command = 'dragByRef';
  } else if (isSourceRef || isTargetRef) {
    // Mixed: one ref, one regular selector - error for now
    throw new Error('drag requires both selectors to be refs or both to be regular selectors');
  } else {
    // Both are regular CSS selectors
    if (hasCdpFlag) {
      // Use CDP-based drag for CSS selectors (dnd-kit compatible)
      cmdArgs.sourceSelector = sourceSelector;
      cmdArgs.targetSelector = targetSelector;
      command = 'dragByCSS';
    } else {
      // Legacy Playwright dragTo (may not work with dnd-kit)
      cmdArgs.source = sourceSelector;
      cmdArgs.target = targetSelector;
    }
  }

  return { command, args: cmdArgs };
}

export function parseSelectOption(args: string[]): ParsedCommand {
  if (!args[1] || !args[2]) {
    throw new Error('selectOption requires selector and value');
  }
  return {
    command: 'selectOption',
    args: {
      selector: args[1],
      value: args[2]
    }
  };
}

export function parseFillForm(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('fillForm requires a JSON object');
  }
  try {
    return {
      command: 'fillForm',
      args: { fields: JSON.parse(args[1]) }
    };
  } catch {
    throw new Error('fillForm argument must be valid JSON');
  }
}

export function parseUploadFile(args: string[]): ParsedCommand {
  if (!args[1] || !args[2]) {
    throw new Error('uploadFile requires selector and file path');
  }
  return {
    command: 'uploadFile',
    args: {
      selector: args[1],
      path: args[2]
    }
  };
}

