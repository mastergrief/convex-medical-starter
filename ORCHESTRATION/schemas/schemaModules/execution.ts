/**
 * EXECUTION SCHEMAS
 * Gate validation, parallel execution, and dispatch schemas
 */

import { z } from "zod";
import { AgentTypeSchema } from "./foundation.js";
import { TraceabilityDataSchema } from "./components.js";

// =============================================================================
// PHASE GATE SCHEMAS
// =============================================================================

export const GateValidationSchema = z.object({
  requiredMemories: z.array(z.string()).optional(),
  requiredTraceability: z.array(z.string()).optional(),
  requiredTypecheck: z.boolean().optional(),
  requiredTests: z.boolean().optional(),
  customChecks: z.array(z.object({
    name: z.string(),
    command: z.string(),
    expectedOutput: z.string().optional()
  })).optional(),
  // New DSL fields for evidence integration
  requiredEvidence: z.boolean().optional(),
  requiredCoverage: z.number().min(0).max(100).optional(),
  condition: z.string().optional() // Full DSL condition string
});

export type GateValidation = z.infer<typeof GateValidationSchema>;

export const GateResultSchema = z.object({
  phaseId: z.string(),
  passed: z.boolean(),
  checkedAt: z.string().datetime(),
  results: z.array(z.object({
    check: z.string(),
    passed: z.boolean(),
    message: z.string().optional()
  })),
  blockers: z.array(z.string()),
  duration: z.number().optional()
});;

export type GateResult = z.infer<typeof GateResultSchema>;

// =============================================================================
// MEMORY BRIDGE SCHEMAS
// =============================================================================

export const LinkedMemorySchema = z.object({
  memoryName: z.string(),
  serenaPath: z.string(),
  linkedAt: z.string().datetime(),
  forAgents: z.array(AgentTypeSchema),
  traceabilityData: TraceabilityDataSchema.optional(),
  summary: z.string().optional()
});

export type LinkedMemory = z.infer<typeof LinkedMemorySchema>;

// =============================================================================
// PARALLEL EXECUTION SCHEMAS
// =============================================================================

export const ParallelGroupSchema = z.object({
  groupId: z.string(),
  tasks: z.array(z.object({
    taskId: z.string(),
    agentType: AgentTypeSchema,
    prompt: z.string(),
    estimatedTokens: z.number().int().positive().optional()
  })),
  waitForAll: z.boolean().default(true)
});

export type ParallelGroup = z.infer<typeof ParallelGroupSchema>;

export const ExecutionStrategySchema = z.object({
  id: z.string().uuid(),
  type: z.literal("execution_strategy"),
  metadata: z.object({
    planId: z.string().uuid(),
    sessionId: z.string(),
    timestamp: z.string().datetime(),
    version: z.literal("1.0.0")
  }),
  phases: z.array(z.object({
    phaseId: z.string(),
    phaseName: z.string(),
    parallelGroups: z.array(ParallelGroupSchema),
    sequentialTasks: z.array(z.object({
      taskId: z.string(),
      agentType: AgentTypeSchema,
      prompt: z.string(),
      dependsOn: z.array(z.string()),
      estimatedTokens: z.number().int().positive().optional()
    })),
    gateValidation: GateValidationSchema.optional()
  })),
  tokenBudget: z.object({
    total: z.number().int().positive(),
    byPhase: z.record(z.string(), z.number().int().positive()),
    percentOfLimit: z.number().min(0).max(100)
  }),
  recommendations: z.array(z.string()).optional()
});

export type ExecutionStrategy = z.infer<typeof ExecutionStrategySchema>;

// =============================================================================
// DISPATCH INSTRUCTION SCHEMAS (for parallel engine)
// =============================================================================

// Single agent dispatch instruction
export const AgentDispatchSchema = z.object({
  taskId: z.string(),
  agentType: AgentTypeSchema,
  prompt: z.string(),
  runInBackground: z.boolean().default(false), // Always foreground by default
  estimatedTokens: z.number().int().positive().optional()
});

export type AgentDispatch = z.infer<typeof AgentDispatchSchema>;

// Full dispatch instruction for a parallel group
export const DispatchInstructionSchema = z.object({
  groupId: z.string(),
  phaseId: z.string(),
  spawnTogether: z.boolean().default(true), // Spawn all in single message
  agents: z.array(AgentDispatchSchema),
  afterSpawn: z.object({
    waitForAll: z.boolean().default(true),
    collectHandoffs: z.boolean().default(true),
    validateGate: z.boolean().default(false)
  }),
  metadata: z.object({
    timestamp: z.string().datetime(),
    totalEstimatedTokens: z.number().int().positive(),
    dependsOnGroups: z.array(z.string()).default([])
  })
});

export type DispatchInstruction = z.infer<typeof DispatchInstructionSchema>;
