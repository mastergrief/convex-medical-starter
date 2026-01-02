/**
 * Command Parser Facade
 * Modularized from command-parser.ts (559 lines) into focused modules
 */

// Re-export types
export type { ParsedCommand } from './types';

// Import parsing functions from modules
import {
  parseStart,
  parseNavigate,
  parseWait,
  parseWaitForSelector,
  parseResize,
  parseSetMobilePreset,
  parseListMobilePresets,
  parseResetMobilePreset,
} from './navigation';

import {
  parseClick,
  parseHover,
  parseDblclick,
  parseType,
  parsePressKey,
  parsePressKeyCombo,
  parseHoldKey,
  parseTapKey,
  parseDrag,
  parseSelectOption,
  parseFillForm,
  parseUploadFile,
} from './interaction';

import {
  parseSnapshotPlus,
  parseSnapshot,
  parseScreenshot,
  parseChanges,
  parseListBaselines,
  parseSaveSnapshotBaseline,
  parseCompareSnapshots,
  parseSaveScreenshotBaseline,
  parseCompareScreenshots,
  parseListScreenshotBaselines,
  parseEvaluate,
} from './snapshot';

import {
  parseSaveState,
  parseRestoreState,
  parseDeleteState,
  parseListStates,
  parseTabs,
  parseExec,
  parseStatus,
  parseConsole,
  parseClearConsole,
  parseClose,
  parseGetConsoleBufferStats,
  parseSetConsoleBufferCapacity,
  parseGetNetworkBufferStats,
  parseSetNetworkBufferCapacity,
  parseGetEventBufferStats,
  parseSetEventBufferCapacity,
  parseSetHeadless,
  parseStartRecording,
  parseStopRecording,
  parseGetRecordingStatus,
  parseListRecordings,
} from './state';

import {
  parseNetwork,
  parseNetworkClear,
  parseSetupNetworkMocking,
  parseMockRoute,
  parseClearMocks,
  parseListMocks,
  parseListSchemas,
  parseValidateMock,
  parseLoadSchema,
  parseCapturePerformanceMetrics,
  parseGetPerformanceMetrics,
  parseAbortRoute,
  parseModifyRequestHeaders,
  parseModifyResponseHeaders,
  parseBlockByPattern,
  parseListAborts,
  parseGetMockHistory,
  parseDisableMock,
  parseEnableMock,
  parseStartHAR,
  parseExportHAR,
  parseGetHARData,
} from './network';

import {
  parseGetPageHTML,
  parseGetPageText,
  parseGetElementHTML,
  parseGetElementText,
} from './content';

import {
  parseGetEventLog,
  parseClearEventLog,
  parseWaitForEvent,
  parseDismissDialog,
  parseAcceptDialog,
} from './events';

import {
  parseGetComputedStyle,
  parseGetElementVisibility,
  parseGetOverlayingElements,
  parseCountElements,
} from './dom';

import {
  parseAssert,
  parseAssertCount,
  parseAssertConsole,
  parseAssertNetwork,
  parseAssertPerformance,
  parseGetAssertionResults,
  parseClearAssertionResults,
} from './assertions';

import {
  parseAuditAccessibility,
  parseGetAccessibilityResults,
} from './a11y';

import {
  parseLoadPlugin,
  parseUnloadPlugin,
  parseListPlugins,
} from './plugins';

import {
  parseRunTestMultipleTimes,
  parseAnalyzeFlakiness,
} from './flaky-detection';

import {
  parseOrchestrate,
  parseGetOrchestrationStatus,
  parseAbortOrchestration,
} from './orchestration';

import type { ParsedCommand } from './types';

/**
 * Parse CLI arguments into a structured command object
 */
export function parseCommand(args: string[]): ParsedCommand {
  if (args.length === 0) {
    throw new Error('NO_COMMAND');
  }

  const command = args[0];

  switch (command) {
    // Navigation commands
    case 'start':
      return parseStart(args);
    case 'navigate':
      return parseNavigate(args);
    case 'wait':
      return parseWait(args);
    case 'waitForSelector':
      return parseWaitForSelector(args);
    case 'resize':
      return parseResize(args);

    // Interaction commands
    case 'click':
      return parseClick(args);
    case 'hover':
      return parseHover(args);
    case 'dblclick':
      return parseDblclick(args);
    case 'type':
      return parseType(args);
    case 'pressKey':
      return parsePressKey(args);
    case 'pressKeyCombo':
      return parsePressKeyCombo(args);
    case 'holdKey':
      return parseHoldKey(args);
    case 'tapKey':
      return parseTapKey(args);
    case 'drag':
      return parseDrag(args);
    case 'selectOption':
      return parseSelectOption(args);
    case 'fillForm':
      return parseFillForm(args);
    case 'uploadFile':
      return parseUploadFile(args);

    // Snapshot commands
    case 'snapshot+':
      return parseSnapshotPlus(args);
    case 'snapshot':
      return parseSnapshot(args);
    case 'screenshot':
      return parseScreenshot(args);
    case 'changes':
      return parseChanges();
    case 'listBaselines':
      return parseListBaselines();
    case 'saveSnapshotBaseline':
      return parseSaveSnapshotBaseline(args);
    case 'compareSnapshots':
      return parseCompareSnapshots(args);
    case 'saveScreenshotBaseline':
      return parseSaveScreenshotBaseline(args);
    case 'compareScreenshots':
      return parseCompareScreenshots(args);
    case 'listScreenshotBaselines':
      return parseListScreenshotBaselines();
    case 'evaluate':
      return parseEvaluate(args);

    // State commands
    case 'saveState':
      return parseSaveState(args);
    case 'restoreState':
      return parseRestoreState(args);
    case 'deleteState':
      return parseDeleteState(args);
    case 'listStates':
      return parseListStates();
    case 'tabs':
      return parseTabs(args);
    case 'exec':
      return parseExec(args);
    case 'status':
      return parseStatus(args);
    case 'console':
      return parseConsole();
    case 'clearConsole':
      return parseClearConsole();
    case 'close':
      return parseClose(args);

    // Network commands
    case 'network':
      return parseNetwork(args);
    case 'networkClear':
      return parseNetworkClear();
    case 'setupNetworkMocking':
      return parseSetupNetworkMocking();
    case 'mockRoute':
      return parseMockRoute(args);
    case 'clearMocks':
      return parseClearMocks();
    case 'listMocks':
      return parseListMocks();
    case 'listSchemas':
      return parseListSchemas();
    case 'validateMock':
      return parseValidateMock(args);
    case 'loadSchema':
      return parseLoadSchema(args);
    case 'capturePerformanceMetrics':
      return parseCapturePerformanceMetrics();
    case 'getPerformanceMetrics':
      return parseGetPerformanceMetrics();
    case 'abortRoute':
      return parseAbortRoute(args);
    case 'modifyRequestHeaders':
      return parseModifyRequestHeaders(args);
    case 'modifyResponseHeaders':
      return parseModifyResponseHeaders(args);
    case 'blockByPattern':
      return parseBlockByPattern(args);
    case 'listAborts':
      return parseListAborts();
    case 'getMockHistory':
      return parseGetMockHistory();
    case 'disableMock':
      return parseDisableMock(args);
    case 'enableMock':
      return parseEnableMock(args);

    // HAR Export commands
    case 'startHAR':
      return parseStartHAR();
    case 'exportHAR':
      return parseExportHAR(args);
    case 'getHARData':
      return parseGetHARData();

    // Content commands
    case 'getPageHTML':
      return parseGetPageHTML();
    case 'getPageText':
      return parseGetPageText();
    case 'getElementHTML':
      return parseGetElementHTML(args);
    case 'getElementText':
      return parseGetElementText(args);

    // Event commands
    case 'getEventLog':
      return parseGetEventLog(args);
    case 'clearEventLog':
      return parseClearEventLog();
    case 'waitForEvent':
      return parseWaitForEvent(args);
    case 'dismissDialog':
      return parseDismissDialog();
    case 'acceptDialog':
      return parseAcceptDialog(args);

    // DOM Inspection commands
    case 'getComputedStyle':
      return parseGetComputedStyle(args);
    case 'getElementVisibility':
      return parseGetElementVisibility(args);
    case 'getOverlayingElements':
      return parseGetOverlayingElements(args);
    case 'countElements':
      return parseCountElements(args);

    // Buffer Management commands (Phase 2.4)
    case 'getConsoleBufferStats':
      return parseGetConsoleBufferStats();
    case 'setConsoleBufferCapacity':
      return parseSetConsoleBufferCapacity(args);
    case 'getNetworkBufferStats':
      return parseGetNetworkBufferStats();
    case 'setNetworkBufferCapacity':
      return parseSetNetworkBufferCapacity(args);
    case 'getEventBufferStats':
      return parseGetEventBufferStats();
    case 'setEventBufferCapacity':
      return parseSetEventBufferCapacity(args);

    // Assertion commands (Phase 1d)
    case 'assert':
      return parseAssert(args);
    case 'assertCount':
      return parseAssertCount(args);
    case 'assertConsole':
      return parseAssertConsole(args);
    case 'assertNetwork':
      return parseAssertNetwork(args);
    case 'assertPerformance':
      return parseAssertPerformance(args);
    case 'getAssertionResults':
      return parseGetAssertionResults();
    case 'clearAssertionResults':
      return parseClearAssertionResults();

    // Runtime configuration (Phase 2)
    case 'setHeadless':
      return parseSetHeadless(args);

    // Device Emulation (Phase 3.5)
    case 'setMobilePreset':
      return parseSetMobilePreset(args);
    case 'listMobilePresets':
      return parseListMobilePresets();
    case 'resetMobilePreset':
      return parseResetMobilePreset();

    // Video Recording (Phase 3.2)
    case 'startRecording':
      return parseStartRecording(args);
    case 'stopRecording':
      return parseStopRecording();
    case 'getRecordingStatus':
      return parseGetRecordingStatus();
    case 'listRecordings':
      return parseListRecordings();

    // Accessibility Audit (Phase 3.4)
    case 'auditAccessibility':
      return parseAuditAccessibility(args);
    case 'getAccessibilityResults':
      return parseGetAccessibilityResults(args);

    // Plugin Management (Phase 3.1)
    case 'loadPlugin':
      return parseLoadPlugin(args);
    case 'unloadPlugin':
      return parseUnloadPlugin(args);
    case 'listPlugins':
      return parseListPlugins();

    // Flaky Test Detection (Phase 3.7)
    case 'runTestMultipleTimes':
      return parseRunTestMultipleTimes(args);
    case 'analyzeFlakiness':
      return parseAnalyzeFlakiness(args);

    // Test Orchestration (Phase 3.6)
    case 'orchestrate':
      return parseOrchestrate(args);
    case 'getOrchestrationStatus':
      return parseGetOrchestrationStatus(args);
    case 'abortOrchestration':
      return parseAbortOrchestration();

    default:
      // Unknown commands may be plugin commands - pass through to backend
      // The backend will check if it's a plugin command via PluginsFeature
      return {
        command: command,
        args: {
          pluginCommandName: command,  // Original command name for routing
          rawArgs: args.slice(1),       // Rest of arguments for the plugin handler
        },
        backendCommand: 'pluginCommand',
      };
  }
}
