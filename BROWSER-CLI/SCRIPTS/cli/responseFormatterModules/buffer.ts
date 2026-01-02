/**
 * Buffer management formatting functions
 * Commands: getConsoleBufferStats, setConsoleBufferCapacity,
 *           getNetworkBufferStats, setNetworkBufferCapacity,
 *           getEventBufferStats, setEventBufferCapacity
 */

import type { CommandResponse } from './types';

/**
 * Format buffer stats response (shared helper)
 */
function formatBufferStats(bufferType: string, response: CommandResponse): string {
  if (response.status === 'error') {
    return `Error: ${response.message}`;
  }
  const { size, capacity, overflowCount } = response.data || {};
  let output = `\n\n${bufferType} Buffer Stats:`;
  output += `\n  Size: ${size ?? 0}/${capacity ?? 0}`;
  output += `\n  Overflow: ${overflowCount ?? 0} messages discarded`;
  return output;
}

/**
 * Format buffer capacity change response (shared helper)
 */
function formatBufferCapacityChange(bufferType: string, response: CommandResponse): string {
  if (response.status === 'error') {
    return `Error: ${response.message}`;
  }
  const { capacity, previousCapacity } = response.data || {};
  let output = `\n\n${bufferType} buffer capacity updated:`;
  output += `\n  New Capacity: ${capacity ?? 'unknown'}`;
  if (previousCapacity !== undefined) {
    output += `\n  Previous Capacity: ${previousCapacity}`;
  }
  return output;
}

/**
 * Format getConsoleBufferStats response
 */
export function formatGetConsoleBufferStats(response: CommandResponse): string {
  return formatBufferStats('Console', response);
}

/**
 * Format setConsoleBufferCapacity response
 */
export function formatSetConsoleBufferCapacity(response: CommandResponse): string {
  return formatBufferCapacityChange('Console', response);
}

/**
 * Format getNetworkBufferStats response
 */
export function formatGetNetworkBufferStats(response: CommandResponse): string {
  return formatBufferStats('Network', response);
}

/**
 * Format setNetworkBufferCapacity response
 */
export function formatSetNetworkBufferCapacity(response: CommandResponse): string {
  return formatBufferCapacityChange('Network', response);
}

/**
 * Format getEventBufferStats response
 */
export function formatGetEventBufferStats(response: CommandResponse): string {
  return formatBufferStats('Event', response);
}

/**
 * Format setEventBufferCapacity response
 */
export function formatSetEventBufferCapacity(response: CommandResponse): string {
  return formatBufferCapacityChange('Event', response);
}
