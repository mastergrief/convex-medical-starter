/**
 * PHASE ADVANCEMENT
 * Logic for advancing phases after gate checks pass
 */

import {
  GateValidation,
  GateResult,
  Plan,
  OrchestratorState,
  createTimestamp
} from "../../../schemas/index.js";
import type { ContextHubConfig, WriteResult, ReadResult } from "../types.js";
import type { AdvancePhaseResult } from "./types.js";

// =============================================================================
// PHASE ADVANCEMENT
// =============================================================================

/**
 * Advances to the next phase after verifying gate conditions are met.
 *
 * This function orchestrates phase transitions by:
 * 1. Checking the gate conditions for the current phase
 * 2. If passed, finding the next phase in the plan
 * 3. Updating the orchestrator state with the new phase
 * 4. Appending a "phase_advance" entry to history
 *
 * Gate conditions are evaluated using the Gate DSL which supports:
 * - Simple checks: "typecheck", "tests", "lint"
 * - Compound conditions: "typecheck AND tests"
 * - Complex expressions: "(typecheck AND tests) OR manual_override"
 *
 * @description Validates gate conditions and advances to next phase if passed
 * @param _config - Context hub configuration (currently unused, reserved for future use)
 * @param phaseId - Current phase identifier to advance from (e.g., "phase-1", "development")
 * @param validation - Optional GateValidation object containing:
 *   - typecheckPassed: boolean for typecheck gate
 *   - testsPassed: boolean for tests gate
 *   - lintPassed: boolean for lint gate
 *   - evidenceCoverage: number for coverage threshold gates
 *   - customChecks: Map of custom gate check results
 * @param checkGateFn - Function to evaluate gate conditions for the phase
 * @param readPlan - Function to retrieve the current plan containing phase definitions
 * @param readOrchestratorState - Function to read current orchestrator state
 * @param writeOrchestratorState - Function to persist updated orchestrator state
 * @param appendHistory - Callback to append "phase_advance" entry to session history
 * @returns AdvancePhaseResult containing:
 *   - success: true if phase was advanced successfully
 *   - nextPhase: ID of the next phase, undefined if this was the final phase
 *   - gateResult: The GateResult from checking the gate conditions
 *   - error: Error message if advancement failed
 *
 * @example
 * // Advance after passing "typecheck AND tests" gate
 * const result = advancePhase(
 *   config,
 *   "development",
 *   { typecheckPassed: true, testsPassed: true },
 *   checkGateFn,
 *   readPlan,
 *   readOrchestratorState,
 *   writeOrchestratorState,
 *   appendHistory
 * );
 * if (result.success) {
 *   console.log(`Advanced to: ${result.nextPhase || 'COMPLETE'}`);
 * }
 *
 * @example
 * // Handle gate failure with "(typecheck AND tests) OR manual_override"
 * const result = advancePhase(config, "analysis", validation, ...);
 * if (!result.success) {
 *   console.error('Gate failed:', result.error);
 *   console.log('Blockers:', result.gateResult.blockers);
 *   // Output: "Gate check failed: typecheck, tests"
 * }
 *
 * @example
 * // Detect phase not found in plan
 * const result = advancePhase(config, "nonexistent-phase", validation, ...);
 * if (!result.success && result.error?.includes('not found')) {
 *   console.error('Phase does not exist in current plan');
 * }
 *
 * @throws Never throws - all errors are captured in AdvancePhaseResult.error
 * @see checkGate for Gate DSL condition evaluation
 * @see parseGateCondition for Gate DSL syntax parsing
 * @see writeGateResult for persisting gate check results
 */
export function advancePhase(
  _config: ContextHubConfig,
  phaseId: string,
  validation: GateValidation | undefined,
  checkGateFn: (phaseId: string, validation?: GateValidation) => GateResult,
  readPlan: () => ReadResult<Plan>,
  readOrchestratorState: () => ReadResult<OrchestratorState>,
  writeOrchestratorState: (state: OrchestratorState) => WriteResult,
  appendHistory: (type: string, id: string) => void
): AdvancePhaseResult {
  // Check gate first
  const gateResult = checkGateFn(phaseId, validation);

  if (!gateResult.passed) {
    return {
      success: false,
      gateResult,
      error: `Gate check failed: ${gateResult.blockers.join(", ")}`
    };
  }

  // Get current plan to find next phase
  const planResult = readPlan();
  if (!planResult.success || !planResult.data) {
    return {
      success: false,
      gateResult,
      error: "No plan found"
    };
  }

  const phases = planResult.data.phases;
  const currentIndex = phases.findIndex(p => p.id === phaseId);

  if (currentIndex === -1) {
    return {
      success: false,
      gateResult,
      error: `Phase '${phaseId}' not found in plan`
    };
  }

  const nextPhase = phases[currentIndex + 1];

  // Update orchestrator state
  const stateResult = readOrchestratorState();
  if (stateResult.success && stateResult.data) {
    const updatedState: OrchestratorState = {
      ...stateResult.data,
      currentPhase: nextPhase
        ? { id: nextPhase.id, name: nextPhase.name, progress: 0 }
        : { ...stateResult.data.currentPhase, progress: 100 },
      metadata: {
        ...stateResult.data.metadata,
        timestamp: createTimestamp()
      }
    };
    writeOrchestratorState(updatedState);
  }

  appendHistory("phase_advance", nextPhase?.id || "complete");

  return {
    success: true,
    nextPhase: nextPhase?.id,
    gateResult
  };
}
