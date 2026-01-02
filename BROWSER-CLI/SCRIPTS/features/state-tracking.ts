/**
 * Phase 1: State Tracking
 * Tracks state changes between snapshots with <changed> markers
 */

import { BaseFeature } from './base-feature';
import { CommandHandler } from '../core/types';

/**
 * State tracking feature for detecting changes between snapshots.
 *
 * Compares successive snapshots and marks lines that have changed
 * with a <changed> prefix. Useful for verifying that interactions
 * worked as expected.
 */
export class StateTrackingFeature extends BaseFeature {
  public readonly name = 'StateTracking';
  private previousSnapshot: string | null = null;
  private changedElements: string[] = [];

  getCommandHandlers(): Map<string, CommandHandler> {
    // No direct commands - this feature is used by snapshot feature
    return new Map();
  }

  /**
   * Mark state changes between old and new snapshot
   */
  markStateChanges(newSnapshot: string): string {
    if (!this.previousSnapshot) {
      this.previousSnapshot = newSnapshot;
      this.changedElements = [];
      return newSnapshot;
    }

    const oldLines = this.previousSnapshot.split('\n');
    const newLines = newSnapshot.split('\n');
    this.changedElements = []; // Reset

    const changedLines = newLines.map((line, i) => {
      // Skip ref tags when comparing
      const oldLineNoRef = oldLines[i]?.replace(/\s*\[ref=e\d+\]/, '') || '';
      const newLineNoRef = line.replace(/\s*\[ref=e\d+\]/, '');

      if (oldLineNoRef !== newLineNoRef && oldLineNoRef !== '') {
        // Extract ref if present
        const refMatch = line.match(/\[ref=(e\d+[a-z]*)\]/);
        if (refMatch) {
          this.changedElements.push(refMatch[1]);
        }
        return `<changed> ${line}`;
      }
      return line;
    });

    this.previousSnapshot = newSnapshot;
    return changedLines.join('\n');
  }

  /**
   * Get list of changed element refs
   */
  getChangedElements(): string[] {
    return [...this.changedElements];
  }

  /**
   * Get count of changed elements
   */
  getChangeCount(): number {
    return this.changedElements.length;
  }

  /**
   * Reset the previous snapshot (useful for testing)
   */
  reset(): void {
    this.previousSnapshot = null;
    this.changedElements = [];
  }

  /**
   * Get the current previous snapshot
   */
  getPreviousSnapshot(): string | null {
    return this.previousSnapshot;
  }
}
