/**
 * POPULATION FUNCTIONS
 * Create evidence chains for different agent types
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  type Handoff,
  type EvidenceChain,
  createTimestamp
} from "../../schemas/index.js";
import {
  type TaskResultWithOutput,
  extractAcceptanceCriteria,
  extractAnalysisData,
  extractImplementationData,
  extractValidationData
} from "./extraction.js";
import type { AutoPopulateResult } from "./chain-ops.js";

// =============================================================================
// ANALYST EVIDENCE
// =============================================================================

/**
 * Create evidence chain for analyst agent
 */
export async function populateAnalystEvidence(
  sessionPath: string,
  handoff: Handoff,
  taskId: string
): Promise<AutoPopulateResult> {
  const taskResult = handoff.results?.find((r) => r.taskId === taskId) as
    | TaskResultWithOutput
    | undefined;
  if (!taskResult) {
    return { created: false, error: "No task result found" };
  }

  const chainId = crypto.randomUUID();
  const now = createTimestamp();

  const chain: EvidenceChain = {
    id: chainId,
    sessionId: handoff.metadata.sessionId,
    createdAt: now,
    updatedAt: now,
    requirement: {
      taskId,
      description: taskResult.summary || "Analysis task",
      acceptanceCriteria: extractAcceptanceCriteria(taskResult)
    },
    analysis: extractAnalysisData(handoff, taskResult),
    chainStatus: {
      analysisLinked: true,
      implementationLinked: false,
      validationLinked: false,
      coveragePercent: 33,
      acceptanceCriteriaVerified: 0,
      acceptanceCriteriaTotal: extractAcceptanceCriteria(taskResult).length
    }
  };

  const filepath = path.join(sessionPath, "evidence", `evidence-${taskId}.json`);
  fs.writeFileSync(filepath, JSON.stringify(chain, null, 2));

  return { created: true, chainId };
}

// =============================================================================
// DEVELOPER EVIDENCE
// =============================================================================

/**
 * Create evidence chain for developer agent
 */
export async function populateDeveloperEvidence(
  sessionPath: string,
  handoff: Handoff,
  taskId: string
): Promise<AutoPopulateResult> {
  const taskResult = handoff.results?.find((r) => r.taskId === taskId) as
    | TaskResultWithOutput
    | undefined;
  if (!taskResult) {
    return { created: false, error: "No task result found" };
  }

  const chainId = crypto.randomUUID();
  const now = createTimestamp();

  const chain: EvidenceChain = {
    id: chainId,
    sessionId: handoff.metadata.sessionId,
    createdAt: now,
    updatedAt: now,
    requirement: {
      taskId,
      description: taskResult.summary || "Implementation task",
      acceptanceCriteria: extractAcceptanceCriteria(taskResult)
    },
    implementation: extractImplementationData(handoff, taskResult),
    chainStatus: {
      analysisLinked: false,
      implementationLinked: true,
      validationLinked: false,
      coveragePercent: 33,
      acceptanceCriteriaVerified: 0,
      acceptanceCriteriaTotal: extractAcceptanceCriteria(taskResult).length
    }
  };

  const filepath = path.join(sessionPath, "evidence", `evidence-${taskId}.json`);
  fs.writeFileSync(filepath, JSON.stringify(chain, null, 2));

  return { created: true, chainId };
}

// =============================================================================
// BROWSER EVIDENCE
// =============================================================================

/**
 * Create evidence chain for browser agent
 */
export async function populateBrowserEvidence(
  sessionPath: string,
  handoff: Handoff,
  taskId: string
): Promise<AutoPopulateResult> {
  const taskResult = handoff.results?.find((r) => r.taskId === taskId) as
    | TaskResultWithOutput
    | undefined;
  if (!taskResult) {
    return { created: false, error: "No task result found" };
  }

  const chainId = crypto.randomUUID();
  const now = createTimestamp();

  const chain: EvidenceChain = {
    id: chainId,
    sessionId: handoff.metadata.sessionId,
    createdAt: now,
    updatedAt: now,
    requirement: {
      taskId,
      description: taskResult.summary || "Validation task",
      acceptanceCriteria: extractAcceptanceCriteria(taskResult)
    },
    validation: extractValidationData(handoff, taskResult),
    chainStatus: {
      analysisLinked: false,
      implementationLinked: false,
      validationLinked: true,
      coveragePercent: 33,
      acceptanceCriteriaVerified: 0,
      acceptanceCriteriaTotal: extractAcceptanceCriteria(taskResult).length
    }
  };

  const filepath = path.join(sessionPath, "evidence", `evidence-${taskId}.json`);
  fs.writeFileSync(filepath, JSON.stringify(chain, null, 2));

  return { created: true, chainId };
}
