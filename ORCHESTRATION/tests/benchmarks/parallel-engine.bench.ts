import { describe, bench } from 'vitest';
import { buildParallelGroups } from '../../lib/parallelEngineModules/scheduling.js';
import type { ParallelExecutionConfig, DispatchInstruction } from '../../lib/parallelEngineModules/types.js';
import type { Phase, Subtask } from '../../schemas/schemaModules/contracts.js';

// Helper to create test subtasks
function createSubtask(
  id: string,
  agentType: Subtask['agentType'] = 'developer',
  dependencies: string[] = []
): Subtask {
  return {
    id,
    description: `Task ${id} description`,
    agentType,
    priority: 'medium',
    dependencies,
  };
}

// Helper to create test phase
function createPhase(subtasks: Subtask[]): Phase {
  return {
    id: 'phase-bench',
    name: 'Benchmark Phase',
    description: 'Phase for benchmarking',
    subtasks,
    parallelizable: true,
  };
}

// Default config for benchmarks
const defaultConfig: ParallelExecutionConfig = {
  maxConcurrentAgents: 3,
  waitForAll: true,
  timeoutMs: 300000,
  retryOnFailure: true,
  tokenBudget: 100000,
};

// Simple prompt builder
const buildTaskPrompt = (task: Subtask): string =>
  `Execute task ${task.id}: ${task.description}`;

// Validation function for dispatch instructions
function validateDispatchInstruction(instruction: DispatchInstruction): boolean {
  return (
    typeof instruction.groupId === 'string' &&
    typeof instruction.agentCount === 'number' &&
    typeof instruction.waitForAll === 'boolean' &&
    Array.isArray(instruction.spawns) &&
    typeof instruction.estimatedTokens === 'number' &&
    typeof instruction.summary === 'string'
  );
}

describe('Parallel Engine Performance', () => {
  describe('buildParallelGroups', () => {
    bench('small phase (3 independent tasks)', () => {
      const subtasks = [
        createSubtask('task-1', 'analyst'),
        createSubtask('task-2', 'developer'),
        createSubtask('task-3', 'browser'),
      ];
      const phase = createPhase(subtasks);
      buildParallelGroups(phase, defaultConfig, buildTaskPrompt);
    });

    bench('medium phase (10 tasks with dependencies)', () => {
      const subtasks = [
        createSubtask('task-1', 'analyst'),
        createSubtask('task-2', 'analyst'),
        createSubtask('task-3', 'developer', ['task-1']),
        createSubtask('task-4', 'developer', ['task-1']),
        createSubtask('task-5', 'developer', ['task-2']),
        createSubtask('task-6', 'developer', ['task-3', 'task-4']),
        createSubtask('task-7', 'browser', ['task-5']),
        createSubtask('task-8', 'browser', ['task-6']),
        createSubtask('task-9', 'browser', ['task-7', 'task-8']),
        createSubtask('task-10', 'orchestrator', ['task-9']),
      ];
      const phase = createPhase(subtasks);
      buildParallelGroups(phase, defaultConfig, buildTaskPrompt);
    });

    bench('large phase (25 tasks, complex dependencies)', () => {
      const subtasks: Subtask[] = [];
      // Layer 1: 5 analysts
      for (let i = 1; i <= 5; i++) {
        subtasks.push(createSubtask(`task-${i}`, 'analyst'));
      }
      // Layer 2: 10 developers depending on analysts
      for (let i = 6; i <= 15; i++) {
        const deps = [`task-${((i - 6) % 5) + 1}`];
        subtasks.push(createSubtask(`task-${i}`, 'developer', deps));
      }
      // Layer 3: 8 browser agents depending on developers
      for (let i = 16; i <= 23; i++) {
        const deps = [`task-${((i - 16) % 10) + 6}`];
        subtasks.push(createSubtask(`task-${i}`, 'browser', deps));
      }
      // Layer 4: 2 orchestrators depending on browsers
      subtasks.push(createSubtask('task-24', 'orchestrator', ['task-16', 'task-17', 'task-18', 'task-19']));
      subtasks.push(createSubtask('task-25', 'orchestrator', ['task-20', 'task-21', 'task-22', 'task-23']));

      const phase = createPhase(subtasks);
      buildParallelGroups(phase, defaultConfig, buildTaskPrompt);
    });
  });

  describe('DispatchInstruction validation', () => {
    bench('validate single instruction', () => {
      const instruction: DispatchInstruction = {
        groupId: 'group-1',
        agentCount: 3,
        waitForAll: true,
        spawns: [
          { taskId: 'task-1', agentType: 'analyst', command: 'run analyst', runInBackground: true },
          { taskId: 'task-2', agentType: 'developer', command: 'run developer', runInBackground: true },
          { taskId: 'task-3', agentType: 'browser', command: 'run browser', runInBackground: true },
        ],
        estimatedTokens: 30000,
        summary: 'Group 1: 3 tasks in parallel',
      };
      validateDispatchInstruction(instruction);
    });

    bench('validate batch of instructions', () => {
      const instructions: DispatchInstruction[] = Array.from({ length: 10 }, (_, i) => ({
        groupId: `group-${i}`,
        agentCount: 3,
        waitForAll: true,
        spawns: [
          { taskId: `task-${i}-1`, agentType: 'analyst' as const, command: 'run analyst', runInBackground: true },
          { taskId: `task-${i}-2`, agentType: 'developer' as const, command: 'run developer', runInBackground: true },
          { taskId: `task-${i}-3`, agentType: 'browser' as const, command: 'run browser', runInBackground: true },
        ],
        estimatedTokens: 30000,
        summary: `Group ${i}: 3 tasks in parallel`,
      }));
      instructions.forEach(validateDispatchInstruction);
    });
  });
});
