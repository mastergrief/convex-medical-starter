/**
 * CHAIN OPERATIONS
 * Evidence chain management and orchestration
 */

import * as fs from "fs";
import * as path from "path";
import {
  type Handoff,
  type EvidenceChain,
  type ChainStatus,
  createTimestamp
} from "../../schemas/index.js";
import { logWarn } from "../utils/logger.js";
import {
  type TaskResultWithOutput,
  extractAnalysisData,
  extractImplementationData,
  extractValidationData
} from "./extraction.js";

// =============================================================================
// TYPES
// =============================================================================

export interface AutoPopulateResult {
  created: boolean;
  chainId?: string;
  error?: string;
}

// =============================================================================
// CHAIN LOOKUP
// =============================================================================

/**
 * Find existing evidence chain for a task
 */
export async function findExistingChain(
  sessionPath: string,
  taskId: string
): Promise<string | null> {
  const evidenceDir = path.join(sessionPath, "evidence");
  if (!fs.existsSync(evidenceDir)) {
    return null;
  }

  const files = fs.readdirSync(evidenceDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    try {
      const filepath = path.join(evidenceDir, file);
      const content = fs.readFileSync(filepath, "utf-8");
      const chain = JSON.parse(content) as EvidenceChain;
      if (chain.requirement?.taskId === taskId) {
        return filepath;
      }
    } catch (error) {
      logWarn("evidence:findExistingChain", error);
      // Skip invalid files
    }
  }

  return null;
}

// =============================================================================
// CHAIN STATUS
// =============================================================================

/**
 * Calculate chain status based on linked evidence
 */
export function calculateChainStatus(chain: EvidenceChain): ChainStatus {
  let linkedCount = 0;
  if (chain.analysis) linkedCount++;
  if (chain.implementation) linkedCount++;
  if (chain.validation) linkedCount++;

  const coveragePercent = Math.round((linkedCount / 3) * 100);

  // Count verified acceptance criteria from validation
  let verified = 0;
  if (chain.validation?.linksTo?.verification?.acceptanceCriteriaVerified) {
    verified = chain.validation.linksTo.verification.acceptanceCriteriaVerified.filter(
      (c) => c.verified
    ).length;
  }

  return {
    analysisLinked: !!chain.analysis,
    implementationLinked: !!chain.implementation,
    validationLinked: !!chain.validation,
    coveragePercent,
    acceptanceCriteriaVerified: verified,
    acceptanceCriteriaTotal: chain.requirement.acceptanceCriteria.length
  };
}

// =============================================================================
// CHAIN UPDATE
// =============================================================================

/**
 * Update existing evidence chain with new handoff data
 */
export async function updateExistingChain(
  _sessionPath: string,
  chainPath: string,
  handoff: Handoff
): Promise<AutoPopulateResult> {
  try {
    const content = fs.readFileSync(chainPath, "utf-8");
    const chain = JSON.parse(content) as EvidenceChain;
    const agentType = handoff.metadata.fromAgent.type;
    const taskResult = handoff.results?.[0] as TaskResultWithOutput | undefined;

    const now = createTimestamp();
    chain.updatedAt = now;

    // Update the appropriate section based on agent type
    if (agentType === "analyst" && taskResult) {
      chain.analysis = extractAnalysisData(handoff, taskResult);
      chain.chainStatus.analysisLinked = true;
    } else if (agentType === "developer" && taskResult) {
      chain.implementation = extractImplementationData(handoff, taskResult);
      chain.chainStatus.implementationLinked = true;
    } else if (agentType === "browser" && taskResult) {
      chain.validation = extractValidationData(handoff, taskResult);
      chain.chainStatus.validationLinked = true;
    }

    // Recalculate coverage
    chain.chainStatus = calculateChainStatus(chain);

    fs.writeFileSync(chainPath, JSON.stringify(chain, null, 2));

    return { created: true, chainId: chain.id };
  } catch (error) {
    return {
      created: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
