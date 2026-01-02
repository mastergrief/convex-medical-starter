/**
 * State and utility command parsing: saveState, restoreState, deleteState, listStates,
 * tabs, exec, status, console, clearConsole, close
 */
import { ParsedCommand } from './types';

export function parseSaveState(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('saveState requires a name');
  }
  return {
    command: 'saveState',
    args: { name: args[1] },
    backendCommand: 'saveBrowserState'
  };
}

export function parseRestoreState(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('restoreState requires a name');
  }
  return {
    command: 'restoreState',
    args: { name: args[1] },
    backendCommand: 'restoreBrowserState'
  };
}

export function parseDeleteState(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('deleteState requires a name');
  }
  return {
    command: 'deleteState',
    args: { name: args[1] },
    backendCommand: 'deleteBrowserState'
  };
}

export function parseListStates(): ParsedCommand {
  return {
    command: 'listStates',
    args: {},
    backendCommand: 'listBrowserStates'
  };
}

export function parseTabs(args: string[]): ParsedCommand {
  const tabAction = args[1];
  const cmdArgs: Record<string, any> = {};

  if (!tabAction || tabAction === 'list') {
    // Default to list action
    cmdArgs.action = 'list';
  } else if (tabAction === 'new') {
    cmdArgs.action = 'new';
    if (args[2]) cmdArgs.url = args[2];
  } else if (tabAction === 'switch') {
    if (!args[2]) {
      throw new Error('tabs switch requires a tab index');
    }
    cmdArgs.action = 'switch';
    cmdArgs.index = parseInt(args[2], 10);
  } else if (tabAction === 'close') {
    cmdArgs.action = 'close';
    // Close current tab if no index provided
    if (args[2]) cmdArgs.index = parseInt(args[2], 10);
  } else {
    throw new Error(`Unknown tabs action: ${tabAction}. Valid actions: list, new, switch, close`);
  }

  return {
    command: 'tabs',
    args: cmdArgs
  };
}

export function parseExec(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('exec requires a command string');
  }
  return {
    command: 'exec',
    args: { commands: args.slice(1).join(' ') }
  };
}

export function parseStatus(args: string[]): ParsedCommand {
  const cmdArgs: Record<string, any> = {};
  // Check for --verbose flag
  if (args.includes('--verbose') || args.includes('-v')) {
    cmdArgs.verbose = true;
  }
  return {
    command: 'status',
    args: cmdArgs
  };
}

export function parseConsole(): ParsedCommand {
  return {
    command: 'console',
    args: {}
  };
}

export function parseClearConsole(): ParsedCommand {
  return {
    command: 'clearConsole',
    args: {}
  };
}

export function parseClose(args: string[]): ParsedCommand {
  // Parse --session-id=<id> flag
  const sessionArg = args.find(arg => arg.startsWith('--session-id='));
  const sessionId = sessionArg ? sessionArg.split('=')[1] : undefined;

  return {
    command: 'close',
    args: sessionId ? { sessionId } : {}
  };
}


// Buffer Management Parsers (Phase 2.4)
export function parseGetConsoleBufferStats(): ParsedCommand {
  return {
    command: 'getConsoleBufferStats',
    args: {}
  };
}

export function parseSetConsoleBufferCapacity(args: string[]): ParsedCommand {
  const capacity = args[1] ? parseInt(args[1], 10) : 100;
  return {
    command: 'setConsoleBufferCapacity',
    args: { capacity }
  };
}

export function parseGetNetworkBufferStats(): ParsedCommand {
  return {
    command: 'getNetworkBufferStats',
    args: {}
  };
}

export function parseSetNetworkBufferCapacity(args: string[]): ParsedCommand {
  const capacity = args[1] ? parseInt(args[1], 10) : 1000;
  return {
    command: 'setNetworkBufferCapacity',
    args: { capacity }
  };
}

export function parseGetEventBufferStats(): ParsedCommand {
  return {
    command: 'getEventBufferStats',
    args: {}
  };
}

export function parseSetEventBufferCapacity(args: string[]): ParsedCommand {
  const capacity = args[1] ? parseInt(args[1], 10) : 100;
  return {
    command: 'setEventBufferCapacity',
    args: { capacity }
  };
}


// Headless Toggle (Phase 2)
export function parseSetHeadless(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('setHeadless requires a value (true/false)');
  }
  const value = args[1].toLowerCase();
  if (value !== 'true' && value !== 'false') {
    throw new Error('setHeadless value must be true or false');
  }
  return {
    command: 'setHeadless',
    args: { headless: value === 'true' }
  };
}


// Video Recording (Phase 3.2)
export function parseStartRecording(args: string[]): ParsedCommand {
  return {
    command: 'startRecording',
    args: { name: args[1] || undefined }
  };
}

export function parseStopRecording(): ParsedCommand {
  return {
    command: 'stopRecording',
    args: {}
  };
}

export function parseGetRecordingStatus(): ParsedCommand {
  return {
    command: 'getRecordingStatus',
    args: {}
  };
}

export function parseListRecordings(): ParsedCommand {
  return {
    command: 'listRecordings',
    args: {}
  };
}
