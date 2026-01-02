/**
 * Accessibility (A11y) command help texts
 * Commands: auditAccessibility, getAccessibilityResults
 */

import type { CommandHelpRecord } from './types';

export const a11yHelp: CommandHelpRecord = {
  auditAccessibility: `Usage: browser-cmd auditAccessibility [--include=<rules>] [--exclude=<rules>]

Run accessibility audit using axe-core

Options:
  --include=rules   Comma-separated list of rules to include
  --exclude=rules   Comma-separated list of rules to exclude

Common Rules:
  - color-contrast
  - label
  - image-alt
  - button-name
  - link-name

Examples:
  browser-cmd auditAccessibility
  browser-cmd auditAccessibility --exclude=color-contrast
  browser-cmd auditAccessibility --include=label,button-name`,

  getAccessibilityResults: `Usage: browser-cmd getAccessibilityResults [--format=<format>]

Get accessibility audit results

Options:
  --format=json      Full JSON output (default)
  --format=summary   Compact summary with counts

Output includes:
  - violations (with impact: minor, moderate, serious, critical)
  - passes
  - incomplete (needs manual review)

Examples:
  browser-cmd getAccessibilityResults
  browser-cmd getAccessibilityResults --format=summary`,
};
