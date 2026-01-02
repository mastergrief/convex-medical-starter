/**
 * EXTRACTION FUNCTIONS
 * Extract data from handoffs for evidence chains
 */

import {
  type Handoff,
  type EvidenceAnalysis,
  type EvidenceImplementation,
  type EvidenceValidation,
  type LinksTo,
  type LinksToUpstream,
  type LinksToDownstream,
  type LinksToVerification
} from "../../schemas/index.js";

// =============================================================================
// TYPES
// =============================================================================

export interface TaskResultWithOutput {
  taskId: string;
  status: string;
  summary: string;
  output?: Record<string, unknown>;
  evidence?: string[];
  blockers?: string[];
}

// =============================================================================
// LINK EXTRACTION
// =============================================================================

/**
 * Extract LinksTo data from output record
 */
export function extractLinksTo(
  output: Record<string, unknown>
): LinksTo | undefined {
  const rawLinksTo = output.linksTo as Record<string, unknown> | undefined;
  if (!rawLinksTo) {
    return undefined;
  }

  const linksTo: LinksTo = {};

  if (rawLinksTo.upstream) {
    linksTo.upstream = rawLinksTo.upstream as LinksToUpstream;
  }
  if (rawLinksTo.downstream) {
    linksTo.downstream = rawLinksTo.downstream as LinksToDownstream;
  }
  if (rawLinksTo.verification) {
    linksTo.verification = rawLinksTo.verification as LinksToVerification;
  }

  return Object.keys(linksTo).length > 0 ? linksTo : undefined;
}

// =============================================================================
// DATA EXTRACTION
// =============================================================================

/**
 * Extract analysis data from handoff and task result
 */
export function extractAnalysisData(
  handoff: Handoff,
  taskResult: TaskResultWithOutput
): EvidenceAnalysis {
  const output = taskResult.output || {};

  return {
    agentId: handoff.metadata.fromAgent.id,
    taskId: taskResult.taskId,
    memoryName: (output.memoryWritten as string) || `ANALYSIS_${taskResult.taskId}`,
    traceabilityData: {
      analyzed_symbols: (output.analyzedSymbols as string[]) || [],
      entry_points: (output.entryPoints as string[]) || [],
      data_flow_map: (output.dataFlowMap as Record<string, string>) || {}
    },
    linksTo: extractLinksTo(output)
  };
}

/**
 * Extract implementation data from handoff and task result
 */
export function extractImplementationData(
  handoff: Handoff,
  taskResult: TaskResultWithOutput
): EvidenceImplementation {
  const output = taskResult.output || {};

  // Extract filesModified from handoff or output
  const filesModified = handoff.fileModifications?.map((f) => ({
    path: f.path,
    action: f.action,
    summary: f.summary || ""
  })) || [];

  return {
    agentId: handoff.metadata.fromAgent.id,
    taskId: taskResult.taskId,
    filesModified,
    symbolsChanged: (output.symbolsChanged as string[]) || [],
    typecheckPassed: (output.typecheckPassed as boolean) ?? true,
    linksTo: extractLinksTo(output)
  };
}

/**
 * Extract validation data from handoff and task result
 */
export function extractValidationData(
  handoff: Handoff,
  taskResult: TaskResultWithOutput
): EvidenceValidation {
  const output = taskResult.output || {};

  return {
    agentId: handoff.metadata.fromAgent.id,
    taskId: taskResult.taskId,
    testsPassed: (output.testsPassed as number) || 0,
    testsFailed: (output.testsFailed as number) || 0,
    screenshots: (output.screenshots as string[]) || taskResult.evidence || [],
    linksTo: extractLinksTo(output)
  };
}

/**
 * Extract acceptance criteria from task result
 */
export function extractAcceptanceCriteria(
  taskResult: TaskResultWithOutput
): string[] {
  const output = taskResult.output || {};
  if (Array.isArray(output.acceptanceCriteria)) {
    return output.acceptanceCriteria as string[];
  }
  if (Array.isArray(output.expectedBehaviors)) {
    return output.expectedBehaviors as string[];
  }
  return [];
}
