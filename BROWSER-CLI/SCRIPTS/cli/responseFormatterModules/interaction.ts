/**
 * Interaction formatting functions
 * Commands: click, dblclick, type
 */

import type { CommandResponse } from './types';
import { formatConsoleMessages, formatCodeBlock } from './base';

/**
 * Format click response with code and console messages
 */
export function formatClick(response: CommandResponse): string {
  if (!response.data?.code) return '';

  let output = '';

  // Display stale warning if present
  if (response.data?.staleWarning) {
    output += `\n⚠️ ${response.data.staleWarning}\n`;
  }

  output += formatCodeBlock(response.data.code);
  output += formatConsoleMessages(response.data.console);

  return output;
}

/**
 * Format double-click response with code and console messages
 */
export function formatDblclick(response: CommandResponse): string {
  if (!response.data?.code) return '';

  let output = '';

  // Display stale warning if present
  if (response.data?.staleWarning) {
    output += `\n⚠️ ${response.data.staleWarning}\n`;
  }

  output += formatCodeBlock(response.data.code);
  output += formatConsoleMessages(response.data.console);

  return output;
}

/**
 * Format type response with code and console messages
 */
export function formatType(response: CommandResponse): string {
  let output = '';

  // Display stale warning if present
  if (response.data?.staleWarning) {
    output += `\n⚠️ ${response.data.staleWarning}\n`;
  }

  // Display code if present
  if (response.data?.code) {
    output += formatCodeBlock(response.data.code);
  }

  // Display console messages if present
  output += formatConsoleMessages(response.data?.console);

  return output;
}
