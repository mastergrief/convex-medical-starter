/**
 * Input Module
 * Text input, keyboard, form filling, and file upload operations
 */

import { Page } from 'playwright';
import { withRetry } from '../../utils/retry';
import type { LogFn, TypeOptions } from './types';

/**
 * Type text into an element with smart input detection
 */
export async function type(
  page: Page,
  log: LogFn,
  selector: string,
  text: string,
  options?: TypeOptions
): Promise<string> {
  log(`Typing into: ${selector}`);

  let code: string = '';

  const typeFn = async () => {
    // Detect element type
    const elementType = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;

      return {
        tagName: el.tagName.toLowerCase(),
        type: (el as HTMLInputElement).type,
        contentEditable: (el as HTMLElement).contentEditable,
        shadowRoot: !!el.shadowRoot
      };
    }, selector);

    if (!elementType) {
      throw new Error(`Element not found: ${selector}`);
    }

    if (elementType.type === 'number') {
      // Number input: Clear + focus + set value + trigger events
      await page.evaluate((sel, value) => {
        const input = document.querySelector(sel) as HTMLInputElement;
        input.value = '';
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, selector, text);
      code = `await page.evaluate((sel, value) => { const input = document.querySelector(sel); input.value = value; input.dispatchEvent(new Event('input', { bubbles: true })); }, '${selector}', '${text}');`;
    } else if (elementType.contentEditable === 'true') {
      // Contenteditable: Focus + clear + type
      await page.locator(selector).focus();
      await page.locator(selector).clear();
      await page.locator(selector).pressSequentially(text, options);
      code = `await page.locator('${selector}').pressSequentially('${text}');`;
    } else if (elementType.shadowRoot) {
      // Shadow DOM: Use pierce selector
      await page.locator(`${selector} >>> input`).fill(text, options);
      code = `await page.locator('${selector} >>> input').fill('${text}');`;
    } else {
      // Regular input: Standard fill
      await page.fill(selector, text, options);
      const optStr = options ? `, ${JSON.stringify(options)}` : '';
      code = `await page.fill('${selector}', '${text}'${optStr});`;
    }
  };

  if (options?.retry !== false) {
    await withRetry(typeFn, {
      maxAttempts: 3,
      onRetry: (attempt, error) => {
        log(`Type retry attempt ${attempt}: ${error.message}`);
      }
    });
  } else {
    await typeFn();
  }

  return code;
}

/**
 * Press a keyboard key
 */
export async function pressKey(
  page: Page,
  log: LogFn,
  key: string
): Promise<string> {
  log(`Pressing key: ${key}`);
  await page.keyboard.press(key);
  return `await page.keyboard.press('${key}');`;
}

/**
 * Select an option from a dropdown
 */
export async function selectOption(
  page: Page,
  log: LogFn,
  selector: string,
  value: string
): Promise<string> {
  log(`Selecting option: ${value} in ${selector}`);
  await page.selectOption(selector, value);
  return `await page.selectOption('${selector}', '${value}');`;
}

/**
 * Fill multiple form fields
 */
export async function fillForm(
  page: Page,
  log: LogFn,
  fields: Record<string, string>
): Promise<string[]> {
  log('Filling form fields...');
  const code: string[] = [];
  for (const [selector, value] of Object.entries(fields)) {
    await page.fill(selector, value);
    code.push(`await page.fill('${selector}', '${value}');`);
  }
  return code;
}

/**
 * Upload file(s) to an input element
 */
export async function uploadFile(
  page: Page,
  log: LogFn,
  selector: string,
  filePath: string | string[]
): Promise<string> {
  log(`Uploading file to: ${selector}`);
  const paths = Array.isArray(filePath) ? filePath : [filePath];
  await page.setInputFiles(selector, paths);
  return `await page.setInputFiles('${selector}', ${JSON.stringify(paths)});`;
}
