/**
 * State management formatting functions
 * Commands: saveState, restoreState, listStates, deleteState
 */

import type { CommandResponse } from './types';

/**
 * Format list states response
 */
export function formatListStates(response: CommandResponse): string {
  let output = '\n\n📦 Saved browser states:';
  if (response.data.states.length === 0) {
    output += '\n  (no saved states)';
  } else {
    response.data.states.forEach((state: string) => {
      output += `\n  - ${state}`;
    });
  }
  return output;
}

/**
 * Format save state response
 */
export function formatSaveState(response: CommandResponse): string {
  return `\n\n💾 Browser state saved: ${response.data.name}`;
}

/**
 * Format restore state response
 */
export function formatRestoreState(response: CommandResponse): string {
  let output = `\n\n🔄 Browser state restored: ${response.data.name}`;
  output += `\n   Current URL: ${response.data.url}`;
  return output;
}

/**
 * Format delete state response
 */
export function formatDeleteState(response: CommandResponse): string {
  return `\n\n🗑️  Browser state deleted: ${response.data.name}`;
}
