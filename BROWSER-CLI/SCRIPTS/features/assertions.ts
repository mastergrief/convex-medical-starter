/**
 * AssertionsFeature - Phase 1d Browser-CLI Improvement
 *
 * Provides assertion commands for E2E testing with built-in result tracking.
 * Supports element visibility/enabled state, count comparisons, console/network/performance assertions.
 */

import { Page, Locator } from 'playwright';
import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse, ConsoleMessage } from '../core/types';
import { ConsoleCaptureFeature } from './console-capture';
import { NetworkCaptureFeature, NetworkRequest } from './network-capture';
import { PerformanceMetricsFeature } from './performance-metrics';
import { SnapshotFeature } from './snapshotModules/SnapshotFeature';

export interface AssertionResult {
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
  message?: string;
  selector?: string;
  timestamp: number;
  duration: number;
}

interface AssertArgs {
  selector: string;
  visible?: boolean;
  hidden?: boolean;
  enabled?: boolean;
  disabled?: boolean;
  text?: string;
  value?: string;
  checked?: boolean;
  timeout?: number;
}

interface AssertCountArgs {
  selector: string;
  equals?: number;
  gt?: number;
  lt?: number;
  timeout?: number;
}

interface AssertConsoleArgs {
  noErrors?: boolean;
  noWarnings?: boolean;
}

interface AssertNetworkArgs {
  pattern: string;
  status?: number;
  method?: string;
}

interface AssertPerformanceArgs {
  lcp?: number;
  cls?: number;
  ttfb?: number;
}

export class AssertionsFeature extends BaseFeature {
  public readonly name = 'Assertions';
  private results: AssertionResult[] = [];

  // Feature references (set via setters for dependency injection)
  private consoleCaptureFeature: ConsoleCaptureFeature | null = null;
  private networkCaptureFeature: NetworkCaptureFeature | null = null;
  private performanceMetricsFeature: PerformanceMetricsFeature | null = null;
  private snapshotFeature: SnapshotFeature | null = null;

  /**
   * Set console capture feature for assertConsole command
   */
  setConsoleCaptureFeature(feature: ConsoleCaptureFeature): void {
    this.consoleCaptureFeature = feature;
  }

  /**
   * Set network capture feature for assertNetwork command
   */
  setNetworkCaptureFeature(feature: NetworkCaptureFeature): void {
    this.networkCaptureFeature = feature;
  }

  /**
   * Set performance metrics feature for assertPerformance command
   */
  setPerformanceMetricsFeature(feature: PerformanceMetricsFeature): void {
    this.performanceMetricsFeature = feature;
  }

  /**
   * Set snapshot feature for ref resolution in assertions
   */
  setSnapshotFeature(feature: SnapshotFeature): void {
    this.snapshotFeature = feature;
  }

  /**
   * Get command handlers for assertion operations
   */
  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['assert', this.handleAssert.bind(this)],
      ['assertCount', this.handleAssertCount.bind(this)],
      ['assertConsole', this.handleAssertConsole.bind(this)],
      ['assertNetwork', this.handleAssertNetwork.bind(this)],
      ['assertPerformance', this.handleAssertPerformance.bind(this)],
      ['getAssertionResults', this.handleGetResults.bind(this)],
      ['clearAssertionResults', this.handleClearResults.bind(this)],
    ]);
  }

  /**
   * Assert element state: --visible|--hidden|--enabled|--disabled|--text="X"
   */
  private async handleAssert(args: AssertArgs): Promise<CommandResponse> {
    const startTime = Date.now();
    const { selector, visible, hidden, enabled, disabled, text, value, checked, timeout = 5000 } = args;

    if (!selector) {
      return {
        status: 'error',
        message: 'Selector is required for assert command',
      };
    }

    try {
      const locator = this.resolveLocator(selector);

      // Determine which assertion to perform
      if (visible) {
        const isVisible = await locator.isVisible({ timeout });
        return this.recordResult({
          name: 'assert:visible',
          passed: isVisible,
          expected: 'visible',
          actual: isVisible ? 'visible' : 'hidden',
          selector,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        });
      }

      if (hidden) {
        const isVisible = await locator.isVisible({ timeout });
        return this.recordResult({
          name: 'assert:hidden',
          passed: !isVisible,
          expected: 'hidden',
          actual: isVisible ? 'visible' : 'hidden',
          selector,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        });
      }

      if (enabled) {
        const isEnabled = await locator.isEnabled({ timeout });
        return this.recordResult({
          name: 'assert:enabled',
          passed: isEnabled,
          expected: 'enabled',
          actual: isEnabled ? 'enabled' : 'disabled',
          selector,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        });
      }

      if (disabled) {
        const isEnabled = await locator.isEnabled({ timeout });
        return this.recordResult({
          name: 'assert:disabled',
          passed: !isEnabled,
          expected: 'disabled',
          actual: isEnabled ? 'enabled' : 'disabled',
          selector,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        });
      }

      if (text !== undefined) {
        const actualText = (await locator.textContent({ timeout })) || '';
        const passed = actualText.includes(text);
        return this.recordResult({
          name: 'assert:text',
          passed,
          expected: `contains "${text}"`,
          actual: `"${actualText.substring(0, 100)}${actualText.length > 100 ? '...' : ''}"`,
          selector,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        });
      }

      if (value !== undefined) {
        const actualValue = (await locator.inputValue({ timeout })) || '';
        const passed = actualValue === value;
        return this.recordResult({
          name: 'assert:value',
          passed,
          expected: `"${value}"`,
          actual: `"${actualValue}"`,
          selector,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        });
      }

      if (checked) {
        const isChecked = await locator.isChecked({ timeout });
        return this.recordResult({
          name: 'assert:checked',
          passed: isChecked,
          expected: 'checked',
          actual: isChecked ? 'checked' : 'unchecked',
          selector,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        });
      }

      // Default: assert element exists (is visible)
      const isVisible = await locator.isVisible({ timeout });
      return this.recordResult({
        name: 'assert:exists',
        passed: isVisible,
        expected: 'exists',
        actual: isVisible ? 'exists' : 'not found',
        selector,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.recordResult({
        name: 'assert:error',
        passed: false,
        expected: 'element found',
        actual: `error: ${errorMessage}`,
        selector,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: errorMessage,
      });
    }
  }

  /**
   * Assert element count: --equals=N|--gt=N|--lt=N
   */
  private async handleAssertCount(args: AssertCountArgs): Promise<CommandResponse> {
    const startTime = Date.now();
    const { selector, equals, gt, lt } = args;

    if (!selector) {
      return {
        status: 'error',
        message: 'Selector is required for assertCount command',
      };
    }

    try {
      const locator = this.resolveLocator(selector);
      const count = await locator.count();

      if (equals !== undefined) {
        const passed = count === equals;
        return this.recordResult({
          name: 'assertCount:equals',
          passed,
          expected: `count === ${equals}`,
          actual: `count = ${count}`,
          selector,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        });
      }

      if (gt !== undefined) {
        const passed = count > gt;
        return this.recordResult({
          name: 'assertCount:gt',
          passed,
          expected: `count > ${gt}`,
          actual: `count = ${count}`,
          selector,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        });
      }

      if (lt !== undefined) {
        const passed = count < lt;
        return this.recordResult({
          name: 'assertCount:lt',
          passed,
          expected: `count < ${lt}`,
          actual: `count = ${count}`,
          selector,
          timestamp: Date.now(),
          duration: Date.now() - startTime,
        });
      }

      // Default: just return the count
      return this.recordResult({
        name: 'assertCount',
        passed: true,
        expected: 'count query',
        actual: `count = ${count}`,
        selector,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.recordResult({
        name: 'assertCount:error',
        passed: false,
        expected: 'count query',
        actual: `error: ${errorMessage}`,
        selector,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: errorMessage,
      });
    }
  }

  /**
   * Assert console state: --no-errors|--no-warnings
   */
  private async handleAssertConsole(args: AssertConsoleArgs): Promise<CommandResponse> {
    const startTime = Date.now();
    const { noErrors, noWarnings } = args;

    if (!this.consoleCaptureFeature) {
      return {
        status: 'error',
        message: 'Console capture feature not available',
      };
    }

    const messages = this.consoleCaptureFeature.getAllMessages();

    if (noErrors) {
      const errors = messages.filter((m: ConsoleMessage) => m.type === 'error');
      const passed = errors.length === 0;
      return this.recordResult({
        name: 'assertConsole:noErrors',
        passed,
        expected: '0 errors',
        actual: `${errors.length} errors`,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: passed ? undefined : errors.map((e: ConsoleMessage) => e.text).join('\n'),
      });
    }

    if (noWarnings) {
      const warnings = messages.filter((m: ConsoleMessage) => m.type === 'warning');
      const passed = warnings.length === 0;
      return this.recordResult({
        name: 'assertConsole:noWarnings',
        passed,
        expected: '0 warnings',
        actual: `${warnings.length} warnings`,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        message: passed ? undefined : warnings.map((w: ConsoleMessage) => w.text).join('\n'),
      });
    }

    // Default: check for no errors or warnings
    const errors = messages.filter((m: ConsoleMessage) => m.type === 'error');
    const warnings = messages.filter((m: ConsoleMessage) => m.type === 'warning');
    const passed = errors.length === 0 && warnings.length === 0;
    return this.recordResult({
      name: 'assertConsole:clean',
      passed,
      expected: '0 errors, 0 warnings',
      actual: `${errors.length} errors, ${warnings.length} warnings`,
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    });
  }

  /**
   * Assert network request: <pattern> --status=200|--method=POST
   */
  private async handleAssertNetwork(args: AssertNetworkArgs): Promise<CommandResponse> {
    const startTime = Date.now();
    const { pattern, status, method } = args;

    if (!pattern) {
      return {
        status: 'error',
        message: 'URL pattern is required for assertNetwork command',
      };
    }

    if (!this.networkCaptureFeature) {
      return {
        status: 'error',
        message: 'Network capture feature not available',
      };
    }

    const requests = this.networkCaptureFeature.getAllRequests();
    let filtered = requests.filter((r: NetworkRequest) => r.url.includes(pattern));

    // Filter by method if specified
    if (method) {
      filtered = filtered.filter((r: NetworkRequest) => r.method === method.toUpperCase());
    }

    // Check status if specified
    if (status !== undefined) {
      const matching = filtered.filter((r: NetworkRequest) => r.status === status);
      const passed = matching.length > 0;
      return this.recordResult({
        name: 'assertNetwork:status',
        passed,
        expected: `request matching "${pattern}" with status ${status}`,
        actual: passed
          ? `found ${matching.length} matching request(s)`
          : `no matching requests (found ${filtered.length} matching URL pattern)`,
        timestamp: Date.now(),
        duration: Date.now() - startTime,
      });
    }

    // Default: just check if matching requests exist
    const passed = filtered.length > 0;
    return this.recordResult({
      name: 'assertNetwork:exists',
      passed,
      expected: `request matching "${pattern}"${method ? ` with method ${method}` : ''}`,
      actual: passed ? `found ${filtered.length} matching request(s)` : 'no matching requests',
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    });
  }

  /**
   * Assert performance metrics: --lcp<2500 --cls<0.1 --ttfb<600
   */
  private async handleAssertPerformance(args: AssertPerformanceArgs): Promise<CommandResponse> {
    const startTime = Date.now();
    const { lcp, cls, ttfb } = args;

    if (!this.performanceMetricsFeature) {
      return {
        status: 'error',
        message: 'Performance metrics feature not available. Call capturePerformanceMetrics first.',
      };
    }

    // Get current metrics by calling the getMetrics handler
    const handlers = this.performanceMetricsFeature.getCommandHandlers();
    const getMetricsHandler = handlers.get('getPerformanceMetrics');
    if (!getMetricsHandler) {
      return {
        status: 'error',
        message: 'Performance metrics not captured. Call capturePerformanceMetrics first.',
      };
    }

    const metricsResponse = await getMetricsHandler({});
    if (metricsResponse.status !== 'ok' || !metricsResponse.data?.metrics) {
      return {
        status: 'error',
        message: metricsResponse.message || 'No performance metrics available',
      };
    }

    const metrics = metricsResponse.data.metrics;
    const failures: string[] = [];
    const results: string[] = [];

    if (lcp !== undefined) {
      const actualLcp = metrics.lcp ?? metrics.navigation?.domComplete;
      if (actualLcp !== undefined) {
        const passed = actualLcp < lcp;
        results.push(`LCP: ${actualLcp.toFixed(0)}ms (threshold: <${lcp}ms) ${passed ? 'PASS' : 'FAIL'}`);
        if (!passed) failures.push(`LCP ${actualLcp.toFixed(0)}ms >= ${lcp}ms`);
      } else {
        failures.push('LCP not available');
      }
    }

    if (cls !== undefined) {
      const actualCls = metrics.cls;
      if (actualCls !== undefined) {
        const passed = actualCls < cls;
        results.push(`CLS: ${actualCls.toFixed(3)} (threshold: <${cls}) ${passed ? 'PASS' : 'FAIL'}`);
        if (!passed) failures.push(`CLS ${actualCls.toFixed(3)} >= ${cls}`);
      } else {
        failures.push('CLS not available');
      }
    }

    if (ttfb !== undefined) {
      const actualTtfb = metrics.navigation?.timeToFirstByte;
      if (actualTtfb !== undefined) {
        const passed = actualTtfb < ttfb;
        results.push(`TTFB: ${actualTtfb.toFixed(0)}ms (threshold: <${ttfb}ms) ${passed ? 'PASS' : 'FAIL'}`);
        if (!passed) failures.push(`TTFB ${actualTtfb.toFixed(0)}ms >= ${ttfb}ms`);
      } else {
        failures.push('TTFB not available');
      }
    }

    const passed = failures.length === 0;
    return this.recordResult({
      name: 'assertPerformance',
      passed,
      expected: `performance within thresholds`,
      actual: results.join(', ') || 'no thresholds specified',
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      message: passed ? undefined : failures.join('; '),
    });
  }

  /**
   * Get all assertion results
   */
  private async handleGetResults(): Promise<CommandResponse> {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    return {
      status: 'ok',
      data: {
        results: this.results,
        summary: {
          total: this.results.length,
          passed,
          failed,
          passRate: this.results.length > 0 ? ((passed / this.results.length) * 100).toFixed(1) + '%' : 'N/A',
        },
      },
    };
  }

  /**
   * Clear all assertion results
   */
  private async handleClearResults(): Promise<CommandResponse> {
    const cleared = this.results.length;
    this.results = [];
    this.log('Assertion results cleared');

    return {
      status: 'ok',
      data: { cleared },
    };
  }

  /**
   * Record assertion result and return CommandResponse
   */
  private recordResult(result: AssertionResult): CommandResponse {
    this.results.push(result);
    return {
      status: result.passed ? 'ok' : 'error',
      data: {
        passed: result.passed,
        expected: result.expected,
        actual: result.actual,
        assertionResults: this.results,
      },
      message: result.passed
        ? `Assertion passed: ${result.name}`
        : `Assertion failed: ${result.name} - Expected: ${result.expected}, Actual: ${result.actual}`,
    };
  }

  /**
   * Resolve selector to Playwright Locator
   * Supports: element refs (e123), semantic selectors (role:button:Text), CSS selectors
   */
  private resolveLocator(selector: string): Locator {
    // Element ref pattern (e.g., "e123", "e5a")
    if (/^e\d+[a-z]?$/.test(selector)) {
      // Use snapshot feature's ref map for proper resolution
      if (this.snapshotFeature) {
        const refMap = this.snapshotFeature.getRefMap();
        const refData = refMap.get(selector);
        if (refData) {
          // Prefer CSS selector if available
          if (refData.cssSelector) {
            return this.page.locator(refData.cssSelector);
          }
          // Fall back to role-based selector
          if (refData.name) {
            return this.page.getByRole(refData.role as any, { name: refData.name });
          }
          return this.page.getByRole(refData.role as any).nth(refData.roleIndex);
        }
      }
      // Fallback if no snapshot feature or ref not found
      return this.page.locator(`[data-ref="${selector}"], [ref="${selector}"]`);
    }

    // Semantic selector pattern (role:type:name)
    if (selector.startsWith('role:')) {
      const parts = selector.split(':');
      const role = parts[1];
      const name = parts.slice(2).join(':');
      if (name) {
        return this.page.getByRole(role as any, { name });
      }
      return this.page.getByRole(role as any);
    }

    // Text selector pattern
    if (selector.startsWith('text:')) {
      const text = selector.slice(5);
      return this.page.getByText(text);
    }

    // Label selector pattern
    if (selector.startsWith('label:')) {
      const label = selector.slice(6);
      return this.page.getByLabel(label);
    }

    // Placeholder selector pattern
    if (selector.startsWith('placeholder:')) {
      const placeholder = selector.slice(12);
      return this.page.getByPlaceholder(placeholder);
    }

    // Default: CSS selector
    return this.page.locator(selector);
  }

  /**
   * Get all assertion results (for external access)
   */
  getAllResults(): AssertionResult[] {
    return [...this.results];
  }
}
