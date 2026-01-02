/**
 * STATE SCHEMAS
 * Orchestrator and token state tracking
 */

import { z } from "zod";
import { AgentTypeSchema, TaskStatusSchema } from "./foundation.js";
import {
  SessionIdSchema,
  TokenUsageSchema,
  AgentInstanceSchema
} from "./components.js";

// =============================================================================
// ORCHESTRATOR STATE SCHEMA (Internal State Tracking)
// =============================================================================

export const OrchestratorStateSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("orchestrator_state"),
  metadata: z.object({
    sessionId: SessionIdSchema,
    planId: z.string().uuid(),
    timestamp: z.string().datetime(),
    version: z.literal("1.0.0")
  }),
  status: z.enum(["initializing", "running", "paused", "completed", "failed"]),
  tokenUsage: TokenUsageSchema.optional(),
  currentPhase: z.object({
    id: z.string(),
    name: z.string(),
    progress: z.number().min(0).max(100)
  }),
  agents: z.array(AgentInstanceSchema),
  taskQueue: z.array(z.object({
    taskId: z.string(),
    status: TaskStatusSchema,
    assignedAgent: z.string().optional()
  })),
  handoffHistory: z.array(z.string()),
  errors: z.array(z.object({
    timestamp: z.string().datetime(),
    taskId: z.string().optional(),
    message: z.string(),
    recoverable: z.boolean()
  })).optional()
});

export type OrchestratorState = z.infer<typeof OrchestratorStateSchema>;

// =============================================================================
// TOKEN STATE SCHEMA (Persisted Token Tracker State)
// @deprecated Token tracking is no longer needed on Claude Max subscriptions.
// These schemas are kept for backward compatibility with existing session data.
// =============================================================================

/**
 * @deprecated Token tracking is deprecated. Claude Max subscriptions do not have token limits.
 * This schema is retained for backward compatibility with existing session data.
 */
export const AgentTokenStateSchema = z.object({
  agentId: z.string(),
  agentType: AgentTypeSchema,
  tokensConsumed: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
  startTime: z.string().datetime(),
  lastUpdate: z.string().datetime(),
  warningIssued: z.boolean(),
  criticalIssued: z.boolean()
});

/**
 * @deprecated Token tracking is deprecated.
 */
export type AgentTokenState = z.infer<typeof AgentTokenStateSchema>;

/**
 * @deprecated Token tracking is deprecated. Claude Max subscriptions do not have token limits.
 * This schema is retained for backward compatibility with existing session data.
 */
export const TokenStateSchema = z.object({
  id: z.string().uuid(),
  type: z.literal("token_state"),
  metadata: z.object({
    sessionId: SessionIdSchema,
    timestamp: z.string().datetime(),
    version: z.literal("1.0.0")
  }),
  agents: z.record(z.string(), AgentTokenStateSchema),
  defaultLimit: z.number().int().positive().default(120000)
});

/**
 * @deprecated Token tracking is deprecated.
 */
export type TokenState = z.infer<typeof TokenStateSchema>;
