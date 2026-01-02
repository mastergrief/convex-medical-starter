/**
 * Flaky Detection Response Formatters
 *
 * Formats output for flaky test detection commands.
 */

import { CommandResponse } from './types';

/**
 * Format runTestMultipleTimes response
 */
export function formatRunTestMultipleTimes(response: CommandResponse): string {
  const data = response.data;
  const passRateFormatted = `${data.passRate.toFixed(1)}%`;
  const flakyStatus = data.isFlaky ? 'FLAKY' : (data.passRate === 100 ? 'STABLE' : 'FAILING');

  let output = '\n\n### Flaky Test Detection Results:';
  output += `\n\nCommand: \`${data.command}\``;
  output += `\nIterations: ${data.iterations}`;
  output += `\nPassed: ${data.passCount} | Failed: ${data.failCount}`;
  output += `\nPass Rate: ${passRateFormatted}`;
  output += `\nStatus: ${flakyStatus}`;
  output += `\nAvg Duration: ${data.averageDuration}ms`;
  output += `\n\nRecommendation: ${data.recommendation}`;

  return output;
}

/**
 * Format analyzeFlakiness response
 */
export function formatAnalyzeFlakiness(response: CommandResponse): string {
  const data = response.data;

  // JSON format - return raw JSON
  if (data.format === 'json') {
    return '\n\n' + JSON.stringify(data.report, null, 2);
  }

  const passRateFormatted = `${data.passRate.toFixed(1)}%`;
  const flakyStatus = data.isFlaky ? 'FLAKY' : (data.passRate === 100 ? 'STABLE' : 'FAILING');

  let output = '\n\n### Flakiness Analysis:';
  output += `\n\nCommand: \`${data.command}\``;
  output += `\nIterations: ${data.iterations}`;
  output += `\nPassed: ${data.passCount} | Failed: ${data.failCount}`;
  output += `\nPass Rate: ${passRateFormatted}`;
  output += `\nStatus: ${flakyStatus}`;
  output += `\nAvg Duration: ${data.averageDuration}ms`;
  output += `\n\nRecommendation: ${data.recommendation}`;

  // Detailed format - include individual run results
  if (data.format === 'detailed' && data.runs) {
    output += '\n\n### Individual Runs:';
    for (const run of data.runs) {
      const statusIcon = run.success ? '[PASS]' : '[FAIL]';
      output += `\n  ${run.iteration}. ${statusIcon} ${run.duration}ms`;
      if (run.error) {
        output += ` - ${run.error}`;
      }
    }
  }

  return output;
}
