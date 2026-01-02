/**
 * FOUNDATION SCHEMAS
 * Base enums and types with no dependencies
 */

import { z } from "zod";

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Path to agent definitions directory.
 * Only agents defined in this directory are valid for orchestration.
 */
export const AGENTS_DIR = ".claude/agents" as const;

// =============================================================================
// COMMON TYPES
// =============================================================================

/**
 * Valid agent types - must match files in AGENTS_DIR.
 * Each agent type corresponds to a .md file (e.g., "analyst" -> analyst.md)
 */
export const AgentTypeSchema = z.enum([
  "analyst",
  "browser",
  "composer",
  "context7",
  "developer",
  "orchestrator",
  "shadcn"
]);

export type AgentType = z.infer<typeof AgentTypeSchema>;

export const TaskStatusSchema = z.enum([
  "pending",
  "in_progress",
  "completed",
  "blocked",
  "failed",
  "delegated"
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const PrioritySchema = z.enum(["critical", "high", "medium", "low"]);

export type Priority = z.infer<typeof PrioritySchema>;

/**
 * Resolve agent type to its definition file path.
 * @param agentType - Valid agent type from AgentTypeSchema
 * @returns Path to agent definition file (e.g., ".claude/agents/analyst.md")
 */
export function resolveAgentPath(agentType: AgentType): string {
  return `${AGENTS_DIR}/${agentType}.md`;
}

/**
 * Get all valid agent types as an array.
 */
export function getValidAgentTypes(): AgentType[] {
  return AgentTypeSchema.options;
}
