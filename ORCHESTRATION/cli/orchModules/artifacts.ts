/**
 * Artifacts module - Facade for prompt, plan, and handoff commands
 *
 * This is a thin facade that re-exports from focused modules:
 * - artifactsModules/prompts.ts: promptWrite, promptRead, handlePrompt
 * - artifactsModules/plans.ts: planWrite, planRead
 * - artifactsModules/handoffs.ts: handoffWrite, handoffRead, handoffList, handleHandoff
 * - artifactsModules/pending-plans.ts: pendingPlan* operations
 */

// Re-export all artifact operations
export {
  // Prompts
  promptWrite,
  promptRead,
  handlePrompt,
  // Session-based plans
  planWrite,
  planRead,
  // Handoffs
  handoffWrite,
  handoffRead,
  handoffList,
  handleHandoff,
  // Pending plans
  PENDING_PLANS_DIR,
  ensurePendingPlansDir,
  pendingPlanWrite,
  pendingPlanList,
  pendingPlanLoad,
  pendingPlanArchive
} from "./artifactsModules/index.js";

export type { PendingPlan } from "./artifactsModules/index.js";

import { printError, printUsage } from "./output.js";
import { filterFlags } from "./flags.js";
import { planWrite, planRead } from "./artifactsModules/plans.js";
import {
  pendingPlanWrite,
  pendingPlanList,
  pendingPlanLoad,
  pendingPlanArchive
} from "./artifactsModules/pending-plans.js";

// =============================================================================
// PLAN ROUTER (combines session-based and pending plan commands)
// =============================================================================

/**
 * Main router for plan CLI subcommands.
 *
 * @description Handles the `plan` CLI command and routes to appropriate subcommand handlers:
 * - `write`: Write plan from JSON file to current session
 * - `read`: Read plan from current session
 * - `write-pending`: Write design JSON to pending plans directory
 * - `list-pending`: List all pending plans awaiting execution
 * - `load-pending`: Load a pending plan into current session
 * - `archive-pending`: Archive a pending plan after execution
 *
 * @returns {Promise<void>} Routes to appropriate subcommand handler
 *
 * @example
 * ```bash
 * # Write plan to session
 * npx tsx ORCHESTRATION/cli/orch.ts plan write ./plan.json
 *
 * # Read current plan
 * npx tsx ORCHESTRATION/cli/orch.ts plan read --json
 *
 * # Write pending plan (from /orch-plan workflow)
 * npx tsx ORCHESTRATION/cli/orch.ts plan write-pending '{"id":"...","phases":[...]}'
 *
 * # List pending plans
 * npx tsx ORCHESTRATION/cli/orch.ts plan list-pending --json
 *
 * # Load pending plan into session
 * npx tsx ORCHESTRATION/cli/orch.ts plan load-pending plan-2025-12-26T10-00-00-000Z.json
 *
 * # Archive pending plan
 * npx tsx ORCHESTRATION/cli/orch.ts plan archive-pending plan-2025-12-26T10-00-00-000Z.json
 * ```
 *
 * @throws Exits with code 1 if required arguments missing
 * @throws Prints usage if unknown subcommand provided
 */

export async function handlePlan(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const arg3 = args[2];

  switch (subcommand) {
    // Session-based plan commands
    case "write":
      if (!arg3) {
        printError("File path required");
        process.exit(1);
      }
      await planWrite(arg3);
      break;
    case "read":
      await planRead(arg3);
      break;

    // Pending plan commands (for /orch-plan -> /orch-execute workflow)
    case "write-pending":
      if (!arg3) {
        printError("Design JSON required");
        process.exit(1);
      }
      await pendingPlanWrite(arg3);
      break;
    case "list-pending":
      await pendingPlanList();
      break;
    case "load-pending":
      await pendingPlanLoad(arg3);
      break;
    case "archive-pending":
      await pendingPlanArchive(arg3);
      break;

    default:
      printUsage();
  }
}
