/**
 * EVIDENCE AUTO-POPULATOR (FACADE)
 * Automatically creates evidence chains from completed handoffs
 *
 * This is a thin facade that re-exports from modular components.
 * Implementation details are in ./evidenceAutoPopulatorModules/
 */

import * as fs from "fs";
import * as path from "path";
import type { Handoff } from "../schemas/index.js";
import {
  type AutoPopulateResult,
  findExistingChain,
  updateExistingChain,
  populateAnalystEvidence,
  populateDeveloperEvidence,
  populateBrowserEvidence
} from "./evidenceAutoPopulatorModules/index.js";

// Re-export types for external consumers
export type { AutoPopulateResult } from "./evidenceAutoPopulatorModules/index.js";

/**
 * Auto-populate evidence chain from completed handoff
 */
export async function autoPopulateEvidence(
  sessionPath: string,
  handoff: Handoff
): Promise<AutoPopulateResult> {
  // Only auto-populate for completed tasks
  if (handoff.reason !== "task_complete") {
    return { created: false };
  }

  const completedTask = handoff.state.completedTasks?.[0];
  if (!completedTask) {
    return { created: false };
  }

  // Ensure evidence directory exists
  const evidenceDir = path.join(sessionPath, "evidence");
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  // Check if evidence already exists for this task
  const existingChain = await findExistingChain(sessionPath, completedTask);
  if (existingChain) {
    return updateExistingChain(sessionPath, existingChain, handoff);
  }

  // Create new chain based on agent type
  const agentType = handoff.metadata?.fromAgent?.type;

  switch (agentType) {
    case "analyst":
      return populateAnalystEvidence(sessionPath, handoff, completedTask);
    case "developer":
      return populateDeveloperEvidence(sessionPath, handoff, completedTask);
    case "browser":
      return populateBrowserEvidence(sessionPath, handoff, completedTask);
    default:
      return { created: false };
  }
}
