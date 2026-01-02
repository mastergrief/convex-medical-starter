/**
 * Performance Regression Guards
 *
 * These tests ensure critical operations complete within expected time bounds.
 * They act as regression guards to detect performance degradation early.
 *
 * IMPORTANT: CI environments may be 2x slower than local development.
 * Thresholds are set conservatively to account for CI variance.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import { parseGateCondition } from '../../lib/gateParser.js';
import { createContextHub } from '../../lib/context-hub.js';
import {
  buildParallelGroups,
  DEFAULT_CONFIG,
} from '../../lib/parallelEngineModules/index.js';
import type { Phase, Subtask } from '../../schemas/index.js';

// Mock fs for ContextHub tests
vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
  readFileSync: vi.fn(() => '{}'),
  writeFileSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  mkdirSync: vi.fn(),
  statSync: vi.fn(() => ({
    isFile: () => true,
    isDirectory: () => false,
    mtime: new Date(),
  })),
}));

describe('Performance Regression Guards', () => {
  /**
   * Gate Parsing Performance
   * Target: < 1ms per simple condition
   * CI Allowance: 2x multiplier built into threshold
   */
  describe('Gate Parsing', () => {
    it('should parse simple condition under 1ms (100 iterations < 100ms)', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        parseGateCondition('typecheck');
      }

      const duration = performance.now() - start;
      // 100 iterations < 100ms = <1ms each average
      // CI allowance: threshold already includes 2x buffer
      expect(duration).toBeLessThan(100);
    });

    it('should parse compound condition under 2ms (100 iterations < 200ms)', () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        parseGateCondition('typecheck AND tests AND memory:ANALYSIS_*');
      }

      const duration = performance.now() - start;
      // Compound conditions are ~2x slower than simple
      expect(duration).toBeLessThan(200);
    });

    it('should parse complex nested condition under 5ms (50 iterations < 250ms)', () => {
      const start = performance.now();

      for (let i = 0; i < 50; i++) {
        parseGateCondition(
          '(typecheck AND tests) OR (memory:SKIP_* AND traceability:justification)'
        );
      }

      const duration = performance.now() - start;
      // Complex conditions with nesting are ~5x slower
      expect(duration).toBeLessThan(250);
    });

    it('should parse threshold condition under 3ms (50 iterations < 150ms)', () => {
      const start = performance.now();

      for (let i = 0; i < 50; i++) {
        parseGateCondition('evidence[coverage] >= 80 AND tests[passed] >= 10');
      }

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(150);
    });
  });

  /**
   * ContextHub Creation Performance
   * Target: < 50ms for initialization
   * CI Allowance: 2x multiplier built into threshold
   */
  describe('ContextHub Creation', () => {
    it('should create ContextHub under 50ms', () => {
      const start = performance.now();

      const hub = createContextHub('perf-test-session');

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
      expect(hub).toBeDefined();
    });

    it('should create multiple ContextHub instances under 100ms (5 instances)', () => {
      const start = performance.now();

      for (let i = 0; i < 5; i++) {
        createContextHub(`perf-test-session-${i}`);
      }

      const duration = performance.now() - start;
      // 5 instances should complete in < 100ms (20ms each average)
      expect(duration).toBeLessThan(100);
    });
  });

  /**
   * Parallel Engine Performance
   * Target: < 10ms for parallel group building
   * CI Allowance: 2x multiplier built into threshold
   */
  describe('Parallel Engine', () => {
    // Helper to create mock subtasks
    function createMockSubtasks(count: number): Subtask[] {
      return Array.from({ length: count }, (_, i) => ({
        id: `task-${i}`,
        description: `Task ${i} description`,
        agentType: 'developer' as const,
        priority: 'medium' as const,
        dependencies: i > 0 ? [`task-${Math.floor(i / 2)}`] : [],
      }));
    }

    function createMockPhase(subtasks: Subtask[]): Phase {
      return {
        id: 'phase-perf',
        name: 'Performance Test Phase',
        description: 'Phase for performance testing',
        subtasks,
        parallelizable: true,
      };
    }

    // Simple prompt builder for testing
    const buildTaskPrompt = (task: Subtask): string =>
      `Execute task: ${task.description}`;

    it('should build parallel groups with 10 tasks under 10ms', () => {
      const phase = createMockPhase(createMockSubtasks(10));
      const start = performance.now();

      const groups = buildParallelGroups(phase, DEFAULT_CONFIG, buildTaskPrompt);

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
      expect(groups.length).toBeGreaterThan(0);
    });

    it('should build parallel groups with 50 tasks under 50ms', () => {
      const phase = createMockPhase(createMockSubtasks(50));
      const start = performance.now();

      const groups = buildParallelGroups(phase, DEFAULT_CONFIG, buildTaskPrompt);

      const duration = performance.now() - start;
      // Larger task sets scale linearly
      expect(duration).toBeLessThan(50);
      expect(groups.length).toBeGreaterThan(0);
    });

    it('should build parallel groups with 100 tasks under 100ms', () => {
      const phase = createMockPhase(createMockSubtasks(100));
      const start = performance.now();

      const groups = buildParallelGroups(phase, DEFAULT_CONFIG, buildTaskPrompt);

      const duration = performance.now() - start;
      // 100 tasks is a stress test - should still be under 100ms
      // CI allowance: 2x multiplier already included
      expect(duration).toBeLessThan(100);
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  /**
   * Combined Operation Performance
   * Tests realistic workflows with multiple operations
   */
  describe('Combined Operations', () => {
    it('should complete parse + hub creation cycle under 60ms', () => {
      const start = performance.now();

      // Simulate typical orchestration startup
      parseGateCondition('typecheck AND tests');
      const hub = createContextHub('combined-test');
      parseGateCondition('memory:ANALYSIS_*');

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(60);
      expect(hub).toBeDefined();
    });
  });
});
