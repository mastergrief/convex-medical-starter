/**
 * Artifacts modules - Re-exports for facade pattern
 */

// Prompts
export { promptWrite, promptRead, handlePrompt } from "./prompts.js";

// Session-based plans
export { planWrite, planRead } from "./plans.js";

// Handoffs
export { handoffWrite, handoffRead, handoffList, handleHandoff } from "./handoffs.js";

// Pending plans
export {
  PENDING_PLANS_DIR,
  ensurePendingPlansDir,
  pendingPlanWrite,
  pendingPlanList,
  pendingPlanLoad,
  pendingPlanArchive
} from "./pending-plans.js";

export type { PendingPlan } from "./pending-plans.js";
