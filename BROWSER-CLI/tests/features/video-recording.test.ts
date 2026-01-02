/**
 * VideoRecordingFeature Unit Tests
 * Tests video recording start, stop, status, and listing functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { VideoRecordingFeature } from '../../SCRIPTS/features/video-recording';
import { Page, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module for file system operations
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({
      size: 1024000,
      birthtime: new Date('2025-01-01T10:00:00Z'),
    }),
  };
});

// Create mock BrowserContext
function createMockBrowserContext(): BrowserContext {
  const mockVideo = {
    path: vi.fn().mockResolvedValue('/tmp/recordings/test.webm'),
  };

  const mockPage = {
    video: vi.fn().mockReturnValue(mockVideo),
  };

  return {
    pages: vi.fn().mockReturnValue([mockPage]),
    newPage: vi.fn(),
    close: vi.fn(),
    cookies: vi.fn().mockResolvedValue([]),
    storageState: vi.fn(),
    addCookies: vi.fn(),
    clearCookies: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    setDefaultTimeout: vi.fn(),
    setGeolocation: vi.fn(),
    grantPermissions: vi.fn(),
    clearPermissions: vi.fn(),
  } as unknown as BrowserContext;
}

describe('VideoRecordingFeature', () => {
  let mockPage: MockPage;
  let feature: VideoRecordingFeature;
  let mockContext: BrowserContext;
  const testRecordingsDir = '/tmp/test-recordings';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPage = createMockPage();
    feature = new VideoRecordingFeature(mockPage as unknown as Page);
    mockContext = createMockBrowserContext();
    feature.setContext(mockContext);
    feature.setRecordingsDir(testRecordingsDir);

    // Reset fs mocks
    (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
    (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 4 command handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(4);
    });

    it('has startRecording handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('startRecording')).toBe(true);
    });

    it('has stopRecording handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('stopRecording')).toBe(true);
    });

    it('has getRecordingStatus handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('getRecordingStatus')).toBe(true);
    });

    it('has listRecordings handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('listRecordings')).toBe(true);
    });
  });

  describe('startRecording', () => {
    it('starts recording with valid name', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;

      const result = await startHandler({ name: 'my-test-recording' });

      expect(result.status).toBe('ok');
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('my-test-recording');
      expect(result.data?.outputPath).toContain('my-test-recording.webm');
      expect(result.data?.message).toContain('Recording started');
      expect(result.playwrightCode).toContain('recordVideo');
    });

    it('generates default name when not provided', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;

      const result = await startHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.name).toMatch(/^recording-\d+$/);
    });

    it('returns error if already recording', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;

      // Start first recording
      await startHandler({ name: 'first-recording' });

      // Try to start second recording
      const result = await startHandler({ name: 'second-recording' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Recording already in progress');
      expect(result.message).toContain('first-recording');
    });

    it('creates recordings directory if not exists', async () => {
      (fs.existsSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;

      await startHandler({ name: 'test' });

      expect(fs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining(testRecordingsDir),
        { recursive: true }
      );
    });

    it('includes recordVideoOptions in response', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;

      const result = await startHandler({ name: 'test' });

      expect(result.data?.recordVideoOptions).toBeDefined();
      expect(result.data?.recordVideoOptions.size).toEqual({
        width: 1920,
        height: 1080,
      });
    });
  });

  describe('stopRecording', () => {
    it('stops recording and saves file', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;
      const stopHandler = handlers.get('stopRecording')!;

      // Start recording first
      await startHandler({ name: 'to-stop' });

      // Stop recording
      const result = await stopHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.name).toBe('to-stop');
      expect(result.data?.outputPath).toBeDefined();
      expect(result.data?.message).toContain('Recording saved');
    });

    it('returns error if not recording', async () => {
      const handlers = feature.getCommandHandlers();
      const stopHandler = handlers.get('stopRecording')!;

      const result = await stopHandler({});

      expect(result.status).toBe('error');
      expect(result.message).toContain('No recording in progress');
    });

    it('returns path to saved recording', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;
      const stopHandler = handlers.get('stopRecording')!;

      await startHandler({ name: 'path-test' });
      const result = await stopHandler({});

      expect(result.data?.outputPath).toContain('.webm');
    });

    it('includes duration in response', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;
      const stopHandler = handlers.get('stopRecording')!;

      await startHandler({ name: 'duration-test' });
      const result = await stopHandler({});

      expect(result.data?.duration).toBeDefined();
      expect(typeof result.data?.duration).toBe('number');
    });

    it('includes Playwright code in response', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;
      const stopHandler = handlers.get('stopRecording')!;

      await startHandler({ name: 'code-test' });
      const result = await stopHandler({});

      expect(result.playwrightCode).toContain('video');
      expect(result.playwrightCode).toContain('context.close()');
    });
  });

  describe('getRecordingStatus', () => {
    it('returns not recording when idle', async () => {
      const handlers = feature.getCommandHandlers();
      const statusHandler = handlers.get('getRecordingStatus')!;

      const result = await statusHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.isRecording).toBe(false);
      expect(result.data?.message).toContain('No recording in progress');
    });

    it('returns recording status when active', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;
      const statusHandler = handlers.get('getRecordingStatus')!;

      await startHandler({ name: 'active-recording' });
      const result = await statusHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.isRecording).toBe(true);
    });

    it('includes recording name when active', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;
      const statusHandler = handlers.get('getRecordingStatus')!;

      await startHandler({ name: 'named-recording' });
      const result = await statusHandler({});

      expect(result.data?.name).toBe('named-recording');
    });

    it('includes duration when active', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;
      const statusHandler = handlers.get('getRecordingStatus')!;

      await startHandler({ name: 'duration-test' });
      const result = await statusHandler({});

      expect(result.data?.duration).toBeDefined();
      expect(typeof result.data?.duration).toBe('number');
      expect(result.data?.duration).toBeGreaterThanOrEqual(0);
    });

    it('includes output path when active', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;
      const statusHandler = handlers.get('getRecordingStatus')!;

      await startHandler({ name: 'path-test' });
      const result = await statusHandler({});

      expect(result.data?.outputPath).toContain('path-test.webm');
    });
  });

  describe('listRecordings', () => {
    it('returns empty array when no recordings', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([]);

      const handlers = feature.getCommandHandlers();
      const listHandler = handlers.get('listRecordings')!;

      const result = await listHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.count).toBe(0);
      expect(result.data?.recordings).toEqual([]);
    });

    it('returns list of saved recordings', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        'recording1.webm',
        'recording2.webm',
      ]);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({
        size: 1024000,
        birthtime: new Date('2025-01-01T10:00:00Z'),
      });

      const handlers = feature.getCommandHandlers();
      const listHandler = handlers.get('listRecordings')!;

      const result = await listHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.count).toBe(2);
      expect(result.data?.recordings).toHaveLength(2);
    });

    it('includes recording metadata', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        'test-recording.webm',
      ]);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({
        size: 2048000,
        birthtime: new Date('2025-01-15T12:30:00Z'),
      });

      const handlers = feature.getCommandHandlers();
      const listHandler = handlers.get('listRecordings')!;

      const result = await listHandler({});

      expect(result.data?.recordings[0].name).toBe('test-recording');
      expect(result.data?.recordings[0].size).toBe(2048000);
      expect(result.data?.recordings[0].sizeFormatted).toBeDefined();
      expect(result.data?.recordings[0].created).toBeDefined();
    });

    it('filters non-webm files', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockReturnValue([
        'recording.webm',
        'notes.txt',
        'config.json',
        'another.webm',
      ]);
      (fs.statSync as ReturnType<typeof vi.fn>).mockReturnValue({
        size: 1024000,
        birthtime: new Date('2025-01-01T10:00:00Z'),
      });

      const handlers = feature.getCommandHandlers();
      const listHandler = handlers.get('listRecordings')!;

      const result = await listHandler({});

      expect(result.data?.count).toBe(2);
      expect(result.data?.recordings.every((r: { name: string }) =>
        !r.name.includes('.txt') && !r.name.includes('.json')
      )).toBe(true);
    });

    it('includes directory path in response', async () => {
      const handlers = feature.getCommandHandlers();
      const listHandler = handlers.get('listRecordings')!;

      const result = await listHandler({});

      expect(result.data?.directory).toBeDefined();
      expect(result.data?.directory).toContain(testRecordingsDir);
    });

    it('handles directory read errors', async () => {
      (fs.readdirSync as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const handlers = feature.getCommandHandlers();
      const listHandler = handlers.get('listRecordings')!;

      const result = await listHandler({});

      expect(result.status).toBe('error');
      expect(result.message).toContain('Failed to list recordings');
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('VideoRecording');
    });
  });

  describe('setContext', () => {
    it('accepts browser context via setter', () => {
      const newFeature = new VideoRecordingFeature(mockPage as unknown as Page);
      expect(() => newFeature.setContext(mockContext)).not.toThrow();
    });
  });

  describe('setRecordingsDir', () => {
    it('accepts recordings directory via setter', () => {
      const newFeature = new VideoRecordingFeature(mockPage as unknown as Page);
      expect(() => newFeature.setRecordingsDir('/custom/path')).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('resets recording state on cleanup', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startRecording')!;
      const statusHandler = handlers.get('getRecordingStatus')!;

      // Start recording
      await startHandler({ name: 'cleanup-test' });

      // Verify recording is active
      let status = await statusHandler({});
      expect(status.data?.isRecording).toBe(true);

      // Cleanup
      await feature.cleanup();

      // Verify recording state is reset
      status = await statusHandler({});
      expect(status.data?.isRecording).toBe(false);
    });

    it('does not throw when no recording active', async () => {
      await expect(feature.cleanup()).resolves.not.toThrow();
    });
  });
});
