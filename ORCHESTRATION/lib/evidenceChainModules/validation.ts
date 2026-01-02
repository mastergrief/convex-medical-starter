/**
 * EVIDENCE CHAIN VALIDATION
 * Validation and formatting utilities for evidence chains
 */

import type { EvidenceChain } from "../../schemas/index.js";

// =============================================================================
// TYPES
// =============================================================================

export interface ChainValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  coveragePercent: number;
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Format a human-readable chain summary
 */
export function formatChainSummary(chain: EvidenceChain): string {
  const lines: string[] = [];

  lines.push("EVIDENCE CHAIN SUMMARY");
  lines.push("=".repeat(50));
  lines.push(`ID: ${chain.id}`);
  lines.push(`Session: ${chain.sessionId}`);
  lines.push(`Created: ${chain.createdAt}`);
  lines.push(`Updated: ${chain.updatedAt}`);
  lines.push("");

  lines.push("REQUIREMENT");
  lines.push("-".repeat(50));
  lines.push(`Task: ${chain.requirement.taskId}`);
  lines.push(`Description: ${chain.requirement.description}`);
  lines.push(`Acceptance Criteria (${chain.requirement.acceptanceCriteria.length}):`);
  for (const criterion of chain.requirement.acceptanceCriteria) {
    lines.push(`  - ${criterion}`);
  }
  lines.push("");

  if (chain.analysis) {
    lines.push("ANALYSIS");
    lines.push("-".repeat(50));
    lines.push(`Agent: ${chain.analysis.agentId}`);
    lines.push(`Task: ${chain.analysis.taskId}`);
    lines.push(`Memory: ${chain.analysis.memoryName}`);
    lines.push(
      `Entry Points: ${chain.analysis.traceabilityData.entry_points.length}`
    );
    lines.push(
      `Analyzed Symbols: ${chain.analysis.traceabilityData.analyzed_symbols.length}`
    );
    lines.push("");
  }

  if (chain.implementation) {
    lines.push("IMPLEMENTATION");
    lines.push("-".repeat(50));
    lines.push(`Agent: ${chain.implementation.agentId}`);
    lines.push(`Task: ${chain.implementation.taskId}`);
    lines.push(`Files Modified: ${chain.implementation.filesModified.length}`);
    for (const file of chain.implementation.filesModified) {
      lines.push(`  - ${file.action}: ${file.path}`);
    }
    lines.push(`Symbols Changed: ${chain.implementation.symbolsChanged.length}`);
    lines.push(
      `Typecheck: ${chain.implementation.typecheckPassed ? "PASSED" : "FAILED"}`
    );
    lines.push("");
  }

  if (chain.validation) {
    lines.push("VALIDATION");
    lines.push("-".repeat(50));
    lines.push(`Agent: ${chain.validation.agentId}`);
    lines.push(`Task: ${chain.validation.taskId}`);
    lines.push(`Tests Passed: ${chain.validation.testsPassed}`);
    lines.push(`Tests Failed: ${chain.validation.testsFailed}`);
    lines.push(`Screenshots: ${chain.validation.screenshots.length}`);
    lines.push("");
  }

  lines.push("CHAIN STATUS");
  lines.push("-".repeat(50));
  lines.push(`Analysis Linked: ${chain.chainStatus.analysisLinked ? "YES" : "NO"}`);
  lines.push(
    `Implementation Linked: ${chain.chainStatus.implementationLinked ? "YES" : "NO"}`
  );
  lines.push(
    `Validation Linked: ${chain.chainStatus.validationLinked ? "YES" : "NO"}`
  );
  lines.push(`Coverage: ${chain.chainStatus.coveragePercent}%`);
  lines.push(
    `Criteria Verified: ${chain.chainStatus.acceptanceCriteriaVerified}/${chain.chainStatus.acceptanceCriteriaTotal}`
  );

  return lines.join("\n");
}
