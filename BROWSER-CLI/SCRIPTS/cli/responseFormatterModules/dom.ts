/**
 * DOM Inspection Response Formatters
 *
 * Formatters for DOM inspection commands:
 * - countElements
 * - getElementVisibility
 * - getComputedStyle
 * - getOverlayingElements
 */

import type { CommandResponse } from './types';

/**
 * Format countElements response
 */
export function formatCountElements(response: CommandResponse): string {
  if (response.status === 'error') {
    return `\n\nError: ${response.message}`;
  }

  const { count, selector } = response.data || {};
  return `\n\nFound ${count ?? 0} elements matching "${selector || 'unknown'}"`;
}

/**
 * Format getElementVisibility response
 */
export function formatGetElementVisibility(response: CommandResponse): string {
  if (response.status === 'error') {
    return `\n\nError: ${response.message}`;
  }

  const { visible, reasons } = response.data || {};
  const icon = visible ? '\u{1F441}' : '\u{1F648}';
  const status = visible ? 'VISIBLE' : 'HIDDEN';
  const reasonStr = reasons?.length ? `\n  Reasons: ${reasons.join(', ')}` : '';

  return `\n\n${icon} Element is ${status}${reasonStr}`;
}

/**
 * Format getComputedStyle response
 */
export function formatGetComputedStyle(response: CommandResponse): string {
  if (response.status === 'error') {
    return `\n\nError: ${response.message}`;
  }

  const { property, value, selector } = response.data || {};
  return `\n\nComputed style for "${selector || 'element'}":\n  ${property || 'unknown'}: ${value ?? 'undefined'}`;
}

/**
 * Format getOverlayingElements response
 */
export function formatGetOverlayingElements(response: CommandResponse): string {
  if (response.status === 'error') {
    return `\n\nError: ${response.message}`;
  }

  const { overlaying, selector, elements } = response.data || {};

  if (!overlaying) {
    return `\n\nNo overlaying elements found for "${selector || 'element'}"`;
  }

  const count = elements?.length ?? 0;
  let output = `\n\nElement "${selector || 'element'}" is covered by ${count} overlaying element(s)`;

  if (elements?.length) {
    output += ':\n';
    elements.forEach((el: { selector?: string; tagName?: string; zIndex?: number }, idx: number) => {
      const tag = el.tagName || 'unknown';
      const sel = el.selector || '';
      const zIndex = el.zIndex !== undefined ? ` (z-index: ${el.zIndex})` : '';
      output += `  ${idx + 1}. <${tag}>${sel ? ` ${sel}` : ''}${zIndex}\n`;
    });
  }

  return output;
}
