/**
 * EVIDENCE CHECKING
 * Functions for checking evidence coverage and existence
 */

import * as fs from "fs";
import * as path from "path";
import type { ContextHubConfig } from "../types.js";
import type { EvidenceCheckResult } from "./types.js";

// =============================================================================
// EVIDENCE CHECKING FUNCTIONS
// =============================================================================

import { logWarn } from "../../utils/logger.js";

/**
 * Checks if evidence coverage meets the minimum threshold.
 *
 * Scans all evidence chain files in the session's evidence directory and
 * calculates the average coverage percentage. This is used as a gate condition
 * to ensure adequate test coverage before phase advancement.
 *
 * Coverage is extracted from each evidence chain's `chainStatus.coveragePercent`
 * field. Files without valid coverage data are skipped with a warning.
 *
 * @description Validates that average evidence coverage meets minimum threshold
 * @param config - Context hub configuration containing sessionPath
 * @param minCoverage - Minimum coverage percentage required (0-100)
 * @returns Promise resolving to EvidenceCheckResult containing:
 *   - passed: true if average coverage >= minCoverage
 *   - message: Human-readable status with actual vs required coverage
 *
 * @example
 * // Check 80% coverage threshold for gate condition "evidence_coverage(80)"
 * const result = await checkEvidenceCoverage(config, 80);
 * if (result.passed) {
 *   console.log(result.message);
 *   // Output: "Coverage: 85.5% (required: 80%)"
 * } else {
 *   console.log('Coverage too low:', result.message);
 *   // Output: "Coverage: 65.0% (required: 80%)"
 * }
 *
 * @example
 * // Handle missing evidence directory
 * const result = await checkEvidenceCoverage(config, 50);
 * if (!result.passed && result.message === "No evidence directory found") {
 *   console.log('Evidence collection has not started');
 * }
 *
 * @example
 * // Use in compound gate DSL: "typecheck AND evidence_coverage(75)"
 * // The gate parser extracts the threshold value and calls this function
 *
 * @throws Never throws - errors result in failed check with descriptive message
 * @see checkEvidenceExists for checking specific evidence chain existence
 * @see checkGate for integrating with Gate DSL evaluation
 */
export async function checkEvidenceCoverage(
  config: ContextHubConfig,
  minCoverage: number
): Promise<EvidenceCheckResult> {
  const evidenceDir = path.join(config.sessionPath, "evidence");

  if (!fs.existsSync(evidenceDir)) {
    return {
      passed: false,
      message: "No evidence directory found"
    };
  }

  const files = fs.readdirSync(evidenceDir).filter(f => f.endsWith(".json"));

  if (files.length === 0) {
    return {
      passed: false,
      message: "No evidence chains found"
    };
  }

  let totalCoverage = 0;
  let count = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(evidenceDir, file), "utf-8");
      const data = JSON.parse(content);
      if (typeof data.chainStatus?.coveragePercent === "number") {
        totalCoverage += data.chainStatus.coveragePercent;
        count++;
      }
    } catch (error) {
      logWarn("gates:evidence:checkCoverage", error);
      // Skip invalid files
    }
  }

  const avgCoverage = count > 0 ? totalCoverage / count : 0;
  const passed = avgCoverage >= minCoverage;

  return {
    passed,
    message: `Coverage: ${avgCoverage.toFixed(1)}% (required: ${minCoverage}%)`
  };
}

/**
 * Checks if a specific evidence chain exists in the session.
 *
 * Verifies the existence of an evidence chain file by its ID. This is used
 * as a gate condition to ensure required evidence has been collected before
 * allowing phase advancement.
 *
 * Evidence chains are stored as JSON files in the session's evidence directory
 * with the naming pattern `{chainId}.json`.
 *
 * @description Validates that a specific evidence chain file exists
 * @param config - Context hub configuration containing sessionPath
 * @param chainId - Unique identifier for the evidence chain to check
 *   (e.g., "auth-flow-evidence", "api-validation-chain", "e2e-test-results")
 * @returns Promise resolving to EvidenceCheckResult containing:
 *   - passed: true if the evidence chain file exists
 *   - message: "Evidence chain found" or "Evidence chain not found"
 *
 * @example
 * // Check for required evidence chain in gate condition
 * // Gate DSL: "evidence_exists(auth-flow-evidence)"
 * const result = await checkEvidenceExists(config, "auth-flow-evidence");
 * if (result.passed) {
 *   console.log('Auth flow evidence collected');
 * } else {
 *   console.log('Missing required evidence:', result.message);
 * }
 *
 * @example
 * // Verify multiple evidence chains before phase advancement
 * const chains = ["api-tests", "e2e-tests", "integration-tests"];
 * for (const chainId of chains) {
 *   const result = await checkEvidenceExists(config, chainId);
 *   if (!result.passed) {
 *     console.error(`Missing evidence chain: ${chainId}`);
 *   }
 * }
 *
 * @example
 * // Use in compound gate DSL: "typecheck AND evidence_exists(developer-handoff)"
 * // Ensures both typecheck passes and handoff evidence was recorded
 *
 * @throws Never throws - missing files result in passed=false with message
 * @see checkEvidenceCoverage for checking coverage threshold across all chains
 * @see checkGate for integrating with Gate DSL evaluation
 */
export async function checkEvidenceExists(
  config: ContextHubConfig,
  chainId: string
): Promise<EvidenceCheckResult> {
  const chainPath = path.join(config.sessionPath, "evidence", `${chainId}.json`);
  const exists = fs.existsSync(chainPath);

  return {
    passed: exists,
    message: exists ? "Evidence chain found" : "Evidence chain not found"
  };
}
