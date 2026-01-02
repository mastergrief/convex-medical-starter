/**
 * CONTRACT SCHEMAS
 * Core contract definitions: Prompt, Plan, Handoff
 */

import { z } from "zod";
import { AgentTypeSchema, PrioritySchema } from "./foundation.js";
import {
  SessionIdSchema,
  PromptMetadataSchema,
  ContextFileSchema,
  FileModificationSchema,
  DiscoverySchema,
  TaskResultSchema,
  TokenUsageSchema,
  HandoffReasonSchema
} from "./components.js";

// =============================================================================
// PROMPT SCHEMA (Parent -> Plan Agent)
// =============================================================================

export const PromptSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("prompt"),
  metadata: PromptMetadataSchema,
  request: z.object({
    description: z.string().min(1),
    arguments: z.record(z.string(), z.unknown()).optional(),
    constraints: z.array(z.string()).optional(),
    successCriteria: z.array(z.string()).optional()
  }),
  context: z.object({
    files: z.array(ContextFileSchema).optional(),
    memories: z.array(z.string()).optional(),
    priorResults: z.record(z.string(), z.unknown()).optional()
  }).optional()
});

export type Prompt = z.infer<typeof PromptSchema>;

// =============================================================================
// PLAN SCHEMA (Plan Agent -> Orchestrator)
// =============================================================================

export const SubtaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  agentType: AgentTypeSchema,
  priority: PrioritySchema,
  dependencies: z.array(z.string()).default([]),
  estimatedTokens: z.number().int().positive().optional(),
  context: z.object({
    files: z.array(z.string()).optional(),
    memories: z.array(z.string()).optional(),
    symbols: z.array(z.string()).optional(),
    prompt: z.string().optional()
  }).optional(),
  acceptanceCriteria: z.array(z.string()).optional()
});

export type Subtask = z.infer<typeof SubtaskSchema>;

export const PhaseSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  subtasks: z.array(SubtaskSchema),
  parallelizable: z.boolean().default(false),
  gateCondition: z.string().optional()
});

export type Phase = z.infer<typeof PhaseSchema>;

export const PlanSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("plan"),
  metadata: z.object({
    promptId: z.string().uuid(),
    sessionId: SessionIdSchema,
    timestamp: z.string().datetime(),
    version: z.literal("1.0.0")
  }),
  summary: z.string(),
  phases: z.array(PhaseSchema),
  totalEstimatedTokens: z.number().int().positive().optional(),
  risks: z.array(z.object({
    description: z.string(),
    mitigation: z.string(),
    severity: PrioritySchema
  })).optional()
});

export type Plan = z.infer<typeof PlanSchema>;

// =============================================================================
// HANDOFF SCHEMA (Agent -> Next Agent or Orchestrator)
// =============================================================================

export const HandoffSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("handoff"),
  metadata: z.object({
    sessionId: SessionIdSchema,
    planId: z.string().uuid(),
    fromAgent: z.object({
      type: AgentTypeSchema,
      id: z.string()
    }),
    toAgent: z.object({
      type: AgentTypeSchema,
      id: z.string().optional()
    }),
    timestamp: z.string().datetime(),
    version: z.literal("1.0.0")
  }),
  reason: HandoffReasonSchema,
  tokenUsage: TokenUsageSchema.optional(),
  state: z.object({
    currentPhase: z.string(),
    currentTask: z.string().optional(),
    completedTasks: z.array(z.string()),
    pendingTasks: z.array(z.string()),
    blockedTasks: z.array(z.string()).optional()
  }),
  results: z.array(TaskResultSchema),
  discoveries: z.array(DiscoverySchema).optional(),
  fileModifications: z.array(FileModificationSchema).optional(),
  context: z.object({
    criticalContext: z.string(),
    resumeInstructions: z.string(),
    warnings: z.array(z.string()).optional()
  }),
  nextActions: z.array(z.object({
    action: z.string(),
    agentType: AgentTypeSchema,
    priority: PrioritySchema
  }))
});

export type Handoff = z.infer<typeof HandoffSchema>;
