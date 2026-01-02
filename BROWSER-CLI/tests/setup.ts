/**
 * BROWSER-CLI Test Setup
 * Provides mock utilities for unit testing CLI features
 * Note: No jsdom - this is Node CLI testing
 */

import { vi } from 'vitest';

// =============================================================================
// Mock Page Interface (Minimal Playwright Page mock)
// =============================================================================

export interface MockPage {
  goto: ReturnType<typeof vi.fn>;
  click: ReturnType<typeof vi.fn>;
  dblclick: ReturnType<typeof vi.fn>;
  type: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  evaluate: ReturnType<typeof vi.fn>;
  waitForSelector: ReturnType<typeof vi.fn>;
  waitForTimeout: ReturnType<typeof vi.fn>;
  screenshot: ReturnType<typeof vi.fn>;
  hover: ReturnType<typeof vi.fn>;
  keyboard: {
    press: ReturnType<typeof vi.fn>;
    type: ReturnType<typeof vi.fn>;
  };
  mouse: {
    move: ReturnType<typeof vi.fn>;
    down: ReturnType<typeof vi.fn>;
    up: ReturnType<typeof vi.fn>;
  };
  locator: ReturnType<typeof vi.fn>;
  url: ReturnType<typeof vi.fn>;
  title: ReturnType<typeof vi.fn>;
  content: ReturnType<typeof vi.fn>;
  setViewportSize: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
}

export function createMockPage(overrides?: Partial<MockPage>): MockPage {
  const mockLocator = {
    click: vi.fn().mockResolvedValue(undefined),
    dblclick: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    hover: vi.fn().mockResolvedValue(undefined),
    waitFor: vi.fn().mockResolvedValue(undefined),
    isVisible: vi.fn().mockResolvedValue(true),
    isEnabled: vi.fn().mockResolvedValue(true),
    textContent: vi.fn().mockResolvedValue('mock text'),
    getAttribute: vi.fn().mockResolvedValue(null),
    boundingBox: vi.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 50 }),
  };

  return {
    goto: vi.fn().mockResolvedValue(undefined),
    click: vi.fn().mockResolvedValue(undefined),
    dblclick: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(undefined),
    waitForSelector: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
    hover: vi.fn().mockResolvedValue(undefined),
    keyboard: {
      press: vi.fn().mockResolvedValue(undefined),
      type: vi.fn().mockResolvedValue(undefined),
    },
    mouse: {
      move: vi.fn().mockResolvedValue(undefined),
      down: vi.fn().mockResolvedValue(undefined),
      up: vi.fn().mockResolvedValue(undefined),
    },
    locator: vi.fn().mockReturnValue(mockLocator),
    url: vi.fn().mockReturnValue('http://localhost:5173'),
    title: vi.fn().mockResolvedValue('Test Page'),
    content: vi.fn().mockResolvedValue('<html><body>Test</body></html>'),
    setViewportSize: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// =============================================================================
// CommandResponse Types and Factories
// =============================================================================

export interface CommandResponse {
  status: 'ok' | 'error';
  data?: unknown;
  message?: string;
}

export function createSuccessResponse<T = unknown>(data: T): CommandResponse {
  return { status: 'ok', data };
}

export function createErrorResponse(message: string): CommandResponse {
  return { status: 'error', message };
}

// =============================================================================
// Snapshot Mock Utilities
// =============================================================================

export interface MockSnapshot {
  tree: string;
  refs: Map<string, string>;
  timestamp: number;
  url?: string;
  title?: string;
}

export function createMockSnapshot(
  tree: string,
  refs: Map<string, string> = new Map(),
  options?: { url?: string; title?: string }
): MockSnapshot {
  return {
    tree,
    refs,
    timestamp: Date.now(),
    url: options?.url ?? 'http://localhost:5173',
    title: options?.title ?? 'Test Page',
  };
}

/**
 * Create a snapshot response matching the CLI format
 */
export function createSnapshotResponse(
  snapshot: string,
  options?: { url?: string; title?: string }
): CommandResponse {
  return createSuccessResponse({
    snapshot,
    url: options?.url ?? 'http://localhost:5173',
    title: options?.title ?? 'Test Page',
  });
}

// =============================================================================
// Network Request Mock Utilities
// =============================================================================

export interface MockNetworkRequest {
  url: string;
  method: string;
  status: number;
  statusText?: string;
  timestamp: number;
  timing?: {
    duration: number;
  };
}

export function createMockNetworkRequest(
  url: string,
  method = 'GET',
  status = 200,
  options?: { statusText?: string; duration?: number }
): MockNetworkRequest {
  return {
    url,
    method,
    status,
    statusText: options?.statusText ?? 'OK',
    timestamp: Date.now(),
    timing: options?.duration !== undefined ? { duration: options.duration } : undefined,
  };
}

/**
 * Create a network response matching the CLI format
 */
export function createNetworkResponse(
  requests: MockNetworkRequest[],
  options?: { total?: number; filtered?: number }
): CommandResponse {
  return createSuccessResponse({
    requests,
    total: options?.total ?? requests.length,
    filtered: options?.filtered ?? requests.length,
  });
}

// =============================================================================
// Console Message Mock Utilities
// =============================================================================

export interface MockConsoleMessage {
  type: 'log' | 'error' | 'warn' | 'info' | 'debug';
  text: string;
  timestamp: number;
  location?: string;
  lineNumber?: number;
  columnNumber?: number;
}

export function createMockConsoleMessage(
  type: MockConsoleMessage['type'],
  text: string,
  options?: { location?: string; lineNumber?: number; columnNumber?: number }
): MockConsoleMessage {
  return {
    type,
    text,
    timestamp: Date.now(),
    location: options?.location,
    lineNumber: options?.lineNumber,
    columnNumber: options?.columnNumber,
  };
}

/**
 * Create a console response matching the CLI format
 */
export function createConsoleResponse(messages: MockConsoleMessage[]): CommandResponse {
  return createSuccessResponse({ messages });
}

// =============================================================================
// Browser State Mock Utilities
// =============================================================================

export interface MockBrowserState {
  name: string;
  url: string;
  cookies?: unknown[];
  localStorage?: Record<string, string>;
  sessionStorage?: Record<string, string>;
}

export function createMockBrowserState(
  name: string,
  url = 'http://localhost:5173',
  options?: { cookies?: unknown[]; localStorage?: Record<string, string> }
): MockBrowserState {
  return {
    name,
    url,
    cookies: options?.cookies ?? [],
    localStorage: options?.localStorage ?? {},
    sessionStorage: {},
  };
}

// =============================================================================
// Click/Interaction Response Factories
// =============================================================================

export function createClickResponse(
  code: string,
  consoleMessages: MockConsoleMessage[] = []
): CommandResponse {
  return createSuccessResponse({
    code,
    console: consoleMessages,
  });
}

export function createTypeResponse(
  code: string,
  consoleMessages: MockConsoleMessage[] = []
): CommandResponse {
  return createSuccessResponse({
    code,
    console: consoleMessages,
  });
}

// =============================================================================
// Performance Metrics Mock Utilities
// =============================================================================

export interface MockPerformanceMetrics {
  navigation: {
    loadTime: number;
    domContentLoaded: number;
    timeToFirstByte: number;
    totalTime: number;
  };
  lcp?: number;
  timestamp: number;
}

export function createMockPerformanceMetrics(
  options?: Partial<MockPerformanceMetrics>
): MockPerformanceMetrics {
  return {
    navigation: {
      loadTime: options?.navigation?.loadTime ?? 500,
      domContentLoaded: options?.navigation?.domContentLoaded ?? 300,
      timeToFirstByte: options?.navigation?.timeToFirstByte ?? 100,
      totalTime: options?.navigation?.totalTime ?? 800,
    },
    lcp: options?.lcp ?? 1200,
    timestamp: Date.now(),
  };
}

export function createPerformanceResponse(
  metrics: MockPerformanceMetrics
): CommandResponse {
  return createSuccessResponse({ metrics });
}

// =============================================================================
// Screenshot Buffer Mock Utilities (Visual Regression)
// =============================================================================

/**
 * Create a mock screenshot buffer for visual regression tests
 */
export function createMockScreenshotBuffer(variant: 'baseline' | 'current' | 'diff' = 'baseline'): Buffer {
  return Buffer.from(`mock-png-${variant}-data`);
}

// =============================================================================
// Accessibility Audit Mock Utilities
// =============================================================================

export interface MockA11yViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  nodes: Array<{ html: string; target: string[] }>;
}

export interface MockA11yResults {
  violations: MockA11yViolation[];
  passes: number;
  incomplete: number;
  inapplicable: number;
}

/**
 * Create mock accessibility audit results for a11y tests
 */
export function createMockA11yResults(overrides?: Partial<MockA11yResults>): MockA11yResults {
  return {
    violations: overrides?.violations ?? [{
      id: 'color-contrast',
      impact: 'serious',
      description: 'Elements must have sufficient color contrast',
      nodes: [{ html: '<div>...</div>', target: ['.low-contrast'] }]
    }],
    passes: overrides?.passes ?? 42,
    incomplete: overrides?.incomplete ?? 0,
    inapplicable: overrides?.inapplicable ?? 5
  };
}

/**
 * Create an a11y response matching the CLI format
 */
export function createA11yResponse(results: MockA11yResults): CommandResponse {
  return createSuccessResponse(results);
}

// =============================================================================
// Browser Context Mock Utilities (Tabs)
// =============================================================================

/**
 * Create a mock browser context for tabs tests
 */
export function createMockBrowserContext() {
  const mockPages: MockPage[] = [createMockPage()];
  return {
    pages: vi.fn().mockReturnValue(mockPages),
    newPage: vi.fn().mockImplementation(async () => {
      const newPage = createMockPage();
      mockPages.push(newPage);
      return newPage;
    }),
    close: vi.fn().mockResolvedValue(undefined),
    browser: vi.fn().mockReturnValue({ close: vi.fn() }),
    _mockPages: mockPages // Expose for test assertions
  };
}

// =============================================================================
// Video Recorder Mock Utilities
// =============================================================================

export interface MockVideoRecorder {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  isRecording: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock video recorder for recording tests
 */
export function createMockVideoRecorder(): MockVideoRecorder {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue('/path/to/recording.webm'),
    isRecording: vi.fn().mockReturnValue(false)
  };
}

// =============================================================================
// HAR Data Mock Utilities
// =============================================================================

export interface MockHAREntry {
  startedDateTime: string;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    headers: unknown[];
    queryString: unknown[];
    cookies: unknown[];
    headersSize: number;
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    headers: unknown[];
    cookies: unknown[];
    content: { size: number; mimeType: string };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: Record<string, unknown>;
  timings: { send: number; wait: number; receive: number };
  time: number;
}

export interface MockHARData {
  log: {
    version: string;
    creator: { name: string; version: string };
    entries: MockHAREntry[];
  };
}

/**
 * Create mock HAR data for HAR export tests
 */
export function createMockHARData(entryOverrides?: Partial<MockHAREntry>[]): MockHARData {
  const defaultEntry: MockHAREntry = {
    startedDateTime: new Date().toISOString(),
    request: {
      method: 'GET',
      url: 'http://example.com',
      httpVersion: 'HTTP/1.1',
      headers: [],
      queryString: [],
      cookies: [],
      headersSize: -1,
      bodySize: -1
    },
    response: {
      status: 200,
      statusText: 'OK',
      httpVersion: 'HTTP/1.1',
      headers: [],
      cookies: [],
      content: { size: 0, mimeType: 'text/html' },
      redirectURL: '',
      headersSize: -1,
      bodySize: -1
    },
    cache: {},
    timings: { send: 0, wait: 100, receive: 50 },
    time: 150
  };

  const entries = entryOverrides
    ? entryOverrides.map(override => ({ ...defaultEntry, ...override }))
    : [defaultEntry];

  return {
    log: {
      version: '1.2',
      creator: { name: 'browser-cli', version: '1.0.0' },
      entries
    }
  };
}

/**
 * Create a HAR response matching the CLI format
 */
export function createHARResponse(harData: MockHARData): CommandResponse {
  return createSuccessResponse(harData);
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Wait for a specified number of milliseconds (for async test timing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a mock TCP client for testing manager communication
 */
export function createMockTcpClient() {
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    receive: vi.fn().mockResolvedValue('{"status":"ok"}'),
    close: vi.fn(),
    isConnected: vi.fn().mockReturnValue(true),
  };
}

/**
 * Reset all mocks in a MockPage instance
 */
export function resetMockPage(page: MockPage): void {
  Object.values(page).forEach(value => {
    if (typeof value === 'function' && 'mockReset' in value) {
      (value as ReturnType<typeof vi.fn>).mockReset();
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(nested => {
        if (typeof nested === 'function' && 'mockReset' in nested) {
          (nested as ReturnType<typeof vi.fn>).mockReset();
        }
      });
    }
  });
}
