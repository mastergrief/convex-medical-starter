/**
 * COMPONENT SCHEMAS
 * Building block schemas used across multiple contracts
 */

import { z } from "zod";
import { AgentTypeSchema, PrioritySchema, TaskStatusSchema } from "./foundation.js";

// =============================================================================
// SESSION & METADATA
// =============================================================================

// Session ID format: YYYYMMDD_HH-MM_<uuid>
export const SessionIdSchema = z.string().regex(/^\d{8}_\d{2}-\d{2}_[0-9a-f-]{36}$/);

export const PromptMetadataSchema = z.object({
  sessionId: SessionIdSchema,
  timestamp: z.string().datetime(),
  parentAgentId: z.string().optional(),
  version: z.literal("1.0.0")
});

// =============================================================================
// CONTEXT & FILES
// =============================================================================

export const ContextFileSchema = z.object({
  path: z.string(),
  type: z.enum(["memory", "skill", "command", "code", "config", "document"]),
  required: z.boolean().default(true),
  summary: z.string().optional()
});

export const FileModificationSchema = z.object({
  path: z.string(),
  action: z.enum(["created", "modified", "deleted"]),
  summary: z.string().optional()
});

export const DiscoverySchema = z.object({
  type: z.enum(["architecture", "pattern", "dependency", "issue", "insight"]),
  description: z.string(),
  location: z.string().optional(),
  importance: PrioritySchema
});

// =============================================================================
// TOKEN & BUDGET
// =============================================================================

export const TokenUsageSchema = z.object({
  consumed: z.number().int().nonnegative(),
  limit: z.number().int().positive().default(120000),
  remaining: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100)
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

// =============================================================================
// TASK RESULTS
// =============================================================================

export const TaskResultSchema = z.object({
  taskId: z.string(),
  status: TaskStatusSchema,
  summary: z.string(),
  output: z.record(z.string(), z.unknown()).optional(),
  evidence: z.array(z.string()).optional(),
  blockers: z.array(z.string()).optional()
});

export const HandoffReasonSchema = z.enum([
  "task_complete",
  "token_limit",
  "phase_complete",
  "blocked",
  "error",
  "user_intervention"
]);

// =============================================================================
// TRACEABILITY DATA
// =============================================================================

export const TraceabilityDataSchema = z.object({
  analyzed_symbols: z.array(z.string()),
  entry_points: z.array(z.string()),
  data_flow_map: z.record(z.string(), z.string())
});

export type TraceabilityData = z.infer<typeof TraceabilityDataSchema>;

// =============================================================================
// AGENT INSTANCES
// =============================================================================

export const AgentInstanceSchema = z.object({
  id: z.string(),
  type: AgentTypeSchema,
  status: z.enum(["idle", "running", "completed", "failed"]),
  taskId: z.string().optional(),
  startTime: z.string().datetime().optional(),
  tokensUsed: z.number().int().nonnegative().default(0)
});
