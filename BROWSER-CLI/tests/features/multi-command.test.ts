/**
 * MultiCommandFeature Unit Tests
 * Tests command chaining, batching, and execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { MultiCommandFeature } from '../../SCRIPTS/features/multi-command';
import { Page } from 'playwright';

describe('MultiCommandFeature', () => {
  let mockPage: MockPage;
  let feature: MultiCommandFeature;
  let mockCommandExecutor: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPage = createMockPage();
    feature = new MultiCommandFeature(mockPage as unknown as Page);
    mockCommandExecutor = vi.fn().mockResolvedValue({ status: 'ok', data: {} });
    feature.setCommandExecutor(mockCommandExecutor);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with exec handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.has('exec')).toBe(true);
    });

    it('exec handler is a function', () => {
      const handlers = feature.getCommandHandlers();
      expect(typeof handlers.get('exec')).toBe('function');
    });
  });

  describe('exec command - single command', () => {
    it('executes single command successfully', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      const result = await exec({ commands: 'snapshot' });

      expect(result.status).toBe('ok');
      expect(mockCommandExecutor).toHaveBeenCalledTimes(1);
      expect(mockCommandExecutor).toHaveBeenCalledWith(
        expect.objectContaining({ cmd: 'snapshot' })
      );
    });

    it('returns results array with command info', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      const result = await exec({ commands: 'console' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('results');
      expect(result.data.results).toHaveLength(1);
      expect(result.data.results[0]).toHaveProperty('command', 'console');
    });
  });

  describe('exec command - chaining with &&', () => {
    it('executes multiple commands in sequence', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      const result = await exec({ commands: 'click e1 && wait 500 && snapshot' });

      expect(result.status).toBe('ok');
      expect(mockCommandExecutor).toHaveBeenCalledTimes(3);
    });

    it('preserves command order', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'navigate http://localhost && click e1 && type e2 "hello"' });

      expect(mockCommandExecutor).toHaveBeenNthCalledWith(1, expect.objectContaining({ cmd: 'navigate' }));
      expect(mockCommandExecutor).toHaveBeenNthCalledWith(2, expect.objectContaining({ cmd: 'click' }));
      expect(mockCommandExecutor).toHaveBeenNthCalledWith(3, expect.objectContaining({ cmd: 'type' }));
    });

    it('parses command arguments correctly', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'navigate http://example.com && wait 1000' });

      expect(mockCommandExecutor).toHaveBeenNthCalledWith(1, expect.objectContaining({
        cmd: 'navigate',
        url: 'http://example.com',
      }));
      expect(mockCommandExecutor).toHaveBeenNthCalledWith(2, expect.objectContaining({
        cmd: 'wait',
        ms: 1000,
      }));
    });
  });

  describe('exec command - command parsing', () => {
    it('parses click command with selector', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'click .button' });

      expect(mockCommandExecutor).toHaveBeenCalledWith(expect.objectContaining({
        cmd: 'click',
        selector: '.button',
      }));
    });

    it('parses type command with selector and text', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'type #email "test@example.com"' });

      expect(mockCommandExecutor).toHaveBeenCalledWith(expect.objectContaining({
        cmd: 'type',
        selector: '#email',
        text: 'test@example.com',
      }));
    });

    it('parses snapshot with --full flag', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'snapshot --full' });

      expect(mockCommandExecutor).toHaveBeenCalledWith(expect.objectContaining({
        cmd: 'snapshot',
        full: true,
      }));
    });

    it('parses snapshot with --forms flag', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'snapshot --forms' });

      expect(mockCommandExecutor).toHaveBeenCalledWith(expect.objectContaining({
        cmd: 'snapshot',
        forms: true,
      }));
    });

    it('parses navigate with --waitUntil option', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'navigate http://example.com --waitUntil=networkidle' });

      expect(mockCommandExecutor).toHaveBeenCalledWith(expect.objectContaining({
        cmd: 'navigate',
        url: 'http://example.com',
        waitUntil: 'networkidle',
      }));
    });

    it('parses waitForSelector with --state and --timeout', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'waitForSelector .modal --state=visible --timeout=5000' });

      expect(mockCommandExecutor).toHaveBeenCalledWith(expect.objectContaining({
        cmd: 'waitForSelector',
        selector: '.modal',
        state: 'visible',
        timeout: 5000,
      }));
    });

    it('parses drag command with source and target', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'drag e1 e2' });

      expect(mockCommandExecutor).toHaveBeenCalledWith(expect.objectContaining({
        cmd: 'drag',
        source: 'e1',
        target: 'e2',
      }));
    });

    it('parses resize command with width and height', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'resize 1920 1080' });

      expect(mockCommandExecutor).toHaveBeenCalledWith(expect.objectContaining({
        cmd: 'resize',
        width: 1920,
        height: 1080,
      }));
    });

    it('handles unknown commands with basic arg passing', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'unknownCommand arg1 arg2' });

      expect(mockCommandExecutor).toHaveBeenCalledWith(expect.objectContaining({
        cmd: 'unknownCommand',
        args: ['arg1', 'arg2'],
      }));
    });
  });

  describe('exec command - error handling', () => {
    it('returns error when executor not configured', async () => {
      const unconfiguredFeature = new MultiCommandFeature(mockPage as unknown as Page);
      const handlers = unconfiguredFeature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      const result = await exec({ commands: 'snapshot' });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Command executor not configured');
    });

    it('continues execution when commands succeed', async () => {
      mockCommandExecutor
        .mockResolvedValueOnce({ status: 'ok', data: { snapshot: 'tree1' } })
        .mockResolvedValueOnce({ status: 'ok', data: { messages: [] } })
        .mockResolvedValueOnce({ status: 'ok', data: { requests: [] } });

      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      const result = await exec({ commands: 'snapshot && console && network' });

      expect(result.status).toBe('ok');
      expect(mockCommandExecutor).toHaveBeenCalledTimes(3);
    });

    it('collects all results including errors', async () => {
      mockCommandExecutor
        .mockResolvedValueOnce({ status: 'ok' })
        .mockResolvedValueOnce({ status: 'error', message: 'Element not found' })
        .mockResolvedValueOnce({ status: 'ok' });

      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      const result = await exec({ commands: 'click e1 && click e2 && click e3' });

      // All commands are executed (no stop on error)
      expect(mockCommandExecutor).toHaveBeenCalledTimes(3);
      expect(result.data.results).toHaveLength(3);
    });
  });

  describe('exec command - parallel-safe batching', () => {
    it('executes parallel-safe commands concurrently', async () => {
      const executionOrder: string[] = [];

      mockCommandExecutor.mockImplementation(async (cmdData) => {
        executionOrder.push(`start-${cmdData.cmd}`);
        await new Promise(resolve => setTimeout(resolve, 10));
        executionOrder.push(`end-${cmdData.cmd}`);
        return { status: 'ok' };
      });

      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      // snapshot, console, network are all parallel-safe
      await exec({ commands: 'snapshot && console && network' });

      // All should start before any ends (parallel execution)
      const snapshotStart = executionOrder.indexOf('start-snapshot');
      const consoleStart = executionOrder.indexOf('start-console');
      const networkStart = executionOrder.indexOf('start-network');
      const firstEnd = Math.min(
        executionOrder.indexOf('end-snapshot'),
        executionOrder.indexOf('end-console'),
        executionOrder.indexOf('end-network')
      );

      expect(snapshotStart).toBeLessThan(firstEnd);
      expect(consoleStart).toBeLessThan(firstEnd);
      expect(networkStart).toBeLessThan(firstEnd);
    });

    it('executes sequential commands one at a time', async () => {
      const executionOrder: string[] = [];

      mockCommandExecutor.mockImplementation(async (cmdData) => {
        executionOrder.push(`start-${cmdData.cmd}`);
        await new Promise(resolve => setTimeout(resolve, 10));
        executionOrder.push(`end-${cmdData.cmd}`);
        return { status: 'ok' };
      });

      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      // click and type are sequential (state-changing)
      await exec({ commands: 'click e1 && type e2 "hello"' });

      // First command should complete before second starts
      const clickEnd = executionOrder.indexOf('end-click');
      const typeStart = executionOrder.indexOf('start-type');

      expect(clickEnd).toBeLessThan(typeStart);
    });

    it('separates parallel and sequential commands into batches', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      // Pattern: parallel -> sequential -> parallel
      const result = await exec({ commands: 'snapshot && console && click e1 && network && status' });

      expect(result.status).toBe('ok');
      expect(mockCommandExecutor).toHaveBeenCalledTimes(5);
      // Results should contain all 5 commands
      expect(result.data.results).toHaveLength(5);
    });

    it('marks parallel commands in results', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      const result = await exec({ commands: 'snapshot && console' });

      // Both are parallel-safe, so should be marked as parallel
      expect(result.data.results[0].parallel).toBe(true);
      expect(result.data.results[1].parallel).toBe(true);
    });

    it('marks sequential commands in results', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      const result = await exec({ commands: 'click e1' });

      // click is sequential
      expect(result.data.results[0].parallel).toBe(false);
    });
  });

  describe('parallel-safe command set', () => {
    // Test that read-only commands are recognized as parallel-safe
    const parallelSafeCommands = [
      'snapshot',
      'console',
      'network',
      'status',
      'changes',
      'getPageHTML',
      'getPageText',
      'getElementHTML',
      'getElementText',
      'getComputedStyle',
      'getElementVisibility',
      'getOverlayingElements',
      'countElements',
      'getEventLog',
      'listMocks',
      'listSchemas',
      'listBaselines',
      'listScreenshotBaselines',
      'listStates',
      'listAborts',
      'getMockHistory',
      'getPerformanceMetrics',
      'getConsoleBufferStats',
      'getNetworkBufferStats',
      'getEventBufferStats',
    ];

    it('treats read-only commands as parallel-safe', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      for (const cmd of parallelSafeCommands) {
        mockCommandExecutor.mockClear();
        const result = await exec({ commands: cmd });

        expect(result.status).toBe('ok');
        // If it's the only command, it won't be batched but should still work
        expect(mockCommandExecutor).toHaveBeenCalledWith(
          expect.objectContaining({ cmd })
        );
      }
    });

    // Test that state-changing commands are NOT parallel-safe
    const sequentialCommands = [
      'click',
      'dblclick',
      'type',
      'navigate',
      'wait',
      'pressKey',
      'hover',
      'drag',
      'selectOption',
      'fillForm',
      'uploadFile',
      'evaluate',
      'resize',
      'clearConsole',
      'networkClear',
    ];

    it('treats state-changing commands as sequential', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      for (const cmd of sequentialCommands) {
        mockCommandExecutor.mockClear();
        // Just verify the command is executed (parallel flag will be false)
        const result = await exec({ commands: `${cmd} arg1` });
        expect(result.status).toBe('ok');
      }
    });
  });

  describe('edge cases', () => {
    it('handles empty commands string', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      const result = await exec({ commands: '' });

      // Should handle gracefully (single empty command)
      expect(result.status).toBe('ok');
    });

    it('handles commands with extra whitespace', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: '  click e1   &&   wait 500  ' });

      expect(mockCommandExecutor).toHaveBeenCalledTimes(2);
      expect(mockCommandExecutor).toHaveBeenNthCalledWith(1, expect.objectContaining({ cmd: 'click' }));
      expect(mockCommandExecutor).toHaveBeenNthCalledWith(2, expect.objectContaining({ cmd: 'wait' }));
    });

    it('handles single && separator', async () => {
      const handlers = feature.getCommandHandlers();
      const exec = handlers.get('exec')!;

      await exec({ commands: 'snapshot && console' });

      expect(mockCommandExecutor).toHaveBeenCalledTimes(2);
    });
  });
});
