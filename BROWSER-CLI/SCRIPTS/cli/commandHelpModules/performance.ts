/**
 * Performance command help texts
 * Commands: capturePerformanceMetrics, getPerformanceMetrics
 */

import type { CommandHelpRecord } from './types';

export const performanceHelp: CommandHelpRecord = {
  capturePerformanceMetrics: `Usage: browser-cmd capturePerformanceMetrics

Capture Web Vitals and navigation timing metrics

Metrics Captured:
  - Load Time
  - DOM Content Loaded
  - Time to First Byte (TTFB)
  - Largest Contentful Paint (LCP)

Examples:
  browser-cmd capturePerformanceMetrics`,

  getPerformanceMetrics: `Usage: browser-cmd getPerformanceMetrics

Get latest captured performance metrics

Examples:
  browser-cmd getPerformanceMetrics`,
};
