/**
 * Snapshot command parsing: snapshot, snapshot+, screenshot, changes,
 * saveSnapshotBaseline, compareSnapshots, listBaselines,
 * saveScreenshotBaseline, compareScreenshots, listScreenshotBaselines, evaluate
 */
import { ParsedCommand } from './types';

export function parseSnapshotPlus(args: string[]): ParsedCommand {
  const cmdArgs: Record<string, any> = { full: true };
  if (args[1] && !args[1].startsWith('--')) {
    cmdArgs.selector = args[1];
  }
  return {
    command: 'snapshot',
    args: cmdArgs
  };
}

export function parseSnapshot(args: string[]): ParsedCommand {
  const cmdArgs: Record<string, any> = {};

  // Handle --baseline and --compare flags
  const baselineArg = args.find(arg => arg.startsWith('--baseline='));
  const compareArg = args.find(arg => arg.startsWith('--compare='));

  if (baselineArg) {
    cmdArgs.saveBaseline = baselineArg.split('=')[1];
  }
  if (compareArg) {
    cmdArgs.compareName = compareArg.split('=')[1];
  }

  // Handle --quiet flag
  if (args.includes('--quiet')) {
    cmdArgs.quiet = true;
  }

  // Enhanced is DEFAULT (maximum context: state + forms + tree)
  // --minimal flag opts out to basic refs-only mode
  if (args.includes('--minimal')) {
    cmdArgs.minimal = true;
  } else {
    cmdArgs.full = true;
  }

  // --forms flag for forms-only mode
  if (args.includes('--forms')) {
    cmdArgs.forms = true;
  }

  // --stable-refs flag for ref stability tracking
  if (args.includes('--stable-refs')) {
    cmdArgs.stableRefs = true;
  }

  // --incremental flag for showing only changes since last snapshot
  if (args.includes('--incremental')) {
    cmdArgs.incremental = true;
  }

  // Check for custom filename with --file=<name>
  const fileArg = args.find(arg => arg.startsWith('--file='));
  if (fileArg) {
    cmdArgs.filename = fileArg.split('=')[1];
  } else if (args.includes('--file')) {
    // Default file save without custom name
    cmdArgs.filename = `snapshot-${Date.now()}.txt`;
  }

  // Filter out all flags when looking for selector
  const snapshotArgs = args.filter(arg =>
    arg !== '--stdout' &&
    arg !== '--file' &&
    arg !== '--quiet' &&
    arg !== '--full' &&
    arg !== '--forms' &&
    arg !== '--minimal' &&
    arg !== '--stable-refs' &&
    arg !== '--incremental' &&
    !arg.startsWith('--file=') &&
    !arg.startsWith('--baseline=') &&
    !arg.startsWith('--compare=')
  );
  if (snapshotArgs[1]) cmdArgs.selector = snapshotArgs[1];

  return {
    command: 'snapshot',
    args: cmdArgs
  };
}

export function parseScreenshot(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('screenshot requires a file path');
  }
  return {
    command: 'screenshot',
    args: { path: args[1] }
  };
}

export function parseChanges(): ParsedCommand {
  return {
    command: 'changes',
    args: {}
  };
}

export function parseListBaselines(): ParsedCommand {
  return {
    command: 'listBaselines',
    args: {}
  };
}

export function parseSaveSnapshotBaseline(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('saveSnapshotBaseline requires a name');
  }
  // Redirect to snapshot with --baseline flag (captures and saves in one step)
  return {
    command: 'snapshot',
    args: { saveBaseline: args[1], full: true }
  };
}

export function parseCompareSnapshots(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('compareSnapshots requires a baseline name');
  }
  // Redirect to snapshot with --compare flag (captures and compares in one step)
  return {
    command: 'snapshot',
    args: { compareName: args[1], full: true }
  };
}

export function parseSaveScreenshotBaseline(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('saveScreenshotBaseline requires a name');
  }
  return {
    command: 'saveScreenshotBaseline',
    args: {
      name: args[1],
      path: args[2] // Optional path
    }
  };
}

export function parseCompareScreenshots(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('compareScreenshots requires a name');
  }

  const cmdArgs: Record<string, any> = {
    name: args[1],
    path: args[2] // Optional path
  };

  // Parse --threshold flag
  const thresholdArg = args.find(arg => arg.startsWith('--threshold='));
  if (thresholdArg) {
    cmdArgs.threshold = parseFloat(thresholdArg.split('=')[1]);
  }

  return {
    command: 'compareScreenshots',
    args: cmdArgs
  };
}

export function parseListScreenshotBaselines(): ParsedCommand {
  return {
    command: 'listScreenshotBaselines',
    args: {}
  };
}

export function parseEvaluate(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('evaluate requires JavaScript code');
  }

  const cmdArgs: Record<string, any> = {};

  // Extract flags: --ref=e123, --element="Button", --unsafe
  const refArg = args.find(arg => arg.startsWith('--ref='));
  const elementArg = args.find(arg => arg.startsWith('--element='));
  const unsafeArg = args.includes('--unsafe');

  if (refArg) {
    cmdArgs.ref = refArg.split('=')[1];
  }
  if (elementArg) {
    // Remove quotes if present
    cmdArgs.element = elementArg.split('=')[1].replace(/^["']|["']$/g, '');
  }
  if (unsafeArg) {
    cmdArgs.unsafe = true;
  }

  // Filter out flags and get code
  const codeArgs = args.slice(1).filter(arg =>
    !arg.startsWith('--ref=') &&
    !arg.startsWith('--element=') &&
    arg !== '--unsafe'
  );
  cmdArgs.code = codeArgs.join(' ');

  return {
    command: 'evaluate',
    args: cmdArgs
  };
}
