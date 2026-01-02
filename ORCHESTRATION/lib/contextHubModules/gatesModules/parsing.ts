/**
 * GATE CONDITION PARSING
 * Parse gate condition strings into validation objects
 */

import type { GateValidation } from "../../../schemas/index.js";

// =============================================================================
// PARSING FUNCTIONS
// =============================================================================

/**
 * Parse gate condition string into validation object
 * Handles legacy format patterns like "typecheck", "memory:ANALYSIS_*", "tests"
 */
export function parseGateCondition(condition: string): GateValidation {
  const validation: GateValidation = {};

  // Parse patterns like "typecheck" or "memory:ANALYSIS_*" or "tests"
  const parts = condition.split(/[,;\s]+/).filter(Boolean);

  for (const part of parts) {
    const lowerPart = part.toLowerCase();

    if (lowerPart === "typecheck") {
      validation.requiredTypecheck = true;
    } else if (lowerPart === "tests") {
      validation.requiredTests = true;
    } else if (lowerPart.startsWith("memory:")) {
      validation.requiredMemories = validation.requiredMemories || [];
      validation.requiredMemories.push(part.substring(7));
    } else if (lowerPart.startsWith("traceability:")) {
      validation.requiredTraceability = validation.requiredTraceability || [];
      validation.requiredTraceability.push(part.substring(13));
    }
  }

  return validation;
}
