/**
 * @vitest-environment node
 */
/**
 * EvidenceAutoPopulator Unit Tests
 * Comprehensive tests for automatic evidence chain population from handoffs
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';

// Mock fs module before importing modules that use it
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Mock crypto module for deterministic test IDs
vi.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
}));

// Now import the module under test
import { autoPopulateEvidence } from '../../lib/evidenceAutoPopulator.js';
import type { Handoff, EvidenceChain } from '../../schemas/index.js';

// =============================================================================
// Test Utilities
// =============================================================================

const mockedFs = fs as unknown as {
  existsSync: ReturnType<typeof vi.fn>;
  readFileSync: ReturnType<typeof vi.fn>;
  writeFileSync: ReturnType<typeof vi.fn>;
  mkdirSync: ReturnType<typeof vi.fn>;
  readdirSync: ReturnType<typeof vi.fn>;
};

/**
 * Create a mock Handoff for testing
 */
function createMockHandoff(overrides: Partial<Handoff> = {}): Handoff {
  return {
    id: 'handoff-001',
    type: 'handoff',
    metadata: {
      sessionId: 'session-001',
      planId: 'plan-001',
      fromAgent: { type: 'analyst', id: 'analyst-001' },
      toAgent: { type: 'orchestrator' },
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    reason: 'task_complete',
    tokenUsage: { consumed: 5000, limit: 120000, remaining: 115000, percentage: 4.2 },
    state: {
      currentPhase: 'phase-1',
      completedTasks: ['task-1.1'],
      pendingTasks: [],
    },
    results: [
      {
        taskId: 'task-1.1',
        status: 'completed',
        summary: 'Analysis completed',
        output: {
          agentType: 'analyst',
          memoryWritten: 'ANALYSIS_FEATURE_001',
          analyzedSymbols: ['Component', 'Handler'],
          entryPoints: ['Component/handleSubmit'],
          dataFlowMap: { 'Component/handleSubmit': 'api/submit' },
        },
      },
    ],
    fileModifications: [],
    context: {
      criticalContext: 'Test context',
      resumeInstructions: 'Test instructions',
    },
    nextActions: [],
    ...overrides,
  } as Handoff;
}

/**
 * Create a mock EvidenceChain for testing
 */
function createMockEvidenceChain(overrides: Partial<EvidenceChain> = {}): EvidenceChain {
  return {
    id: 'evidence-001',
    sessionId: 'session-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requirement: {
      taskId: 'task-1.1',
      description: 'Test requirement',
      acceptanceCriteria: ['Criterion 1', 'Criterion 2'],
    },
    chainStatus: {
      analysisLinked: false,
      implementationLinked: false,
      validationLinked: false,
      coveragePercent: 0,
      acceptanceCriteriaVerified: 0,
      acceptanceCriteriaTotal: 2,
    },
    ...overrides,
  } as EvidenceChain;
}

// =============================================================================
// Data Extraction Tests
// =============================================================================

describe('Data Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractAnalysisData', () => {
    it('extracts memory name from analyst output', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'analyst', id: 'analyst-test' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.1',
            status: 'completed',
            summary: 'Analysis done',
            output: {
              agentType: 'analyst',
              memoryWritten: 'ANALYSIS_CUSTOM_MEMORY',
              analyzedSymbols: ['Symbol1'],
              entryPoints: ['entry1'],
            },
          },
        ],
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(true);
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.analysis.memoryName).toBe('ANALYSIS_CUSTOM_MEMORY');
    });

    it('extracts agentId from handoff metadata', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'analyst', id: 'custom-agent-id' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });

      await autoPopulateEvidence('/test/session', handoff);

      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.analysis.agentId).toBe('custom-agent-id');
    });

    it('extracts traceability data (symbols and entry points)', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        results: [
          {
            taskId: 'task-1.1',
            status: 'completed',
            summary: 'Analysis',
            output: {
              agentType: 'analyst',
              analyzedSymbols: ['ClassA', 'ClassB', 'FunctionC'],
              entryPoints: ['ClassA/method1', 'FunctionC'],
              dataFlowMap: { 'ClassA/method1': 'ClassB/process' },
            },
          },
        ],
      });

      await autoPopulateEvidence('/test/session', handoff);

      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.analysis.traceabilityData.analyzed_symbols).toEqual([
        'ClassA',
        'ClassB',
        'FunctionC',
      ]);
      expect(writtenContent.analysis.traceabilityData.entry_points).toEqual([
        'ClassA/method1',
        'FunctionC',
      ]);
    });

    it('handles missing analyst output gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        results: [
          {
            taskId: 'task-1.1',
            status: 'completed',
            summary: 'Minimal analysis',
            output: undefined,
          },
        ],
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(true);
      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.analysis.traceabilityData.analyzed_symbols).toEqual([]);
      expect(writtenContent.analysis.traceabilityData.entry_points).toEqual([]);
    });
  });

  describe('extractImplementationData', () => {
    it('extracts files modified from developer handoff', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'developer', id: 'dev-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.2',
            status: 'completed',
            summary: 'Implementation done',
            output: {
              agentType: 'developer',
              symbolsChanged: ['Component/newMethod'],
              typecheckPassed: true,
            },
          },
        ],
        fileModifications: [
          { path: 'src/component.tsx', action: 'modified', summary: 'Added method' },
          { path: 'src/utils.ts', action: 'created', summary: 'New utility' },
        ],
        state: {
          currentPhase: 'phase-1',
          completedTasks: ['task-1.2'],
          pendingTasks: [],
        },
      });

      await autoPopulateEvidence('/test/session', handoff);

      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.implementation.filesModified).toHaveLength(2);
      expect(writtenContent.implementation.filesModified[0].path).toBe('src/component.tsx');
      expect(writtenContent.implementation.filesModified[1].action).toBe('created');
    });

    it('extracts typecheck status from developer output', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'developer', id: 'dev-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.2',
            status: 'completed',
            summary: 'Implementation',
            output: {
              agentType: 'developer',
              typecheckPassed: false,
            },
          },
        ],
        state: {
          currentPhase: 'phase-1',
          completedTasks: ['task-1.2'],
          pendingTasks: [],
        },
      });

      await autoPopulateEvidence('/test/session', handoff);

      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.implementation.typecheckPassed).toBe(false);
    });

    it('extracts symbolsChanged from developer output', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'developer', id: 'dev-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.2',
            status: 'completed',
            summary: 'Implementation',
            output: {
              agentType: 'developer',
              symbolsChanged: ['Form/validate', 'Form/submit', 'utils/helper'],
              typecheckPassed: true,
            },
          },
        ],
        state: {
          currentPhase: 'phase-1',
          completedTasks: ['task-1.2'],
          pendingTasks: [],
        },
      });

      await autoPopulateEvidence('/test/session', handoff);

      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.implementation.symbolsChanged).toEqual([
        'Form/validate',
        'Form/submit',
        'utils/helper',
      ]);
    });
  });

  describe('extractValidationData', () => {
    it('extracts test counts from browser output', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'browser', id: 'browser-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.3',
            status: 'completed',
            summary: 'E2E tests passed',
            output: {
              agentType: 'browser',
              testsPassed: 15,
              testsFailed: 2,
            },
          },
        ],
        state: {
          currentPhase: 'phase-1',
          completedTasks: ['task-1.3'],
          pendingTasks: [],
        },
      });

      await autoPopulateEvidence('/test/session', handoff);

      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.validation.testsPassed).toBe(15);
      expect(writtenContent.validation.testsFailed).toBe(2);
    });

    it('extracts screenshots from browser output', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'browser', id: 'browser-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.3',
            status: 'completed',
            summary: 'Validation',
            output: {
              agentType: 'browser',
              testsPassed: 5,
              testsFailed: 0,
              screenshots: ['before.png', 'after.png', 'success.png'],
            },
          },
        ],
        state: {
          currentPhase: 'phase-1',
          completedTasks: ['task-1.3'],
          pendingTasks: [],
        },
      });

      await autoPopulateEvidence('/test/session', handoff);

      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.validation.screenshots).toEqual(['before.png', 'after.png', 'success.png']);
    });

    it('uses evidence array as fallback for screenshots', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'browser', id: 'browser-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.3',
            status: 'completed',
            summary: 'Validation',
            output: {
              agentType: 'browser',
              testsPassed: 3,
              testsFailed: 0,
              // No screenshots in output
            },
            evidence: ['fallback-screenshot.png'],
          },
        ],
        state: {
          currentPhase: 'phase-1',
          completedTasks: ['task-1.3'],
          pendingTasks: [],
        },
      });

      await autoPopulateEvidence('/test/session', handoff);

      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.validation.screenshots).toEqual(['fallback-screenshot.png']);
    });

    it('handles missing validation data gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'browser', id: 'browser-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.3',
            status: 'completed',
            summary: 'Minimal validation',
            output: undefined,
          },
        ],
        state: {
          currentPhase: 'phase-1',
          completedTasks: ['task-1.3'],
          pendingTasks: [],
        },
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(true);
      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.validation.testsPassed).toBe(0);
      expect(writtenContent.validation.testsFailed).toBe(0);
      expect(writtenContent.validation.screenshots).toEqual([]);
    });
  });
});

// =============================================================================
// Chain Management Tests
// =============================================================================

describe('Chain Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findExistingChain', () => {
    it('finds existing chain by taskId', async () => {
      const existingChain = createMockEvidenceChain({
        requirement: {
          taskId: 'task-1.1',
          description: 'Existing task',
          acceptanceCriteria: [],
        },
      });

      mockedFs.existsSync.mockImplementation((p: string) => {
        return p.includes('evidence');
      });
      mockedFs.readdirSync.mockReturnValue(['evidence-task-1.1.json']);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingChain));

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'developer', id: 'dev-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.1',
            status: 'completed',
            summary: 'Implementation done',
            output: { typecheckPassed: true },
          },
        ],
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      // Should update existing chain, not create new
      expect(result.created).toBe(true);
      expect(result.chainId).toBe('evidence-001');
    });

    it('returns null when chain not found', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff();

      const result = await autoPopulateEvidence('/test/session', handoff);

      // Should create new chain
      expect(result.created).toBe(true);
      expect(result.chainId).toBe('test-uuid-1234');
    });

    it('skips invalid JSON files when searching', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['invalid.json', 'evidence-task-x.json']);
      mockedFs.readFileSync.mockImplementation((p: string) => {
        if ((p as string).includes('invalid.json')) {
          return 'not valid json';
        }
        return JSON.stringify(
          createMockEvidenceChain({
            requirement: { taskId: 'task-x', description: 'Other task', acceptanceCriteria: [] },
          })
        );
      });

      const handoff = createMockHandoff();

      const result = await autoPopulateEvidence('/test/session', handoff);

      // Should create new chain (no match found)
      expect(result.created).toBe(true);
    });
  });

  describe('updateExistingChain', () => {
    it('updates existing chain with new analysis stage', async () => {
      const existingChain = createMockEvidenceChain();

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['evidence-task-1.1.json']);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingChain));

      const handoff = createMockHandoff();

      await autoPopulateEvidence('/test/session', handoff);

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      const updatedContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(updatedContent.chainStatus.analysisLinked).toBe(true);
    });

    it('recalculates coverage percentage after update', async () => {
      const existingChain = createMockEvidenceChain({
        analysis: {
          agentId: 'analyst-001',
          taskId: 'task-1.1',
          memoryName: 'ANALYSIS_TEST',
          traceabilityData: { analyzed_symbols: [], entry_points: [], data_flow_map: {} },
        },
        chainStatus: {
          analysisLinked: true,
          implementationLinked: false,
          validationLinked: false,
          coveragePercent: 33,
          acceptanceCriteriaVerified: 0,
          acceptanceCriteriaTotal: 2,
        },
      });

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['evidence-task-1.1.json']);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingChain));

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'developer', id: 'dev-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.1',
            status: 'completed',
            summary: 'Implementation done',
            output: { typecheckPassed: true },
          },
        ],
      });

      await autoPopulateEvidence('/test/session', handoff);

      const updatedContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      // Now has analysis + implementation = 67%
      expect(updatedContent.chainStatus.coveragePercent).toBe(67);
    });

    it('handles file write errors gracefully', async () => {
      const existingChain = createMockEvidenceChain();

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['evidence-task-1.1.json']);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingChain));
      mockedFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const handoff = createMockHandoff();

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(false);
      expect(result.error).toBe('Permission denied');
    });
  });

  describe('calculateChainStatus', () => {
    it('calculates 100% coverage with all stages linked', async () => {
      const fullChain = createMockEvidenceChain({
        analysis: {
          agentId: 'analyst-001',
          taskId: 'task-1.1',
          memoryName: 'ANALYSIS',
          traceabilityData: { analyzed_symbols: [], entry_points: [], data_flow_map: {} },
        },
        implementation: {
          agentId: 'dev-001',
          taskId: 'task-1.2',
          filesModified: [],
          symbolsChanged: [],
          typecheckPassed: true,
        },
        chainStatus: {
          analysisLinked: true,
          implementationLinked: true,
          validationLinked: false,
          coveragePercent: 67,
          acceptanceCriteriaVerified: 0,
          acceptanceCriteriaTotal: 2,
        },
      });

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue(['evidence-task-1.1.json']);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(fullChain));

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'browser', id: 'browser-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.1',
            status: 'completed',
            summary: 'E2E tests',
            output: { testsPassed: 10, testsFailed: 0 },
          },
        ],
      });

      await autoPopulateEvidence('/test/session', handoff);

      const updatedContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(updatedContent.chainStatus.coveragePercent).toBe(100);
      expect(updatedContent.chainStatus.validationLinked).toBe(true);
    });
  });
});

// =============================================================================
// Auto-Population Entry Point Tests
// =============================================================================

describe('autoPopulateEvidence', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('routing by agent type', () => {
    it('routes analyst results to populateAnalystEvidence', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'analyst', id: 'analyst-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(true);
      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.analysis).toBeDefined();
      expect(writtenContent.implementation).toBeUndefined();
      expect(writtenContent.validation).toBeUndefined();
    });

    it('routes developer results to populateDeveloperEvidence', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'developer', id: 'dev-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.2',
            status: 'completed',
            summary: 'Implementation',
            output: { typecheckPassed: true },
          },
        ],
        state: {
          currentPhase: 'phase-1',
          completedTasks: ['task-1.2'],
          pendingTasks: [],
        },
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(true);
      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.implementation).toBeDefined();
      expect(writtenContent.analysis).toBeUndefined();
      expect(writtenContent.validation).toBeUndefined();
    });

    it('routes browser results to populateBrowserEvidence', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'browser', id: 'browser-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
        results: [
          {
            taskId: 'task-1.3',
            status: 'completed',
            summary: 'E2E tests',
            output: { testsPassed: 5, testsFailed: 0 },
          },
        ],
        state: {
          currentPhase: 'phase-1',
          completedTasks: ['task-1.3'],
          pendingTasks: [],
        },
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(true);
      const writtenContent = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenContent.validation).toBeDefined();
      expect(writtenContent.analysis).toBeUndefined();
      expect(writtenContent.implementation).toBeUndefined();
    });

    it('returns chainId and created flag on success', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff();

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(true);
      expect(result.chainId).toBe('test-uuid-1234');
      expect(result.error).toBeUndefined();
    });

    it('handles unknown agent types gracefully', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        metadata: {
          sessionId: 'session-001',
          planId: 'plan-001',
          fromAgent: { type: 'unknown' as 'analyst', id: 'unknown-001' },
          toAgent: { type: 'orchestrator' },
          timestamp: new Date().toISOString(),
          version: '1.0.0',
        },
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(false);
      expect(result.chainId).toBeUndefined();
    });
  });

  describe('skip conditions', () => {
    it('skips auto-population for non-complete handoffs', async () => {
      const handoff = createMockHandoff({
        reason: 'token_limit',
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(false);
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });

    it('skips when no completed tasks in state', async () => {
      const handoff = createMockHandoff({
        state: {
          currentPhase: 'phase-1',
          completedTasks: [],
          pendingTasks: ['task-1.1'],
        },
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(false);
    });

    it('returns error when no task result found', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff({
        results: [], // No results but completedTasks has a task
      });

      const result = await autoPopulateEvidence('/test/session', handoff);

      expect(result.created).toBe(false);
      expect(result.error).toBe('No task result found');
    });
  });

  describe('directory management', () => {
    it('creates evidence directory if not exists', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff();

      await autoPopulateEvidence('/test/session', handoff);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('evidence'),
        { recursive: true }
      );
    });

    it('does not create directory if already exists', async () => {
      mockedFs.existsSync.mockImplementation((p: string) => {
        return (p as string).includes('evidence');
      });
      mockedFs.readdirSync.mockReturnValue([]);

      const handoff = createMockHandoff();

      await autoPopulateEvidence('/test/session', handoff);

      // mkdirSync should not be called when directory exists
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });
});
