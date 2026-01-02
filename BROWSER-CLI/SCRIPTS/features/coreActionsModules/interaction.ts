/**
 * Interaction Module
 * Click, double-click, hover, and drag operations
 */

import { Page } from 'playwright';
import { withRetry, withRetryMetrics, RetryMetrics } from '../../utils/retry';
import type { LogFn, ClickOptions, DblclickOptions } from './types';

/**
 * Result of an interaction with retry metrics
 */
export interface InteractionResult {
  code: string;
  metrics?: RetryMetrics;
}

/**
 * Click an element with optional retry
 */
export async function click(
  page: Page,
  log: LogFn,
  selector: string,
  options?: ClickOptions
): Promise<InteractionResult> {
  log(`Clicking: ${selector}`);

  const clickFn = async () => {
    await page.click(selector, options);
  };

  const optStr = options ? `, ${JSON.stringify(options)}` : '';
  const code = `await page.click('${selector}'${optStr});`;

  if (options?.retry !== false) {
    const { metrics } = await withRetryMetrics(clickFn, `click:${selector}`, {
      maxAttempts: 3,
      onRetry: (attempt, error) => {
        log(`Click retry attempt ${attempt}: ${error.message}`);
      }
    });
    return { code, metrics };
  } else {
    await clickFn();
    return { code };
  }
}

/**
 * Double-click an element
 */
export async function dblclick(
  page: Page,
  log: LogFn,
  selector: string,
  options?: DblclickOptions
): Promise<InteractionResult> {
  log(`Double-clicking: ${selector}`);

  const dblclickFn = async () => {
    await page.dblclick(selector, {
      ...options,
      delay: 0,
      timeout: 30000
    });
  };

  const optStr = options ? `, ${JSON.stringify(options)}` : '';
  const code = `await page.dblclick('${selector}'${optStr});`;

  const { metrics } = await withRetryMetrics(dblclickFn, `dblclick:${selector}`, {
    maxAttempts: 3,
    onRetry: (attempt, error) => {
      log(`Double-click retry attempt ${attempt}: ${error.message}`);
    }
  });

  return { code, metrics };
}

/**
 * Hover over an element
 */
export async function hover(
  page: Page,
  log: LogFn,
  selector: string
): Promise<InteractionResult> {
  log(`Hovering: ${selector}`);

  const hoverFn = async () => {
    await page.hover(selector);
  };

  const code = `await page.hover('${selector}');`;

  const { metrics } = await withRetryMetrics(hoverFn, `hover:${selector}`, {
    maxAttempts: 3,
    onRetry: (attempt, error) => {
      log(`Hover retry attempt ${attempt}: ${error.message}`);
    }
  });

  return { code, metrics };
}

/**
 * Drag from one element to another
 */
export async function drag(
  page: Page,
  log: LogFn,
  sourceSelector: string,
  targetSelector: string
): Promise<string> {
  log(`Dragging from ${sourceSelector} to ${targetSelector}`);
  const source = page.locator(sourceSelector);
  const target = page.locator(targetSelector);
  await source.dragTo(target);
  return `await page.locator('${sourceSelector}').dragTo(page.locator('${targetSelector}'));`;
}
