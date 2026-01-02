/**
 * Phase 3: Performance Metrics Feature
 *
 * Captures Web Vitals and navigation timing metrics from the page.
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';
import { LCP_CAPTURE_TIMEOUT } from '../core/constants';

/**
 * Performance Metrics Feature
 *
 * Provides commands to capture and retrieve performance metrics including:
 * - Navigation timing (load time, DOM content loaded, TTFB, etc.)
 * - Web Vitals (LCP - Largest Contentful Paint)
 *
 * Commands:
 * - capturePerformanceMetrics: Capture current page performance metrics
 * - getPerformanceMetrics: Retrieve last captured metrics
 */
export class PerformanceMetricsFeature extends BaseFeature {
  public readonly name = 'PerformanceMetrics';

  private performanceMetrics: {
    navigation?: PerformanceNavigationTiming;
    lcp?: number;
    fid?: number;
    cls?: number;
    timestamp?: number;
  } = {};

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['capturePerformanceMetrics', this.captureMetrics.bind(this)],
      ['getPerformanceMetrics', this.getMetrics.bind(this)]
    ]);
  }

  /**
   * Capture performance metrics from the current page
   */
  private async captureMetrics(): Promise<CommandResponse> {
    const metrics = await this.page.evaluate((lcpTimeout) => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      // Capture Web Vitals
      return new Promise<any>((resolve) => {
        const result: any = {
          navigation: {
            loadTime: navigation.loadEventEnd - navigation.loadEventStart,
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            timeToFirstByte: navigation.responseStart - navigation.requestStart,
            domInteractive: navigation.domInteractive,
            domComplete: navigation.domComplete,
            totalTime: navigation.loadEventEnd - navigation.fetchStart
          }
        };

        // Try to capture LCP
        try {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            result.lcp = lastEntry.startTime;
          });
          observer.observe({ entryTypes: ['largest-contentful-paint'] });

          // Give it time to capture LCP (increased timeout for slow pages)
          setTimeout(() => {
            observer.disconnect();
            resolve(result);
          }, lcpTimeout);
        } catch {
          resolve(result);
        }
      });
    }, LCP_CAPTURE_TIMEOUT);

    this.performanceMetrics = {
      ...metrics,
      timestamp: Date.now()
    };

    this.log('Performance metrics captured');
    return { status: 'ok', data: { metrics } };
  }

  /**
   * Get the last captured performance metrics
   */
  private async getMetrics(): Promise<CommandResponse> {
    if (!this.performanceMetrics.timestamp) {
      return {
        status: 'error',
        message: 'No performance metrics captured. Call capturePerformanceMetrics() first.'
      };
    }
    return { status: 'ok', data: { metrics: this.performanceMetrics } };
  }
}
