/**
 * @vitest-environment node
 */
/**
 * Unit tests for evaluator module
 * Tests evaluateGate(), createDefaultContext(), and boolean logic evaluation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createMockGateContext,
  createPassingCheck,
  createFailingCheck,
} from '../setup.js';
import type { GateASTNode } from '../../lib/gateParserModules/types.js';

// Mock validators module
vi.mock('../../lib/gateParserModules/validators.js', () => ({
  checkTypecheck: vi.fn(),
  checkTests: vi.fn(),
  checkMemory: vi.fn(),
  checkTraceability: vi.fn(),
  checkEvidence: vi.fn(),
  checkEvidenceThreshold: vi.fn(),
  checkTestsThreshold: vi.fn(),
}));

import { evaluateGate, createDefaultContext } from '../../lib/gateParserModules/evaluator.js';
import * as validators from '../../lib/gateParserModules/validators.js';

describe('evaluator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Simple Check Evaluation (5 tests)
  // ===========================================================================
  describe('simple checks', () => {
    it('evaluates passing check node', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createPassingCheck('typecheck')
      );

      const ast: GateASTNode = { type: 'check', checkType: 'typecheck' };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].passed).toBe(true);
      expect(result.blockers).toHaveLength(0);
    });

    it('evaluates failing check node with blockers populated', async () => {
      vi.mocked(validators.checkTests).mockResolvedValue(
        createFailingCheck('tests', 'Tests failed with 3 errors')
      );

      const ast: GateASTNode = { type: 'check', checkType: 'tests' };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(false);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].passed).toBe(false);
      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toBe('Tests failed with 3 errors');
    });

    it('handles unknown check type', async () => {
      const ast: GateASTNode = { type: 'check', checkType: 'unknown_check' };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(false);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].check).toBe('unknown_check');
      expect(result.results[0].message).toContain('Unknown check type');
    });

    it('verifies result structure has all required fields', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createPassingCheck('typecheck')
      );

      const ast: GateASTNode = { type: 'check', checkType: 'typecheck' };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('blockers');
      expect(typeof result.passed).toBe('boolean');
      expect(Array.isArray(result.results)).toBe(true);
      expect(Array.isArray(result.blockers)).toBe(true);
    });

    it('propagates message from validator', async () => {
      vi.mocked(validators.checkMemory).mockResolvedValue(
        createPassingCheck('memory', 'Found 5 matching memories')
      );

      const ast: GateASTNode = { type: 'check', checkType: 'memory', pattern: 'ANALYSIS_*' };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.results[0].message).toBe('Found 5 matching memories');
    });
  });

  // ===========================================================================
  // Boolean Logic Evaluation (8 tests)
  // ===========================================================================
  describe('boolean logic', () => {
    it('evaluates AND: true AND true -> true', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createPassingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createPassingCheck('tests')
      );

      const ast: GateASTNode = {
        type: 'and',
        left: { type: 'check', checkType: 'typecheck' },
        right: { type: 'check', checkType: 'tests' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(true);
      expect(result.results).toHaveLength(2);
    });

    it('evaluates AND: true AND false -> false', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createPassingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createFailingCheck('tests')
      );

      const ast: GateASTNode = {
        type: 'and',
        left: { type: 'check', checkType: 'typecheck' },
        right: { type: 'check', checkType: 'tests' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(false);
    });

    it('evaluates AND: false AND true -> false (short-circuit)', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createFailingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createPassingCheck('tests')
      );

      const ast: GateASTNode = {
        type: 'and',
        left: { type: 'check', checkType: 'typecheck' },
        right: { type: 'check', checkType: 'tests' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(false);
      expect(validators.checkTypecheck).toHaveBeenCalled();
      expect(validators.checkTests).not.toHaveBeenCalled();
    });

    it('evaluates OR: false OR true -> true', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createFailingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createPassingCheck('tests')
      );

      const ast: GateASTNode = {
        type: 'or',
        left: { type: 'check', checkType: 'typecheck' },
        right: { type: 'check', checkType: 'tests' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(true);
    });

    it('evaluates OR: true OR false -> true (short-circuit)', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createPassingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createFailingCheck('tests')
      );

      const ast: GateASTNode = {
        type: 'or',
        left: { type: 'check', checkType: 'typecheck' },
        right: { type: 'check', checkType: 'tests' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(true);
      expect(validators.checkTypecheck).toHaveBeenCalled();
      expect(validators.checkTests).not.toHaveBeenCalled();
    });

    it('evaluates OR: false OR false -> false', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createFailingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createFailingCheck('tests')
      );

      const ast: GateASTNode = {
        type: 'or',
        left: { type: 'check', checkType: 'typecheck' },
        right: { type: 'check', checkType: 'tests' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(false);
    });

    it('evaluates NOT: NOT true -> false', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createPassingCheck('typecheck')
      );

      const ast: GateASTNode = {
        type: 'not',
        operand: { type: 'check', checkType: 'typecheck' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(false);
    });

    it('evaluates NOT: NOT false -> true', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createFailingCheck('typecheck')
      );

      const ast: GateASTNode = {
        type: 'not',
        operand: { type: 'check', checkType: 'typecheck' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(true);
    });
  });

  // ===========================================================================
  // Short-Circuit Verification (3 tests)
  // ===========================================================================
  describe('short-circuit verification', () => {
    it('AND short-circuits: left false -> right validator not called', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createFailingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createPassingCheck('tests')
      );

      const ast: GateASTNode = {
        type: 'and',
        left: { type: 'check', checkType: 'typecheck' },
        right: { type: 'check', checkType: 'tests' },
      };
      const context = createMockGateContext();

      await evaluateGate(ast, context);

      expect(validators.checkTypecheck).toHaveBeenCalledTimes(1);
      expect(validators.checkTests).toHaveBeenCalledTimes(0);
    });

    it('OR short-circuits: left true -> right validator not called', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createPassingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createFailingCheck('tests')
      );

      const ast: GateASTNode = {
        type: 'or',
        left: { type: 'check', checkType: 'typecheck' },
        right: { type: 'check', checkType: 'tests' },
      };
      const context = createMockGateContext();

      await evaluateGate(ast, context);

      expect(validators.checkTypecheck).toHaveBeenCalledTimes(1);
      expect(validators.checkTests).toHaveBeenCalledTimes(0);
    });

    it('verifies mock call counts for complex expression', async () => {
      // (typecheck AND tests) OR memory
      // typecheck passes, tests fails -> AND fails -> memory evaluated
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createPassingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createFailingCheck('tests')
      );
      vi.mocked(validators.checkMemory).mockResolvedValue(
        createPassingCheck('memory')
      );

      const ast: GateASTNode = {
        type: 'or',
        left: {
          type: 'and',
          left: { type: 'check', checkType: 'typecheck' },
          right: { type: 'check', checkType: 'tests' },
        },
        right: { type: 'check', checkType: 'memory', pattern: '*' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(true);
      expect(validators.checkTypecheck).toHaveBeenCalledTimes(1);
      expect(validators.checkTests).toHaveBeenCalledTimes(1);
      expect(validators.checkMemory).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Context Creation (2 tests)
  // ===========================================================================
  describe('createDefaultContext', () => {
    it('sets correct sessionPath', () => {
      const sessionPath = '/tmp/test-session';
      const context = createDefaultContext(sessionPath);

      expect(context.sessionPath).toBe(sessionPath);
    });

    it('sets memoriesPath with default value', () => {
      const sessionPath = '/tmp/test-session';
      const context = createDefaultContext(sessionPath);

      expect(context.memoriesPath).toContain('.serena');
      expect(context.memoriesPath).toContain('memories');
    });

    it('sets custom memoriesPath when provided', () => {
      const sessionPath = '/tmp/test-session';
      const memoriesPath = '/custom/memories/path';
      const context = createDefaultContext(sessionPath, memoriesPath);

      expect(context.memoriesPath).toBe(memoriesPath);
    });

    it('provides runCommand function', () => {
      const sessionPath = '/tmp/test-session';
      const context = createDefaultContext(sessionPath);

      expect(typeof context.runCommand).toBe('function');
    });
  });

  // ===========================================================================
  // Result Aggregation (2 tests)
  // ===========================================================================
  describe('result aggregation', () => {
    it('collects all results from multiple checks', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createPassingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createPassingCheck('tests')
      );
      vi.mocked(validators.checkMemory).mockResolvedValue(
        createPassingCheck('memory')
      );

      const ast: GateASTNode = {
        type: 'and',
        left: {
          type: 'and',
          left: { type: 'check', checkType: 'typecheck' },
          right: { type: 'check', checkType: 'tests' },
        },
        right: { type: 'check', checkType: 'memory', pattern: '*' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.results).toHaveLength(3);
      expect(result.results.map(r => r.check)).toContain('typecheck');
      expect(result.results.map(r => r.check)).toContain('tests');
      expect(result.results.map(r => r.check)).toContain('memory');
    });

    it('populates blockers only from failed checks', async () => {
      vi.mocked(validators.checkTypecheck).mockResolvedValue(
        createPassingCheck('typecheck')
      );
      vi.mocked(validators.checkTests).mockResolvedValue(
        createFailingCheck('tests', 'Tests failed')
      );

      const ast: GateASTNode = {
        type: 'and',
        left: { type: 'check', checkType: 'typecheck' },
        right: { type: 'check', checkType: 'tests' },
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.blockers).toHaveLength(1);
      expect(result.blockers[0]).toBe('Tests failed');
      // Typecheck passed, so not in blockers
      expect(result.blockers).not.toContain('typecheck passed');
    });
  });

  // ===========================================================================
  // Threshold Evaluation (2 bonus tests)
  // ===========================================================================
  describe('threshold evaluation', () => {
    it('evaluates evidence threshold check', async () => {
      vi.mocked(validators.checkEvidenceThreshold).mockResolvedValue(
        createPassingCheck('evidence[coverage]>=80', 'Coverage is 85%')
      );

      const ast: GateASTNode = {
        type: 'threshold',
        checkType: 'evidence',
        field: 'coverage',
        operator: '>=',
        value: 80,
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(true);
      expect(validators.checkEvidenceThreshold).toHaveBeenCalledWith(
        'coverage',
        '>=',
        80,
        context
      );
    });

    it('evaluates tests threshold check', async () => {
      vi.mocked(validators.checkTestsThreshold).mockResolvedValue(
        createFailingCheck('tests[passed]>=10', 'Only 5 tests passed')
      );

      const ast: GateASTNode = {
        type: 'threshold',
        checkType: 'tests',
        field: 'passed',
        operator: '>=',
        value: 10,
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(false);
      expect(result.blockers[0]).toBe('Only 5 tests passed');
    });

    it('handles unsupported threshold check type', async () => {
      const ast: GateASTNode = {
        type: 'threshold',
        checkType: 'memory',
        field: 'count',
        operator: '>=',
        value: 5,
      };
      const context = createMockGateContext();

      const result = await evaluateGate(ast, context);

      expect(result.passed).toBe(false);
      expect(result.results[0].message).toContain('Threshold checks not supported');
    });
  });
});
