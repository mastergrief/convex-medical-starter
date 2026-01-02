/**
 * Scheduling Module for Parallel Execution Engine
 *
 * Handles task grouping, dependency level calculation, and execution eligibility.
 *
 * @module parallelEngineModules/scheduling
 */

import { ParallelGroup, Phase, Subtask } from "../../schemas/index.js";
import { ParallelExecutionConfig } from "./types.js";

// ============================================================================
// Group Building
// ============================================================================

/**
 * Build parallel groups from a phase, respecting task dependencies
 *
 * Groups tasks by dependency level:
 * - Level 0: Tasks with no dependencies (can run first)
 * - Level 1: Tasks depending only on level 0 tasks
 * - Level N: Tasks depending on level N-1 tasks
 *
 * @param phase - Phase containing subtasks to group
 * @param config - Parallel execution configuration
 * @param buildTaskPrompt - Function to build prompt for a subtask
 * @returns Array of ParallelGroup sorted by dependency order
 */
export function buildParallelGroups(
  phase: Phase,
  config: ParallelExecutionConfig,
  buildTaskPrompt: (task: Subtask) => string
): ParallelGroup[] {
  const subtasks = phase.subtasks;
  if (subtasks.length === 0) {
    return [];
  }

  // Build dependency graph
  const taskMap = new Map<string, Subtask>();
  for (const task of subtasks) {
    taskMap.set(task.id, task);
  }

  // Calculate dependency levels using topological sort
  const levels = calculateDependencyLevels(subtasks, taskMap);

  // Group tasks by level
  const groupsByLevel = new Map<number, Subtask[]>();
  for (const [taskId, level] of levels) {
    const task = taskMap.get(taskId);
    if (task) {
      const existing = groupsByLevel.get(level) ?? [];
      existing.push(task);
      groupsByLevel.set(level, existing);
    }
  }

  // Convert to ParallelGroup format, respecting maxConcurrentAgents
  const groups: ParallelGroup[] = [];
  const sortedLevels = Array.from(groupsByLevel.keys()).sort((a, b) => a - b);

  for (const level of sortedLevels) {
    const tasksAtLevel = groupsByLevel.get(level) ?? [];

    // Split into chunks based on maxConcurrentAgents
    const chunks = chunkArray(tasksAtLevel, config.maxConcurrentAgents);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      const groupId = `${phase.id}-L${level}-G${chunkIndex}`;

      groups.push({
        groupId,
        tasks: chunk.map((task) => ({
          taskId: task.id,
          agentType: task.agentType,
          prompt: buildTaskPrompt(task),
          estimatedTokens: task.estimatedTokens,
        })),
        waitForAll: config.waitForAll,
      });
    }
  }

  return groups;
}

// ============================================================================
// Dependency Calculation
// ============================================================================

/**
 * Calculate dependency levels for tasks using topological sort
 *
 * @param subtasks - Array of subtasks to analyze
 * @param taskMap - Map of task ID to task for quick lookup
 * @returns Map of task ID to dependency level
 */
export function calculateDependencyLevels(
  subtasks: Subtask[],
  taskMap: Map<string, Subtask>
): Map<string, number> {
  const levels = new Map<string, number>();
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const calculateLevel = (taskId: string): number => {
    if (levels.has(taskId)) {
      return levels.get(taskId)!;
    }

    if (visiting.has(taskId)) {
      // Circular dependency detected - treat as level 0
      console.warn(`Circular dependency detected involving task: ${taskId}`);
      return 0;
    }

    const task = taskMap.get(taskId);
    if (!task) {
      return 0;
    }

    visiting.add(taskId);

    let maxDepLevel = -1;
    for (const depId of task.dependencies) {
      if (taskMap.has(depId)) {
        const depLevel = calculateLevel(depId);
        maxDepLevel = Math.max(maxDepLevel, depLevel);
      }
    }

    visiting.delete(taskId);
    visited.add(taskId);

    const level = maxDepLevel + 1;
    levels.set(taskId, level);
    return level;
  };

  for (const task of subtasks) {
    if (!visited.has(task.id)) {
      calculateLevel(task.id);
    }
  }

  return levels;
}

// ============================================================================
// Execution Eligibility
// ============================================================================

/**
 * Check if a task's dependencies are satisfied
 *
 * @param task - Task to check (needs taskId and dependencies)
 * @param completedTasks - List of completed task IDs
 * @returns True if all dependencies are in completedTasks
 */
export function canExecute(
  task: { taskId: string; dependencies: string[] },
  completedTasks: string[]
): boolean {
  if (task.dependencies.length === 0) {
    return true;
  }

  const completedSet = new Set(completedTasks);
  return task.dependencies.every((dep) => completedSet.has(dep));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Split array into chunks of specified size
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}
