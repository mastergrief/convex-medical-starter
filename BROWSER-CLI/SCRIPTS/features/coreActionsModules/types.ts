/**
 * Core Actions Module Types
 * Shared interfaces and types for core actions feature modules
 */

import { Page } from 'playwright';

/**
 * Logging function type for dependency injection
 */
export type LogFn = (message: string) => void;

/**
 * Context passed to action functions
 */
export interface ActionContext {
  page: Page;
  log: LogFn;
}

/**
 * Navigate action options
 */
export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
}

/**
 * Navigate state tracking
 */
export interface NavigateState {
  url: string | null;
}

/**
 * Click action options
 */
export interface ClickOptions {
  button?: 'left' | 'right' | 'middle';
  clickCount?: number;
  retry?: boolean;
}

/**
 * Double-click action options
 */
export interface DblclickOptions {
  button?: 'left' | 'right' | 'middle';
}

/**
 * Type action options
 */
export interface TypeOptions {
  delay?: number;
  retry?: boolean;
}

/**
 * Wait for selector options
 */
export interface WaitForSelectorOptions {
  state?: 'attached' | 'detached' | 'visible' | 'hidden';
  timeout?: number;
}

/**
 * Resize config tracking
 */
export interface ResizeConfig {
  width: number;
  height: number;
}

/**
 * Evaluate result type
 */
export interface EvaluateResult {
  result?: any;
  code: string;
  url: string;
  title: string;
  status?: 'ok' | 'error';
  message?: string;
}
