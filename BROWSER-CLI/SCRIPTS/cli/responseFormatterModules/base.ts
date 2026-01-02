/**
 * Base formatting utilities
 * Shared utilities used by other formatter modules
 */

import type { CommandResponse } from './types';

/**
 * Format response with code transparency for commands that return Playwright code
 */
export function formatWithCode(response: CommandResponse, _command: string): string {
  let output = '';

  // Display stale warning if present
  if (response.data?.staleWarning) {
    output += `\n⚠️ ${response.data.staleWarning}\n`;
  }

  if (response.data?.code) {
    output += '\n\n### Ran Playwright code';
    output += '\n```js';

    if (Array.isArray(response.data.code)) {
      // Multiple code statements (e.g., fillForm)
      response.data.code.forEach((code: string) => {
        output += '\n' + code;
      });
    } else {
      output += '\n' + response.data.code;
    }

    output += '\n```';
  }

  return output;
}

/**
 * Format console messages (shared by click, dblclick, type, evaluate)
 */
export function formatConsoleMessages(messages: any[]): string {
  if (!messages || messages.length === 0) {
    return '';
  }

  let output = '\n\n### Console messages (last 5)';
  messages.forEach((msg: any) => {
    const timestamp = new Date(msg.timestamp).toISOString().split('T')[1].split('.')[0];
    output += `\n  [${timestamp}] [${msg.type.toUpperCase()}] ${msg.text}`;

    // Add location with line:column if available
    if (msg.location && msg.lineNumber) {
      const filename = msg.location.split('/').pop() || msg.location;
      output += ` @ ${filename}:${msg.lineNumber}`;
    }
  });

  return output;
}

/**
 * Format code block with Playwright code
 */
export function formatCodeBlock(code: string | string[]): string {
  let output = '\n\n### Ran Playwright code';
  output += '\n```js';

  if (Array.isArray(code)) {
    code.forEach((c: string) => {
      output += '\n' + c;
    });
  } else {
    output += '\n' + code;
  }

  output += '\n```';
  return output;
}
