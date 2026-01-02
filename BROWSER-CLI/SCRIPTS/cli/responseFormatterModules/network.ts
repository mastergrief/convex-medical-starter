/**
 * Network formatting functions
 * Commands: network, networkClear, setupNetworkMocking, mockRoute, clearMocks, listMocks
 */

import type { CommandResponse } from './types';

/**
 * Format network requests response
 */
export function formatNetwork(response: CommandResponse): string {
  let output = '\n\n🌐 Network Requests';

  // Show filter info if results were filtered
  if (response.data.filtered !== response.data.total) {
    output += ` (${response.data.filtered} of ${response.data.total})`;
  } else {
    output += ` (${response.data.total})`;
  }

  if (response.data.requests.length === 0) {
    output += '\n  (no requests captured)';
    return output;
  }

  response.data.requests.forEach((req: any) => {
    // Status-based color indicator
    const statusColor =
      req.status >= 200 && req.status < 300
        ? '✅'
        : req.status >= 400
          ? '❌'
          : req.status >= 300
            ? '⚠️'
            : '⏳';

    output += `\n  ${statusColor} [${req.method}] ${req.url}`;

    if (req.status) {
      output += ` => [${req.status}] ${req.statusText || ''}`;
    } else {
      output += ' => (pending)';
    }

    // Show timing if available
    if (req.timing?.duration) {
      output += ` (${req.timing.duration}ms)`;
    }
  });

  return output;
}

/**
 * Format network clear response
 */
export function formatNetworkClear(response: CommandResponse): string {
  return `\n\n🧹 Network requests cleared (${response.data.cleared} requests)`;
}

/**
 * Format setup network mocking response
 */
export function formatSetupNetworkMocking(): string {
  return '\n\n🌐 Network mocking enabled';
}

/**
 * Format mock route response
 */
export function formatMockRoute(response: CommandResponse): string {
  return `\n\n🔧 Route mocked: ${response.data.method} ${response.data.url}`;
}

/**
 * Format clear mocks response
 */
export function formatClearMocks(): string {
  return '\n\n🧹 All network mocks cleared';
}

/**
 * Format list mocks response
 */
export function formatListMocks(response: CommandResponse): string {
  let output = '\n\n🌐 Active network mocks:';
  if (response.data.mocks.length === 0) {
    output += '\n  (no active mocks)';
  } else {
    response.data.mocks.forEach((mock: any) => {
      const enabledStatus = mock.enabled !== false ? 'enabled' : 'disabled';
      output += `\n  - [${mock.method}] ${mock.url} → ${mock.status} (${enabledStatus})`;
    });
  }
  return output;
}

/**
 * Format startHAR response
 */
export function formatStartHAR(response: CommandResponse): string {
  return `\n\n📼 HAR capture started at ${response.data.startTimeISO}`;
}

/**
 * Format exportHAR response
 */
export function formatExportHAR(response: CommandResponse): string {
  const fileSizeKB = (response.data.fileSize / 1024).toFixed(2);
  return `\n\n📁 HAR exported: ${response.data.filepath}\n  Entries: ${response.data.entryCount}\n  Size: ${fileSizeKB} KB`;
}

/**
 * Format getHARData response
 */
export function formatGetHARData(response: CommandResponse): string {
  let output = '\n\n📊 HAR Data Summary';
  output += `\n  Entries: ${response.data.entryCount}`;
  output += `\n  Capturing: ${response.data.isCapturing ? 'Yes' : 'No'}`;
  if (response.data.captureStartTime) {
    output += `\n  Started: ${response.data.captureStartTime}`;
  }
  output += '\n\n  (Use --json flag for full HAR data)';
  return output;
}
