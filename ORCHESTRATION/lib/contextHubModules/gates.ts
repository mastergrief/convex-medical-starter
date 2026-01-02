/**
 * GATES MODULE (FACADE)
 * Phase gate checking and advancement operations
 *
 * This is a facade that re-exports from gatesModules/ for API compatibility.
 * All implementations are in the focused modules under gatesModules/
 *
 * ## Module Structure
 * - `gatesModules/types.ts`: Type definitions (AdvancePhaseResult, EvidenceCheckResult)
 * - `gatesModules/parsing.ts`: Gate condition parsing (parseGateCondition)
 * - `gatesModules/evidence.ts`: Evidence checking (checkEvidenceExists, checkEvidenceCoverage)
 * - `gatesModules/io.ts`: Gate result I/O (writeGateResult, readGateResult, listGateResults)
 * - `gatesModules/checking.ts`: Core gate validation (checkGate, checkGateAsync)
 * - `gatesModules/advancement.ts`: Phase advancement (advancePhase)
 *
 * ## Gate DSL Syntax
 * Gates use a Domain-Specific Language (DSL) to define conditions for phase advancement:
 *
 * ### Simple Checks
 * - `"typecheck"` - TypeScript compilation must pass
 * - `"tests"` - Test suite must pass
 * - `"lint"` - Linting must pass
 * - `"manual_override"` - Always passes (for manual approval flows)
 *
 * ### Evidence Checks
 * - `"evidence_exists(chain-id)"` - Specific evidence chain must exist
 * - `"evidence_coverage(80)"` - Average evidence coverage >= 80%
 *
 * ### Compound Conditions
 * - `"typecheck AND tests"` - Both conditions must pass
 * - `"typecheck OR manual_override"` - Either condition must pass
 * - `"(typecheck AND tests) OR manual_override"` - Grouped expressions
 *
 * @example
 * // Import gate functions from facade
 * import { checkGate, advancePhase, parseGateCondition } from "./gates.js";
 *
 * // Check a compound gate condition
 * const result = checkGate("phase-1", { typecheckPassed: true, testsPassed: false });
 *
 * // Parse a complex gate DSL expression
 * const parsed = parseGateCondition("(typecheck AND tests) OR manual_override");
 *
 * @module gates
 * @see gatesModules/checking for checkGate and checkGateAsync implementations
 * @see gatesModules/advancement for advancePhase implementation
 * @see gatesModules/evidence for evidence checking functions
 * @see gatesModules/io for gate result persistence
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type { AdvancePhaseResult, EvidenceCheckResult } from "./gatesModules/index.js";

// =============================================================================
// FUNCTION EXPORTS
// =============================================================================

export {
  // Parsing
  parseGateCondition,
  // Evidence
  checkEvidenceCoverage,
  checkEvidenceExists,
  // I/O
  writeGateResult,
  readGateResult,
  listGateResults,
  // Checking
  checkGate,
  checkGateAsync,
  // Advancement
  advancePhase
} from "./gatesModules/index.js";
