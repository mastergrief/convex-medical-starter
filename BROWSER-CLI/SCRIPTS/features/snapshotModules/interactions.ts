/**
 * Snapshot Interactions Module
 * Ref-based element interactions (click, dblclick, type, hover)
 */

import { Page } from 'playwright';
import { CommandResponse } from '../../core/types';
import { RefData, LogFn } from './types';
import { withRetryMetrics, RetryMetrics } from '../../utils/retry';

/**
 * Interface for stale ref check results
 */
interface StaleRefCheck {
  isStale: boolean;
  warning?: string;
  age?: number;
}

/**
 * Check if a ref is stale based on its generatedAt timestamp
 * Default TTL is 30 seconds (30000ms)
 */
function checkRefStaleness(refData: RefData, maxAge: number = 30000): StaleRefCheck {
  if (!refData.generatedAt) {
    // No timestamp means legacy ref - treat as potentially stale
    return { isStale: false };
  }

  const age = Date.now() - refData.generatedAt;
  const isStale = age > maxAge;

  if (isStale) {
    return {
      isStale: true,
      age,
      warning: `Stale ref warning: snapshot ${refData.snapshotId || 'unknown'} is ${Math.round(age/1000)}s old (TTL: ${maxAge/1000}s). Take a fresh snapshot.`
    };
  }

  return { isStale: false, age };
}

/**
 * Click an element by its ref
 */
export async function clickByRef(
  page: Page,
  ref: string,
  refMap: Map<string, RefData>,
  log: LogFn,
  options?: { button?: 'left' | 'right' | 'middle'; clickCount?: number }
): Promise<CommandResponse> {
  const { button, clickCount } = options || {};
  const refData = refMap.get(ref);

  if (!refData) {
    return {
      status: 'error',
      message: `Invalid ref: ${ref}. Capture a snapshot first to generate refs.`
    };
  }

  // Check for stale ref and warn if needed
  const staleCheck = checkRefStaleness(refData);
  if (staleCheck.warning) {
    log(staleCheck.warning);
  }

  log(`Clicking ref ${ref}: ${refData.roleSelector}`);

  const clickFn = async (): Promise<{ selector: string; code: string }> => {
    // Tier 1: Try name-based resolution
    if (refData.name) {
      try {
        await page.getByRole(refData.role as any, { name: refData.name }).click({ button, clickCount });
        return {
          selector: refData.roleSelector,
          code: `await page.getByRole('${refData.role}', { name: '${refData.name}' }).click();`
        };
      } catch (error: any) {
        // Check for strict mode violation (multiple elements matched)
        if (error.message?.includes('strict mode violation') || error.message?.includes('resolved to')) {
          log(`Tier 1 failed (non-unique name '${refData.name}'), falling back to CSS selector`);
          // Fall through to Tier 2
        } else {
          throw error; // Re-throw non-uniqueness errors
        }
      }
    }

    // Tier 2: CSS selector fallback
    if (refData.cssSelector) {
      try {
        await page.locator(refData.cssSelector).click({ button, clickCount });
        return {
          selector: refData.cssSelector,
          code: `await page.locator('${refData.cssSelector}').click();`
        };
      } catch (error: any) {
        log(`Tier 2 failed (CSS selector '${refData.cssSelector}'), falling back to role index`);
        // Fall through to Tier 3
      }
    }

    // Tier 3: Role index (guaranteed unique)
    await page.getByRole(refData.role as any).nth(refData.roleIndex).click({ button, clickCount });
    return {
      selector: refData.roleSelector,
      code: `await page.getByRole('${refData.role}').nth(${refData.roleIndex}).click();`
    };
  };

  try {
    const { result, metrics } = await withRetryMetrics(clickFn, `clickByRef:${ref}`, {
      onRetry: (attempt, error) => {
        log(`Click retry attempt ${attempt}: ${error.message}`);
      }
    });
    return {
      status: 'ok',
      data: { ref, selector: result.selector, metrics, staleWarning: staleCheck.warning },
      code: result.code
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Double-click an element by its ref
 */
export async function dblclickByRef(
  page: Page,
  ref: string,
  refMap: Map<string, RefData>,
  log: LogFn,
  options?: { button?: 'left' | 'right' | 'middle' }
): Promise<CommandResponse> {
  const { button } = options || {};
  const refData = refMap.get(ref);

  if (!refData) {
    return {
      status: 'error',
      message: `Invalid ref: ${ref}. Capture a snapshot first to generate refs.`
    };
  }

  // Check for stale ref and warn if needed
  const staleCheck = checkRefStaleness(refData);
  if (staleCheck.warning) {
    log(staleCheck.warning);
  }

  log(`Double-clicking ref ${ref}: ${refData.roleSelector}`);

  const dblclickFn = async (): Promise<{ selector: string; code: string }> => {
    // Tier 1: Try name-based resolution
    if (refData.name) {
      try {
        await page.getByRole(refData.role as any, { name: refData.name }).dblclick({ button, delay: 0 });
        return {
          selector: refData.roleSelector,
          code: `await page.getByRole('${refData.role}', { name: '${refData.name}' }).dblclick();`
        };
      } catch (error: any) {
        // Check for strict mode violation (multiple elements matched)
        if (error.message?.includes('strict mode violation') || error.message?.includes('resolved to')) {
          log(`Tier 1 failed (non-unique name '${refData.name}'), falling back to CSS selector`);
          // Fall through to Tier 2
        } else {
          throw error; // Re-throw non-uniqueness errors
        }
      }
    }

    // Tier 2: CSS selector fallback
    if (refData.cssSelector) {
      try {
        await page.locator(refData.cssSelector).dblclick({ button, delay: 0 });
        return {
          selector: refData.cssSelector,
          code: `await page.locator('${refData.cssSelector}').dblclick();`
        };
      } catch (error: any) {
        log(`Tier 2 failed (CSS selector '${refData.cssSelector}'), falling back to role index`);
        // Fall through to Tier 3
      }
    }

    // Tier 3: Role index (guaranteed unique)
    await page.getByRole(refData.role as any).nth(refData.roleIndex).dblclick({ button, delay: 0 });
    return {
      selector: refData.roleSelector,
      code: `await page.getByRole('${refData.role}').nth(${refData.roleIndex}).dblclick();`
    };
  };

  try {
    const { result, metrics } = await withRetryMetrics(dblclickFn, `dblclickByRef:${ref}`, {
      onRetry: (attempt, error) => {
        log(`Double-click retry attempt ${attempt}: ${error.message}`);
      }
    });
    return {
      status: 'ok',
      data: { ref, selector: result.selector, metrics, staleWarning: staleCheck.warning },
      code: result.code
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Type text into an element by its ref
 */
export async function typeByRef(
  page: Page,
  ref: string,
  text: string,
  refMap: Map<string, RefData>,
  log: LogFn
): Promise<CommandResponse> {
  const refData = refMap.get(ref);

  if (!refData) {
    return {
      status: 'error',
      message: `Invalid ref: ${ref}. Capture a snapshot first to generate refs.`
    };
  }

  // Check for stale ref and warn if needed
  const staleCheck = checkRefStaleness(refData);
  if (staleCheck.warning) {
    log(staleCheck.warning);
  }

  log(`Typing into ref ${ref}: ${refData.roleSelector}`);

  const typeFn = async (): Promise<{ selector: string; code: string }> => {
    // Tier 1: Try name-based resolution
    if (refData.name) {
      try {
        await page.getByRole(refData.role as any, { name: refData.name }).fill(text);
        return {
          selector: refData.roleSelector,
          code: `await page.getByRole('${refData.role}', { name: '${refData.name}' }).fill('${text}');`
        };
      } catch (error: any) {
        // Check for strict mode violation (multiple elements matched)
        if (error.message?.includes('strict mode violation') || error.message?.includes('resolved to')) {
          log(`Tier 1 failed (non-unique name '${refData.name}'), falling back to CSS selector`);
          // Fall through to Tier 2
        } else {
          throw error; // Re-throw non-uniqueness errors
        }
      }
    }

    // Tier 2: CSS selector fallback
    if (refData.cssSelector) {
      try {
        await page.locator(refData.cssSelector).fill(text);
        return {
          selector: refData.cssSelector,
          code: `await page.locator('${refData.cssSelector}').fill('${text}');`
        };
      } catch (error: any) {
        log(`Tier 2 failed (CSS selector '${refData.cssSelector}'), falling back to role index`);
        // Fall through to Tier 3
      }
    }

    // Tier 3: Role index (guaranteed unique)
    await page.getByRole(refData.role as any).nth(refData.roleIndex).fill(text);
    return {
      selector: refData.roleSelector,
      code: `await page.getByRole('${refData.role}').nth(${refData.roleIndex}).fill('${text}');`
    };
  };

  try {
    const { result, metrics } = await withRetryMetrics(typeFn, `typeByRef:${ref}`, {
      onRetry: (attempt, error) => {
        log(`Type retry attempt ${attempt}: ${error.message}`);
      }
    });
    return {
      status: 'ok',
      data: { ref, selector: result.selector, text, metrics, staleWarning: staleCheck.warning },
      code: result.code
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message
    };
  }
}

/**
 * Hover over an element by its ref
 */
export async function hoverByRef(
  page: Page,
  ref: string,
  refMap: Map<string, RefData>,
  log: LogFn
): Promise<CommandResponse> {
  const refData = refMap.get(ref);

  if (!refData) {
    return {
      status: 'error',
      message: `Invalid ref: ${ref}. Capture a snapshot first to generate refs.`
    };
  }

  // Check for stale ref and warn if needed
  const staleCheck = checkRefStaleness(refData);
  if (staleCheck.warning) {
    log(staleCheck.warning);
  }

  log(`Hovering ref ${ref}: ${refData.roleSelector}`);

  const hoverFn = async (): Promise<{ selector: string; code: string }> => {
    // Tier 1: Try name-based resolution
    if (refData.name) {
      try {
        await page.getByRole(refData.role as any, { name: refData.name }).hover();
        return {
          selector: refData.roleSelector,
          code: `await page.getByRole('${refData.role}', { name: '${refData.name}' }).hover();`
        };
      } catch (error: any) {
        // Check for strict mode violation (multiple elements matched)
        if (error.message?.includes('strict mode violation') || error.message?.includes('resolved to')) {
          log(`Tier 1 failed (non-unique name '${refData.name}'), falling back to CSS selector`);
          // Fall through to Tier 2
        } else {
          throw error; // Re-throw non-uniqueness errors
        }
      }
    }

    // Tier 2: CSS selector fallback
    if (refData.cssSelector) {
      try {
        await page.locator(refData.cssSelector).hover();
        return {
          selector: refData.cssSelector,
          code: `await page.locator('${refData.cssSelector}').hover();`
        };
      } catch (error: any) {
        log(`Tier 2 failed (CSS selector '${refData.cssSelector}'), falling back to role index`);
        // Fall through to Tier 3
      }
    }

    // Tier 3: Role index (guaranteed unique)
    await page.getByRole(refData.role as any).nth(refData.roleIndex).hover();
    return {
      selector: refData.roleSelector,
      code: `await page.getByRole('${refData.role}').nth(${refData.roleIndex}).hover();`
    };
  };

  try {
    const { result, metrics } = await withRetryMetrics(hoverFn, `hoverByRef:${ref}`, {
      onRetry: (attempt, error) => {
        log(`Hover retry attempt ${attempt}: ${error.message}`);
      }
    });
    return {
      status: 'ok',
      data: { ref, selector: result.selector, metrics, staleWarning: staleCheck.warning },
      code: result.code
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: error.message
    };
  }
}
