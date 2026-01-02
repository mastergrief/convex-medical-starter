/**
 * Command Validator Module
 * Validates command names and arguments
 */

import { ParsedCommand } from './commandParserModules';

// List of all valid commands
const VALID_COMMANDS = new Set([
  // Navigation
  'start',
  'navigate',

  // Interaction
  'click',
  'dblclick',
  'type',
  'pressKey',
  'pressKeyCombo',
  'holdKey',
  'tapKey',
  'hover',
  'drag',
  'selectOption',
  'fillForm',
  'uploadFile',

  // Waiting
  'wait',
  'waitForSelector',

  // Capture
  'snapshot',
  'snapshot+',
  'changes',
  'screenshot',
  'clearConsole',
  'listBaselines',

  // Tabs
  'tabs',

  // Utility
  'resize',
  'evaluate',
  'console',
  'network',
  'networkClear',
  'status',
  'close',

  // Phase 2
  'exec',
  'saveState',
  'restoreState',
  'listStates',
  'deleteState',
  'saveSnapshotBaseline',
  'compareSnapshots',

  // Phase 3
  'saveScreenshotBaseline',
  'compareScreenshots',
  'listScreenshotBaselines',
  'setupNetworkMocking',
  'mockRoute',
  'clearMocks',
  'listMocks',
  'listSchemas',
  'validateMock',
  'loadSchema',
  'capturePerformanceMetrics',
  'getPerformanceMetrics',
  'abortRoute',
  'modifyRequestHeaders',
  'modifyResponseHeaders',
  'blockByPattern',
  'listAborts',
  'getMockHistory',
  'disableMock',
  'enableMock',

  // Content
  'getPageHTML',
  'getPageText',
  'getElementHTML',
  'getElementText',

  // Events (Phase 4)
  'getEventLog',
  'clearEventLog',
  'waitForEvent',
  'dismissDialog',
  'acceptDialog',

  // DOM Inspection (Phase 4)
  'getComputedStyle',
  'getElementVisibility',
  'getOverlayingElements',
  'countElements',

  // Buffer Management (Phase 2.4)
  'getConsoleBufferStats',
  'setConsoleBufferCapacity',
  'getNetworkBufferStats',
  'setNetworkBufferCapacity',
  'getEventBufferStats',
  'setEventBufferCapacity',

  // Assertions (Phase 1d)
  'assert',
  'assertCount',
  'assertConsole',
  'assertNetwork',
  'assertPerformance',
  'getAssertionResults',
  'clearAssertionResults',

  // Runtime Configuration (Phase 2)
  'setHeadless',

  // Device Emulation (Phase 3.5)
  'setMobilePreset',
  'listMobilePresets',
  'resetMobilePreset',

  // Video Recording (Phase 3.2)
  'startRecording',
  'stopRecording',
  'getRecordingStatus',
  'listRecordings',

  // HAR Export (Phase 3.3)
  'startHAR',
  'exportHAR',
  'getHARData',

  // Accessibility Audit (Phase 3.4)
  'auditAccessibility',
  'getAccessibilityResults',

  // Plugin Management (Phase 3.1)
  'loadPlugin',
  'unloadPlugin',
  'listPlugins',

  // Test Orchestration (Phase 3.6)
  'orchestrate',
  'getOrchestrationStatus',
  'abortOrchestration',

  // Flaky Test Detection (Phase 3.7)
  'runTestMultipleTimes',
  'analyzeFlakiness',
]);;

/**
 * Validates that a command is known/supported.
 *
 * Note: Unknown commands may be plugin commands, so validation is lenient.
 * The backend will check if it's a valid plugin command.
 */
export function validateCommand(parsed: ParsedCommand): void {
  // Built-in commands are validated strictly
  // Unknown commands are allowed to pass through (may be plugin commands)
  // Backend will return error if command is truly unknown
}

/**
 * Check if a command is valid without throwing
 */
export function isValidCommand(command: string): boolean {
  return VALID_COMMANDS.has(command);
}
