/**
 * Template Processor Types
 *
 * Additional interfaces not covered by Zod inference.
 */

import type { Plan } from "../../schemas/index.js";
import type { TemplateVariable } from "./schemas.js";

// =============================================================================
// Template Info Interface
// =============================================================================

/**
 * Template metadata for listing/browsing templates
 */
export interface TemplateInfo {
  id: string;
  name: string;
  description: string;
  tags: string[];
  variables: TemplateVariable[];
  estimatedTokens?: number;
}

// =============================================================================
// Validation Result Interface
// =============================================================================

/**
 * Result of template validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// =============================================================================
// Instantiation Result Interface
// =============================================================================

/**
 * Result of template instantiation
 */
export interface InstantiationResult {
  success: boolean;
  plan?: Plan;
  errors: string[];
  missingVariables: string[];
  substitutedVariables: Record<string, string>;
}
