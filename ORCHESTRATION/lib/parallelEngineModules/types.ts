/**
 * Type Definitions for Parallel Execution Engine
 *
 * All interfaces and constants for parallel agent execution.
 *
 * @module parallelEngineModules/types
 */

import { AgentType } from "../../schemas/index.js";
import { RETRY_DELAYS } from "../utils/retry.js";

// ============================================================================
// Configuration Interfaces
// ============================================================================

/**
 * Configuration for parallel execution behavior
 */
export interface ParallelExecutionConfig {
  /** Maximum number of agents that can run concurrently (default: 5) */
  maxConcurrentAgents: number;
  /** Whether to wait for all agents in a group before continuing (default: true) */
  waitForAll: boolean;
  /** Timeout in milliseconds for each agent (default: 300000 = 5 minutes) */
  timeoutMs: number;
  /** Whether to retry failed agents once (default: true) */
  retryOnFailure: boolean;
  /** Maximum total tokens for the phase */
  tokenBudget: number;
  /** Maximum retry attempts when retryOnFailure is true (default: 3) */
  maxRetryAttempts?: number;
  /** Retry delay pattern in milliseconds (default: [500, 1000, 2000]) */
  retryDelayMs?: readonly number[];
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ParallelExecutionConfig = {
  maxConcurrentAgents: 5,
  waitForAll: true,
  timeoutMs: 300000, // 5 minutes
  retryOnFailure: true,
  tokenBudget: 120000,
  maxRetryAttempts: 3,
  retryDelayMs: RETRY_DELAYS,
};

// ============================================================================
// Request/Response Interfaces
// ============================================================================

/**
 * Request to spawn an agent for a specific task
 *
 * Contains all information needed to spawn a child agent,
 * including prompt, dependencies, and execution preferences.
 */
export interface AgentSpawnRequest {
  /** Unique task identifier */
  taskId: string;
  /** Type of agent to spawn */
  agentType: AgentType;
  /** Prompt/instructions for the agent */
  prompt: string;
  /** Whether to run in background (non-blocking) */
  runInBackground: boolean;
  /** Task IDs this task depends on (must complete first) */
  dependencies: string[];
  /** Estimated token consumption */
  estimatedTokens?: number;
}

/**
 * Result from executing an agent task
 *
 * Captures success/failure status, timing, token usage,
 * and any handoff data produced by the agent.
 */
export interface ExecutionResult {
  /** Task ID that was executed */
  taskId: string;
  /** UUID assigned to the agent instance */
  agentId: string;
  /** Whether execution completed successfully */
  success: boolean;
  /** Handoff data from the agent (if available) */
  handoff?: Record<string, unknown>;
  /** Error message if execution failed */
  error?: string;
  /** Actual tokens consumed */
  tokensUsed: number;
  /** ISO timestamp when execution started */
  startedAt: string;
  /** ISO timestamp when execution completed */
  completedAt: string;
}

/**
 * Aggregated context from multiple task executions
 *
 * Used to track progress across a phase, combining results
 * from multiple parallel groups.
 */
export interface AggregatedContext {
  /** List of completed task IDs */
  completedTasks: string[];
  /** Map of task ID to handoff data */
  handoffs: Record<string, Record<string, unknown>>;
  /** Total tokens used across all tasks */
  totalTokensUsed: number;
  /** Error messages from failed tasks */
  errors: string[];
}

// ============================================================================
// Dispatch Types
// ============================================================================

/**
 * Instructions for dispatching a parallel group of agents
 *
 * Created by generateDispatchInstructions(), provides all
 * information needed for a parent agent to spawn child agents.
 */
export interface DispatchInstruction {
  /** Group being dispatched */
  groupId: string;
  /** Number of agents to spawn */
  agentCount: number;
  /** Whether to wait for all before continuing */
  waitForAll: boolean;
  /** Individual agent spawn commands */
  spawns: Array<{
    taskId: string;
    agentType: AgentType;
    command: string;
    runInBackground: boolean;
  }>;
  /** Estimated total tokens for this group */
  estimatedTokens: number;
  /** Human-readable summary */
  summary: string;
}
