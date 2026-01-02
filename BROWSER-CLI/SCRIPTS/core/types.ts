/**
 * Shared type definitions for Browser CLI
 */

import { Browser, BrowserContext, Page } from 'playwright';

/**
 * Browser state managed by BrowserManager
 */
export interface ManagerState {
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
  url: string | null;
  startTime: number;
}

/**
 * Feature interface for modular feature system
 */
export interface BrowserFeature {
  name: string;
  setup?(page: Page): Promise<void>;
  cleanup?(): Promise<void>;
  getCommandHandlers(): Map<string, CommandHandler>;
}

/**
 * Command handling
 */
export type CommandHandler = (args: any) => Promise<CommandResponse>;

export interface CommandResponse {
  status: 'ok' | 'error';
  data?: any;
  message?: string;
  code?: string;
}

/**
 * Snapshot options
 */
export interface SnapshotOptions {
  selector?: string;
  baseline?: string;
  compare?: string;
  file?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  navigation: NavigationTiming;
  lcp?: number;
  fid?: number;
  cls?: number;
  timestamp: number;
}

export interface NavigationTiming {
  loadTime: number;
  domContentLoaded: number;
  timeToFirstByte: number;
  totalTime: number;
}

/**
 * Network mocking
 */
export interface MockRoute {
  url: string;
  method: string;
  response: any;
  status?: number;
}

/**
 * Browser state save/restore
 */
export interface SavedBrowserState {
  url: string;
  cookies: any[];
  localStorage: string;
  sessionStorage: string;
  timestamp: number;
}

/**
 * Console message
 */
export interface ConsoleMessage {
  type: string;
  text: string;
  timestamp: number;
  location?: string;
  lineNumber?: number;
  columnNumber?: number;
  args?: string[];
}


/**
 * Re-export config types for consistency
 */
export type { BrowserConfig, ViewportConfig } from './config';
export { ConfigLoader, DEFAULT_BROWSER_CONFIG } from './config';
