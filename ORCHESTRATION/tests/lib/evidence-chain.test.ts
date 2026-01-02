/**
 * @vitest-environment node
 */
/**
 * EvidenceChainBuilder Unit Tests
 * Comprehensive tests for evidence chain builder class and related functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';

// Mock fs module before importing modules that use it
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

// Now import the module
import {
  EvidenceChainBuilder,
  createEvidenceChain,
  loadEvidenceChain,
  saveEvidenceChain,
  formatChainSummary,
  type AnalysisParams,
  type ImplementationParams,
  type ValidationParams,
} from '../../lib/evidence-chain.js';
import type { TraceabilityData } from '../../schemas/index.js';

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Create mock TraceabilityData for analysis tests
 */
function createMockTraceabilityData(overrides: Partial<TraceabilityData> = {}): TraceabilityData {
  return {
    entry_points: ['Component/handleSubmit', 'api/submitForm'],
    data_flow_map: {
      'Component/handleSubmit': 'api/submitForm -> store/update',
    },
    analyzed_symbols: ['Component', 'FormHandler', 'SubmitButton'],
    ...overrides,
  };
}

/**
 * Create mock AnalysisParams
 */
function createMockAnalysisParams(overrides: Partial<AnalysisParams> = {}): AnalysisParams {
  return {
    agentId: 'analyst-001',
    taskId: 'task-1.1',
    memoryName: 'ANALYSIS_FORM_SUBMIT',
    traceabilityData: createMockTraceabilityData(),
    linksTo: undefined,
    ...overrides,
  };
}

/**
 * Create mock ImplementationParams
 */
function createMockImplementationParams(overrides: Partial<ImplementationParams> = {}): ImplementationParams {
  return {
    agentId: 'developer-001',
    taskId: 'task-1.2',
    filesModified: [
      { path: 'src/components/Form.tsx', action: 'modified', summary: 'Added submit handler' },
    ],
    symbolsChanged: ['Form/handleSubmit', 'Form/validateInput'],
    typecheckPassed: true,
    linksTo: undefined,
    ...overrides,
  };
}

/**
 * Create mock ValidationParams
 */
function createMockValidationParams(overrides: Partial<ValidationParams> = {}): ValidationParams {
  return {
    agentId: 'browser-001',
    taskId: 'task-1.3',
    testsPassed: 5,
    testsFailed: 0,
    screenshots: ['screenshot-1.png', 'screenshot-2.png'],
    linksTo: undefined,
    ...overrides,
  };
}

/**
 * Create a complete evidence chain using the builder for testing
 */
function createCompleteChainBuilder(): EvidenceChainBuilder {
  return new EvidenceChainBuilder('test-session-001')
    .setRequirement('req-001', 'Add form submission feature', [
      'Form validates input',
      'Form submits data',
      'Success message shown',
    ])
    .setAnalysis(createMockAnalysisParams())
    .setImplementation(createMockImplementationParams())
    .setValidation(createMockValidationParams());
}

// =============================================================================
// EvidenceChainBuilder Constructor Tests
// =============================================================================

describe('EvidenceChainBuilder', () => {
  describe('constructor', () => {
    it('creates builder with correct sessionId', () => {
      const builder = new EvidenceChainBuilder('test-session-001');
      builder.setRequirement('task-1', 'Test', []);
      const chain = builder.build();
      expect(chain.sessionId).toBe('test-session-001');
    });

    it('generates unique chainId when not provided', () => {
      const builder1 = new EvidenceChainBuilder('session-1');
      const builder2 = new EvidenceChainBuilder('session-1');
      builder1.setRequirement('task-1', 'Test 1', []);
      builder2.setRequirement('task-2', 'Test 2', []);
      const chain1 = builder1.build();
      const chain2 = builder2.build();
      expect(chain1.id).not.toBe(chain2.id);
    });

    it('uses provided chainId when specified', () => {
      const customUUID = 'a1b2c3d4-e5f6-4a7b-9c9d-0e1f2a3b4c5d';
      const builder = new EvidenceChainBuilder('session-1', customUUID);
      builder.setRequirement('task-1', 'Test', []);
      const chain = builder.build();
      expect(chain.id).toBe(customUUID);
    });

    it('sets createdAt timestamp', () => {
      const before = new Date().toISOString();
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);
      const chain = builder.build();
      const after = new Date().toISOString();
      expect(chain.createdAt >= before).toBe(true);
      expect(chain.createdAt <= after).toBe(true);
    });
  });

  // ===========================================================================
  // setRequirement Tests
  // ===========================================================================

  describe('setRequirement', () => {
    it('sets requirement with taskId and description', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-req-1', 'Add login feature', ['User can log in']);
      const chain = builder.build();
      expect(chain.requirement.taskId).toBe('task-req-1');
      expect(chain.requirement.description).toBe('Add login feature');
    });

    it('sets acceptance criteria', () => {
      const builder = new EvidenceChainBuilder('session-1');
      const criteria = ['Criterion 1', 'Criterion 2', 'Criterion 3'];
      builder.setRequirement('task-1', 'Test', criteria);
      const chain = builder.build();
      expect(chain.requirement.acceptanceCriteria).toEqual(criteria);
    });

    it('returns this for method chaining', () => {
      const builder = new EvidenceChainBuilder('session-1');
      const result = builder.setRequirement('task-1', 'Test', []);
      expect(result).toBe(builder);
    });
  });

  // ===========================================================================
  // setAnalysis Tests
  // ===========================================================================

  describe('setAnalysis', () => {
    it('sets analysis stage with all parameters', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      const analysisParams = createMockAnalysisParams();
      builder.setAnalysis(analysisParams);

      const chain = builder.build();
      expect(chain.analysis).toBeDefined();
      expect(chain.analysis?.agentId).toBe('analyst-001');
      expect(chain.analysis?.taskId).toBe('task-1.1');
      expect(chain.analysis?.memoryName).toBe('ANALYSIS_FORM_SUBMIT');
    });

    it('includes traceability data in analysis', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      const traceData = createMockTraceabilityData({
        entry_points: ['entry1', 'entry2'],
        analyzed_symbols: ['sym1', 'sym2', 'sym3'],
      });
      builder.setAnalysis(createMockAnalysisParams({ traceabilityData: traceData }));

      const chain = builder.build();
      expect(chain.analysis?.traceabilityData.entry_points).toEqual(['entry1', 'entry2']);
      expect(chain.analysis?.traceabilityData.analyzed_symbols).toEqual(['sym1', 'sym2', 'sym3']);
    });

    it('returns this for method chaining', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);
      const result = builder.setAnalysis(createMockAnalysisParams());
      expect(result).toBe(builder);
    });
  });

  // ===========================================================================
  // setImplementation Tests
  // ===========================================================================

  describe('setImplementation', () => {
    it('sets implementation with files, symbols, and typecheck', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      const implParams = createMockImplementationParams({
        filesModified: [
          { path: 'src/a.ts', action: 'created', summary: 'New file' },
          { path: 'src/b.ts', action: 'modified', summary: 'Updated' },
        ],
        symbolsChanged: ['functionA', 'classB'],
        typecheckPassed: true,
      });
      builder.setImplementation(implParams);

      const chain = builder.build();
      expect(chain.implementation).toBeDefined();
      expect(chain.implementation?.filesModified).toHaveLength(2);
      expect(chain.implementation?.symbolsChanged).toEqual(['functionA', 'classB']);
      expect(chain.implementation?.typecheckPassed).toBe(true);
    });

    it('handles typecheck failure', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      builder.setImplementation(createMockImplementationParams({ typecheckPassed: false }));

      const chain = builder.build();
      expect(chain.implementation?.typecheckPassed).toBe(false);
    });

    it('returns this for method chaining', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);
      const result = builder.setImplementation(createMockImplementationParams());
      expect(result).toBe(builder);
    });
  });

  // ===========================================================================
  // setValidation Tests
  // ===========================================================================

  describe('setValidation', () => {
    it('sets validation with tests passed and failed counts', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      builder.setValidation(createMockValidationParams({
        testsPassed: 10,
        testsFailed: 2,
      }));

      const chain = builder.build();
      expect(chain.validation).toBeDefined();
      expect(chain.validation?.testsPassed).toBe(10);
      expect(chain.validation?.testsFailed).toBe(2);
    });

    it('includes screenshots in validation', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      const screenshots = ['before.png', 'after.png', 'error.png'];
      builder.setValidation(createMockValidationParams({ screenshots }));

      const chain = builder.build();
      expect(chain.validation?.screenshots).toEqual(screenshots);
    });

    it('returns this for method chaining', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);
      const result = builder.setValidation(createMockValidationParams());
      expect(result).toBe(builder);
    });
  });

  // ===========================================================================
  // build() Tests
  // ===========================================================================

  describe('build', () => {
    it('returns complete EvidenceChain object', () => {
      const builder = createCompleteChainBuilder();
      const chain = builder.build();

      expect(chain.id).toBeDefined();
      expect(chain.sessionId).toBe('test-session-001');
      expect(chain.createdAt).toBeDefined();
      expect(chain.updatedAt).toBeDefined();
      expect(chain.requirement).toBeDefined();
      expect(chain.analysis).toBeDefined();
      expect(chain.implementation).toBeDefined();
      expect(chain.validation).toBeDefined();
      expect(chain.chainStatus).toBeDefined();
    });

    it('throws if requirement not set', () => {
      const builder = new EvidenceChainBuilder('session-1');
      expect(() => builder.build()).toThrow('Requirement is required to build evidence chain');
    });

    it('builds successfully with only requirement set', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', ['criterion 1']);

      const chain = builder.build();
      expect(chain.requirement.taskId).toBe('task-1');
      expect(chain.analysis).toBeUndefined();
      expect(chain.implementation).toBeUndefined();
      expect(chain.validation).toBeUndefined();
    });

    it('sets chainStatus.analysisLinked correctly', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      let chain = builder.build();
      expect(chain.chainStatus.analysisLinked).toBe(false);

      builder.setAnalysis(createMockAnalysisParams());
      chain = builder.build();
      expect(chain.chainStatus.analysisLinked).toBe(true);
    });

    it('sets chainStatus.implementationLinked correctly', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      let chain = builder.build();
      expect(chain.chainStatus.implementationLinked).toBe(false);

      builder.setImplementation(createMockImplementationParams());
      chain = builder.build();
      expect(chain.chainStatus.implementationLinked).toBe(true);
    });

    it('sets chainStatus.validationLinked correctly', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      let chain = builder.build();
      expect(chain.chainStatus.validationLinked).toBe(false);

      builder.setValidation(createMockValidationParams());
      chain = builder.build();
      expect(chain.chainStatus.validationLinked).toBe(true);
    });

    it('calculates coveragePercent based on stages', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      // 0 stages = ~0%
      let chain = builder.build();
      expect(chain.chainStatus.coveragePercent).toBe(0);

      // 1 stage (analysis) = ~33%
      builder.setAnalysis(createMockAnalysisParams());
      chain = builder.build();
      expect(chain.chainStatus.coveragePercent).toBe(33);

      // 2 stages = ~67%
      builder.setImplementation(createMockImplementationParams());
      chain = builder.build();
      expect(chain.chainStatus.coveragePercent).toBe(67);

      // 3 stages = 100%
      builder.setValidation(createMockValidationParams());
      chain = builder.build();
      expect(chain.chainStatus.coveragePercent).toBe(100);
    });

    it('tracks acceptance criteria counts', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', ['C1', 'C2', 'C3']);

      const chain = builder.build();
      expect(chain.chainStatus.acceptanceCriteriaTotal).toBe(3);
      expect(chain.chainStatus.acceptanceCriteriaVerified).toBe(0);
    });
  });

  // ===========================================================================
  // Method Chaining Tests
  // ===========================================================================

  describe('method chaining', () => {
    it('allows fluent API for all setters', () => {
      const chain = new EvidenceChainBuilder('session-1')
        .setRequirement('task-1', 'Fluent test', ['criterion'])
        .setAnalysis(createMockAnalysisParams())
        .setImplementation(createMockImplementationParams())
        .setValidation(createMockValidationParams())
        .build();

      expect(chain.requirement).toBeDefined();
      expect(chain.analysis).toBeDefined();
      expect(chain.implementation).toBeDefined();
      expect(chain.validation).toBeDefined();
    });
  });

  // ===========================================================================
  // toJSON Tests
  // ===========================================================================

  describe('toJSON', () => {
    it('serializes chain to JSON string', () => {
      const builder = createCompleteChainBuilder();
      const json = builder.toJSON();

      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('serialized JSON contains all chain properties', () => {
      const builder = createCompleteChainBuilder();
      const json = builder.toJSON();
      const parsed = JSON.parse(json);

      expect(parsed.id).toBeDefined();
      expect(parsed.sessionId).toBe('test-session-001');
      expect(parsed.requirement).toBeDefined();
      expect(parsed.analysis).toBeDefined();
      expect(parsed.implementation).toBeDefined();
      expect(parsed.validation).toBeDefined();
      expect(parsed.chainStatus).toBeDefined();
    });
  });

  // ===========================================================================
  // fromJSON Tests
  // ===========================================================================

  describe('fromJSON', () => {
    it('deserializes JSON back to builder state', () => {
      const originalBuilder = createCompleteChainBuilder();
      const json = originalBuilder.toJSON();

      const restoredBuilder = EvidenceChainBuilder.fromJSON(json);
      const restoredChain = restoredBuilder.build();
      const originalChain = originalBuilder.build();

      expect(restoredChain.sessionId).toBe(originalChain.sessionId);
      expect(restoredChain.requirement.taskId).toBe(originalChain.requirement.taskId);
    });

    it('preserves chainId from original', () => {
      const preservedUUID = 'b2c3d4e5-f6a7-4b8c-ad0e-1f2a3b4c5d6e';
      const originalBuilder = new EvidenceChainBuilder('session-1', preservedUUID);
      originalBuilder.setRequirement('task-1', 'Test', []);
      const json = originalBuilder.toJSON();

      const restoredBuilder = EvidenceChainBuilder.fromJSON(json);
      const restoredChain = restoredBuilder.build();

      expect(restoredChain.id).toBe(preservedUUID);
    });

    it('throws error for invalid JSON', () => {
      expect(() => EvidenceChainBuilder.fromJSON('not valid json')).toThrow();
    });

    it('throws error for JSON missing required fields', () => {
      const invalidJson = JSON.stringify({ id: 'test', sessionId: 'session' });
      expect(() => EvidenceChainBuilder.fromJSON(invalidJson)).toThrow();
    });
  });

  // ===========================================================================
  // validateChainLinks Tests
  // ===========================================================================

  describe('validateChainLinks', () => {
    it('returns error when requirement not set', () => {
      const builder = new EvidenceChainBuilder('session-1');
      const result = builder.validateChainLinks();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Requirement is required for evidence chain');
      expect(result.coveragePercent).toBe(0);
    });

    it('returns valid for chain with only requirement', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);
      const result = builder.validateChainLinks();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('warns when implementation does not link to analysis', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);
      builder.setAnalysis(createMockAnalysisParams());
      builder.setImplementation(createMockImplementationParams());

      const result = builder.validateChainLinks();

      expect(result.warnings).toContain('Implementation does not explicitly link to analysis task');
    });

    it('warns when validation does not link to implementation', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);
      builder.setImplementation(createMockImplementationParams());
      builder.setValidation(createMockValidationParams());

      const result = builder.validateChainLinks();

      expect(result.warnings).toContain('Validation does not explicitly link to implementation task');
    });
  });
});

// =============================================================================
// I/O Function Tests
// =============================================================================

describe('I/O Functions', () => {
  const mockedFs = fs as unknown as {
    existsSync: ReturnType<typeof vi.fn>;
    readFileSync: ReturnType<typeof vi.fn>;
    writeFileSync: ReturnType<typeof vi.fn>;
    mkdirSync: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveEvidenceChain', () => {
    it('writes chain to correct file path', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      mockedFs.existsSync.mockReturnValue(true);

      saveEvidenceChain(builder, '/path/to/evidence/chain.json');

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        '/path/to/evidence/chain.json',
        expect.any(String),
        'utf-8'
      );
    });

    it('creates directory if it does not exist', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test', []);

      mockedFs.existsSync.mockReturnValue(false);

      saveEvidenceChain(builder, '/new/path/chain.json');

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('/new/path'),
        { recursive: true }
      );
    });

    it('writes valid JSON content', () => {
      const builder = new EvidenceChainBuilder('session-1');
      builder.setRequirement('task-1', 'Test requirement', ['criterion']);

      mockedFs.existsSync.mockReturnValue(true);

      saveEvidenceChain(builder, '/path/chain.json');

      const writtenContent = mockedFs.writeFileSync.mock.calls[0][1] as string;
      const parsed = JSON.parse(writtenContent);
      expect(parsed.requirement.description).toBe('Test requirement');
    });
  });

  describe('loadEvidenceChain', () => {
    it('reads and returns builder from existing chain file', () => {
      const originalBuilder = new EvidenceChainBuilder('session-1');
      originalBuilder.setRequirement('task-1', 'Load test', ['criterion']);
      const json = originalBuilder.toJSON();

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(json);

      const loaded = loadEvidenceChain('/path/chain.json');
      const chain = loaded.build();

      expect(chain.requirement.description).toBe('Load test');
    });

    it('throws error for non-existent chain file', () => {
      mockedFs.existsSync.mockReturnValue(false);

      expect(() => loadEvidenceChain('/nonexistent/chain.json')).toThrow(
        'Evidence chain file not found'
      );
    });
  });
});

// =============================================================================
// createEvidenceChain Helper Tests
// =============================================================================

describe('createEvidenceChain', () => {
  it('creates builder with requirement already set', () => {
    const builder = createEvidenceChain(
      'session-1',
      'task-1',
      'Feature description',
      ['criterion 1', 'criterion 2']
    );

    // Should be able to build without calling setRequirement
    const chain = builder.build();
    expect(chain.requirement.taskId).toBe('task-1');
    expect(chain.requirement.description).toBe('Feature description');
    expect(chain.requirement.acceptanceCriteria).toHaveLength(2);
  });

  it('returns EvidenceChainBuilder instance', () => {
    const builder = createEvidenceChain('session-1', 'task-1', 'Test', []);
    expect(builder).toBeInstanceOf(EvidenceChainBuilder);
  });

  it('allows chaining additional stages', () => {
    const chain = createEvidenceChain('session-1', 'task-1', 'Test', [])
      .setAnalysis(createMockAnalysisParams())
      .setImplementation(createMockImplementationParams())
      .build();

    expect(chain.analysis).toBeDefined();
    expect(chain.implementation).toBeDefined();
  });
});

// =============================================================================
// formatChainSummary Tests
// =============================================================================

describe('formatChainSummary', () => {
  it('formats empty chain (requirement only)', () => {
    const builder = new EvidenceChainBuilder('session-1');
    builder.setRequirement('task-1', 'Minimal requirement', []);
    const chain = builder.build();

    const summary = formatChainSummary(chain);

    expect(summary).toContain('EVIDENCE CHAIN SUMMARY');
    expect(summary).toContain('REQUIREMENT');
    expect(summary).toContain('task-1');
    expect(summary).toContain('Minimal requirement');
    expect(summary).toContain('CHAIN STATUS');
    expect(summary).toContain('Analysis Linked: NO');
  });

  it('formats complete chain with all stages', () => {
    const builder = createCompleteChainBuilder();
    const chain = builder.build();

    const summary = formatChainSummary(chain);

    expect(summary).toContain('EVIDENCE CHAIN SUMMARY');
    expect(summary).toContain('REQUIREMENT');
    expect(summary).toContain('ANALYSIS');
    expect(summary).toContain('IMPLEMENTATION');
    expect(summary).toContain('VALIDATION');
    expect(summary).toContain('CHAIN STATUS');
    expect(summary).toContain('Analysis Linked: YES');
    expect(summary).toContain('Implementation Linked: YES');
    expect(summary).toContain('Validation Linked: YES');
  });

  it('includes session and chain IDs', () => {
    const testChainUUID = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';
    const builder = new EvidenceChainBuilder('my-session-id', testChainUUID);
    builder.setRequirement('task-1', 'Test', []);
    const chain = builder.build();

    const summary = formatChainSummary(chain);

    expect(summary).toContain(testChainUUID);
    expect(summary).toContain('my-session-id');
  });

  it('lists acceptance criteria', () => {
    const builder = new EvidenceChainBuilder('session-1');
    builder.setRequirement('task-1', 'Test', [
      'User can submit form',
      'Validation errors shown',
      'Success message displayed',
    ]);
    const chain = builder.build();

    const summary = formatChainSummary(chain);

    expect(summary).toContain('User can submit form');
    expect(summary).toContain('Validation errors shown');
    expect(summary).toContain('Success message displayed');
  });

  it('shows coverage percentage', () => {
    const builder = createCompleteChainBuilder();
    const chain = builder.build();

    const summary = formatChainSummary(chain);

    expect(summary).toContain('Coverage:');
    expect(summary).toMatch(/Coverage: \d+%/);
  });

  it('shows files modified in implementation section', () => {
    const builder = new EvidenceChainBuilder('session-1');
    builder.setRequirement('task-1', 'Test', []);
    builder.setImplementation(createMockImplementationParams({
      filesModified: [
        { path: 'src/components/Feature.tsx', action: 'modified', summary: 'Added feature' },
        { path: 'src/utils/helper.ts', action: 'created', summary: 'New utility' },
      ],
    }));
    const chain = builder.build();

    const summary = formatChainSummary(chain);

    expect(summary).toContain('modified: src/components/Feature.tsx');
    expect(summary).toContain('created: src/utils/helper.ts');
  });

  it('shows test counts in validation section', () => {
    const builder = new EvidenceChainBuilder('session-1');
    builder.setRequirement('task-1', 'Test', []);
    builder.setValidation(createMockValidationParams({
      testsPassed: 15,
      testsFailed: 3,
    }));
    const chain = builder.build();

    const summary = formatChainSummary(chain);

    expect(summary).toContain('Tests Passed: 15');
    expect(summary).toContain('Tests Failed: 3');
  });

  it('shows typecheck status in implementation section', () => {
    const builder = new EvidenceChainBuilder('session-1');
    builder.setRequirement('task-1', 'Test', []);
    builder.setImplementation(createMockImplementationParams({ typecheckPassed: true }));
    const chain = builder.build();

    const summary = formatChainSummary(chain);

    expect(summary).toContain('Typecheck: PASSED');
  });
});
