/**
 * Phase 2: Snapshot Comparison Feature
 *
 * Provides snapshot baseline management and text-based diff comparison.
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';

/**
 * Snapshot Comparison Feature
 *
 * Manages accessibility snapshot baselines and provides text-based diff
 * comparison for detecting structural changes in the DOM.
 *
 * Unlike Visual Regression (which compares pixels), this compares the
 * accessibility tree structure as text, making it useful for:
 * - Detecting semantic changes in page structure
 * - Verifying accessibility tree integrity
 * - Faster comparison than pixel-based diffs
 *
 * Commands:
 * - saveSnapshotBaseline: Save a named snapshot baseline
 * - compareSnapshots: Compare current snapshot with baseline
 * - listBaselines: List all saved snapshot baselines
 */
export class SnapshotComparisonFeature extends BaseFeature {
  public readonly name = 'SnapshotComparison';

  private snapshotBaselines: Map<string, string> = new Map();

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['saveSnapshotBaseline', this.saveBaseline.bind(this)],
      ['compareSnapshots', this.compareSnapshots.bind(this)],
      ['listBaselines', this.listBaselines.bind(this)]
    ]);
  }

  /**
   * Save snapshot as baseline
   */
  private async saveBaseline(args: { name: string; snapshot: string }): Promise<CommandResponse> {
    this.snapshotBaselines.set(args.name, args.snapshot);
    this.log(`Saved snapshot baseline: ${args.name}`);
    return { status: 'ok', data: { name: args.name } };
  }

  /**
   * Compare snapshot with baseline
   * Returns lines that were added, removed, or changed
   */
  private async compareSnapshots(args: { name: string; snapshot: string }): Promise<CommandResponse> {
    const baseline = this.snapshotBaselines.get(args.name);
    if (!baseline) {
      return {
        status: 'error',
        message: `No baseline snapshot found with name: ${args.name}`
      };
    }

    const baselineLines = baseline.split('\n');
    const currentLines = args.snapshot.split('\n');

    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    // Find removed and changed lines
    baselineLines.forEach((line, i) => {
      const cleanLine = line.replace(/\s*\[ref=e\d+\]/, '').trim();
      const currentLine = currentLines[i]?.replace(/\s*\[ref=e\d+\]/, '').trim();

      if (!currentLine && cleanLine) {
        removed.push(line);
      } else if (currentLine && cleanLine && currentLine !== cleanLine) {
        changed.push(`- ${line}\n+ ${currentLines[i]}`);
      }
    });

    // Find added lines
    currentLines.forEach((line, i) => {
      if (i >= baselineLines.length) {
        added.push(line);
      }
    });

    return {
      status: 'ok',
      data: { added, removed, changed }
    };
  }

  /**
   * List all saved baselines
   */
  private async listBaselines(): Promise<CommandResponse> {
    const baselines = Array.from(this.snapshotBaselines.keys());
    return { status: 'ok', data: { baselines } };
  }
}
