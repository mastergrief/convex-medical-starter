/**
 * Test orchestration command help texts
 * Commands: orchestrate, getOrchestrationStatus, abortOrchestration
 */

import type { CommandHelpRecord } from './types';

export const orchestrationHelp: CommandHelpRecord = {
  orchestrate: `Usage: browser-cmd orchestrate "<prompt>"

Generate and execute test from natural language prompt

The orchestration system:
  - Analyzes the prompt
  - Generates Playwright code
  - Executes the test
  - Returns results

Examples:
  browser-cmd orchestrate "login as coach and verify dashboard loads"
  browser-cmd orchestrate "create a new workout and verify it appears in calendar"`,

  getOrchestrationStatus: `Usage: browser-cmd getOrchestrationStatus

Get current orchestration execution status

Status values:
  - idle       No orchestration running
  - running    Orchestration in progress
  - completed  Orchestration finished
  - failed     Orchestration failed

Examples:
  browser-cmd getOrchestrationStatus`,

  abortOrchestration: `Usage: browser-cmd abortOrchestration

Stop current orchestration execution

Examples:
  browser-cmd abortOrchestration`,
};
