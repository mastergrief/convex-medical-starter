/**
 * FlakyDetectionFeature Unit Tests
 * Tests flaky test detection and analysis functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { FlakyDetectionFeature } from '../../SCRIPTS/features/flaky-detection';
import { Page } from 'playwright';

describe('FlakyDetectionFeature', () => {
  let mockPage: MockPage;
  let feature: FlakyDetectionFeature;

  beforeEach(() => {
    mockPage = createMockPage();
    feature = new FlakyDetectionFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 2 handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(2);
    });

    it('registers runTestMultipleTimes handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('runTestMultipleTimes')).toBe(true);
    });

    it('registers analyzeFlakiness handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('analyzeFlakiness')).toBe(true);
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('FlakyDetection');
    });
  });

  describe('runTestMultipleTimes', () => {
    it('returns error if command executor not configured', async () => {
      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 3,
        command: 'snapshot',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Command executor not configured');
    });

    it('returns error for invalid iterations', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 0,
        command: 'snapshot',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('iterations must be a positive integer');
    });

    it('returns error for missing command', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 3,
        command: '',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('command must be a non-empty string');
    });

    it('runs command N times', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 5,
        command: 'snapshot',
      });

      expect(result.status).toBe('ok');
      expect(mockExecutor).toHaveBeenCalledTimes(5);
    });

    it('records pass/fail for each run', async () => {
      const mockExecutor = vi
        .fn()
        .mockResolvedValueOnce({ status: 'ok', data: {} })
        .mockResolvedValueOnce({ status: 'error', message: 'Failed' })
        .mockResolvedValueOnce({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 3,
        command: 'snapshot',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toMatchObject({
        passCount: 2,
        failCount: 1,
        iterations: 3,
      });
    });

    it('returns individual run results', async () => {
      const mockExecutor = vi
        .fn()
        .mockResolvedValueOnce({ status: 'ok', data: { msg: 'run1' } })
        .mockResolvedValueOnce({ status: 'ok', data: { msg: 'run2' } });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 2,
        command: 'snapshot',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('command', 'snapshot');
      expect(result.data).toHaveProperty('iterations', 2);
      expect(result.data).toHaveProperty('passCount', 2);
      expect(result.data).toHaveProperty('failCount', 0);
    });

    it('calculates pass rate correctly', async () => {
      const mockExecutor = vi
        .fn()
        .mockResolvedValueOnce({ status: 'ok', data: {} })
        .mockResolvedValueOnce({ status: 'ok', data: {} })
        .mockResolvedValueOnce({ status: 'error', message: 'Failed' })
        .mockResolvedValueOnce({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 4,
        command: 'snapshot',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('passRate', 75);
    });

    it('detects flaky tests (partial pass rate)', async () => {
      const mockExecutor = vi
        .fn()
        .mockResolvedValueOnce({ status: 'ok', data: {} })
        .mockResolvedValueOnce({ status: 'error', message: 'Failed' });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 2,
        command: 'snapshot',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('isFlaky', true);
    });

    it('reports non-flaky for 100% pass rate', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 3,
        command: 'snapshot',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('isFlaky', false);
    });

    it('reports non-flaky for 0% pass rate', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'error', message: 'Failed' });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 3,
        command: 'snapshot',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('isFlaky', false);
    });

    it('handles executor throwing errors', async () => {
      const mockExecutor = vi.fn().mockRejectedValue(new Error('Network error'));
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 2,
        command: 'snapshot',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('passCount', 0);
      expect(result.data).toHaveProperty('failCount', 2);
    });

    it('returns average duration', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 2,
        command: 'snapshot',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('averageDuration');
      expect(typeof result.data?.averageDuration).toBe('number');
    });

    it('returns recommendation', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      const result = await runHandler!({
        iterations: 2,
        command: 'snapshot',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('recommendation');
      expect(typeof result.data?.recommendation).toBe('string');
    });
  });

  describe('analyzeFlakiness', () => {
    it('returns error if no test data', async () => {
      const handlers = feature.getCommandHandlers();
      const analyzeHandler = handlers.get('analyzeFlakiness');

      const result = await analyzeHandler!({});

      expect(result.status).toBe('error');
      expect(result.message).toBe('No flakiness test has been run yet. Use runTestMultipleTimes first.');
    });

    it('calculates pass rate correctly', async () => {
      const mockExecutor = vi
        .fn()
        .mockResolvedValueOnce({ status: 'ok', data: {} })
        .mockResolvedValueOnce({ status: 'error', message: 'Failed' })
        .mockResolvedValueOnce({ status: 'ok', data: {} })
        .mockResolvedValueOnce({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();

      // Run tests first
      await handlers.get('runTestMultipleTimes')!({
        iterations: 4,
        command: 'click e1',
      });

      // Analyze results
      const result = await handlers.get('analyzeFlakiness')!({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('passRate', 75);
      expect(result.data).toHaveProperty('passCount', 3);
      expect(result.data).toHaveProperty('failCount', 1);
    });

    it('reports average duration', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();

      // Run tests first
      await handlers.get('runTestMultipleTimes')!({
        iterations: 3,
        command: 'snapshot',
      });

      // Analyze results
      const result = await handlers.get('analyzeFlakiness')!({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('averageDuration');
      expect(typeof result.data?.averageDuration).toBe('number');
    });

    it('identifies flaky patterns', async () => {
      const mockExecutor = vi
        .fn()
        .mockResolvedValueOnce({ status: 'ok', data: {} })
        .mockResolvedValueOnce({ status: 'error', message: 'Timeout' })
        .mockResolvedValueOnce({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();

      // Run tests first
      await handlers.get('runTestMultipleTimes')!({
        iterations: 3,
        command: 'click e5',
      });

      // Analyze results
      const result = await handlers.get('analyzeFlakiness')!({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('isFlaky', true);
      expect(result.data).toHaveProperty('recommendation');
    });

    it('returns summary format by default', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();

      await handlers.get('runTestMultipleTimes')!({
        iterations: 2,
        command: 'snapshot',
      });

      const result = await handlers.get('analyzeFlakiness')!({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('format', 'summary');
    });

    it('returns json format when requested', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();

      await handlers.get('runTestMultipleTimes')!({
        iterations: 2,
        command: 'snapshot',
      });

      const result = await handlers.get('analyzeFlakiness')!({ format: 'json' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('format', 'json');
      expect(result.data).toHaveProperty('report');
    });

    it('returns detailed format with runs when requested', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();

      await handlers.get('runTestMultipleTimes')!({
        iterations: 2,
        command: 'snapshot',
      });

      const result = await handlers.get('analyzeFlakiness')!({ format: 'detailed' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('format', 'detailed');
      expect(result.data).toHaveProperty('runs');
      expect(Array.isArray(result.data?.runs)).toBe(true);
    });
  });

  describe('setCommandExecutor', () => {
    it('sets command executor for running tests', async () => {
      const mockExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
      feature.setCommandExecutor(mockExecutor);

      const handlers = feature.getCommandHandlers();
      const runHandler = handlers.get('runTestMultipleTimes');

      await runHandler!({
        iterations: 1,
        command: 'snapshot',
      });

      expect(mockExecutor).toHaveBeenCalled();
    });
  });
});
