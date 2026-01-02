/**
 * Flaky test detection command help texts
 * Commands: runFlaky, getFlakySummary
 */

import type { CommandHelpRecord } from './types';

export const flakyDetectionHelp: CommandHelpRecord = {
  runTestMultipleTimes: `Usage: browser-cmd runTestMultipleTimes <iterations> "<command>"

Run a command multiple times to detect flakiness

Arguments:
  iterations   Number of times to run (1-100)
  command      The command to test (in quotes for multi-word)

Examples:
  browser-cmd runTestMultipleTimes 10 "click e5"
  browser-cmd runTestMultipleTimes 5 "snapshot && click e3"
  browser-cmd runTestMultipleTimes 3 status`,

  analyzeFlakiness: `Usage: browser-cmd analyzeFlakiness

Get flakiness analysis from last runTestMultipleTimes execution

Report includes:
  - Pass rate percentage
  - Average duration
  - Individual run results
  - Recommendation (stable, flaky, broken)

Examples:
  browser-cmd analyzeFlakiness`,
};;
