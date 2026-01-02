/**
 * Performance metrics formatting functions
 * Commands: capturePerformanceMetrics, getPerformanceMetrics
 */

import type { CommandResponse } from './types';

/**
 * Format performance metrics response (shared implementation)
 */
export function formatPerformanceMetrics(
  response: CommandResponse,
  showTimestamp: boolean
): string {
  const { metrics } = response.data;
  let output =
    '\n\n⚡ ' +
    (showTimestamp ? 'Latest performance metrics:' : 'Performance metrics captured:');

  if (metrics.navigation) {
    output += '\n\n  Navigation Timing:';
    output += `\n    Load Time: ${metrics.navigation.loadTime.toFixed(2)}ms`;
    output += `\n    DOM Content Loaded: ${metrics.navigation.domContentLoaded.toFixed(2)}ms`;
    output += `\n    Time to First Byte: ${metrics.navigation.timeToFirstByte.toFixed(2)}ms`;
    output += `\n    Total Time: ${metrics.navigation.totalTime.toFixed(2)}ms`;
  }

  if (metrics.lcp) {
    output += '\n\n  Web Vitals:';
    output += `\n    LCP: ${metrics.lcp.toFixed(2)}ms`;
  }

  if (showTimestamp) {
    output += `\n\n  Captured: ${new Date(metrics.timestamp).toLocaleString()}`;
  }

  return output;
}

/**
 * Format capture performance metrics response
 */
export function formatCapturePerformanceMetrics(response: CommandResponse): string {
  return formatPerformanceMetrics(response, false);
}

/**
 * Format get performance metrics response
 */
export function formatGetPerformanceMetrics(response: CommandResponse): string {
  return formatPerformanceMetrics(response, true);
}
