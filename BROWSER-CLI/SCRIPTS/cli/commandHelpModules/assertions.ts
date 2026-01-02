/**
 * Assertions command help texts
 * Commands: assert, assertCount, assertConsole, assertNetwork, assertPerformance, getAssertionResults, clearAssertionResults
 */

import type { CommandHelpRecord } from './types';

export const assertionsHelp: CommandHelpRecord = {
  assert: `Usage: browser-cmd assert <selector> <check> [value]

Assert element state matches expected condition

Checks:
  - visible    Element is visible on page
  - hidden     Element is hidden or not present
  - enabled    Element is enabled (not disabled)
  - disabled   Element is disabled
  - text       Element text matches value
  - value      Input value matches value
  - checked    Checkbox/radio is checked

Examples:
  browser-cmd assert e5 visible
  browser-cmd assert e5 text "Submit"
  browser-cmd assert e10 disabled`,

  assertCount: `Usage: browser-cmd assertCount <selector> <operator> <count>

Assert count of matching elements

Operators:
  - equals     Count equals expected
  - lt         Count less than expected
  - gt         Count greater than expected
  - lte        Count less than or equal
  - gte        Count greater than or equal

Examples:
  browser-cmd assertCount "li.item" equals 5
  browser-cmd assertCount "button" gt 0`,

  assertConsole: `Usage: browser-cmd assertConsole [--level=<level>]

Assert no console errors or warnings

Options:
  --level=error    Check for errors only (default)
  --level=warn     Check for warnings only
  --level=all      Check for any console messages

Examples:
  browser-cmd assertConsole
  browser-cmd assertConsole --level=warn`,

  assertNetwork: `Usage: browser-cmd assertNetwork <pattern> [--method=<method>] [--status=<status>]

Assert network request occurred

Options:
  --method=GET     Filter by HTTP method
  --status=200     Filter by status code

Examples:
  browser-cmd assertNetwork "/api/users"
  browser-cmd assertNetwork "/api/login" --method=POST --status=200`,

  assertPerformance: `Usage: browser-cmd assertPerformance <metric> <operator> <value>

Assert performance metric meets threshold

Metrics:
  - LCP        Largest Contentful Paint (ms)
  - TTFB       Time to First Byte (ms)
  - CLS        Cumulative Layout Shift

Operators: lt, lte, gt, gte, equals

Examples:
  browser-cmd assertPerformance LCP lt 2500
  browser-cmd assertPerformance TTFB lt 800`,

  getAssertionResults: `Usage: browser-cmd getAssertionResults

Get all assertion results from current session

Returns array of assertion results with:
  - check type
  - expected value
  - actual value
  - pass/fail status

Examples:
  browser-cmd getAssertionResults`,

  clearAssertionResults: `Usage: browser-cmd clearAssertionResults

Clear assertion history

Examples:
  browser-cmd clearAssertionResults`,
};
