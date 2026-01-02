/**
 * OrchestrationFeature Unit Tests
 * Tests parallel test orchestration commands
 */

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { OrchestrationFeature } from '../../SCRIPTS/features/orchestration-feature';
import { Page } from 'playwright';

// Mock the TestOrchestrator module
vi.mock('../../SCRIPTS/orchestrator/TestOrchestrator', () => {
  return {
    TestOrchestrator: vi.fn().mockImplementation(() => ({
      orchestrate: vi.fn(),
      getStatus: vi.fn().mockReturnValue({ running: false }),
      abort: vi.fn(),
    })),
  };
});

// Import after mocking
import { TestOrchestrator } from '../../SCRIPTS/orchestrator/TestOrchestrator';

// Mock orchestrator results type
interface MockAggregatedResults {
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  duration: number;
  passRate: number;
  instances: Array<{ id: string; port: number }>;
  results: Array<{ testId: string; status: string }>;
  startTime: string;
  endTime: string;
}

function createMockResults(overrides?: Partial<MockAggregatedResults>): MockAggregatedResults {
  return {
    totalTests: 10,
    passed: 8,
    failed: 2,
    errors: 0,
    duration: 5000,
    passRate: 80,
    instances: [
      { id: 'inst1', port: 3456 },
      { id: 'inst2', port: 3457 },
    ],
    results: [
      { testId: 'test1', status: 'passed' },
      { testId: 'test2', status: 'failed' },
    ],
    startTime: '2025-01-01T00:00:00.000Z',
    endTime: '2025-01-01T00:00:05.000Z',
    ...overrides,
  };
}

describe('OrchestrationFeature', () => {
  let mockPage: MockPage;
  let feature: OrchestrationFeature;
  let mockOrchestratorInstance: {
    orchestrate: Mock;
    getStatus: Mock;
    abort: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockPage = createMockPage();

    // Setup mock orchestrator instance behavior
    mockOrchestratorInstance = {
      orchestrate: vi.fn().mockResolvedValue(createMockResults()),
      getStatus: vi.fn().mockReturnValue({ running: false }),
      abort: vi.fn(),
    };

    (TestOrchestrator as Mock).mockImplementation(() => mockOrchestratorInstance);

    feature = new OrchestrationFeature(mockPage as unknown as Page);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 3 handlers', () => {
      const handlers = feature.getCommandHandlers();

      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(3);
      expect(handlers.has('orchestrate')).toBe(true);
      expect(handlers.has('getOrchestrationStatus')).toBe(true);
      expect(handlers.has('abortOrchestration')).toBe(true);
    });
  });

  describe('orchestrate', () => {
    it('starts orchestration with prompt', async () => {
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;

      const result = await orchestrateHandler({
        pattern: 'tests/*.txt',
        instances: 2,
      });

      expect(result.status).toBe('ok');
      expect(result.data).toMatchObject({
        totalTests: 10,
        passed: 8,
        failed: 2,
        errors: 0,
        duration: 5000,
        passRate: 80,
      });
      expect(TestOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          testPattern: 'tests/*.txt',
          instances: 2,
        })
      );
    });

    it('returns error if already running', async () => {
      // Make orchestrator report running status
      mockOrchestratorInstance.getStatus.mockReturnValue({ running: true });

      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;

      // First call to create the orchestrator
      await orchestrateHandler({ pattern: 'tests/*.txt' });

      // Update mock to report running after first orchestrate
      mockOrchestratorInstance.getStatus.mockReturnValue({ running: true });

      // Second call should fail
      const result = await orchestrateHandler({ pattern: 'other/*.txt' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('already in progress');
    });

    it('validates prompt input and uses defaults', async () => {
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;

      await orchestrateHandler({ pattern: 'tests/*.txt' });

      expect(TestOrchestrator).toHaveBeenCalledWith(
        expect.objectContaining({
          testPattern: 'tests/*.txt',
          instances: 3, // default
          basePort: 3456, // default
          baseVitePort: 5173, // default
          testTimeout: 60000, // default
          continueOnFailure: true, // default
          verbose: false, // default
        })
      );
    });

    it('handles orchestration errors', async () => {
      mockOrchestratorInstance.orchestrate.mockRejectedValue(new Error('Test execution failed'));

      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;

      const result = await orchestrateHandler({ pattern: 'tests/*.txt' });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Test execution failed');
    });

    it('includes Playwright code in response', async () => {
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;

      const result = await orchestrateHandler({
        pattern: 'tests/*.txt',
        instances: 4,
      });

      expect(result.status).toBe('ok');
      expect(result.code).toContain('Pattern: tests/*.txt');
      expect(result.code).toContain('Instances: 4');
    });
  });

  describe('getOrchestrationStatus', () => {
    it('returns idle when not running', async () => {
      const handlers = feature.getCommandHandlers();
      const statusHandler = handlers.get('getOrchestrationStatus')!;

      const result = await statusHandler({});

      expect(result.status).toBe('ok');
      expect(result.data).toMatchObject({
        running: false,
        message: expect.stringContaining('No orchestration results'),
      });
    });

    it('returns running status with details', async () => {
      // First start an orchestration
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;
      await orchestrateHandler({ pattern: 'tests/*.txt' });

      // Mock running status with details
      mockOrchestratorInstance.getStatus.mockReturnValue({
        running: true,
        phase: 'executing',
        progress: 50,
        completed: 5,
        total: 10,
        activeInstances: 3,
        aborted: false,
      });

      const statusHandler = handlers.get('getOrchestrationStatus')!;
      const result = await statusHandler({});

      expect(result.status).toBe('ok');
      expect(result.data).toMatchObject({
        running: true,
        phase: 'executing',
        progress: 50,
        completed: 5,
        total: 10,
        activeInstances: 3,
        aborted: false,
      });
    });

    it('includes current step info in running status', async () => {
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;
      await orchestrateHandler({ pattern: 'tests/*.txt' });

      mockOrchestratorInstance.getStatus.mockReturnValue({
        running: true,
        phase: 'setup',
        progress: 10,
        completed: 1,
        total: 10,
        activeInstances: 2,
        aborted: false,
      });

      const statusHandler = handlers.get('getOrchestrationStatus')!;
      const result = await statusHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.phase).toBe('setup');
      expect(result.data?.progress).toBe(10);
    });

    it('returns last results after completion', async () => {
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;
      await orchestrateHandler({ pattern: 'tests/*.txt' });

      // Orchestration finished
      mockOrchestratorInstance.getStatus.mockReturnValue({ running: false });

      const statusHandler = handlers.get('getOrchestrationStatus')!;
      const result = await statusHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.running).toBe(false);
      expect(result.data?.totalTests).toBe(10);
      expect(result.data?.passed).toBe(8);
    });

    it('returns summary format when requested', async () => {
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;
      await orchestrateHandler({ pattern: 'tests/*.txt' });

      const statusHandler = handlers.get('getOrchestrationStatus')!;
      const result = await statusHandler({ format: 'summary' });

      expect(result.status).toBe('ok');
      expect(result.data).toMatchObject({
        running: false,
        totalTests: 10,
        passed: 8,
        failed: 2,
        errors: 0,
        passRate: 80,
        duration: 5000,
        instances: 2, // Count, not array
      });
    });
  });

  describe('abortOrchestration', () => {
    it('aborts running orchestration', async () => {
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;
      await orchestrateHandler({ pattern: 'tests/*.txt' });

      // Mock running status
      mockOrchestratorInstance.getStatus.mockReturnValue({ running: true });

      const abortHandler = handlers.get('abortOrchestration')!;
      const result = await abortHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.message).toContain('abort requested');
      expect(mockOrchestratorInstance.abort).toHaveBeenCalled();
    });

    it('returns message if not running', async () => {
      const handlers = feature.getCommandHandlers();
      const abortHandler = handlers.get('abortOrchestration')!;

      const result = await abortHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.message).toContain('No orchestration running');
    });

    it('cleans up state after abort', async () => {
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;
      await orchestrateHandler({ pattern: 'tests/*.txt' });

      mockOrchestratorInstance.getStatus.mockReturnValue({ running: true });

      const abortHandler = handlers.get('abortOrchestration')!;
      await abortHandler({});

      expect(mockOrchestratorInstance.abort).toHaveBeenCalled();
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('Orchestration');
    });
  });

  describe('cleanup', () => {
    it('aborts running orchestration on cleanup', async () => {
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;
      await orchestrateHandler({ pattern: 'tests/*.txt' });

      mockOrchestratorInstance.getStatus.mockReturnValue({ running: true });

      await feature.cleanup();

      expect(mockOrchestratorInstance.abort).toHaveBeenCalled();
    });

    it('clears orchestrator and results on cleanup', async () => {
      const handlers = feature.getCommandHandlers();
      const orchestrateHandler = handlers.get('orchestrate')!;
      await orchestrateHandler({ pattern: 'tests/*.txt' });

      await feature.cleanup();

      // After cleanup, status should show no results
      const statusHandler = handlers.get('getOrchestrationStatus')!;
      const result = await statusHandler({});

      expect(result.data?.running).toBe(false);
      expect(result.data?.message).toContain('No orchestration results');
    });
  });
});
