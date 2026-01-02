/**
 * Status module - Status, dashboard, and validate commands
 */

import * as fs from "fs";
import { createContextHub } from "../../lib/context-hub.js";
import { createDashboard } from "../dashboard.js";
import { createDashboardCollector } from "../../lib/dashboard-data.js";
import {
  printHeader,
  printSuccess,
  printError,
  printInfo,
  printJson,
  isJsonOutput
} from "./output.js";
import { getSessionId } from "./flags.js";

// =============================================================================
// STATUS COMMANDS
// =============================================================================

/**
 * Displays overall orchestration status for the current session.
 *
 * @description Handles the `status` CLI command. Shows session information including
 * counts of prompts, plans, handoffs, current phase, progress, and token usage.
 * If no session is active, displays instructions for creating one.
 *
 * @returns {Promise<void>} Outputs status to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Show status with text output
 * npx tsx ORCHESTRATION/cli/orch.ts status
 *
 * # Show status with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts status --json
 * ```
 *
 * @throws Never throws - gracefully handles missing session
 */

export async function showStatus(): Promise<void> {
  const sessionId = getSessionId();

  if (isJsonOutput()) {
    if (!sessionId) {
      printJson({ hasSession: false });
    } else {
      const hub = createContextHub(sessionId);
      const info = hub.getSessionInfo();
      const state = hub.readOrchestratorState();
      printJson({
        hasSession: true,
        sessionInfo: info,
        orchestratorState: state.success ? state.data : null
      });
    }
  } else {
    printHeader("Orchestration Status");

    if (!sessionId) {
      console.log("  No active session");
      console.log("\n  Create one with: npx tsx ORCHESTRATION/cli/orch.ts session new");
    } else {
      const hub = createContextHub(sessionId);
      const info = hub.getSessionInfo();
      const state = hub.readOrchestratorState();

      printInfo("Session", sessionId.slice(0, 8) + "...");
      printInfo("Prompts", String(info.promptCount));
      printInfo("Plans", String(info.planCount));
      printInfo("Handoffs", String(info.handoffCount));

      if (state.success && state.data) {
        console.log("");
        printInfo("Status", state.data.status);
        printInfo("Current Phase", state.data.currentPhase.name);
        printInfo("Progress", `${state.data.currentPhase.progress}%`);
        if (state.data.tokenUsage) {
          printInfo("Tokens", `${state.data.tokenUsage.percentage}%`);
        }
      }
    }
  }
}

// =============================================================================
// DASHBOARD COMMANDS
// =============================================================================

/**
 * Displays real-time orchestration dashboard or outputs state as JSON.
 *
 * @description Handles the `dashboard` CLI command. Provides a terminal UI (TUI)
 * that shows live orchestration state including agents, tasks, progress, and token usage.
 * Can run continuously with auto-refresh or render once and exit.
 *
 * @param {Object} options - Dashboard configuration options
 * @param {boolean} options.once - If true, render once and exit
 * @param {number} options.interval - Refresh interval in milliseconds (default: 1000)
 * @param {boolean} options.json - If true, output state as JSON instead of TUI
 *
 * @returns {Promise<void>} Runs dashboard until interrupted or outputs JSON
 *
 * @example
 * ```bash
 * # Show real-time dashboard (Ctrl+C to exit)
 * npx tsx ORCHESTRATION/cli/orch.ts dashboard
 *
 * # Show dashboard once and exit
 * npx tsx ORCHESTRATION/cli/orch.ts dashboard --once
 *
 * # Custom refresh interval (2 seconds)
 * npx tsx ORCHESTRATION/cli/orch.ts dashboard --interval=2000
 *
 * # Output dashboard state as JSON
 * npx tsx ORCHESTRATION/cli/orch.ts dashboard --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 */

export async function handleDashboard(options: {
  once: boolean;
  interval: number;
  json: boolean;
}): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No active session. Run 'session new' first or set ORCH_SESSION");
    process.exit(1);
  }

  if (options.json) {
    // JSON mode: output state once and exit
    const collector = createDashboardCollector(sessionId);
    const state = collector.collectState();
    console.log(JSON.stringify({ success: true, data: state }, null, 2));
    return;
  }

  const dashboard = createDashboard(sessionId, {
    refreshInterval: options.interval
  });

  if (options.once) {
    dashboard.renderOnce();
  } else {
    dashboard.start();
  }
}

// =============================================================================
// VALIDATE COMMANDS
// =============================================================================

/**
 * Validates a JSON file against orchestration schemas.
 *
 * @description Handles the `validate` CLI command. Automatically detects the file type
 * (plan, handoff, state, etc.) and validates against the appropriate Zod schema.
 * Reports validation errors with field paths.
 *
 * @param {string} filePath - Path to the JSON file to validate
 *
 * @returns {Promise<void>} Outputs validation result to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Validate a plan file
 * npx tsx ORCHESTRATION/cli/orch.ts validate ./my-plan.json
 *
 * # Validate with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts validate ./my-plan.json --json
 * ```
 *
 * @throws Exits with code 1 if file not found
 * @throws Exits with code 1 if validation fails
 */

export async function validateFile(filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    printError(`File not found: ${filePath}`);
    process.exit(1);
  }

  const sessionId = getSessionId() || "validation";
  const hub = createContextHub(sessionId);
  const result = hub.validateFile(filePath);

  if (isJsonOutput()) {
    printJson(result);
  } else {
    if (result.valid) {
      printSuccess(`Valid ${result.type} schema`);
    } else {
      printError(`Invalid: ${result.error}`);
      if (result.details) {
        console.log("\n  Validation errors:");
        const details = result.details as Record<string, unknown>;
        for (const [fieldPath, issue] of Object.entries(details)) {
          if (typeof issue === "object" && issue !== null && "_errors" in issue) {
            const errors = (issue as { _errors: string[] })._errors;
            if (errors.length > 0) {
              console.log(`    ${fieldPath}: ${errors.join(", ")}`);
            }
          }
        }
      }
      process.exit(1);
    }
  }
}
