/**
 * @vitest-environment node
 */
/**
 * ParallelEngine Unit Tests
 * Comprehensive tests for parallel execution engine methods
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ParallelEngine,
  createEmptyContext,
  createExecutionResult,
  mergeContexts,
  type AggregatedContext,
  type AgentSpawnRequest,
} from '../../lib/parallel-engine.js';
import type { ParallelGroup, Phase, Subtask, AgentType, Priority } from '../../schemas/index.js';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create a Phase for testing
 */
function createTestPhase(overrides: {
  id?: string;
  name?: string;
  description?: string;
  subtasks?: Subtask[];
  parallelizable?: boolean;
  gateCondition?: string;
} = {}): Phase {
  return {
    id: overrides.id ?? 'phase-1',
    name: overrides.name ?? 'Test Phase',
    description: overrides.description ?? 'A test phase',
    subtasks: overrides.subtasks ?? [],
    parallelizable: overrides.parallelizable ?? false,
    gateCondition: overrides.gateCondition,
  };
}

/**
 * Create a Subtask for testing
 */
function createTestSubtask(overrides: {
  id?: string;
  description?: string;
  agentType?: AgentType;
  priority?: Priority;
  dependencies?: string[];
  estimatedTokens?: number;
  context?: Subtask['context'];
  acceptanceCriteria?: string[];
} = {}): Subtask {
  return {
    id: overrides.id ?? 'task-1',
    description: overrides.description ?? 'Test task',
    agentType: overrides.agentType ?? 'developer',
    priority: overrides.priority ?? 'medium',
    dependencies: overrides.dependencies ?? [],
    estimatedTokens: overrides.estimatedTokens,
    context: overrides.context,
    acceptanceCriteria: overrides.acceptanceCriteria,
  };
}

/**
 * Create an AgentSpawnRequest for testing
 */
function createSpawnRequest(overrides: Partial<AgentSpawnRequest> = {}): AgentSpawnRequest {
  return {
    taskId: 'task-1',
    agentType: 'developer',
    prompt: 'Test prompt',
    runInBackground: false,
    dependencies: [],
    estimatedTokens: 30000,
    ...overrides,
  };
}

// =============================================================================
// buildParallelGroups Tests
// =============================================================================

describe('ParallelEngine', () => {
  let engine: ParallelEngine;

  beforeEach(() => {
    engine = new ParallelEngine({ maxConcurrentAgents: 3 });
    // Suppress console.warn for circular dependency tests
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  describe('buildParallelGroups', () => {
    it('returns empty array for phase with no subtasks', () => {
      const phase = createTestPhase({ subtasks: [] });
      const groups = engine.buildParallelGroups(phase);
      expect(groups).toEqual([]);
    });

    it('creates single group for one task with no dependencies', () => {
      const phase = createTestPhase({
        id: 'phase-1',
        subtasks: [createTestSubtask({ id: 'a', dependencies: [] })],
      });
      const groups = engine.buildParallelGroups(phase);
      expect(groups).toHaveLength(1);
      expect(groups[0].tasks).toHaveLength(1);
      expect(groups[0].tasks[0].taskId).toBe('a');
    });

    it('groups independent tasks together', () => {
      const phase = createTestPhase({
        id: 'phase-1',
        subtasks: [
          createTestSubtask({ id: 'a', dependencies: [] }),
          createTestSubtask({ id: 'b', dependencies: [] }),
          createTestSubtask({ id: 'c', dependencies: [] }),
        ],
      });
      const groups = engine.buildParallelGroups(phase);
      expect(groups).toHaveLength(1);
      expect(groups[0].tasks).toHaveLength(3);
    });

    it('creates sequential groups for linear dependencies (A->B->C)', () => {
      const phase = createTestPhase({
        id: 'phase-1',
        subtasks: [
          createTestSubtask({ id: 'a', dependencies: [] }),
          createTestSubtask({ id: 'b', dependencies: ['a'] }),
          createTestSubtask({ id: 'c', dependencies: ['b'] }),
        ],
      });
      const groups = engine.buildParallelGroups(phase);
      expect(groups).toHaveLength(3);
      expect(groups[0].tasks[0].taskId).toBe('a');
      expect(groups[1].tasks[0].taskId).toBe('b');
      expect(groups[2].tasks[0].taskId).toBe('c');
    });

    it('handles diamond dependency pattern (A->B,C; B,C->D)', () => {
      const phase = createTestPhase({
        id: 'phase-1',
        subtasks: [
          createTestSubtask({ id: 'a', dependencies: [] }),
          createTestSubtask({ id: 'b', dependencies: ['a'] }),
          createTestSubtask({ id: 'c', dependencies: ['a'] }),
          createTestSubtask({ id: 'd', dependencies: ['b', 'c'] }),
        ],
      });
      const groups = engine.buildParallelGroups(phase);
      // Level 0: A, Level 1: B+C (parallel), Level 2: D
      expect(groups).toHaveLength(3);
      expect(groups[0].tasks).toHaveLength(1); // A
      expect(groups[1].tasks).toHaveLength(2); // B and C
      expect(groups[2].tasks).toHaveLength(1); // D
    });

    it('chunks groups when exceeding maxConcurrentAgents', () => {
      const phase = createTestPhase({
        id: 'phase-1',
        subtasks: [
          createTestSubtask({ id: 'a', dependencies: [] }),
          createTestSubtask({ id: 'b', dependencies: [] }),
          createTestSubtask({ id: 'c', dependencies: [] }),
          createTestSubtask({ id: 'd', dependencies: [] }),
          createTestSubtask({ id: 'e', dependencies: [] }),
        ],
      });
      // maxConcurrentAgents is 3, so 5 tasks should create 2 groups
      const groups = engine.buildParallelGroups(phase);
      expect(groups).toHaveLength(2);
      expect(groups[0].tasks).toHaveLength(3);
      expect(groups[1].tasks).toHaveLength(2);
    });

    it('handles circular dependencies gracefully', () => {
      const phase = createTestPhase({
        id: 'phase-1',
        subtasks: [
          createTestSubtask({ id: 'a', dependencies: ['b'] }),
          createTestSubtask({ id: 'b', dependencies: ['a'] }),
        ],
      });
      // Should not throw, circular deps are treated as level 0
      const groups = engine.buildParallelGroups(phase);
      expect(groups.length).toBeGreaterThanOrEqual(1);
      expect(console.warn).toHaveBeenCalled();
    });

    it('ignores unknown dependencies', () => {
      const phase = createTestPhase({
        id: 'phase-1',
        subtasks: [
          createTestSubtask({ id: 'a', dependencies: ['unknown-task'] }),
        ],
      });
      const groups = engine.buildParallelGroups(phase);
      expect(groups).toHaveLength(1);
      expect(groups[0].tasks[0].taskId).toBe('a');
    });

    it('generates correct groupId format', () => {
      const phase = createTestPhase({
        id: 'phase-1',
        subtasks: [createTestSubtask({ id: 'a', dependencies: [] })],
      });
      const groups = engine.buildParallelGroups(phase);
      expect(groups[0].groupId).toBe('phase-1-L0-G0');
    });

    it('preserves estimatedTokens in task output', () => {
      const phase = createTestPhase({
        id: 'phase-1',
        subtasks: [createTestSubtask({ id: 'a', dependencies: [], estimatedTokens: 50000 })],
      });
      const groups = engine.buildParallelGroups(phase);
      expect(groups[0].tasks[0].estimatedTokens).toBe(50000);
    });
  });

  // ===========================================================================
  // generateDispatchInstructions Tests
  // ===========================================================================

  describe('generateDispatchInstructions', () => {
    it('generates correct dispatch for single task', () => {
      const group: ParallelGroup = {
        groupId: 'test-group',
        tasks: [
          { taskId: 'task-1', agentType: 'developer', prompt: 'Do something', estimatedTokens: 30000 },
        ],
        waitForAll: true,
      };
      const instruction = engine.generateDispatchInstructions(group);
      expect(instruction.groupId).toBe('test-group');
      expect(instruction.agentCount).toBe(1);
      expect(instruction.spawns).toHaveLength(1);
      expect(instruction.spawns[0].runInBackground).toBe(false); // Single task not in background
    });

    it('sets runInBackground false for all tasks (foreground only)', () => {
      const group: ParallelGroup = {
        groupId: 'test-group',
        tasks: [
          { taskId: 'task-1', agentType: 'developer', prompt: 'Do something' },
          { taskId: 'task-2', agentType: 'analyst', prompt: 'Analyze something' },
        ],
        waitForAll: true,
      };
      const instruction = engine.generateDispatchInstructions(group);
      expect(instruction.spawns[0].runInBackground).toBe(false);
      expect(instruction.spawns[1].runInBackground).toBe(false);
    });

    it('calculates estimatedTokens with defaults', () => {
      const group: ParallelGroup = {
        groupId: 'test-group',
        tasks: [
          { taskId: 'task-1', agentType: 'developer', prompt: 'Do something' }, // No estimatedTokens = 30000
          { taskId: 'task-2', agentType: 'analyst', prompt: 'Analyze', estimatedTokens: 20000 },
        ],
        waitForAll: true,
      };
      const instruction = engine.generateDispatchInstructions(group);
      expect(instruction.estimatedTokens).toBe(50000); // 30000 + 20000
    });

    it('generates human-readable summary', () => {
      const group: ParallelGroup = {
        groupId: 'phase-1-L0-G0',
        tasks: [
          { taskId: 'task-1', agentType: 'developer', prompt: 'Code' },
          { taskId: 'task-2', agentType: 'browser', prompt: 'Test' },
        ],
        waitForAll: true,
      };
      const instruction = engine.generateDispatchInstructions(group);
      expect(instruction.summary).toContain('2 agent(s)');
      expect(instruction.summary).toContain('developer');
      expect(instruction.summary).toContain('browser');
    });

    it('preserves waitForAll from group', () => {
      const group: ParallelGroup = {
        groupId: 'test-group',
        tasks: [{ taskId: 'task-1', agentType: 'developer', prompt: 'Do something' }],
        waitForAll: false,
      };
      const instruction = engine.generateDispatchInstructions(group);
      expect(instruction.waitForAll).toBe(false);
    });
  });

  // ===========================================================================
  // aggregateResults Tests
  // ===========================================================================

  describe('aggregateResults', () => {
    it('aggregates all successful results', () => {
      const results = [
        createExecutionResult('task-1', true, { tokensUsed: 10000, handoff: { data: 'a' } }),
        createExecutionResult('task-2', true, { tokensUsed: 15000, handoff: { data: 'b' } }),
      ];
      const aggregated = engine.aggregateResults(results);
      expect(aggregated.completedTasks).toEqual(['task-1', 'task-2']);
      expect(aggregated.handoffs['task-1']).toEqual({ data: 'a' });
      expect(aggregated.handoffs['task-2']).toEqual({ data: 'b' });
      expect(aggregated.totalTokensUsed).toBe(25000);
      expect(aggregated.errors).toEqual([]);
    });

    it('handles partial failures', () => {
      const results = [
        createExecutionResult('task-1', true, { tokensUsed: 10000 }),
        createExecutionResult('task-2', false, { tokensUsed: 5000, error: 'Something failed' }),
      ];
      const aggregated = engine.aggregateResults(results);
      expect(aggregated.completedTasks).toEqual(['task-1']);
      expect(aggregated.errors).toHaveLength(1);
      expect(aggregated.errors[0]).toContain('task-2');
      expect(aggregated.errors[0]).toContain('Something failed');
    });

    it('handles all failures', () => {
      const results = [
        createExecutionResult('task-1', false, { tokensUsed: 5000, error: 'Error 1' }),
        createExecutionResult('task-2', false, { tokensUsed: 5000, error: 'Error 2' }),
      ];
      const aggregated = engine.aggregateResults(results);
      expect(aggregated.completedTasks).toEqual([]);
      expect(aggregated.errors).toHaveLength(2);
      expect(aggregated.totalTokensUsed).toBe(10000);
    });

    it('totals tokens across all results', () => {
      const results = [
        createExecutionResult('task-1', true, { tokensUsed: 10000 }),
        createExecutionResult('task-2', true, { tokensUsed: 20000 }),
        createExecutionResult('task-3', false, { tokensUsed: 5000 }),
      ];
      const aggregated = engine.aggregateResults(results);
      expect(aggregated.totalTokensUsed).toBe(35000);
    });

    it('returns empty context for empty results array', () => {
      const aggregated = engine.aggregateResults([]);
      expect(aggregated.completedTasks).toEqual([]);
      expect(aggregated.handoffs).toEqual({});
      expect(aggregated.totalTokensUsed).toBe(0);
      expect(aggregated.errors).toEqual([]);
    });
  });

  // ===========================================================================
  // injectDependencies Tests
  // ===========================================================================

  describe('injectDependencies', () => {
    it('substitutes single placeholder with handoff data', () => {
      const task = createSpawnRequest({
        prompt: 'Based on {result:task-1}, do something',
      });
      const priorResults: AggregatedContext = {
        completedTasks: ['task-1'],
        handoffs: {
          'task-1': { results: [{ summary: 'Analysis complete' }] },
        },
        totalTokensUsed: 10000,
        errors: [],
      };
      const injected = engine.injectDependencies(task, priorResults);
      expect(injected.prompt).toContain('task-1');
      expect(injected.prompt).toContain('Analysis complete');
      expect(injected.prompt).not.toContain('{result:task-1}');
    });

    it('substitutes multiple placeholders', () => {
      const task = createSpawnRequest({
        prompt: 'Use {result:task-1} and {result:task-2} together',
      });
      const priorResults: AggregatedContext = {
        completedTasks: ['task-1', 'task-2'],
        handoffs: {
          'task-1': { results: [{ summary: 'First result' }] },
          'task-2': { results: [{ summary: 'Second result' }] },
        },
        totalTokensUsed: 20000,
        errors: [],
      };
      const injected = engine.injectDependencies(task, priorResults);
      expect(injected.prompt).toContain('First result');
      expect(injected.prompt).toContain('Second result');
    });

    it('handles completed task with no handoff data', () => {
      const task = createSpawnRequest({
        prompt: 'Based on {result:task-1}, do something',
      });
      const priorResults: AggregatedContext = {
        completedTasks: ['task-1'],
        handoffs: {},
        totalTokensUsed: 10000,
        errors: [],
      };
      const injected = engine.injectDependencies(task, priorResults);
      expect(injected.prompt).toContain('task-1 completed successfully');
      expect(injected.prompt).toContain('no handoff data available');
    });

    it('adds warning for non-existent task dependency', () => {
      const task = createSpawnRequest({
        prompt: 'Based on {result:unknown-task}, do something',
      });
      const priorResults: AggregatedContext = {
        completedTasks: [],
        handoffs: {},
        totalTokensUsed: 0,
        errors: [],
      };
      const injected = engine.injectDependencies(task, priorResults);
      expect(injected.prompt).toContain('WARNING');
      expect(injected.prompt).toContain('unknown-task not yet completed');
    });

    it('returns unchanged task when no placeholders present', () => {
      const task = createSpawnRequest({
        prompt: 'Just a regular prompt with no placeholders',
      });
      const priorResults = createEmptyContext();
      const injected = engine.injectDependencies(task, priorResults);
      expect(injected.prompt).toBe('Just a regular prompt with no placeholders');
    });
  });

  // ===========================================================================
  // Configuration & Budget Tests
  // ===========================================================================

  describe('getConfig', () => {
    it('returns default configuration values', () => {
      const defaultEngine = new ParallelEngine();
      const config = defaultEngine.getConfig();
      expect(config.maxConcurrentAgents).toBe(5);
      expect(config.waitForAll).toBe(true);
      expect(config.timeoutMs).toBe(300000);
      expect(config.retryOnFailure).toBe(true);
      expect(config.tokenBudget).toBe(120000);
    });

    it('reflects custom configuration', () => {
      const customEngine = new ParallelEngine({ maxConcurrentAgents: 10, tokenBudget: 200000 });
      const config = customEngine.getConfig();
      expect(config.maxConcurrentAgents).toBe(10);
      expect(config.tokenBudget).toBe(200000);
    });
  });

  describe('updateConfig', () => {
    it('updates single config property', () => {
      engine.updateConfig({ maxConcurrentAgents: 10 });
      expect(engine.getConfig().maxConcurrentAgents).toBe(10);
      expect(engine.getConfig().waitForAll).toBe(true); // Unchanged
    });

    it('updates multiple config properties', () => {
      engine.updateConfig({ maxConcurrentAgents: 8, retryOnFailure: false });
      const config = engine.getConfig();
      expect(config.maxConcurrentAgents).toBe(8);
      expect(config.retryOnFailure).toBe(false);
    });
  });

  describe('withinTokenBudget', () => {
    it('returns true when within budget', () => {
      const budgetEngine = new ParallelEngine({ tokenBudget: 100000 });
      expect(budgetEngine.withinTokenBudget(50000, 30000)).toBe(true);
    });

    it('returns true when exactly at budget', () => {
      const budgetEngine = new ParallelEngine({ tokenBudget: 100000 });
      expect(budgetEngine.withinTokenBudget(70000, 30000)).toBe(true);
    });

    it('returns false when over budget', () => {
      const budgetEngine = new ParallelEngine({ tokenBudget: 100000 });
      expect(budgetEngine.withinTokenBudget(70000, 40000)).toBe(false);
    });
  });

  describe('getRemainingBudget', () => {
    it('calculates remaining budget correctly', () => {
      const budgetEngine = new ParallelEngine({ tokenBudget: 100000 });
      expect(budgetEngine.getRemainingBudget(30000)).toBe(70000);
    });

    it('returns zero when budget exceeded', () => {
      const budgetEngine = new ParallelEngine({ tokenBudget: 100000 });
      expect(budgetEngine.getRemainingBudget(120000)).toBe(0);
    });

    it('returns full budget when nothing used', () => {
      const budgetEngine = new ParallelEngine({ tokenBudget: 100000 });
      expect(budgetEngine.getRemainingBudget(0)).toBe(100000);
    });
  });

  describe('canExecute', () => {
    it('returns true for task with no dependencies', () => {
      const result = engine.canExecute(
        { taskId: 'task-1', dependencies: [] },
        []
      );
      expect(result).toBe(true);
    });

    it('returns true when all dependencies completed', () => {
      const result = engine.canExecute(
        { taskId: 'task-3', dependencies: ['task-1', 'task-2'] },
        ['task-1', 'task-2']
      );
      expect(result).toBe(true);
    });

    it('returns false when some dependencies not completed', () => {
      const result = engine.canExecute(
        { taskId: 'task-3', dependencies: ['task-1', 'task-2'] },
        ['task-1']
      );
      expect(result).toBe(false);
    });

    it('returns false when no dependencies completed', () => {
      const result = engine.canExecute(
        { taskId: 'task-2', dependencies: ['task-1'] },
        []
      );
      expect(result).toBe(false);
    });
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('Helper Functions', () => {
  describe('createEmptyContext', () => {
    it('returns context with empty arrays and zero tokens', () => {
      const ctx = createEmptyContext();
      expect(ctx.completedTasks).toEqual([]);
      expect(ctx.handoffs).toEqual({});
      expect(ctx.totalTokensUsed).toBe(0);
      expect(ctx.errors).toEqual([]);
    });
  });

  describe('createExecutionResult', () => {
    it('creates successful result with defaults', () => {
      const result = createExecutionResult('task-1', true);
      expect(result.taskId).toBe('task-1');
      expect(result.success).toBe(true);
      expect(result.tokensUsed).toBe(0);
      expect(result.agentId).toBeDefined();
      expect(result.startedAt).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    it('creates failed result with error', () => {
      const result = createExecutionResult('task-1', false, { error: 'Test error' });
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
    });

    it('includes handoff data when provided', () => {
      const result = createExecutionResult('task-1', true, {
        handoff: { analysis: { findings: ['found something'] } },
      });
      expect(result.handoff).toEqual({ analysis: { findings: ['found something'] } });
    });
  });

  describe('mergeContexts', () => {
    it('merges two contexts correctly', () => {
      const ctx1: AggregatedContext = {
        completedTasks: ['task-1'],
        handoffs: { 'task-1': { data: 'a' } },
        totalTokensUsed: 10000,
        errors: [],
      };
      const ctx2: AggregatedContext = {
        completedTasks: ['task-2'],
        handoffs: { 'task-2': { data: 'b' } },
        totalTokensUsed: 15000,
        errors: ['Error 1'],
      };
      const merged = mergeContexts(ctx1, ctx2);
      expect(merged.completedTasks).toContain('task-1');
      expect(merged.completedTasks).toContain('task-2');
      expect(merged.handoffs['task-1']).toEqual({ data: 'a' });
      expect(merged.handoffs['task-2']).toEqual({ data: 'b' });
      expect(merged.totalTokensUsed).toBe(25000);
      expect(merged.errors).toEqual(['Error 1']);
    });

    it('deduplicates completed tasks', () => {
      const ctx1: AggregatedContext = {
        completedTasks: ['task-1', 'task-2'],
        handoffs: {},
        totalTokensUsed: 10000,
        errors: [],
      };
      const ctx2: AggregatedContext = {
        completedTasks: ['task-2', 'task-3'],
        handoffs: {},
        totalTokensUsed: 10000,
        errors: [],
      };
      const merged = mergeContexts(ctx1, ctx2);
      expect(merged.completedTasks).toHaveLength(3);
      expect(merged.completedTasks).toEqual(['task-1', 'task-2', 'task-3']);
    });

    it('handles empty contexts', () => {
      const merged = mergeContexts(createEmptyContext(), createEmptyContext());
      expect(merged.completedTasks).toEqual([]);
      expect(merged.totalTokensUsed).toBe(0);
    });

    it('merges multiple contexts', () => {
      const ctx1 = createEmptyContext();
      ctx1.completedTasks = ['task-1'];
      ctx1.totalTokensUsed = 1000;

      const ctx2 = createEmptyContext();
      ctx2.completedTasks = ['task-2'];
      ctx2.totalTokensUsed = 2000;

      const ctx3 = createEmptyContext();
      ctx3.completedTasks = ['task-3'];
      ctx3.totalTokensUsed = 3000;

      const merged = mergeContexts(ctx1, ctx2, ctx3);
      expect(merged.completedTasks).toHaveLength(3);
      expect(merged.totalTokensUsed).toBe(6000);
    });
  });
});
