/**
 * Response Formatter Modules - Facade Export
 *
 * Facade pattern: This file imports all formatting functions and
 * exports the unified ResponseFormatter class.
 */

import type { CommandResponse, SendCommandFn } from './types';
import type { OutputOptions } from '../output-options';
import { ErrorContext } from '../error-context';

// Import base utilities
import { formatWithCode } from './base';

// Import domain-specific formatters
import { formatSnapshot, formatChanges, formatScreenshot, handleSnapshotComparison } from './snapshot';
import { formatClick, formatDblclick, formatType } from './interaction';
import {
  formatNetwork,
  formatNetworkClear,
  formatSetupNetworkMocking,
  formatMockRoute,
  formatClearMocks,
  formatListMocks,
  formatStartHAR,
  formatExportHAR,
  formatGetHARData,
} from './network';
import { formatListStates, formatSaveState, formatRestoreState, formatDeleteState } from './state';
import {
  formatSaveScreenshotBaseline,
  formatCompareScreenshots,
  formatListScreenshotBaselines,
} from './comparison';
import {
  formatStatus,
  formatEvaluate,
  formatConsole,
  formatTabs,
  formatExec,
  formatSetHeadless,
  formatSetMobilePreset,
  formatListMobilePresets,
  formatResetMobilePreset,
  formatStartRecording,
  formatStopRecording,
  formatGetRecordingStatus,
  formatListRecordings,
} from './status';
import {
  formatPerformanceMetrics,
  formatCapturePerformanceMetrics,
  formatGetPerformanceMetrics,
} from './performance';
import {
  formatAssert,
  formatAssertCount,
  formatAssertConsole,
  formatAssertNetwork,
  formatAssertPerformance,
  formatGetAssertionResults,
  formatClearAssertionResults,
} from './assertions';
import {
  formatAuditAccessibility,
  formatGetAccessibilityResults,
} from './a11y';
import {
  formatLoadPlugin,
  formatUnloadPlugin,
  formatListPlugins,
} from './plugins';
import {
  formatRunTestMultipleTimes,
  formatAnalyzeFlakiness,
} from './flaky-detection';
import {
  formatOrchestrate,
  formatGetOrchestrationStatus,
  formatAbortOrchestration,
} from './orchestration';

/**
 * Main response formatting class
 * Composes modular formatting functions into a unified API
 */
// Content extraction formatters
import {
  formatGetPageHTML,
  formatGetPageText,
  formatGetElementHTML,
  formatGetElementText,
} from './content';

// Event handling formatters
import {
  formatGetEventLog,
  formatClearEventLog,
  formatWaitForEvent,
  formatDismissDialog,
  formatAcceptDialog,
} from './events';

// DOM inspection formatters
import {
  formatCountElements,
  formatGetElementVisibility,
  formatGetComputedStyle,
  formatGetOverlayingElements,
} from './dom';

// Buffer management formatters
import {
  formatGetConsoleBufferStats,
  formatSetConsoleBufferCapacity,
  formatGetNetworkBufferStats,
  formatSetNetworkBufferCapacity,
  formatGetEventBufferStats,
  formatSetEventBufferCapacity,
} from './buffer';

export class ResponseFormatter {
  /**
   * Format response for display based on command type
   */
  static async format(
    command: string,
    response: CommandResponse,
    args: string[],
    cmdArgs: Record<string, any>,
    outputOptions?: OutputOptions
  ): Promise<string> {
    // JSON mode - early return with full response
    if (outputOptions?.json) {
      return JSON.stringify(response, null, 2);
    }

    // Raw mode - return data only, no formatting
    if (outputOptions?.raw) {
      if (response.status !== 'ok') {
        return JSON.stringify({ error: response.message });
      }
      return response.data ? JSON.stringify(response.data) : '';
    }

    // Error handling
    if (response.status !== 'ok') {
      const error = new Error(response.message || 'Unknown error');
      return ErrorContext.enhance(error, command, cmdArgs);
    }

    // Quiet mode - suppress success prefix
    let output = outputOptions?.quiet ? '' : '✅ Success';

    if (!response.data) {
      return output;
    }

    // Format based on command type
    if (command === 'snapshot') {
      output += formatSnapshot(response, args, cmdArgs);
    } else if (command === 'changes') {
      output += formatChanges(response);
    } else if (command === 'screenshot') {
      output += await formatScreenshot(response, args);
    } else if (command === 'click' || command === 'clickByRef' || command === 'clickBySemantic') {
      output += formatClick(response);
    } else if (command === 'dblclick' || command === 'dblclickByRef' || command === 'dblclickBySemantic') {
      output += formatDblclick(response);
    } else if (command === 'type' || command === 'typeByRef' || command === 'typeBySemantic') {
      output += formatType(response);
    } else if (command === 'tabs') {
      output += formatTabs(response);
    } else if (command === 'console') {
      output += formatConsole(response);
    } else if (command === 'network') {
      output += formatNetwork(response);
    } else if (command === 'networkClear') {
      output += formatNetworkClear(response);
    } else if (command === 'exec') {
      output += formatExec(response);
    } else if (command === 'listStates') {
      output += formatListStates(response);
    } else if (command === 'saveState') {
      output += formatSaveState(response);
    } else if (command === 'restoreState') {
      output += formatRestoreState(response);
    } else if (command === 'deleteState') {
      output += formatDeleteState(response);
    } else if (command === 'saveScreenshotBaseline') {
      output += formatSaveScreenshotBaseline(response);
    } else if (command === 'compareScreenshots') {
      output += formatCompareScreenshots(response, cmdArgs);
    } else if (command === 'listScreenshotBaselines') {
      output += formatListScreenshotBaselines(response);
    } else if (command === 'setupNetworkMocking') {
      output += formatSetupNetworkMocking();
    } else if (command === 'mockRoute') {
      output += formatMockRoute(response);
    } else if (command === 'clearMocks') {
      output += formatClearMocks();
    } else if (command === 'listMocks') {
      output += formatListMocks(response);
    } else if (command === 'startHAR') {
      output += formatStartHAR(response);
    } else if (command === 'exportHAR') {
      output += formatExportHAR(response);
    } else if (command === 'getHARData') {
      output += formatGetHARData(response);
    } else if (command === 'capturePerformanceMetrics') {
      output += formatCapturePerformanceMetrics(response);
    } else if (command === 'getPerformanceMetrics') {
      output += formatGetPerformanceMetrics(response);
    } else if (command === 'evaluate') {
      output += formatEvaluate(response);
    } else if (command === 'status') {
      output += formatStatus(response, cmdArgs);
    } else if (command === 'setHeadless') {
      output += formatSetHeadless(response);
    } else if (command === 'setMobilePreset') {
      output += formatSetMobilePreset(response);
    } else if (command === 'listMobilePresets') {
      output += formatListMobilePresets(response);
    } else if (command === 'resetMobilePreset') {
      output += formatResetMobilePreset(response);
    } else if (command === 'assert') {
      output += formatAssert(response);
    } else if (command === 'assertCount') {
      output += formatAssertCount(response);
    } else if (command === 'assertConsole') {
      output += formatAssertConsole(response);
    } else if (command === 'assertNetwork') {
      output += formatAssertNetwork(response);
    } else if (command === 'assertPerformance') {
      output += formatAssertPerformance(response);
    } else if (command === 'getAssertionResults') {
      output += formatGetAssertionResults(response);
    } else if (command === 'clearAssertionResults') {
      output += formatClearAssertionResults(response);
    } else if (command === 'startRecording') {
      output += formatStartRecording(response);
    } else if (command === 'stopRecording') {
      output += formatStopRecording(response);
    } else if (command === 'getRecordingStatus') {
      output += formatGetRecordingStatus(response);
    } else if (command === 'listRecordings') {
      output += formatListRecordings(response);
    } else if (command === 'auditAccessibility') {
      output += formatAuditAccessibility(response);
    } else if (command === 'getAccessibilityResults') {
      output += formatGetAccessibilityResults(response);
    } else if (command === 'loadPlugin') {
      output += formatLoadPlugin(response);
    } else if (command === 'unloadPlugin') {
      output += formatUnloadPlugin(response);
    } else if (command === 'listPlugins') {
      output += formatListPlugins(response);
    } else if (command === 'runTestMultipleTimes') {
      output += formatRunTestMultipleTimes(response);
    } else if (command === 'analyzeFlakiness') {
      output += formatAnalyzeFlakiness(response);
    } else if (command === 'orchestrate') {
      output += formatOrchestrate(response);
    } else if (command === 'getOrchestrationStatus') {
      output += formatGetOrchestrationStatus(response);
    } else if (command === 'abortOrchestration') {
      output += formatAbortOrchestration(response);
    // Content extraction commands
    } else if (command === 'getPageHTML') {
      output += formatGetPageHTML(response);
    } else if (command === 'getPageText') {
      output += formatGetPageText(response);
    } else if (command === 'getElementHTML') {
      output += formatGetElementHTML(response);
    } else if (command === 'getElementText') {
      output += formatGetElementText(response);
    // Event handling commands
    } else if (command === 'getEventLog') {
      output += formatGetEventLog(response);
    } else if (command === 'clearEventLog') {
      output += formatClearEventLog(response);
    } else if (command === 'waitForEvent') {
      output += formatWaitForEvent(response);
    } else if (command === 'dismissDialog') {
      output += formatDismissDialog(response);
    } else if (command === 'acceptDialog') {
      output += formatAcceptDialog(response);
    // DOM inspection commands
    } else if (command === 'countElements') {
      output += formatCountElements(response);
    } else if (command === 'getElementVisibility') {
      output += formatGetElementVisibility(response);
    } else if (command === 'getComputedStyle') {
      output += formatGetComputedStyle(response);
    } else if (command === 'getOverlayingElements') {
      output += formatGetOverlayingElements(response);
    // Buffer management commands
    } else if (command === 'getConsoleBufferStats') {
      output += formatGetConsoleBufferStats(response);
    } else if (command === 'setConsoleBufferCapacity') {
      output += formatSetConsoleBufferCapacity(response);
    } else if (command === 'getNetworkBufferStats') {
      output += formatGetNetworkBufferStats(response);
    } else if (command === 'setNetworkBufferCapacity') {
      output += formatSetNetworkBufferCapacity(response);
    } else if (command === 'getEventBufferStats') {
      output += formatGetEventBufferStats(response);
    } else if (command === 'setEventBufferCapacity') {
      output += formatSetEventBufferCapacity(response);
    } else if (
      [
        'navigate',
        'screenshot',
        'click',
        'type',
        'hover',
        'drag',
        'dragByRef',
        'hoverByRef',
        'waitForSelectorByRef',
        'selectOption',
        'fillForm',
        'uploadFile',
        'resize',
        'wait',
        'waitForSelector',
        'pressKey',
      ].includes(command)
    ) {
      output += formatWithCode(response, command);
    } else {
      output += '\n' + JSON.stringify(response.data, null, 2);
    }

    return output;
  }

  /**
   * Handle snapshot baseline/comparison post-processing
   */
  static async handleSnapshotComparison(
    cmdArgs: Record<string, any>,
    snapshot: string,
    sendCommand: SendCommandFn
  ): Promise<void> {
    return handleSnapshotComparison(cmdArgs, snapshot, sendCommand);
  }

  // Expose individual formatters as static methods for direct access
  static formatWithCode = formatWithCode;
  static formatSnapshot = formatSnapshot;
  static formatChanges = formatChanges;
  static formatScreenshot = formatScreenshot;
  static formatClick = formatClick;
  static formatDblclick = formatDblclick;
  static formatType = formatType;
  static formatTabs = formatTabs;
  static formatConsole = formatConsole;
  static formatNetwork = formatNetwork;
  static formatNetworkClear = formatNetworkClear;
  static formatExec = formatExec;
  static formatListStates = formatListStates;
  static formatSaveState = formatSaveState;
  static formatRestoreState = formatRestoreState;
  static formatDeleteState = formatDeleteState;
  static formatSaveScreenshotBaseline = formatSaveScreenshotBaseline;
  static formatCompareScreenshots = formatCompareScreenshots;
  static formatListScreenshotBaselines = formatListScreenshotBaselines;
  static formatSetupNetworkMocking = formatSetupNetworkMocking;
  static formatMockRoute = formatMockRoute;
  static formatClearMocks = formatClearMocks;
  static formatListMocks = formatListMocks;
  // HAR Export formatters (Phase 3.3)
  static formatStartHAR = formatStartHAR;
  static formatExportHAR = formatExportHAR;
  static formatGetHARData = formatGetHARData;
  static formatCapturePerformanceMetrics = formatCapturePerformanceMetrics;
  static formatGetPerformanceMetrics = formatGetPerformanceMetrics;
  static formatPerformanceMetrics = formatPerformanceMetrics;
  static formatEvaluate = formatEvaluate;
  static formatStatus = formatStatus;
  // Device emulation formatters (Phase 3.5)
  static formatSetMobilePreset = formatSetMobilePreset;
  static formatListMobilePresets = formatListMobilePresets;
  static formatResetMobilePreset = formatResetMobilePreset;
  // Assertion formatters (Phase 1d)
  static formatAssert = formatAssert;
  static formatAssertCount = formatAssertCount;
  static formatAssertConsole = formatAssertConsole;
  static formatAssertNetwork = formatAssertNetwork;
  static formatAssertPerformance = formatAssertPerformance;
  static formatGetAssertionResults = formatGetAssertionResults;
  static formatClearAssertionResults = formatClearAssertionResults;
  // Video Recording formatters (Phase 3.2)
  static formatStartRecording = formatStartRecording;
  static formatStopRecording = formatStopRecording;
  static formatGetRecordingStatus = formatGetRecordingStatus;
  static formatListRecordings = formatListRecordings;
  // Accessibility Audit formatters (Phase 3.4)
  static formatAuditAccessibility = formatAuditAccessibility;
  static formatGetAccessibilityResults = formatGetAccessibilityResults;
  // Plugin Management formatters (Phase 3.1)
  static formatLoadPlugin = formatLoadPlugin;
  static formatUnloadPlugin = formatUnloadPlugin;
  static formatListPlugins = formatListPlugins;
  // Flaky Test Detection formatters (Phase 3.7)
  static formatRunTestMultipleTimes = formatRunTestMultipleTimes;
  static formatAnalyzeFlakiness = formatAnalyzeFlakiness;
  // Test Orchestration formatters (Phase 3.6)
  static formatOrchestrate = formatOrchestrate;
  static formatGetOrchestrationStatus = formatGetOrchestrationStatus;
  static formatAbortOrchestration = formatAbortOrchestration;
  // Content extraction formatters
  static formatGetPageHTML = formatGetPageHTML;
  static formatGetPageText = formatGetPageText;
  static formatGetElementHTML = formatGetElementHTML;
  static formatGetElementText = formatGetElementText;
  // Event handling formatters
  static formatGetEventLog = formatGetEventLog;
  static formatClearEventLog = formatClearEventLog;
  static formatWaitForEvent = formatWaitForEvent;
  static formatDismissDialog = formatDismissDialog;
  static formatAcceptDialog = formatAcceptDialog;
  // DOM inspection formatters
  static formatCountElements = formatCountElements;
  static formatGetElementVisibility = formatGetElementVisibility;
  static formatGetComputedStyle = formatGetComputedStyle;
  static formatGetOverlayingElements = formatGetOverlayingElements;
  // Buffer management formatters
  static formatGetConsoleBufferStats = formatGetConsoleBufferStats;
  static formatSetConsoleBufferCapacity = formatSetConsoleBufferCapacity;
  static formatGetNetworkBufferStats = formatGetNetworkBufferStats;
  static formatSetNetworkBufferCapacity = formatSetNetworkBufferCapacity;
  static formatGetEventBufferStats = formatGetEventBufferStats;
  static formatSetEventBufferCapacity = formatSetEventBufferCapacity;
}

// Re-export types
export type { CommandResponse, SendCommandFn } from './types';
