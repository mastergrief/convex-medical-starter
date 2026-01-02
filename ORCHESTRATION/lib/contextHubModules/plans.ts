/**
 * PLANS MODULE
 * Plan CRUD operations
 */

import * as fs from "fs";
import * as path from "path";
import { Plan, validatePlan } from "../../schemas/index.js";
import { type ContextHubConfig, type WriteResult, type ReadResult, writeArtifactInternal } from "./types.js";

// =============================================================================
// PLAN OPERATIONS
// =============================================================================

/**
 * Writes a plan artifact to the orchestration session.
 *
 * Plans are structured execution documents containing phases, tasks, and dependencies
 * for orchestrated agent workflows. This function validates the plan against the Plan
 * schema, stores it in the plans/ subdirectory with a unique filename, and updates
 * the current-plan.json pointer file to reference the latest active plan.
 *
 * @description Persists a plan artifact with validation, file storage, and history tracking.
 *
 * @param config - The context hub configuration containing session paths
 * @param config.sessionPath - Absolute path to the session directory
 * @param config.basePath - Base path for the context hub
 * @param config.sessionId - Unique identifier for the current session
 * @param config.maxHistoryItems - Maximum number of history entries to retain
 * @param plan - The plan object to write, must conform to Plan schema
 * @param plan.id - Unique identifier for the plan (UUID)
 * @param plan.type - Must be "plan"
 * @param plan.metadata - Plan metadata including timestamp, version, and goal
 * @param plan.phases - Array of execution phases with tasks and dependencies
 * @param appendHistory - Callback function to append entries to session history log
 *
 * @returns WriteResult object indicating success or failure
 * @returns {boolean} WriteResult.success - true if write succeeded, false otherwise
 * @returns {string} WriteResult.path - Absolute path to the written file (on success)
 * @returns {string} [WriteResult.error] - Error message if write failed
 *
 * @throws Validation errors are caught and returned in WriteResult.error
 *
 * @example
 * ```typescript
 * const result = writePlan(config, {
 *   id: "plan-abc-123",
 *   type: "plan",
 *   metadata: {
 *     timestamp: "2024-01-15T10:00:00Z",
 *     version: "1.0.0",
 *     goal: "Implement user authentication"
 *   },
 *   phases: [
 *     { id: "phase-1", name: "Analysis", tasks: [...] },
 *     { id: "phase-2", name: "Implementation", tasks: [...] }
 *   ]
 * }, appendHistory);
 *
 * if (result.success) {
 *   console.log(`Plan written to: ${result.path}`);
 *   // File created: session/plans/plan-abc-123.json
 *   // Pointer updated: session/current-plan.json
 * } else {
 *   console.error(`Write failed: ${result.error}`);
 * }
 * ```
 */
export function writePlan(
  config: ContextHubConfig,
  plan: Plan,
  appendHistory: (type: string, id: string) => void
): WriteResult {
  return writeArtifactInternal(config, plan, {
    subdir: "plans",
    filenamePrefix: "plan",
    currentPointerFile: "current-plan.json",
    historyType: "plan",
    validate: validatePlan
  }, appendHistory);
}

/**
 * Reads a plan artifact from the orchestration session.
 *
 * Retrieves a plan by its unique ID from the plans/ subdirectory, or reads the
 * current active plan via the current-plan.json pointer file if no ID is specified.
 * The retrieved data is validated against the Plan schema before being returned.
 *
 * When no current plan pointer exists, provides enhanced error messages listing
 * available plans to help users recover from missing pointer situations.
 *
 * @description Retrieves and validates a plan artifact by ID or reads the current plan pointer.
 *
 * @param config - The context hub configuration containing session paths
 * @param config.sessionPath - Absolute path to the session directory
 * @param planId - Optional unique identifier of the plan to read.
 *                 If omitted, reads the current plan from current-plan.json pointer.
 *
 * @returns ReadResult<Plan> object containing the plan data or error information
 * @returns {boolean} ReadResult.success - true if read succeeded, false otherwise
 * @returns {Plan} [ReadResult.data] - The validated plan object (on success)
 * @returns {string} [ReadResult.path] - Absolute path to the file that was read
 * @returns {string} [ReadResult.error] - Error message if read failed. When no current
 *                   plan exists but plans are available, lists available plan IDs.
 *
 * @throws Validation errors and file read errors are caught and returned in ReadResult.error
 *
 * @example
 * ```typescript
 * // Read current plan (via pointer file)
 * const current = readPlan(config);
 * if (current.success) {
 *   console.log(`Active plan: ${current.data.metadata.goal}`);
 *   console.log(`Phases: ${current.data.phases.length}`);
 * } else {
 *   // Error may include: "No current plan pointer. Available plans: abc-123, def-456"
 *   console.error(current.error);
 * }
 *
 * // Read specific plan by ID
 * const specific = readPlan(config, "abc-123");
 * if (specific.success) {
 *   const plan = specific.data;
 *   console.log(`Plan ${plan.id} has ${plan.phases.length} phases`);
 * }
 * ```
 */
export function readPlan(config: ContextHubConfig, planId?: string): ReadResult<Plan> {
  try {
    let filepath: string;

    if (planId) {
      filepath = path.join(config.sessionPath, "plans", `plan-${planId}.json`);
    } else {
      filepath = path.join(config.sessionPath, "current-plan.json");
    }

    if (!fs.existsSync(filepath)) {
      // Enhanced error message: show available plans if no planId specified
      if (!planId) {
        const plansDir = path.join(config.sessionPath, "plans");
        if (fs.existsSync(plansDir)) {
          const plans = fs.readdirSync(plansDir).filter(f => f.startsWith("plan-") && f.endsWith(".json"));
          if (plans.length > 0) {
            const planIds = plans.map(p => p.replace("plan-", "").replace(".json", ""));
            return {
              success: false,
              error: `No current plan pointer. Available plans: ${planIds.join(", ")}. Use 'plan read <planId>' to read a specific plan.`
            };
          }
        }
        return { success: false, error: "No plans found in session. Use 'plan write <file>' to create one." };
      }
      return { success: false, error: `Plan not found: ${filepath}` };
    }

    const content = fs.readFileSync(filepath, "utf-8");
    const data = JSON.parse(content);
    const validated = validatePlan(data);

    return { success: true, data: validated, path: filepath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Lists all plan artifact IDs in the orchestration session.
 *
 * Scans the plans/ subdirectory for all stored plan files and extracts their IDs.
 * Only files matching the pattern plan-{id}.json are included in the results.
 * The current-plan.json pointer file is not included in the list.
 *
 * @description Returns an array of plan IDs from the session's plans/ directory.
 *
 * @param config - The context hub configuration containing session paths
 * @param config.sessionPath - Absolute path to the session directory
 *
 * @returns Array of plan ID strings extracted from filenames.
 *          Returns empty array if plans/ directory does not exist or contains no plans.
 *
 * @example
 * ```typescript
 * const planIds = listPlans(config);
 * // Returns: ["plan-abc-123", "plan-def-456"]
 *
 * // Use with readPlan to iterate all plans
 * for (const id of planIds) {
 *   const result = readPlan(config, id);
 *   if (result.success) {
 *     console.log(`Plan ${id}: ${result.data.metadata.goal}`);
 *   }
 * }
 *
 * // Check if any plans exist
 * if (listPlans(config).length === 0) {
 *   console.log("No plans in session. Use 'plan write <file>' to create one.");
 * }
 * ```
 */
export function listPlans(config: ContextHubConfig): string[] {
  const plansDir = path.join(config.sessionPath, "plans");
  if (!fs.existsSync(plansDir)) return [];

  return fs
    .readdirSync(plansDir)
    .filter((f) => f.startsWith("plan-") && f.endsWith(".json"))
    .map((f) => f.replace("plan-", "").replace(".json", ""));
}
