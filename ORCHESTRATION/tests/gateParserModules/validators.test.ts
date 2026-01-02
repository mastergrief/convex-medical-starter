/**
 * @vitest-environment node
 */
/**
 * Unit tests for gateParserModules/validators.ts
 * Tests all 7 check* functions with comprehensive coverage
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createMockGateContext,
  createMockCommandRunner,
} from '../setup.js';

// Mock fs module - readdirSync returns string[] by default in the validators
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(() => [] as string[]),
  readFileSync: vi.fn(),
}));

// Import validators after mocking
import {
  checkTypecheck,
  checkTests,
  checkMemory,
  checkTraceability,
  checkEvidence,
  checkEvidenceThreshold,
  checkTestsThreshold,
} from '../../lib/gateParserModules/validators.js';

describe('validators', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ==========================================================================
  // checkTypecheck (6 tests)
  // ==========================================================================
  describe('checkTypecheck', () => {
    it('returns passed: true when typecheck succeeds with exit code 0', async () => {
      const mockRunner = createMockCommandRunner({
        'npm run typecheck': { stdout: '', stderr: '', exitCode: 0 },
      });
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTypecheck(context);

      expect(result).toMatchObject({ check: 'typecheck', passed: true, message: '0 errors' });
      expect(mockRunner.runCommand).toHaveBeenCalledWith('npm run typecheck', 60000);
    });

    it('returns passed: false with error count when typecheck fails', async () => {
      const mockRunner = createMockCommandRunner({
        'npm run typecheck': {
          stdout: '',
          stderr: 'Found 5 errors in 3 files.',
          exitCode: 1,
        },
      });
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTypecheck(context);

      expect(result).toMatchObject({ check: 'typecheck', passed: false, message: '5 errors' });
    });

    it('handles command timeout by returning error message', async () => {
      const mockRunner = createMockCommandRunner();
      mockRunner.runCommand.mockRejectedValue(new Error('Command timed out after 60000ms'));
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTypecheck(context);

      expect(result).toMatchObject({
        check: 'typecheck',
        passed: false,
        message: 'Command timed out after 60000ms',
      });
    });

    it('extracts error message from stderr correctly', async () => {
      const mockRunner = createMockCommandRunner({
        'npm run typecheck': {
          stdout: '',
          stderr: 'error TS2345: Argument of type\nFound 12 errors',
          exitCode: 1,
        },
      });
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTypecheck(context);

      expect(result.message).toBe('12 errors');
    });

    it('returns unknown error count when stderr does not match pattern', async () => {
      const mockRunner = createMockCommandRunner({
        'npm run typecheck': {
          stdout: '',
          stderr: 'Something went wrong',
          exitCode: 1,
        },
      });
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTypecheck(context);

      expect(result.message).toBe('unknown errors');
    });

    it('uses correct command format npm run typecheck', async () => {
      const mockRunner = createMockCommandRunner();
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      await checkTypecheck(context);

      expect(mockRunner.runCommand).toHaveBeenCalledWith('npm run typecheck', 60000);
    });
  });

  // ==========================================================================
  // checkTests (4 tests)
  // ==========================================================================
  describe('checkTests', () => {
    it('returns passed: true when tests succeed with exit code 0', async () => {
      const mockRunner = createMockCommandRunner({
        'npm test': { stdout: 'All tests passed', stderr: '', exitCode: 0 },
      });
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTests(context);

      expect(result).toMatchObject({ check: 'tests', passed: true });
      expect(result.message).toBeUndefined();
    });

    it('returns passed: false with message when tests fail', async () => {
      const mockRunner = createMockCommandRunner({
        'npm test': { stdout: '', stderr: '2 tests failed', exitCode: 1 },
      });
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTests(context);

      expect(result).toMatchObject({ check: 'tests', passed: false, message: 'Tests failed' });
    });

    it('handles timeout by returning failed result', async () => {
      const mockRunner = createMockCommandRunner();
      mockRunner.runCommand.mockRejectedValue(new Error('Timeout'));
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTests(context);

      expect(result).toMatchObject({ check: 'tests', passed: false, message: 'Tests failed' });
    });

    it('uses 120000ms timeout for test command', async () => {
      const mockRunner = createMockCommandRunner({
        'npm test': { exitCode: 0 },
      });
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      await checkTests(context);

      expect(mockRunner.runCommand).toHaveBeenCalledWith('npm test', 120000);
    });
  });

  // ==========================================================================
  // checkMemory (8 tests)
  // ==========================================================================
  describe('checkMemory', () => {
    it('returns passed: true for exact match of memory file', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['ANALYSIS_COMPLETE.md'] as unknown as ReturnType<typeof fs.readdirSync>);
      const context = createMockGateContext({ memoriesPath: '/test/memories' });

      const result = await checkMemory('ANALYSIS_COMPLETE', context);

      expect(result).toMatchObject({
        check: 'memory:ANALYSIS_COMPLETE',
        passed: true,
        message: 'Found: ANALYSIS_COMPLETE.md',
      });
    });

    it('returns passed: true for wildcard pattern match', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'ANALYSIS_COMPLETE.md',
        'ANALYSIS_PARTIAL.md',
        'OTHER.md',
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      const context = createMockGateContext({ memoriesPath: '/test/memories' });

      const result = await checkMemory('ANALYSIS_*', context);

      expect(result).toMatchObject({
        check: 'memory:ANALYSIS_*',
        passed: true,
      });
      expect(result.message).toContain('ANALYSIS_COMPLETE.md');
      expect(result.message).toContain('ANALYSIS_PARTIAL.md');
    });

    it('returns passed: false when memories directory does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const context = createMockGateContext({ memoriesPath: '/nonexistent/memories' });

      const result = await checkMemory('ANALYSIS_*', context);

      expect(result).toMatchObject({
        check: 'memory:ANALYSIS_*',
        passed: false,
        message: "No memory matching 'ANALYSIS_*' found",
      });
    });

    it('returns passed: false for empty directory', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);
      const context = createMockGateContext({ memoriesPath: '/test/memories' });

      const result = await checkMemory('ANALYSIS_*', context);

      expect(result).toMatchObject({
        check: 'memory:ANALYSIS_*',
        passed: false,
        message: "No memory matching 'ANALYSIS_*' found",
      });
    });

    it('returns passed: false when no files match pattern', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'OTHER_FILE.md',
        'DIFFERENT.md',
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      const context = createMockGateContext({ memoriesPath: '/test/memories' });

      const result = await checkMemory('ANALYSIS_*', context);

      expect(result).toMatchObject({
        check: 'memory:ANALYSIS_*',
        passed: false,
        message: "No memory matching 'ANALYSIS_*' found",
      });
    });

    it('handles multiple wildcard matches and returns all in message', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'IMPL_FEATURE_A.md',
        'IMPL_FEATURE_B.md',
        'IMPL_BUGFIX.md',
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      const context = createMockGateContext({ memoriesPath: '/test/memories' });

      const result = await checkMemory('IMPL_*', context);

      expect(result.passed).toBe(true);
      expect(result.message).toBe('Found: IMPL_FEATURE_A.md, IMPL_FEATURE_B.md, IMPL_BUGFIX.md');
    });

    it('handles invalid regex pattern gracefully', async () => {
      vi.mocked(fs.existsSync).mockImplementation(() => {
        throw new Error('Invalid pattern');
      });
      const context = createMockGateContext({ memoriesPath: '/test/memories' });

      const result = await checkMemory('[invalid', context);

      expect(result.passed).toBe(false);
      expect(result.message).toBe('Invalid pattern');
    });

    it('is case sensitive when matching patterns', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'analysis_complete.md',
        'Analysis_Complete.md',
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      const context = createMockGateContext({ memoriesPath: '/test/memories' });

      const result = await checkMemory('ANALYSIS_*', context);

      // Should NOT match lowercase variants
      expect(result.passed).toBe(false);
    });
  });

  // ==========================================================================
  // checkTraceability (6 tests)
  // ==========================================================================
  describe('checkTraceability', () => {
    it('returns passed: true when analyzed_symbols field exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['memory1.json'] as unknown as ReturnType<typeof fs.readdirSync>);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          traceabilityData: {
            analyzed_symbols: ['Component', 'Method'],
          },
        })
      );
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkTraceability('analyzed_symbols', context);

      expect(result).toMatchObject({
        check: 'traceability:analyzed_symbols',
        passed: true,
      });
    });

    it('returns passed: true when entry_points field exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['memory1.json'] as unknown as ReturnType<typeof fs.readdirSync>);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          traceabilityData: {
            entry_points: ['/src/index.ts'],
          },
        })
      );
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkTraceability('entry_points', context);

      expect(result).toMatchObject({
        check: 'traceability:entry_points',
        passed: true,
      });
    });

    it('returns passed: true when data_flow_map field exists with entries', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['memory1.json'] as unknown as ReturnType<typeof fs.readdirSync>);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          traceabilityData: {
            data_flow_map: { input: 'output' },
          },
        })
      );
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkTraceability('data_flow_map', context);

      expect(result).toMatchObject({
        check: 'traceability:data_flow_map',
        passed: true,
      });
    });

    it('returns passed: false when linked memories directory does not exist', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkTraceability('analyzed_symbols', context);

      expect(result).toMatchObject({
        check: 'traceability:analyzed_symbols',
        passed: false,
        message: 'No linked memories found',
      });
    });

    it('returns passed: false when traceability field is not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['memory1.json'] as unknown as ReturnType<typeof fs.readdirSync>);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          traceabilityData: {
            other_field: 'value',
          },
        })
      );
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkTraceability('analyzed_symbols', context);

      expect(result).toMatchObject({
        check: 'traceability:analyzed_symbols',
        passed: false,
        message: 'Missing traceability field: analyzed_symbols',
      });
    });

    it('skips malformed JSON files and continues checking others', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'bad.json',
        'good.json',
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('{ invalid json }')
        .mockReturnValueOnce(
          JSON.stringify({
            traceabilityData: {
              analyzed_symbols: ['Symbol1'],
            },
          })
        );
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkTraceability('analyzed_symbols', context);

      // Should pass because the second file has valid data
      expect(result.passed).toBe(true);
    });
  });

  // ==========================================================================
  // checkEvidence (5 tests)
  // ==========================================================================
  describe('checkEvidence', () => {
    it('returns passed: true when evidence chain exists by ID', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkEvidence('chain-123', 'exists', context);

      expect(result).toMatchObject({
        check: 'evidence:chain-123 exists',
        passed: true,
        message: 'Evidence chain found',
      });
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join('/test/session', 'evidence', 'chain-123.json')
      );
    });

    it('returns passed: false when evidence chain not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkEvidence('nonexistent', 'exists', context);

      expect(result).toMatchObject({
        check: 'evidence:nonexistent exists',
        passed: false,
        message: 'Evidence chain not found',
      });
    });

    it('handles pattern match check with exists field implicitly', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      const context = createMockGateContext({ sessionPath: '/test/session' });

      // When field is undefined, defaults to exists check
      const result = await checkEvidence('chain-456', undefined, context);

      expect(result).toMatchObject({
        check: 'evidence:chain-456 exists',
        passed: true,
      });
    });

    it('returns passed: true when coverage field is present with value > 0', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['chain1.json'] as unknown as ReturnType<typeof fs.readdirSync>);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          chainStatus: { coveragePercent: 75 },
        })
      );
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkEvidence(undefined, 'coverage', context);

      expect(result).toMatchObject({
        check: 'evidence:coverage',
        passed: true,
        message: 'Coverage: 75%',
      });
    });

    it('returns passed: false when evidence directory is empty', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkEvidence(undefined, 'coverage', context);

      expect(result).toMatchObject({
        check: 'evidence:coverage',
        passed: false,
        message: 'No evidence directory found',
      });
    });
  });

  // ==========================================================================
  // checkEvidenceThreshold (4 tests)
  // ==========================================================================
  describe('checkEvidenceThreshold', () => {
    it('returns passed: true when >= operator is satisfied', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['chain1.json'] as unknown as ReturnType<typeof fs.readdirSync>);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          chainStatus: { coveragePercent: 80 },
        })
      );
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkEvidenceThreshold('coverage', '>=', 75, context);

      expect(result).toMatchObject({
        check: 'evidence:coverage>=75',
        passed: true,
      });
      expect(result.message).toContain('80.0%');
      expect(result.message).toContain('>=75%');
    });

    it('returns passed: false when < operator fails', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['chain1.json'] as unknown as ReturnType<typeof fs.readdirSync>);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          chainStatus: { coveragePercent: 80 },
        })
      );
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkEvidenceThreshold('coverage', '<', 50, context);

      expect(result).toMatchObject({
        check: 'evidence:coverage<50',
        passed: false,
      });
    });

    it('calculates average coverage across multiple chains', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([
        'chain1.json',
        'chain2.json',
        'chain3.json',
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce(JSON.stringify({ chainStatus: { coveragePercent: 60 } }))
        .mockReturnValueOnce(JSON.stringify({ chainStatus: { coveragePercent: 80 } }))
        .mockReturnValueOnce(JSON.stringify({ chainStatus: { coveragePercent: 100 } }));
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkEvidenceThreshold('coverage', '>=', 80, context);

      // Average: (60 + 80 + 100) / 3 = 80
      expect(result.passed).toBe(true);
      expect(result.message).toContain('80.0%');
    });

    it('returns passed: false when no evidence chains found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkEvidenceThreshold('coverage', '>=', 50, context);

      expect(result).toMatchObject({
        check: 'evidence:coverage>=50',
        passed: false,
        message: 'No evidence directory found',
      });
    });
  });

  // ==========================================================================
  // checkTestsThreshold (2 tests)
  // ==========================================================================
  describe('checkTestsThreshold', () => {
    it('calculates passed percentage correctly from test output', async () => {
      const mockRunner = createMockCommandRunner({
        'npm test': {
          stdout: 'Test Suites: 8 passed, 2 failed, 10 total',
          stderr: '',
          exitCode: 1,
        },
      });
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTestsThreshold('passed', '>=', 80, context);

      // 8 passed out of 10 total = 80%
      expect(result.passed).toBe(true);
      expect(result.message).toContain('80.0%');
      expect(result.message).toContain('8/10');
    });

    it('falls back to exit code when test output cannot be parsed', async () => {
      const mockRunner = createMockCommandRunner({
        'npm test': {
          stdout: 'Some unrecognizable output format',
          stderr: '',
          exitCode: 0,
        },
      });
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTestsThreshold('passed', '>=', 100, context);

      expect(result.passed).toBe(true);
      expect(result.message).toBe('Tests passed');
    });
  });

  // ==========================================================================
  // Additional edge case tests for comprehensive coverage
  // ==========================================================================
  describe('edge cases', () => {
    it('checkEvidenceThreshold handles unknown field gracefully', async () => {
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkEvidenceThreshold('unknown_field', '>=', 50, context);

      expect(result).toMatchObject({
        check: 'evidence:unknown_field',
        passed: false,
        message: 'Unknown evidence field: unknown_field',
      });
    });

    it('checkEvidence returns invalid spec message for edge case', async () => {
      const context = createMockGateContext({ sessionPath: '/test/session' });

      // Pass both pattern and coverage field but pattern with non-exists field
      const result = await checkEvidence('chain-123', 'coverage', context);

      // This is an edge case - pattern with coverage field is not a standard check
      expect(result.check).toBe('evidence');
      expect(result.passed).toBe(false);
    });

    it('checkTestsThreshold handles command error', async () => {
      const mockRunner = createMockCommandRunner();
      mockRunner.runCommand.mockRejectedValue(new Error('Command failed'));
      const context = createMockGateContext({ runCommand: mockRunner.runCommand });

      const result = await checkTestsThreshold('passed', '>=', 80, context);

      expect(result).toMatchObject({
        passed: false,
        message: 'Tests failed',
      });
    });

    it('checkTraceability handles fs errors gracefully', async () => {
      vi.mocked(fs.existsSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });
      const context = createMockGateContext({ sessionPath: '/test/session' });

      const result = await checkTraceability('analyzed_symbols', context);

      expect(result).toMatchObject({
        check: 'traceability:analyzed_symbols',
        passed: false,
        message: 'Permission denied',
      });
    });

    it('checkEvidenceThreshold supports all comparison operators', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['chain1.json'] as unknown as ReturnType<typeof fs.readdirSync>);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ chainStatus: { coveragePercent: 50 } })
      );
      const context = createMockGateContext({ sessionPath: '/test/session' });

      // Test all operators
      const expectations = [
        { op: '>=', val: 50, expected: true },
        { op: '<=', val: 50, expected: true },
        { op: '>', val: 50, expected: false },
        { op: '<', val: 50, expected: false },
        { op: '=', val: 50, expected: true },
      ];

      for (const { op, val, expected } of expectations) {
        vi.mocked(fs.readFileSync).mockReturnValue(
          JSON.stringify({ chainStatus: { coveragePercent: 50 } })
        );
        const r = await checkEvidenceThreshold('coverage', op, val, context);
        expect(r.passed).toBe(expected);
      }
    });
  });
});
