/**
 * Navigation Module
 * Page navigation, waiting, and viewport operations
 */

import { Page } from 'playwright';
import { withRetry } from '../../utils/retry';
import type {
  LogFn,
  NavigateOptions,
  NavigateState,
  WaitForSelectorOptions,
  ResizeConfig
} from './types';

/**
 * Navigate to a URL with retry support
 */
export async function navigate(
  page: Page,
  log: LogFn,
  url: string,
  state?: NavigateState,
  options?: NavigateOptions
): Promise<string> {
  const waitUntil = options?.waitUntil || 'load';
  log(`Navigating to: ${url} (waitUntil: ${waitUntil})`);

  await withRetry(
    async () => {
      await page.goto(url, { waitUntil, timeout: 30000 });
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      onRetry: (attempt, error) => {
        log(`Navigation retry attempt ${attempt}: ${error.message}`);
      }
    }
  );

  if (state) {
    state.url = page.url();
  }
  return `await page.goto('${url}', { waitUntil: '${waitUntil}' });`;
}

/**
 * Wait for a specified duration
 */
export async function wait(
  page: Page,
  log: LogFn,
  ms: number
): Promise<string> {
  log(`Waiting ${ms}ms...`);
  await page.waitForTimeout(ms);
  return `await page.waitForTimeout(${ms});`;
}

/**
 * Wait for a selector to appear/disappear
 */
export async function waitForSelector(
  page: Page,
  log: LogFn,
  selector: string,
  options?: WaitForSelectorOptions
): Promise<string> {
  log(`Waiting for selector: ${selector}`);
  await page.waitForSelector(selector, options);
  const optStr = options ? `, ${JSON.stringify(options)}` : '';
  return `await page.waitForSelector('${selector}'${optStr});`;
}

/**
 * Resize the browser viewport
 */
export async function resize(
  page: Page,
  log: LogFn,
  width: number,
  height: number,
  config?: ResizeConfig
): Promise<string> {
  log(`Resizing to: ${width}x${height}`);
  await page.setViewportSize({ width, height });
  if (config) {
    config.width = width;
    config.height = height;
  }
  return `await page.setViewportSize({ width: ${width}, height: ${height} });`;
}
