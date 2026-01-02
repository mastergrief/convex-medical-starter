/**
 * Accessibility Audit Response Formatters - Phase 3.4 Browser-CLI Improvement
 *
 * Formats accessibility audit command responses for human-readable CLI output.
 */

import { CommandResponse } from '../../core/types';

/**
 * Format auditAccessibility command response
 */
export function formatAuditAccessibility(response: CommandResponse): string {
  if (response.status !== 'ok' || !response.data) {
    return '\n\n  No accessibility audit results available';
  }

  const { summary, criticalIssues } = response.data;
  let output = '\n\n  Accessibility Audit Results';
  output += `\n    URL: ${summary.url}`;
  output += `\n    Time: ${summary.timestamp}`;
  output += '\n';
  output += `\n    Total Violations: ${summary.totalViolations}`;
  output += `\n      Critical: ${summary.critical}`;
  output += `\n      Serious: ${summary.serious}`;
  output += `\n      Moderate: ${summary.moderate}`;
  output += `\n      Minor: ${summary.minor}`;
  output += '\n';
  output += `\n    Passes: ${summary.passes}`;
  output += `\n    Incomplete: ${summary.incomplete}`;

  if (criticalIssues && criticalIssues.length > 0) {
    output += '\n\n  Critical/Serious Issues:';
    for (const issue of criticalIssues) {
      const impactIcon = issue.impact === 'critical' ? '!!!' : '!!';
      output += `\n    [${impactIcon}] ${issue.id}`;
      output += `\n        ${issue.help}`;
      if (issue.nodes && issue.nodes.length > 0) {
        output += `\n        Affected: ${issue.nodes.length} element(s)`;
        // Show first affected node
        const firstNode = issue.nodes[0];
        if (firstNode.html) {
          const truncatedHtml =
            firstNode.html.length > 80 ? firstNode.html.slice(0, 80) + '...' : firstNode.html;
          output += `\n        Example: ${truncatedHtml}`;
        }
      }
      output += `\n        Help: ${issue.helpUrl}`;
    }
  } else if (summary.totalViolations === 0) {
    output += '\n\n  No accessibility violations found!';
  }

  return output;
}

/**
 * Format getAccessibilityResults command response
 */
export function formatGetAccessibilityResults(response: CommandResponse): string {
  if (response.status !== 'ok' || !response.data) {
    return '\n\n  No accessibility results available. Run auditAccessibility first.';
  }

  const { url, timestamp, summary, violations, criticalIssues } = response.data;

  let output = '\n\n  Accessibility Audit Results';
  output += `\n    URL: ${url}`;
  output += `\n    Time: ${timestamp}`;

  if (summary) {
    output += '\n';
    output += `\n    Total Violations: ${summary.totalViolations}`;
    if (summary.critical !== undefined) {
      output += `\n      Critical: ${summary.critical}`;
      output += `\n      Serious: ${summary.serious}`;
      output += `\n      Moderate: ${summary.moderate}`;
      output += `\n      Minor: ${summary.minor}`;
    }
    output += `\n    Passes: ${summary.passes}`;
    output += `\n    Incomplete: ${summary.incomplete}`;
  }

  // For detailed format, show all violations
  if (violations && violations.length > 0) {
    output += '\n\n  All Violations:';
    for (const violation of violations) {
      const impactIcon = getImpactIcon(violation.impact);
      output += `\n    [${impactIcon}] ${violation.id} (${violation.impact || 'unknown'})`;
      output += `\n        ${violation.description}`;
      output += `\n        Elements: ${violation.nodes.length}`;
      output += `\n        Help: ${violation.helpUrl}`;
    }
  }

  // For summary format, show critical issues
  if (criticalIssues && criticalIssues.length > 0) {
    output += '\n\n  Critical/Serious Issues:';
    for (const issue of criticalIssues) {
      const impactIcon = issue.impact === 'critical' ? '!!!' : '!!';
      output += `\n    [${impactIcon}] ${issue.id}`;
      output += `\n        ${issue.help}`;
      output += `\n        Affected: ${issue.affectedElements} element(s)`;
      output += `\n        Help: ${issue.helpUrl}`;
    }
  }

  return output;
}

/**
 * Get icon based on impact level
 */
function getImpactIcon(impact: string | null): string {
  switch (impact) {
    case 'critical':
      return '!!!';
    case 'serious':
      return '!!';
    case 'moderate':
      return '!';
    case 'minor':
      return '-';
    default:
      return '?';
  }
}
