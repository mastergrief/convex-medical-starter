/**
 * Tab completion for Browser-CLI REPL
 */

// All supported browser commands for completion
const BROWSER_COMMANDS = [
  // Navigation
  'navigate', 'wait', 'waitForSelector', 'resize',
  // Interaction
  'click', 'dblclick', 'hover', 'type', 'pressKey', 'pressKeyCombo',
  'holdKey', 'tapKey', 'drag', 'selectOption', 'fillForm', 'uploadFile',
  // Snapshot
  'snapshot', 'snapshot+', 'screenshot', 'changes',
  'saveScreenshotBaseline', 'compareScreenshots', 'listScreenshotBaselines',
  // State
  'saveState', 'restoreState', 'deleteState', 'listStates',
  'tabs', 'exec', 'status', 'console', 'clearConsole', 'close',
  // Network
  'network', 'networkClear', 'setupNetworkMocking', 'mockRoute',
  'clearMocks', 'listMocks', 'listSchemas', 'validateMock', 'loadSchema',
  'capturePerformanceMetrics', 'getPerformanceMetrics',
  'abortRoute', 'modifyRequestHeaders', 'modifyResponseHeaders',
  'blockByPattern', 'listAborts', 'getMockHistory', 'disableMock', 'enableMock',
  // Content
  'getPageHTML', 'getPageText', 'getElementHTML', 'getElementText',
  // Events
  'getEventLog', 'clearEventLog', 'waitForEvent', 'dismissDialog', 'acceptDialog',
  // DOM Inspection
  'getComputedStyle', 'getElementVisibility', 'getOverlayingElements', 'countElements',
  // Buffer Management
  'getConsoleBufferStats', 'setConsoleBufferCapacity',
  'getNetworkBufferStats', 'setNetworkBufferCapacity',
  'getEventBufferStats', 'setEventBufferCapacity',
  // Assertions
  'assert', 'assertCount', 'assertConsole', 'assertNetwork', 'assertPerformance',
  'getAssertionResults', 'clearAssertionResults',
  // Runtime
  'setHeadless', 'evaluate', 'acceptDialog', 'dismissDialog',
];

// Meta-commands for REPL control
const META_COMMANDS = ['.exit', '.quit', '.clear', '.help', '.refs', '.history'];

export type CompleterFunction = (line: string) => [string[], string];

/**
 * Creates a completer function for readline with dynamic ref support
 * @param getLastRefs Function that returns the last captured element refs
 */
export function createCompleter(getLastRefs: () => string[]): CompleterFunction {
  return function completer(line: string): [string[], string] {
    const refs = getLastRefs();
    const allCompletions = [...BROWSER_COMMANDS, ...refs, ...META_COMMANDS];

    // Find completions that start with the current input
    const hits = allCompletions.filter((c) => c.startsWith(line));

    // Return matches, or all completions if no matches
    return [hits.length ? hits : allCompletions, line];
  };
}

/**
 * Get all available commands for help display
 */
export function getAllCommands(): string[] {
  return [...BROWSER_COMMANDS];
}

/**
 * Get all meta-commands for help display
 */
export function getMetaCommands(): string[] {
  return [...META_COMMANDS];
}
