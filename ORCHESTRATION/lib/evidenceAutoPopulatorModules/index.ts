/**
 * EVIDENCE AUTO-POPULATOR MODULES
 * Re-exports for modular evidence chain management
 */

// Types
export type { AutoPopulateResult } from "./chain-ops.js";
export type { TaskResultWithOutput } from "./extraction.js";

// Extraction functions
export {
  extractLinksTo,
  extractAnalysisData,
  extractImplementationData,
  extractValidationData,
  extractAcceptanceCriteria
} from "./extraction.js";

// Population functions
export {
  populateAnalystEvidence,
  populateDeveloperEvidence,
  populateBrowserEvidence
} from "./population.js";

// Chain operations
export {
  findExistingChain,
  calculateChainStatus,
  updateExistingChain
} from "./chain-ops.js";
