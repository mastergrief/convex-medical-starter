/**
 * Template Processor Schemas
 *
 * Zod schemas and inferred types for template processing.
 * All schemas are defined here to avoid circular dependencies.
 */

import { z } from "zod";
import { AgentTypeSchema, PrioritySchema } from "../../schemas/index.js";

// =============================================================================
// Template Variable Schema
// =============================================================================

/**
 * Template variable definition
 */
export const TemplateVariableSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  default: z.string().optional(),
  required: z.boolean(),
});

export type TemplateVariable = z.infer<typeof TemplateVariableSchema>;

// =============================================================================
// Template Subtask Schema
// =============================================================================

/**
 * Individual subtask within a template phase
 */
export const TemplateSubtaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  agentType: AgentTypeSchema,
  priority: PrioritySchema,
  dependencies: z.array(z.string()).default([]),
  estimatedTokens: z.number().int().positive().optional(),
});

export type TemplateSubtask = z.infer<typeof TemplateSubtaskSchema>;

// =============================================================================
// Template Phase Schema
// =============================================================================

/**
 * Template phase containing subtasks
 */
export const TemplatePhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  subtasks: z.array(TemplateSubtaskSchema),
  parallelizable: z.boolean().default(false),
  gateCondition: z.string().optional(),
});

export type TemplatePhase = z.infer<typeof TemplatePhaseSchema>;

// =============================================================================
// Session Template Schema
// =============================================================================

/**
 * Complete session template definition
 */
export const SessionTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  variables: z.array(TemplateVariableSchema).default([]),
  phases: z.array(TemplatePhaseSchema),
  estimatedTokens: z.number().int().positive().optional(),
});

export type SessionTemplate = z.infer<typeof SessionTemplateSchema>;

// =============================================================================
// Template Registry Schemas
// =============================================================================

/**
 * Entry in the template registry
 */
export const TemplateRegistryEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  file: z.string(),
});

export type TemplateRegistryEntry = z.infer<typeof TemplateRegistryEntrySchema>;

/**
 * Template registry containing all available templates
 */
export const TemplateRegistrySchema = z.object({
  version: z.string(),
  templates: z.array(TemplateRegistryEntrySchema),
});

export type TemplateRegistry = z.infer<typeof TemplateRegistrySchema>;
