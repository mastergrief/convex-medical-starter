/**
 * HARExportFeature Unit Tests
 * Tests HAR capture and export functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockPage, MockPage, createMockNetworkRequest } from '../setup';
import { HARExportFeature } from '../../SCRIPTS/features/har-export';
import { NetworkCaptureFeature, NetworkRequest } from '../../SCRIPTS/features/network-capture';
import { Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    statSync: vi.fn().mockReturnValue({ size: 1024 }),
  };
});

/**
 * Create a mock NetworkCaptureFeature for testing
 */
function createMockNetworkCapture(requests: NetworkRequest[] = []): NetworkCaptureFeature {
  return {
    name: 'NetworkCapture',
    getAllRequests: vi.fn().mockReturnValue(requests),
    getNetwork: vi.fn(),
    clearNetwork: vi.fn(),
    setup: vi.fn(),
    cleanup: vi.fn(),
    getCommandHandlers: vi.fn().mockReturnValue(new Map()),
    getBufferStats: vi.fn(),
    setBufferCapacity: vi.fn(),
  } as unknown as NetworkCaptureFeature;
}

/**
 * Create a NetworkRequest matching the feature's expected format
 */
function createNetworkRequest(
  url: string,
  method = 'GET',
  status = 200,
  options?: {
    statusText?: string;
    duration?: number;
    headers?: Record<string, string>;
    responseHeaders?: Record<string, string>;
    postData?: string;
    timestamp?: number;
  }
): NetworkRequest {
  return {
    url,
    method,
    status,
    statusText: options?.statusText ?? 'OK',
    timestamp: options?.timestamp ?? Date.now(),
    headers: options?.headers ?? {},
    responseHeaders: options?.responseHeaders ?? {},
    postData: options?.postData,
    timing: options?.duration !== undefined ? {
      startTime: Date.now(),
      endTime: Date.now() + options.duration,
      duration: options.duration
    } : undefined,
  };
}

describe('HARExportFeature', () => {
  let mockPage: MockPage;
  let feature: HARExportFeature;
  let mockNetworkCapture: NetworkCaptureFeature;

  beforeEach(() => {
    mockPage = createMockPage();
    feature = new HARExportFeature(mockPage as unknown as Page);
    mockNetworkCapture = createMockNetworkCapture();

    // Reset fs mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.writeFileSync).mockClear();
    vi.mocked(fs.mkdirSync).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 3 command handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(3);
    });

    it('includes startHAR handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('startHAR')).toBe(true);
    });

    it('includes exportHAR handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('exportHAR')).toBe(true);
    });

    it('includes getHARData handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('getHARData')).toBe(true);
    });
  });

  describe('startHAR', () => {
    it('returns error if NetworkCaptureFeature not available', async () => {
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startHAR');

      const result = await startHandler!({});

      expect(result.status).toBe('error');
      expect(result.message).toContain('NetworkCaptureFeature not available');
    });

    it('initializes HAR capture when network capture available', async () => {
      feature.setNetworkCaptureFeature(mockNetworkCapture);
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startHAR');

      const result = await startHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.startTime).toBeDefined();
      expect(result.data?.startTimeISO).toBeDefined();
      expect(result.data?.message).toContain('HAR capture started');
    });

    it('returns start time as ISO string', async () => {
      feature.setNetworkCaptureFeature(mockNetworkCapture);
      const handlers = feature.getCommandHandlers();
      const startHandler = handlers.get('startHAR');

      const result = await startHandler!({});

      expect(result.status).toBe('ok');
      // Verify startTimeISO is a valid ISO date string
      const isoDate = new Date(result.data?.startTimeISO);
      expect(isoDate.toISOString()).toBe(result.data?.startTimeISO);
    });
  });

  describe('exportHAR', () => {
    it('returns error if NetworkCaptureFeature not available', async () => {
      const handlers = feature.getCommandHandlers();
      const exportHandler = handlers.get('exportHAR');

      const result = await exportHandler!({});

      expect(result.status).toBe('error');
      expect(result.message).toContain('NetworkCaptureFeature not available');
    });

    it('returns error if no requests captured', async () => {
      feature.setNetworkCaptureFeature(mockNetworkCapture);
      const handlers = feature.getCommandHandlers();
      const exportHandler = handlers.get('exportHAR');

      const result = await exportHandler!({});

      expect(result.status).toBe('error');
      expect(result.message).toContain('No network requests captured');
    });

    it('exports to file with valid filename', async () => {
      const requests = [
        createNetworkRequest('http://example.com/api/users', 'GET', 200),
        createNetworkRequest('http://example.com/api/data', 'POST', 201, { postData: '{"key":"value"}' }),
      ];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const exportHandler = handlers.get('exportHAR');

      const result = await exportHandler!({ filename: 'test-export.har' });

      expect(result.status).toBe('ok');
      expect(result.data?.filepath).toContain('test-export.har');
      expect(result.data?.entryCount).toBe(2);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('generates default filename when not provided', async () => {
      const requests = [createNetworkRequest('http://example.com', 'GET', 200)];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const exportHandler = handlers.get('exportHAR');

      const result = await exportHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.filepath).toContain('har-export-');
      expect(result.data?.filepath).toContain('.har');
    });

    it('returns path to saved file', async () => {
      const requests = [createNetworkRequest('http://example.com', 'GET', 200)];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const exportHandler = handlers.get('exportHAR');

      const result = await exportHandler!({ filename: 'output.har' });

      expect(result.status).toBe('ok');
      expect(result.data?.filepath).toBeDefined();
      expect(result.data?.filepath).toContain('har-exports');
      expect(result.data?.filepath).toContain('output.har');
    });

    it('returns file size in response', async () => {
      const requests = [createNetworkRequest('http://example.com', 'GET', 200)];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const exportHandler = handlers.get('exportHAR');

      const result = await exportHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.fileSize).toBe(1024); // Mocked statSync returns size 1024
    });

    it('creates output directory if not exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const requests = [createNetworkRequest('http://example.com', 'GET', 200)];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const exportHandler = handlers.get('exportHAR');

      await exportHandler!({});

      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('har-exports'), { recursive: true });
    });

    it('filters requests by capture start time', async () => {
      const oldTime = Date.now() - 10000;
      const newTime = Date.now() + 1000;

      const requests = [
        createNetworkRequest('http://example.com/old', 'GET', 200, { timestamp: oldTime }),
        createNetworkRequest('http://example.com/new', 'GET', 200, { timestamp: newTime }),
      ];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();

      // Start capture (sets harStartTime to now)
      await handlers.get('startHAR')!({});

      const result = await handlers.get('exportHAR')!({});

      expect(result.status).toBe('ok');
      // Only the "new" request should be exported (after startHAR was called)
      expect(result.data?.entryCount).toBe(1);
    });
  });

  describe('getHARData', () => {
    it('returns error if NetworkCaptureFeature not available', async () => {
      const handlers = feature.getCommandHandlers();
      const getDataHandler = handlers.get('getHARData');

      const result = await getDataHandler!({});

      expect(result.status).toBe('error');
      expect(result.message).toContain('NetworkCaptureFeature not available');
    });

    it('returns current HAR object', async () => {
      const requests = [
        createNetworkRequest('http://example.com/api', 'GET', 200),
      ];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const getDataHandler = handlers.get('getHARData');

      const result = await getDataHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.har).toBeDefined();
      expect(result.data?.har.log).toBeDefined();
      expect(result.data?.har.log.version).toBe('1.2');
    });

    it('includes entry count in response', async () => {
      const requests = [
        createNetworkRequest('http://example.com/1', 'GET', 200),
        createNetworkRequest('http://example.com/2', 'GET', 200),
        createNetworkRequest('http://example.com/3', 'POST', 201),
      ];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const getDataHandler = handlers.get('getHARData');

      const result = await getDataHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.entryCount).toBe(3);
    });

    it('includes all captured entries in HAR', async () => {
      const requests = [
        createNetworkRequest('http://example.com/api/users', 'GET', 200, {
          headers: { 'Accept': 'application/json' },
          responseHeaders: { 'Content-Type': 'application/json' },
        }),
        createNetworkRequest('http://example.com/api/data', 'POST', 201, {
          postData: '{"name":"test"}',
          headers: { 'Content-Type': 'application/json' },
        }),
      ];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const getDataHandler = handlers.get('getHARData');

      const result = await getDataHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.har.log.entries).toHaveLength(2);

      // Verify first entry
      const entry1 = result.data?.har.log.entries[0];
      expect(entry1.request.method).toBe('GET');
      expect(entry1.request.url).toBe('http://example.com/api/users');
      expect(entry1.response.status).toBe(200);

      // Verify second entry has postData
      const entry2 = result.data?.har.log.entries[1];
      expect(entry2.request.method).toBe('POST');
      expect(entry2.request.postData).toBeDefined();
    });

    it('returns capturing status', async () => {
      mockNetworkCapture = createMockNetworkCapture([]);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const getDataHandler = handlers.get('getHARData');

      // Before starting capture
      let result = await getDataHandler!({});
      expect(result.data?.isCapturing).toBe(false);

      // Start capture
      await handlers.get('startHAR')!({});

      // After starting capture
      result = await getDataHandler!({});
      expect(result.data?.isCapturing).toBe(true);
    });

    it('returns capture start time when capturing', async () => {
      mockNetworkCapture = createMockNetworkCapture([]);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();

      // Start capture
      await handlers.get('startHAR')!({});

      const result = await handlers.get('getHARData')!({});

      expect(result.status).toBe('ok');
      expect(result.data?.captureStartTime).toBeDefined();
      // Should be a valid ISO date
      expect(() => new Date(result.data?.captureStartTime)).not.toThrow();
    });

    it('returns null capture start time when not capturing', async () => {
      mockNetworkCapture = createMockNetworkCapture([]);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('getHARData')!({});

      expect(result.data?.captureStartTime).toBeNull();
    });
  });

  describe('HAR format validation', () => {
    it('generates HAR 1.2 compliant structure', async () => {
      const requests = [createNetworkRequest('http://example.com', 'GET', 200)];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('getHARData')!({});

      const har = result.data?.har;
      expect(har.log.version).toBe('1.2');
      expect(har.log.creator).toBeDefined();
      expect(har.log.creator.name).toBe('Browser-CLI');
      expect(har.log.browser).toBeDefined();
      expect(har.log.entries).toBeInstanceOf(Array);
    });

    it('converts network request to HAR entry format', async () => {
      const requests = [
        createNetworkRequest('http://example.com/api?foo=bar&baz=qux', 'GET', 200, {
          duration: 150,
          headers: { 'Accept': 'application/json' },
          responseHeaders: { 'Content-Type': 'application/json; charset=utf-8' },
        }),
      ];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('getHARData')!({});

      const entry = result.data?.har.log.entries[0];

      // Request validation
      expect(entry.request.method).toBe('GET');
      expect(entry.request.url).toBe('http://example.com/api?foo=bar&baz=qux');
      expect(entry.request.httpVersion).toBe('HTTP/1.1');
      expect(entry.request.queryString).toEqual([
        { name: 'foo', value: 'bar' },
        { name: 'baz', value: 'qux' },
      ]);

      // Response validation
      expect(entry.response.status).toBe(200);
      expect(entry.response.content.mimeType).toBe('application/json');

      // Timing validation
      expect(entry.startedDateTime).toBeDefined();
      expect(entry.time).toBe(150);
      expect(entry.timings).toBeDefined();
    });

    it('includes postData for POST requests', async () => {
      const requests = [
        createNetworkRequest('http://example.com/api', 'POST', 201, {
          postData: '{"user":"test"}',
          headers: { 'Content-Type': 'application/json' },
        }),
      ];
      mockNetworkCapture = createMockNetworkCapture(requests);
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('getHARData')!({});

      const entry = result.data?.har.log.entries[0];
      expect(entry.request.postData).toBeDefined();
      expect(entry.request.postData.text).toBe('{"user":"test"}');
      expect(entry.request.postData.mimeType).toBe('application/json');
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('HARExport');
    });
  });

  describe('setNetworkCaptureFeature', () => {
    it('sets network capture dependency', async () => {
      feature.setNetworkCaptureFeature(mockNetworkCapture);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('startHAR')!({});

      // If dependency was set, startHAR should succeed
      expect(result.status).toBe('ok');
    });
  });
});
