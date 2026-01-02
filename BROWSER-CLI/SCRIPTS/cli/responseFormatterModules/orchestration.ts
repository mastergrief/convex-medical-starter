/**
 * Orchestration Response Formatters - Browser-CLI P3.6
 *
 * Formats output for parallel test orchestration commands.
 */

import { CommandResponse } from '../../core/types';

/**
 * Format duration in human-readable form
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds}s`;
}

/**
 * Get status icon
 */
function statusIcon(status: 'pass' | 'fail' | 'error'): string {
  switch (status) {
    case 'pass':
      return '[PASS]';
    case 'fail':
      return '[FAIL]';
    case 'error':
      return '[ERR]';
  }
}

/**
 * Format orchestrate response.
 */
export function formatOrchestrate(response: CommandResponse): string {
  const { data } = response;
  if (!data) return '\nOrchestration complete';

  const lines: string[] = [];

  // Summary header
  lines.push('\n=== Test Orchestration Results ===\n');

  // Overall stats
  const passRateColor =
    data.passRate >= 80 ? '' : data.passRate >= 50 ? '' : '';
  lines.push(`  Total:    ${data.totalTests} tests`);
  lines.push(`  Passed:   ${data.passed}`);
  lines.push(`  Failed:   ${data.failed}`);
  lines.push(`  Errors:   ${data.errors}`);
  lines.push(`  Duration: ${formatDuration(data.duration)}`);
  lines.push(`  Pass Rate: ${passRateColor}${data.passRate}%`);

  // Instance summary
  if (data.instances && data.instances.length > 0) {
    lines.push(`\n  Instances: ${data.instances.join(', ')}`);
  }

  // Timing
  if (data.startTime) {
    lines.push(`\n  Started:  ${data.startTime}`);
  }
  if (data.endTime) {
    lines.push(`  Finished: ${data.endTime}`);
  }

  // Individual results (if there are failures)
  if (data.results && data.results.length > 0) {
    const failures = data.results.filter(
      (r: any) => r.status === 'fail' || r.status === 'error'
    );

    if (failures.length > 0) {
      lines.push('\n--- Failed Tests ---\n');
      for (const result of failures) {
        const basename = result.testFile.split('/').pop() || result.testFile;
        lines.push(
          `  ${statusIcon(result.status)} ${basename} (${result.instance})`
        );
        if (result.failedCommand) {
          lines.push(`       Line ${result.failedLine}: ${result.failedCommand}`);
        }
        if (result.error) {
          const shortError =
            result.error.length > 100
              ? result.error.substring(0, 100) + '...'
              : result.error;
          lines.push(`       Error: ${shortError}`);
        }
      }
    }

    // Show passed tests in verbose mode or if few tests
    const passed = data.results.filter((r: any) => r.status === 'pass');
    if (passed.length > 0 && passed.length <= 10) {
      lines.push('\n--- Passed Tests ---\n');
      for (const result of passed) {
        const basename = result.testFile.split('/').pop() || result.testFile;
        lines.push(
          `  ${statusIcon(result.status)} ${basename} (${formatDuration(result.duration)})`
        );
      }
    } else if (passed.length > 10) {
      lines.push(`\n  (${passed.length} passed tests not shown)`);
    }
  }

  // Final status
  if (data.passRate === 100) {
    lines.push('\n=== All tests passed ===');
  } else if (data.passRate >= 80) {
    lines.push('\n=== Most tests passed ===');
  } else {
    lines.push('\n=== Tests failed ===');
  }

  return lines.join('\n');
}

/**
 * Format getOrchestrationStatus response.
 */
export function formatGetOrchestrationStatus(response: CommandResponse): string {
  const { data } = response;
  if (!data) return '\nNo orchestration status available';

  const lines: string[] = [];

  if (data.running) {
    lines.push('\n=== Orchestration In Progress ===\n');
    lines.push(`  Phase:    ${data.phase}`);
    lines.push(`  Progress: ${data.progress}%`);
    lines.push(`  Tests:    ${data.completed}/${data.total}`);
    if (data.activeInstances && data.activeInstances.length > 0) {
      lines.push(`  Active:   ${data.activeInstances.join(', ')}`);
    }
    if (data.aborted) {
      lines.push('\n  [ABORTING...]');
    }
  } else if (data.message) {
    lines.push(`\n${data.message}`);
  } else {
    // Show last results
    lines.push('\n=== Last Orchestration Results ===\n');
    lines.push(`  Total:    ${data.totalTests} tests`);
    lines.push(`  Passed:   ${data.passed}`);
    lines.push(`  Failed:   ${data.failed}`);
    lines.push(`  Errors:   ${data.errors}`);
    lines.push(`  Pass Rate: ${data.passRate}%`);
    lines.push(`  Duration: ${formatDuration(data.duration)}`);

    if (data.instances && data.instances.length > 0) {
      lines.push(`\n  Instances: ${data.instances.join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format abortOrchestration response.
 */
export function formatAbortOrchestration(response: CommandResponse): string {
  const { data } = response;
  if (!data) return '\nOrchestration abort requested';

  return `\n${data.message}`;
}
