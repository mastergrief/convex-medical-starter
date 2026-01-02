/**
 * Content extraction formatting functions
 * Commands: getPageHTML, getPageText, getElementHTML, getElementText
 */

import type { CommandResponse } from './types';

/**
 * Format getPageHTML response with length preview
 */
export function formatGetPageHTML(response: CommandResponse): string {
  if (response.status === 'error') {
    return `Error: ${response.message}`;
  }

  const { html, length } = response.data || {};
  const htmlContent = html || '';
  const contentLength = length || htmlContent.length;
  const preview = htmlContent.substring(0, 500);

  let output = `\n\nPage HTML (${contentLength} characters):`;
  output += '\n```html';
  output += '\n' + preview;
  if (contentLength > 500) {
    output += '\n... (truncated)';
  }
  output += '\n```';

  return output;
}

/**
 * Format getPageText response
 */
export function formatGetPageText(response: CommandResponse): string {
  if (response.status === 'error') {
    return `Error: ${response.message}`;
  }

  const { text, length } = response.data || {};
  const textContent = text || '';
  const contentLength = length || textContent.length;
  const preview = textContent.substring(0, 1000);

  let output = `\n\nPage Text (${contentLength} characters):`;
  output += '\n```';
  output += '\n' + preview;
  if (contentLength > 1000) {
    output += '\n... (truncated)';
  }
  output += '\n```';

  return output;
}

/**
 * Format getElementHTML response
 */
export function formatGetElementHTML(response: CommandResponse): string {
  if (response.status === 'error') {
    return `Error: ${response.message}`;
  }

  const { html, selector, length } = response.data || {};
  const htmlContent = html || '';
  const contentLength = length || htmlContent.length;
  const preview = htmlContent.substring(0, 500);

  let output = `\n\nElement HTML`;
  if (selector) {
    output += ` (${selector})`;
  }
  output += ` - ${contentLength} characters:`;
  output += '\n```html';
  output += '\n' + preview;
  if (contentLength > 500) {
    output += '\n... (truncated)';
  }
  output += '\n```';

  return output;
}

/**
 * Format getElementText response
 */
export function formatGetElementText(response: CommandResponse): string {
  if (response.status === 'error') {
    return `Error: ${response.message}`;
  }

  const { text, selector, length } = response.data || {};
  const textContent = text || '';
  const contentLength = length || textContent.length;
  const preview = textContent.substring(0, 1000);

  let output = `\n\nElement Text`;
  if (selector) {
    output += ` (${selector})`;
  }
  output += ` - ${contentLength} characters:`;
  output += '\n```';
  output += '\n' + preview;
  if (contentLength > 1000) {
    output += '\n... (truncated)';
  }
  output += '\n```';

  return output;
}
