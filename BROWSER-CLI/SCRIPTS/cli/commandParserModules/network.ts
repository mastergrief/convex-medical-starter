/**
 * Network command parsing: network, networkClear, setupNetworkMocking,
 * mockRoute, clearMocks, listMocks, listSchemas, validateMock, loadSchema,
 * capturePerformanceMetrics, getPerformanceMetrics
 */
import { ParsedCommand } from './types';

export function parseNetwork(args: string[]): ParsedCommand {
  const cmdArgs: Record<string, any> = {};

  // Optional filtering arguments
  const filterArg = args.find(arg => arg.startsWith('--filter='));
  const methodArg = args.find(arg => arg.startsWith('--method='));
  const statusArg = args.find(arg => arg.startsWith('--status='));
  const limitArg = args.find(arg => arg.startsWith('--limit='));

  if (filterArg) cmdArgs.filter = filterArg.split('=')[1];
  if (methodArg) cmdArgs.method = methodArg.split('=')[1];
  if (statusArg) cmdArgs.status = parseInt(statusArg.split('=')[1], 10);
  if (limitArg) cmdArgs.limit = parseInt(limitArg.split('=')[1], 10);

  return {
    command: 'network',
    args: cmdArgs
  };
}

export function parseNetworkClear(): ParsedCommand {
  return {
    command: 'networkClear',
    args: {}
  };
}

export function parseSetupNetworkMocking(): ParsedCommand {
  return {
    command: 'setupNetworkMocking',
    args: {}
  };
}

export function parseMockRoute(args: string[]): ParsedCommand {
  if (!args[1] || !args[2] || !args[3]) {
    throw new Error('mockRoute requires url, method, and response (JSON)');
  }

  const cmdArgs: Record<string, any> = {
    url: args[1],
    method: args[2]
  };

  try {
    cmdArgs.response = JSON.parse(args[3]);
  } catch {
    throw new Error('response must be valid JSON');
  }

  cmdArgs.status = args[4] ? parseInt(args[4]) : undefined;

  // Parse --schema flag
  const schemaArg = args.find(arg => arg.startsWith('--schema='));
  if (schemaArg) {
    cmdArgs.schema = schemaArg.split('=')[1];
  }

  // Parse --skip-validation flag
  if (args.includes('--skip-validation')) {
    cmdArgs.skipValidation = true;
  }

  return {
    command: 'mockRoute',
    args: cmdArgs
  };
}

export function parseClearMocks(): ParsedCommand {
  return {
    command: 'clearMocks',
    args: {}
  };
}

export function parseListMocks(): ParsedCommand {
  return {
    command: 'listMocks',
    args: {}
  };
}

export function parseListSchemas(): ParsedCommand {
  return {
    command: 'listSchemas',
    args: {}
  };
}

export function parseValidateMock(args: string[]): ParsedCommand {
  if (!args[1] || !args[2]) {
    throw new Error('validateMock requires schema name and response (JSON)');
  }

  let response: any;
  try {
    response = JSON.parse(args[2]);
  } catch {
    throw new Error('response must be valid JSON');
  }

  return {
    command: 'validateMock',
    args: {
      schema: args[1],
      response
    }
  };
}

export function parseLoadSchema(args: string[]): ParsedCommand {
  if (!args[1] || !args[2]) {
    throw new Error('loadSchema requires schema name and file path');
  }
  return {
    command: 'loadSchema',
    args: {
      name: args[1],
      path: args[2]
    }
  };
}

export function parseCapturePerformanceMetrics(): ParsedCommand {
  return {
    command: 'capturePerformanceMetrics',
    args: {}
  };
}

export function parseGetPerformanceMetrics(): ParsedCommand {
  return {
    command: 'getPerformanceMetrics',
    args: {}
  };
}


export function parseAbortRoute(args: string[]): ParsedCommand {
  if (!args[1]) throw new Error('abortRoute requires a URL pattern');
  return { command: 'abortRoute', args: { urlPattern: args[1], errorCode: args[2] } };
}

export function parseModifyRequestHeaders(args: string[]): ParsedCommand {
  if (!args[1] || !args[2]) throw new Error('modifyRequestHeaders requires pattern and headers JSON');
  return { command: 'modifyRequestHeaders', args: { urlPattern: args[1], headers: JSON.parse(args[2]) } };
}

export function parseModifyResponseHeaders(args: string[]): ParsedCommand {
  if (!args[1] || !args[2]) throw new Error('modifyResponseHeaders requires pattern and headers JSON');
  return { command: 'modifyResponseHeaders', args: { urlPattern: args[1], headers: JSON.parse(args[2]) } };
}

export function parseBlockByPattern(args: string[]): ParsedCommand {
  if (!args[1]) throw new Error('blockByPattern requires pattern(s) - single pattern string or JSON array');
  
  let patterns: string[];
  
  // Support both single pattern string and JSON array
  if (args[1].startsWith('[')) {
    try {
      patterns = JSON.parse(args[1]);
    } catch {
      throw new Error('blockByPattern JSON array must be valid JSON');
    }
  } else {
    // Single pattern string - wrap in array
    patterns = [args[1]];
  }
  
  return { command: 'blockByPattern', args: { patterns, errorCode: args[2] } };
}

export function parseListAborts(): ParsedCommand {
  return { command: 'listAborts', args: {} };
}


export function parseGetMockHistory(): ParsedCommand {
  return { command: 'getMockHistory', args: {} };
}


export function parseDisableMock(args: string[]): ParsedCommand {
  if (args.length < 2) {
    throw new Error('disableMock requires a mock key (e.g., "GET:https://api.example.com/users")');
  }
  return { command: 'disableMock', args: { key: args[1] } };
}

export function parseEnableMock(args: string[]): ParsedCommand {
  if (args.length < 2) {
    throw new Error('enableMock requires a mock key (e.g., "GET:https://api.example.com/users")');
  }
  return { command: 'enableMock', args: { key: args[1] } };
}

// HAR Export commands

export function parseStartHAR(): ParsedCommand {
  return { command: 'startHAR', args: {} };
}

export function parseExportHAR(args: string[]): ParsedCommand {
  const cmdArgs: Record<string, any> = {};

  // Optional filename argument (positional or flag)
  if (args[1] && !args[1].startsWith('--')) {
    cmdArgs.filename = args[1];
  }

  const filenameArg = args.find((arg) => arg.startsWith('--filename='));
  if (filenameArg) {
    cmdArgs.filename = filenameArg.split('=')[1];
  }

  return { command: 'exportHAR', args: cmdArgs };
}

export function parseGetHARData(): ParsedCommand {
  return { command: 'getHARData', args: {} };
}
