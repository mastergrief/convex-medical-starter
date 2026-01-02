/**
 * Assertion Response Formatters - Phase 1d Browser-CLI Improvement
 *
 * Formats assertion command responses for human-readable CLI output.
 */

import { CommandResponse } from '../../core/types';

/**
 * Common assertion response formatter
 */
export function formatAssertionResponse(response: CommandResponse): string {
  if (response.status === 'ok' && response.data?.passed) {
    return `\n\n  Assertion passed: ${response.message || 'OK'}`;
  }

  const { expected, actual } = response.data || {};
  let output = `\n\n  Assertion failed`;
  if (expected) output += `\n    Expected: ${expected}`;
  if (actual) output += `\n    Actual: ${actual}`;
  if (response.message && !response.message.startsWith('Assertion')) {
    output += `\n    Message: ${response.message}`;
  }
  return output;
}

/**
 * Format assert command response
 */
export function formatAssert(response: CommandResponse): string {
  return formatAssertionResponse(response);
}

/**
 * Format assertCount command response
 */
export function formatAssertCount(response: CommandResponse): string {
  return formatAssertionResponse(response);
}

/**
 * Format assertConsole command response
 */
export function formatAssertConsole(response: CommandResponse): string {
  return formatAssertionResponse(response);
}

/**
 * Format assertNetwork command response
 */
export function formatAssertNetwork(response: CommandResponse): string {
  return formatAssertionResponse(response);
}

/**
 * Format assertPerformance command response
 */
export function formatAssertPerformance(response: CommandResponse): string {
  if (response.status === 'ok' && response.data?.passed) {
    let output = `\n\n  Performance assertion passed`;
    if (response.data.actual) {
      output += `\n    Results: ${response.data.actual}`;
    }
    return output;
  }

  let output = `\n\n  Performance assertion failed`;
  if (response.data?.expected) output += `\n    Expected: ${response.data.expected}`;
  if (response.data?.actual) output += `\n    Results: ${response.data.actual}`;
  if (response.message) output += `\n    Failures: ${response.message}`;
  return output;
}

/**
 * Format getAssertionResults command response
 */
export function formatGetAssertionResults(response: CommandResponse): string {
  if (response.status !== 'ok' || !response.data?.results) {
    return '\n\n  No assertion results available';
  }

  const { results, summary } = response.data;
  let output = `\n\n  Assertion Results Summary`;
  output += `\n    Total: ${summary.total}`;
  output += `\n    Passed: ${summary.passed}`;
  output += `\n    Failed: ${summary.failed}`;
  output += `\n    Pass Rate: ${summary.passRate}`;

  if (results.length > 0) {
    output += '\n\n  Recent Assertions:';
    const recentResults = results.slice(-10); // Show last 10
    for (const result of recentResults) {
      const icon = result.passed ? '✓' : '✗';
      output += `\n    ${icon} ${result.name}`;
      if (!result.passed) {
        output += ` (expected: ${result.expected}, actual: ${result.actual})`;
      }
    }
    if (results.length > 10) {
      output += `\n    ... and ${results.length - 10} more`;
    }
  }

  return output;
}

/**
 * Format clearAssertionResults command response
 */
export function formatClearAssertionResults(response: CommandResponse): string {
  if (response.status === 'ok') {
    return `\n\n  Cleared ${response.data?.cleared || 0} assertion result(s)`;
  }
  return '\n\n  Failed to clear assertion results';
}
