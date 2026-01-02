/**
 * Execution Module for Parallel Execution Engine
 *
 * Handles dispatch instruction generation, result aggregation,
 * dependency injection, and utility functions.
 *
 * @module parallelEngineModules/execution
 */

import * as crypto from "crypto";
import { ParallelGroup, createTimestamp } from "../../schemas/index.js";
import {
  AgentSpawnRequest,
  AggregatedContext,
  DispatchInstruction,
  ExecutionResult,
  ParallelExecutionConfig,
} from "./types.js";

// ============================================================================
// Dispatch Instructions
// ============================================================================

/**
 * Generate dispatch instructions for a parallel group
 *
 * Creates structured instructions that a parent agent can execute
 * to spawn child agents for each task in the group.
 *
 * @param group - Parallel group to dispatch
 * @param buildSpawnCommand - Function to build spawn command for a task
 * @returns Dispatch instructions with spawn commands
 */
export function generateDispatchInstructions(
  group: ParallelGroup,
  buildSpawnCommand: (task: ParallelGroup["tasks"][0]) => string
): DispatchInstruction {
  const spawns = group.tasks.map((task) => ({
    taskId: task.taskId,
    agentType: task.agentType,
    command: buildSpawnCommand(task),
    runInBackground: false, // Always foreground - never run subagents in background
  }));

  const estimatedTokens = group.tasks.reduce(
    (sum, task) => sum + (task.estimatedTokens ?? 30000),
    0
  );

  const agentTypes = [...new Set(group.tasks.map((t) => t.agentType))].join(", ");
  const summary = `Dispatch ${group.tasks.length} agent(s) [${agentTypes}] for group ${group.groupId}`;

  return {
    groupId: group.groupId,
    agentCount: group.tasks.length,
    waitForAll: group.waitForAll,
    spawns,
    estimatedTokens,
    summary,
  };
}

// ============================================================================
// Result Aggregation
// ============================================================================

/**
 * Aggregate results from completed task executions
 *
 * Combines handoffs, calculates total token usage, and collects errors.
 *
 * @param results - Array of execution results
 * @returns Aggregated context with combined results
 */
export function aggregateResults(results: ExecutionResult[]): AggregatedContext {
  const completedTasks: string[] = [];
  const handoffs: Record<string, Record<string, unknown>> = {};
  const errors: string[] = [];
  let totalTokensUsed = 0;

  for (const result of results) {
    totalTokensUsed += result.tokensUsed;

    if (result.success) {
      completedTasks.push(result.taskId);
      if (result.handoff) {
        handoffs[result.taskId] = result.handoff;
      }
    } else {
      const errorMsg = `Task ${result.taskId} failed: ${result.error ?? "Unknown error"}`;
      errors.push(errorMsg);
    }
  }

  return {
    completedTasks,
    handoffs,
    totalTokensUsed,
    errors,
  };
}

// ============================================================================
// Dependency Injection
// ============================================================================

/**
 * Inject prior results into task prompt via {result:taskId} placeholders
 *
 * Substitutes placeholders in the format {result:taskId} with actual
 * handoff data from completed tasks.
 *
 * @example
 * ```typescript
 * const task = {
 *   taskId: "task-2",
 *   prompt: "Based on {result:task-1}, implement the feature",
 *   // ...
 * };
 * const injected = injectDependencies(task, priorResults, formatHandoff);
 * // injected.prompt now contains actual data from task-1
 * ```
 *
 * @param task - Task with potential placeholders
 * @param priorResults - Aggregated results from prior tasks
 * @param formatHandoffForInjection - Function to format handoff data
 * @returns Task with placeholders substituted
 */
export function injectDependencies(
  task: AgentSpawnRequest,
  priorResults: AggregatedContext,
  formatHandoffForInjection: (taskId: string, handoff: Record<string, unknown>) => string
): AgentSpawnRequest {
  let prompt = task.prompt;

  // Find all {result:taskId} placeholders
  const placeholderRegex = /\{result:([^}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = placeholderRegex.exec(task.prompt)) !== null) {
    const taskId = match[1];
    const handoff = priorResults.handoffs[taskId];

    if (handoff) {
      // Format handoff as readable context
      const formatted = formatHandoffForInjection(taskId, handoff);
      prompt = prompt.replace(match[0], formatted);
    } else if (priorResults.completedTasks.includes(taskId)) {
      // Task completed but no handoff data
      prompt = prompt.replace(
        match[0],
        `[Task ${taskId} completed successfully - no handoff data available]`
      );
    } else {
      // Task not completed - leave placeholder with warning
      prompt = prompt.replace(
        match[0],
        `[WARNING: Task ${taskId} not yet completed - dependency not satisfied]`
      );
    }
  }

  return {
    ...task,
    prompt,
  };
}

// ============================================================================
// Handoff Formatting
// ============================================================================

/**
 * Format handoff data for injection into prompts
 *
 * @param taskId - ID of the task that produced the handoff
 * @param handoff - Handoff data to format
 * @returns Formatted string representation
 */
export function formatHandoffForInjection(
  taskId: string,
  handoff: Record<string, unknown>
): string {
  const parts: string[] = [];
  parts.push(`<result taskId="${taskId}">`);

  // Extract key information from handoff
  if (handoff.results && Array.isArray(handoff.results)) {
    for (const result of handoff.results as Array<Record<string, unknown>>) {
      if (result.summary) {
        parts.push(`Summary: ${result.summary}`);
      }
      if (result.output) {
        parts.push(`Output: ${JSON.stringify(result.output, null, 2)}`);
      }
    }
  }

  if (handoff.context && typeof handoff.context === "object") {
    const ctx = handoff.context as Record<string, unknown>;
    if (ctx.criticalContext) {
      parts.push(`Critical Context: ${ctx.criticalContext}`);
    }
    if (ctx.resumeInstructions) {
      parts.push(`Resume Instructions: ${ctx.resumeInstructions}`);
    }
  }

  if (handoff.fileModifications && Array.isArray(handoff.fileModifications)) {
    parts.push("Files Modified:");
    for (const mod of handoff.fileModifications as Array<Record<string, unknown>>) {
      parts.push(`  - ${mod.path}: ${mod.summary}`);
    }
  }

  // If no structured data found, include raw JSON
  if (parts.length === 1) {
    parts.push(JSON.stringify(handoff, null, 2));
  }

  parts.push("</result>");
  return parts.join("\n");
}

// ============================================================================
// Command Building
// ============================================================================

/**
 * Build spawn command for a task
 *
 * @param task - Task to build command for
 * @returns Shell command to spawn the agent
 */
export function buildSpawnCommand(task: ParallelGroup["tasks"][0]): string {
  // Escape the prompt for shell usage
  const escapedPrompt = task.prompt.replace(/"/g, '\\"').replace(/\$/g, "\\$");

  // Agent definitions loaded from AGENTS_DIR (.claude/agents/)
  // The claude CLI resolves agent type to ${AGENTS_DIR}/${agentType}.md
  return `claude --agent ${task.agentType} --task-id ${task.taskId} --prompt "${escapedPrompt}"`;
}

// ============================================================================
// Token Budget
// ============================================================================

/**
 * Check if token budget allows spawning more agents
 *
 * @param config - Parallel execution configuration
 * @param usedTokens - Tokens already consumed
 * @param estimatedTokens - Estimated tokens for next operation
 * @returns True if within budget
 */
export function withinTokenBudget(
  config: ParallelExecutionConfig,
  usedTokens: number,
  estimatedTokens: number
): boolean {
  return usedTokens + estimatedTokens <= config.tokenBudget;
}

/**
 * Calculate remaining token budget
 *
 * @param config - Parallel execution configuration
 * @param usedTokens - Tokens already consumed
 * @returns Remaining tokens available
 */
export function getRemainingBudget(
  config: ParallelExecutionConfig,
  usedTokens: number
): number {
  return Math.max(0, config.tokenBudget - usedTokens);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create an empty aggregated context
 *
 * @returns Empty context with initialized collections
 */
export function createEmptyContext(): AggregatedContext {
  return {
    completedTasks: [],
    handoffs: {},
    totalTokensUsed: 0,
    errors: [],
  };
}

/**
 * Merge multiple aggregated contexts into one
 *
 * @param contexts - Contexts to merge
 * @returns Merged context with deduplicated tasks
 */
export function mergeContexts(...contexts: AggregatedContext[]): AggregatedContext {
  const merged: AggregatedContext = {
    completedTasks: [],
    handoffs: {},
    totalTokensUsed: 0,
    errors: [],
  };

  for (const ctx of contexts) {
    merged.completedTasks.push(...ctx.completedTasks);
    merged.totalTokensUsed += ctx.totalTokensUsed;
    merged.errors.push(...ctx.errors);

    for (const [taskId, handoff] of Object.entries(ctx.handoffs)) {
      merged.handoffs[taskId] = handoff;
    }
  }

  // Deduplicate completed tasks
  merged.completedTasks = [...new Set(merged.completedTasks)];

  return merged;
}

/**
 * Create an execution result with defaults
 *
 * @param taskId - Task identifier
 * @param success - Whether execution succeeded
 * @param options - Optional fields (handoff, error, tokensUsed, timestamps)
 * @returns Complete execution result
 */
export function createExecutionResult(
  taskId: string,
  success: boolean,
  options: {
    handoff?: Record<string, unknown>;
    error?: string;
    tokensUsed?: number;
    startedAt?: string;
    completedAt?: string;
  } = {}
): ExecutionResult {
  return {
    taskId,
    agentId: crypto.randomUUID(),
    success,
    handoff: options.handoff,
    error: options.error,
    tokensUsed: options.tokensUsed ?? 0,
    startedAt: options.startedAt ?? createTimestamp(),
    completedAt: options.completedAt ?? createTimestamp(),
  };
}

/**
 * Format a dispatch instruction as human-readable text
 *
 * @param instruction - Dispatch instruction to format
 * @returns Multi-line formatted string
 */
export function formatDispatchInstruction(instruction: DispatchInstruction): string {
  const lines: string[] = [];

  lines.push(`=== ${instruction.summary} ===`);
  lines.push(`Group: ${instruction.groupId}`);
  lines.push(`Agents: ${instruction.agentCount}`);
  lines.push(`Wait for all: ${instruction.waitForAll}`);
  lines.push(`Estimated tokens: ${instruction.estimatedTokens.toLocaleString()}`);
  lines.push("");
  lines.push("Spawn Commands:");

  for (const spawn of instruction.spawns) {
    const bgIndicator = spawn.runInBackground ? " [background]" : "";
    lines.push(`  ${spawn.taskId} (${spawn.agentType})${bgIndicator}`);
    lines.push(`    ${spawn.command}`);
  }

  return lines.join("\n");
}
