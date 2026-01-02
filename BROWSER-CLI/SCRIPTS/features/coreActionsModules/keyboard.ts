/**
 * Keyboard Module
 * Advanced keyboard operations: key combinations, hold, tap
 */

import { Page } from 'playwright';
import type { LogFn } from './types';

/**
 * Press a key combination (e.g., Control+S, Shift+Tab, Alt+F4)
 */
export async function pressKeyCombo(
  page: Page,
  log: LogFn,
  combo: string
): Promise<string> {
  log(`Pressing key combo: ${combo}`);
  const keys = combo.split('+').map(k => k.trim());
  const modifiers = keys.slice(0, -1);
  const finalKey = keys[keys.length - 1];

  // Press modifier keys down
  for (const mod of modifiers) {
    await page.keyboard.down(mod);
  }

  // Press the final key
  await page.keyboard.press(finalKey);

  // Release modifier keys in reverse order
  for (const mod of [...modifiers].reverse()) {
    await page.keyboard.up(mod);
  }

  return `// Key combo: ${combo}\nfor (const mod of ${JSON.stringify(modifiers)}) await page.keyboard.down(mod);\nawait page.keyboard.press('${finalKey}');\nfor (const mod of ${JSON.stringify([...modifiers].reverse())}) await page.keyboard.up(mod);`;
}

/**
 * Hold a key for specified duration
 */
export async function holdKey(
  page: Page,
  log: LogFn,
  key: string,
  durationMs: number
): Promise<string> {
  log(`Holding key: ${key} for ${durationMs}ms`);
  await page.keyboard.down(key);
  await page.waitForTimeout(durationMs);
  await page.keyboard.up(key);
  return `await page.keyboard.down('${key}'); await page.waitForTimeout(${durationMs}); await page.keyboard.up('${key}');`;
}

/**
 * Tap a key repeatedly
 */
export async function tapKey(
  page: Page,
  log: LogFn,
  key: string,
  count: number,
  delayMs: number = 50
): Promise<string> {
  log(`Tapping key: ${key} ${count} times`);
  for (let i = 0; i < count; i++) {
    await page.keyboard.press(key);
    if (i < count - 1) {
      await page.waitForTimeout(delayMs);
    }
  }
  return `// Tapped '${key}' ${count} times with ${delayMs}ms delay\nfor (let i = 0; i < ${count}; i++) { await page.keyboard.press('${key}'); if (i < ${count} - 1) await page.waitForTimeout(${delayMs}); }`;
}
