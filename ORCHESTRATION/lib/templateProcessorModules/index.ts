/**
 * Template Processor Modules - Barrel Exports
 *
 * Re-exports all template processor functionality for modular architecture.
 */

// =============================================================================
// Schemas
// =============================================================================

export {
  TemplateVariableSchema,
  TemplateSubtaskSchema,
  TemplatePhaseSchema,
  SessionTemplateSchema,
  TemplateRegistryEntrySchema,
  TemplateRegistrySchema,
  type TemplateVariable,
  type TemplateSubtask,
  type TemplatePhase,
  type SessionTemplate,
  type TemplateRegistryEntry,
  type TemplateRegistry,
} from "./schemas.js";

// =============================================================================
// Types
// =============================================================================

export type {
  TemplateInfo,
  ValidationResult,
  InstantiationResult,
} from "./types.js";

// =============================================================================
// Validation
// =============================================================================

export {
  validate,
  validateStructure,
  detectCircularDependencies,
  extractVariables,
} from "./validation.js";

// =============================================================================
// Instantiation
// =============================================================================

export {
  substituteVariables,
  extractVariablesFromPlan,
  instantiate,
  createTemplateFromPlan,
} from "./instantiation.js";

// =============================================================================
// Processor
// =============================================================================

export {
  DEFAULT_TEMPLATES_DIR,
  TemplateProcessor,
  createTemplateProcessor,
  loadTemplateById,
  instantiateTemplate,
} from "./processor.js";
