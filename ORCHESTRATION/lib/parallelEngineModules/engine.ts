/**
 * ParallelEngine Class for Multi-Agent Orchestration
 *
 * Core engine class that orchestrates parallel agent execution
 * with dependency resolution, token budget tracking, and result aggregation.
 *
 * @module parallelEngineModules/engine
 */

import { ParallelGroup, Phase, Subtask } from "../../schemas/index.js";
import { ContextHub } from "../context-hub.js";
import {
  withRetryMetrics,
  type RetryMetrics,
} from "../utils/retry.js";
import {
  AgentSpawnRequest,
  AggregatedContext,
  DEFAULT_CONFIG,
  DispatchInstruction,
  ExecutionResult,
  ParallelExecutionConfig,
} from "./types.js";
import {
  buildParallelGroups as buildParallelGroupsFn,
  canExecute as canExecuteFn,
} from "./scheduling.js";
import {
  aggregateResults as aggregateResultsFn,
  buildSpawnCommand,
  formatHandoffForInjection,
  generateDispatchInstructions as generateDispatchInstructionsFn,
  injectDependencies as injectDependenciesFn,
} from "./execution.js";

// ============================================================================
// ParallelEngine Class
// ============================================================================

/**
 * Parallel Execution Engine
 *
 * Manages parallel agent execution with:
 * - Dependency-aware task grouping
 * - Token budget tracking
 * - Result aggregation across phases
 * - Retry support for transient failures
 */
export class ParallelEngine {
  private config: ParallelExecutionConfig;

  constructor(
    config: Partial<ParallelExecutionConfig> = {},
    _contextHub?: ContextHub
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // contextHub reserved for future session-aware dispatch functionality
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Build parallel groups from a phase, respecting task dependencies
   *
   * Groups tasks by dependency level:
   * - Level 0: Tasks with no dependencies (can run first)
   * - Level 1: Tasks depending only on level 0 tasks
   * - Level N: Tasks depending on level N-1 tasks
   *
   * @param phase - Phase containing subtasks to group
   * @returns Array of ParallelGroup sorted by dependency order
   */
  buildParallelGroups(phase: Phase): ParallelGroup[] {
    return buildParallelGroupsFn(phase, this.config, (task) =>
      this.buildTaskPrompt(task)
    );
  }

  /**
   * Generate dispatch instructions for a parallel group
   *
   * Creates structured instructions that a parent agent can execute
   * to spawn child agents for each task in the group.
   *
   * @param group - Parallel group to dispatch
   * @returns Dispatch instructions with spawn commands
   */
  generateDispatchInstructions(group: ParallelGroup): DispatchInstruction {
    return generateDispatchInstructionsFn(group, buildSpawnCommand);
  }

  /**
   * Aggregate results from completed task executions
   *
   * Combines handoffs, calculates total token usage, and collects errors.
   *
   * @param results - Array of execution results
   * @returns Aggregated context with combined results
   */
  aggregateResults(results: ExecutionResult[]): AggregatedContext {
    return aggregateResultsFn(results);
  }

  /**
   * Inject prior results into task prompt via {result:taskId} placeholders
   *
   * Substitutes placeholders in the format {result:taskId} with actual
   * handoff data from completed tasks.
   *
   * @param task - Task with potential placeholders
   * @param priorResults - Aggregated results from prior tasks
   * @returns Task with placeholders substituted
   */
  injectDependencies(
    task: AgentSpawnRequest,
    priorResults: AggregatedContext
  ): AgentSpawnRequest {
    return injectDependenciesFn(task, priorResults, formatHandoffForInjection);
  }

  /**
   * Check if a task's dependencies are satisfied
   *
   * @param task - Task to check (needs taskId and dependencies)
   * @param completedTasks - List of completed task IDs
   * @returns True if all dependencies are in completedTasks
   */
  canExecute(
    task: { taskId: string; dependencies: string[] },
    completedTasks: string[]
  ): boolean {
    return canExecuteFn(task, completedTasks);
  }

  /**
   * Get the current configuration
   */
  getConfig(): ParallelExecutionConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ParallelExecutionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if token budget allows spawning more agents
   *
   * @param usedTokens - Tokens already consumed
   * @param estimatedTokens - Estimated tokens for next operation
   * @returns True if within budget
   */
  withinTokenBudget(usedTokens: number, estimatedTokens: number): boolean {
    return usedTokens + estimatedTokens <= this.config.tokenBudget;
  }

  /**
   * Calculate remaining token budget
   *
   * @param usedTokens - Tokens already consumed
   * @returns Remaining tokens available
   */
  getRemainingBudget(usedTokens: number): number {
    return Math.max(0, this.config.tokenBudget - usedTokens);
  }

  /**
   * Execute a function with retry if retryOnFailure is enabled
   *
   * Uses exponential backoff retry strategy when config.retryOnFailure is true.
   * Returns both the result and retry metrics for monitoring.
   *
   * @param fn - Async function to execute with retry
   * @param taskId - Optional task identifier for logging
   * @returns Result and optional metrics (metrics only when retry is enabled)
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    taskId?: string
  ): Promise<{ result: T; metrics?: RetryMetrics }> {
    if (!this.config.retryOnFailure) {
      return { result: await fn() };
    }

    return withRetryMetrics(fn, taskId, {
      maxAttempts: this.config.maxRetryAttempts ?? 3,
      onRetry: (attempt, error, delayMs) => {
        console.warn(
          `[ParallelEngine] Task ${taskId ?? "unknown"} retry ${attempt}: ${error.message} (waiting ${delayMs}ms)`
        );
      },
    });
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Build prompt for a subtask including context
   */
  private buildTaskPrompt(task: Subtask): string {
    const parts: string[] = [];

    // Task description
    parts.push(`## Task: ${task.id}`);
    parts.push(task.description);

    // Context if available
    if (task.context) {
      if (task.context.prompt) {
        parts.push("\n### Instructions");
        parts.push(task.context.prompt);
      }

      if (task.context.files && task.context.files.length > 0) {
        parts.push("\n### Reference Files");
        parts.push(task.context.files.map((f) => `- ${f}`).join("\n"));
      }

      if (task.context.memories && task.context.memories.length > 0) {
        parts.push("\n### Memories to Read");
        parts.push(task.context.memories.map((m) => `- ${m}`).join("\n"));
      }

      if (task.context.symbols && task.context.symbols.length > 0) {
        parts.push("\n### Symbols to Analyze");
        parts.push(task.context.symbols.map((s) => `- ${s}`).join("\n"));
      }
    }

    // Acceptance criteria if available
    if (task.acceptanceCriteria && task.acceptanceCriteria.length > 0) {
      parts.push("\n### Acceptance Criteria");
      parts.push(task.acceptanceCriteria.map((c) => `- ${c}`).join("\n"));
    }

    return parts.join("\n");
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new ParallelEngine instance
 *
 * @param config - Optional configuration overrides
 * @param contextHub - Optional context hub for session-aware operations
 * @returns New ParallelEngine instance
 */
export function createParallelEngine(
  config?: Partial<ParallelExecutionConfig>,
  contextHub?: ContextHub
): ParallelEngine {
  return new ParallelEngine(config ?? {}, contextHub);
}
