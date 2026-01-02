/**
 * Template Processor for Orchestration System
 *
 * FACADE MODULE - Re-exports all functionality from templateProcessorModules/
 *
 * Provides template management for pre-built workflow patterns:
 * - Load and validate session templates
 * - Instantiate templates with variable substitution
 * - Create templates from existing plans
 *
 * @module template-processor
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
} from "./templateProcessorModules/schemas.js";

// =============================================================================
// Types
// =============================================================================

export type {
  TemplateInfo,
  ValidationResult,
  InstantiationResult,
} from "./templateProcessorModules/types.js";

// =============================================================================
// Validation Functions
// =============================================================================

export {
  validate,
  validateStructure,
  detectCircularDependencies,
  extractVariables,
} from "./templateProcessorModules/validation.js";

// =============================================================================
// Instantiation Functions
// =============================================================================

export {
  substituteVariables,
  extractVariablesFromPlan,
  instantiate,
  createTemplateFromPlan,
} from "./templateProcessorModules/instantiation.js";

// =============================================================================
// Template Processor Class and Factory Functions
// =============================================================================

export {
  DEFAULT_TEMPLATES_DIR,
  TemplateProcessor,
  createTemplateProcessor,
  loadTemplateById,
  instantiateTemplate,
} from "./templateProcessorModules/processor.js";
