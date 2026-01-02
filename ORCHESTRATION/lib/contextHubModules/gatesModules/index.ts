/**
 * GATES MODULES
 * Modular implementation of phase gate checking and advancement
 *
 * Module structure:
 * - types.ts: Type definitions (AdvancePhaseResult, EvidenceCheckResult)
 * - parsing.ts: Gate condition parsing
 * - evidence.ts: Evidence coverage and existence checking
 * - io.ts: Gate result I/O operations
 * - checking.ts: Core gate validation (checkGate, checkGateAsync)
 * - advancement.ts: Phase advancement logic
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { AdvancePhaseResult, EvidenceCheckResult } from "./types.js";

// =============================================================================
// PARSING EXPORTS
// =============================================================================

export { parseGateCondition } from "./parsing.js";

// =============================================================================
// EVIDENCE EXPORTS
// =============================================================================

export { checkEvidenceCoverage, checkEvidenceExists } from "./evidence.js";

// =============================================================================
// I/O EXPORTS
// =============================================================================

export { writeGateResult, readGateResult, listGateResults } from "./io.js";

// =============================================================================
// CHECKING EXPORTS
// =============================================================================

export { checkGate, checkGateAsync } from "./checking.js";

// =============================================================================
// ADVANCEMENT EXPORTS
// =============================================================================

export { advancePhase } from "./advancement.js";
