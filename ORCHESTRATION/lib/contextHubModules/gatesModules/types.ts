/**
 * GATES MODULE TYPES
 * Type definitions and interfaces for gate operations
 */

import type { GateResult } from "../../../schemas/index.js";

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Result of advancing to the next phase
 */
export interface AdvancePhaseResult {
  success: boolean;
  nextPhase?: string;
  gateResult: GateResult;
  error?: string;
}

/**
 * Result of evidence checking operations
 */
export interface EvidenceCheckResult {
  passed: boolean;
  message: string;
}
