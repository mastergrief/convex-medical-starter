/**
 * Utilities Module
 * Screenshot capture and JavaScript evaluation
 */

import { Page } from 'playwright';
import type { LogFn, EvaluateResult } from './types';

/**
 * Take a screenshot
 */
export async function screenshot(
  page: Page,
  log: LogFn,
  filepath: string
): Promise<string> {
  log(`Taking screenshot: ${filepath}`);
  await page.screenshot({ path: filepath });
  return `await page.screenshot({ path: '${filepath}' });`;
}


/**
 * Allowed patterns for evaluate command (read-only operations)
 * These patterns are considered safe and won't trigger warnings
 */
const ALLOWED_PATTERNS: RegExp[] = [
  // Document read-only properties
  /^document\.(title|URL|referrer|domain|characterSet|contentType)/,
  // DOM queries
  /^document\.querySelector(All)?\s*\(/,
  /^document\.getElement(s?)By/,
  // Body content inspection
  /^document\.body\.(innerText|textContent|innerHTML|outerHTML)/,
  // Window read-only properties
  /^window\.(location|innerWidth|innerHeight|scrollX|scrollY|devicePixelRatio)/,
  // Computed styles
  /^window\.getComputedStyle\s*\(/,
  // Safe utility functions
  /^JSON\.stringify\s*\(/,
  /^Array\.from\s*\(/,
  // Arrow function IIFE pattern (common for complex read-only operations)
  /^\(\s*\(\s*\)\s*=>/,
  // Template literal (for inspection)
  /^`[^`]*`$/,
];

/**
 * Blocked patterns for evaluate command (dangerous operations)
 * These patterns will be rejected unless --unsafe flag is used
 */
const BLOCKED_PATTERNS: RegExp[] = [
  // Network requests
  /fetch\s*\(/i,
  /XMLHttpRequest/i,
  /WebSocket/i,
  // Cookie manipulation
  /\.cookie\s*=/,
  // Storage manipulation
  /localStorage\.setItem/i,
  /sessionStorage\.setItem/i,
  /localStorage\.removeItem/i,
  /sessionStorage\.removeItem/i,
  /localStorage\.clear/i,
  /sessionStorage\.clear/i,
  // Dynamic code execution
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  // Module loading
  /\bimport\s*\(/,
  /\brequire\s*\(/,
  // DOM manipulation that could be dangerous
  /document\.write/i,
  /\.innerHTML\s*=/,
  /\.outerHTML\s*=/,
  // Event handler injection
  /\.on\w+\s*=/,
  /addEventListener\s*\(/,
];

/**
 * Evaluate JavaScript code in the browser
 */
export async function evaluate(
  page: Page,
  log: LogFn,
  code: string,
  ref?: string,
  unsafe?: boolean
): Promise<EvaluateResult> {
  const trimmedCode = code.trim();

  // If unsafe flag, bypass validation with warning
  if (unsafe) {
    log('warn: Executing with --unsafe flag, security checks bypassed');
  } else {
    // Check for blocked patterns first (dangerous operations)
    const blockedMatch = BLOCKED_PATTERNS.find(p => p.test(trimmedCode));
    if (blockedMatch) {
      return {
        status: 'error',
        message: `Blocked pattern detected: ${blockedMatch.source}. Use --unsafe flag to bypass.`,
        code: '',
        url: page.url(),
        title: await page.title()
      };
    }

    // Check if matches allowed patterns (for simple expressions)
    const isSimpleExpression = trimmedCode.split('\n').length === 1;
    if (isSimpleExpression && !ALLOWED_PATTERNS.some(p => p.test(trimmedCode))) {
      log('warn: Code does not match common read-only patterns. Consider using --unsafe if intentional.');
    }
  }

  log('Evaluating code...');

  let result: any;
  let playwrightCode: string;

  if (ref) {
    // Element-scoped evaluation
    const selector = `[ref="${ref}"]`;
    playwrightCode = `await page.locator('${selector}').evaluate(${code})`;
    result = await page.locator(selector).evaluate(code);
  } else {
    // Page-level evaluation
    playwrightCode = `await page.evaluate('${code}')`;
    result = await page.evaluate(code);
  }

  return {
    status: 'ok',
    result,
    code: playwrightCode,
    url: page.url(),
    title: await page.title()
  };
}
