/**
 * EVIDENCE CHAIN BUILDER - FACADE
 * Fluent API for creating and validating evidence chains
 *
 * This is a facade module that re-exports from focused modules:
 * - builder.ts: EvidenceChainBuilder class and factory function
 * - io.ts: File load/save operations
 * - validation.ts: Chain validation and formatting
 */

// =============================================================================
// RE-EXPORTS
// =============================================================================

// Builder class and factory
export {
  EvidenceChainBuilder,
  createEvidenceChain,
  type AnalysisParams,
  type ImplementationParams,
  type ValidationParams
} from "./evidenceChainModules/builder.js";

// I/O operations
export {
  loadEvidenceChain,
  saveEvidenceChain,
  listEvidenceChains
} from "./evidenceChainModules/io.js";

// Validation and formatting
export {
  formatChainSummary,
  type ChainValidationResult
} from "./evidenceChainModules/validation.js";
