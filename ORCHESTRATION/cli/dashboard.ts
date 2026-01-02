/**
 * OrchestrationDashboard - Terminal-based dashboard UI for orchestration monitoring.
 *
 * FACADE: This file re-exports from dashboardModules/ and provides CLI entry point.
 *
 * Displays real-time status of:
 * - Current session and phase progress
 * - Active agents and their status
 * - Token budget consumption
 * - Recent events from the orchestration log
 */

import { fileURLToPath } from "url";
import { createDashboardCollector } from "../lib/dashboard-data.js";
import {
  DashboardConfig,
  DEFAULT_DASHBOARD_CONFIG
} from "../lib/dashboard-types.js";
import { OrchestrationDashboard } from "./dashboardModules/index.js";

// ===========================================================================
// RE-EXPORTS (maintain API compatibility)
// ===========================================================================

export { OrchestrationDashboard } from "./dashboardModules/index.js";
export { BOX, COLORS, PROGRESS } from "./dashboardModules/index.js";

// ===========================================================================
// FACTORY FUNCTION
// ===========================================================================

/**
 * Create a new dashboard instance
 * @param sessionId - Optional session ID (uses most recent if not provided)
 * @param config - Optional configuration overrides
 */
export function createDashboard(
  sessionId?: string,
  config?: Partial<DashboardConfig>
): OrchestrationDashboard {
  const collector = createDashboardCollector(sessionId);
  return new OrchestrationDashboard(collector, config);
}

// ===========================================================================
// CLI ENTRY POINT
// ===========================================================================

/**
 * Run the dashboard from command line
 * Usage: npx tsx ORCHESTRATION/cli/dashboard.ts [sessionId] [--refresh=ms] [--max-events=n]
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let sessionId: string | undefined;
  let refreshInterval = DEFAULT_DASHBOARD_CONFIG.refreshInterval;
  let maxEvents = DEFAULT_DASHBOARD_CONFIG.maxEvents;

  // Parse arguments
  for (const arg of args) {
    if (arg.startsWith("--refresh=")) {
      const value = parseInt(arg.slice(10), 10);
      if (!isNaN(value) && value > 0) {
        refreshInterval = value;
      }
    } else if (arg.startsWith("--max-events=")) {
      const value = parseInt(arg.slice(13), 10);
      if (!isNaN(value) && value > 0) {
        maxEvents = value;
      }
    } else if (!arg.startsWith("--")) {
      sessionId = arg;
    }
  }

  // Create and start dashboard
  const dashboard = createDashboard(sessionId, { refreshInterval, maxEvents });

  // Handle process termination
  process.on("SIGINT", () => {
    dashboard.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    dashboard.stop();
    process.exit(0);
  });

  console.log("Starting Orchestration Dashboard...");
  console.log(`Refresh interval: ${refreshInterval}ms`);
  console.log(`Max events: ${maxEvents}`);
  console.log("");

  dashboard.start();
}

// Run if executed directly (not when imported)
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename || process.argv[1]?.endsWith("/dashboard.ts")) {
  main().catch((error) => {
    console.error("Dashboard error:", error);
    process.exit(1);
  });
}
