/**
 * GATE I/O OPERATIONS
 * Reading and writing gate results to persistent storage
 */

import * as fs from "fs";
import * as path from "path";
import type { GateResult } from "../../../schemas/index.js";
import type { ContextHubConfig, WriteResult, ReadResult, GateListItem } from "../types.js";

// =============================================================================
// GATE RESULT I/O
// =============================================================================

import { logWarn } from "../../utils/logger.js";

/**
 * Writes a gate result to persistent storage for audit and retrieval.
 *
 * Persists the gate check result to the session's gates directory with both
 * a timestamped filename for history and a "latest" file for quick lookups.
 * Also appends to the session history log.
 *
 * @description Persists gate check results to disk with timestamped and latest versions
 * @param config - Context hub configuration containing sessionPath
 * @param result - The gate check result to persist, containing:
 *   - phaseId: Phase identifier (e.g., "phase-1", "analysis")
 *   - passed: Whether all gate conditions were satisfied
 *   - checkedAt: ISO timestamp of when the check occurred
 *   - results: Array of individual check results
 *   - blockers: Array of blocking condition descriptions
 * @param appendHistory - Callback to append "gate_check" entry to session history
 * @returns WriteResult with success status, file path, and optional error message
 *
 * @example
 * // After evaluating a phase gate with DSL condition "typecheck AND tests"
 * const result: GateResult = {
 *   phaseId: "development",
 *   passed: true,
 *   checkedAt: "2024-01-15T10:30:00.000Z",
 *   results: [
 *     { check: "typecheck", passed: true, message: "No TypeScript errors" },
 *     { check: "tests", passed: true, message: "All 42 tests passing" }
 *   ],
 *   blockers: []
 * };
 * const writeResult = writeGateResult(config, result, appendHistory);
 * // Creates: gates/gate-development-2024-01-15T10-30-00-000Z.json
 * // Updates: gates/gate-development-latest.json
 *
 * @throws Never throws - errors are captured in the returned WriteResult.error
 * @see parseGateCondition for Gate DSL syntax
 * @see checkGate for evaluating gate conditions
 */
export function writeGateResult(
  config: ContextHubConfig,
  result: GateResult,
  appendHistory: (type: string, id: string) => void
): WriteResult {
  try {
    const gatesDir = path.join(config.sessionPath, "gates");
    if (!fs.existsSync(gatesDir)) {
      fs.mkdirSync(gatesDir, { recursive: true });
    }

    const timestamp = result.checkedAt.replace(/[:.]/g, "-");
    const filename = `gate-${result.phaseId}-${timestamp}.json`;
    const filepath = path.join(gatesDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(result, null, 2));

    // Update latest gate result for this phase
    const latestPath = path.join(gatesDir, `gate-${result.phaseId}-latest.json`);
    fs.writeFileSync(latestPath, JSON.stringify(result, null, 2));

    appendHistory("gate_check", result.phaseId);

    return { success: true, path: filepath };
  } catch (error) {
    return {
      success: false,
      path: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Reads the latest gate result for a specific phase.
 *
 * Retrieves the most recent gate check result from the "latest" pointer file
 * for the specified phase. This provides quick access to the current gate
 * status without scanning the full history.
 *
 * @description Retrieves the most recent gate check result for a phase
 * @param config - Context hub configuration containing sessionPath
 * @param phaseId - Phase identifier to retrieve results for (e.g., "phase-1", "analysis")
 * @returns ReadResult containing:
 *   - success: true if gate result was found and parsed
 *   - data: GateResult object with phaseId, passed, checkedAt, results, blockers
 *   - path: Filesystem path to the retrieved file
 *   - error: Error message if retrieval failed
 *
 * @example
 * // Read gate result after checking "(typecheck AND tests) OR manual_override"
 * const result = readGateResult(config, "development");
 * if (result.success && result.data) {
 *   console.log(`Phase ${result.data.phaseId}: ${result.data.passed ? 'PASSED' : 'BLOCKED'}`);
 *   if (!result.data.passed) {
 *     console.log('Blockers:', result.data.blockers.join(', '));
 *   }
 * }
 *
 * @example
 * // Check if a phase gate was never evaluated
 * const result = readGateResult(config, "testing");
 * if (!result.success) {
 *   console.log('No gate result found - phase not yet checked');
 * }
 *
 * @throws Never throws - errors are captured in the returned ReadResult.error
 * @see writeGateResult for persisting gate results
 * @see listGateResults for retrieving gate history
 */
export function readGateResult(config: ContextHubConfig, phaseId: string): ReadResult<GateResult> {
  try {
    const gatesDir = path.join(config.sessionPath, "gates");
    const latestPath = path.join(gatesDir, `gate-${phaseId}-latest.json`);

    if (!fs.existsSync(latestPath)) {
      return { success: false, error: `No gate result found for phase: ${phaseId}` };
    }

    const content = fs.readFileSync(latestPath, "utf-8");
    const data = JSON.parse(content) as GateResult;

    return { success: true, data, path: latestPath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Lists all gate results with optional filtering by phase.
 *
 * Scans the gates directory for all historical gate check results, excluding
 * the "latest" pointer files. Results are sorted by checkedAt timestamp in
 * descending order (most recent first).
 *
 * @description Lists gate check history with optional phase filtering
 * @param config - Context hub configuration containing sessionPath
 * @param phaseId - Optional phase identifier to filter results (e.g., "phase-1", "analysis")
 * @returns Array of GateListItem objects containing:
 *   - phaseId: Phase identifier the gate was checked for
 *   - passed: Whether the gate check passed
 *   - checkedAt: ISO timestamp of when the check occurred
 *
 * @example
 * // List all gate results across phases
 * const allResults = listGateResults(config);
 * console.log(`Total gate checks: ${allResults.length}`);
 * allResults.forEach(r => {
 *   console.log(`${r.phaseId}: ${r.passed ? 'PASSED' : 'FAILED'} at ${r.checkedAt}`);
 * });
 *
 * @example
 * // Filter to show only development phase gate history
 * // Useful for tracking gate attempts with DSL like "typecheck AND tests"
 * const devResults = listGateResults(config, "development");
 * const failedAttempts = devResults.filter(r => !r.passed);
 * console.log(`Development phase: ${failedAttempts.length} failed attempts`);
 *
 * @example
 * // Check if any phase gates are failing
 * const results = listGateResults(config);
 * const latestByPhase = new Map<string, GateListItem>();
 * results.forEach(r => {
 *   if (!latestByPhase.has(r.phaseId)) {
 *     latestByPhase.set(r.phaseId, r);
 *   }
 * });
 *
 * @throws Never throws - invalid files are silently skipped with warning logged
 * @see readGateResult for retrieving the latest result for a specific phase
 * @see writeGateResult for persisting new gate results
 */
export function listGateResults(config: ContextHubConfig, phaseId?: string): GateListItem[] {
  const gatesDir = path.join(config.sessionPath, "gates");
  if (!fs.existsSync(gatesDir)) return [];

  const files = fs.readdirSync(gatesDir)
    .filter(f => f.startsWith("gate-") && f.endsWith(".json") && !f.includes("-latest.json"));

  const results: GateListItem[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(gatesDir, file), "utf-8");
      const data = JSON.parse(content) as GateResult;

      if (!phaseId || data.phaseId === phaseId) {
        results.push({
          phaseId: data.phaseId,
          passed: data.passed,
          checkedAt: data.checkedAt
        });
      }
    } catch (error) {
      logWarn("gates:io:listGateResults", error);
      // Skip invalid files
    }
  }

  return results.sort((a, b) => b.checkedAt.localeCompare(a.checkedAt));
}
