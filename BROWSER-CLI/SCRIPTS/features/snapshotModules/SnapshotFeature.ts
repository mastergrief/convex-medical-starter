/**
 * Snapshot Feature - Main Class
 * Orchestrates snapshot capture, formatting, and interactions
 * Delegates to modular functions for actual implementation
 */

import { Page } from 'playwright';
import { BaseFeature } from '../base-feature';
import { CommandHandler, CommandResponse } from '../../core/types';
import { StateTrackingFeature } from '../state-tracking';

// Import from sibling modules
import type { RefData, FormAnalysis } from './types';
import {
  buildFallbackSnapshot,
  addRefsToSnapshot,
  captureCssSelectors
} from './capture';
import {
  formatEnhancedRefs
} from './formatters';
import {
  clickByRef,
  dblclickByRef,
  typeByRef,
  hoverByRef
} from './interactions';
import { analyzeForms } from './forms';
import { RefVersionManager, RefValidation, RefLifecycle } from './ref-version';
import { RefStabilityTracker, StabilityReport } from './ref-stability';
import type { PluginsFeature } from '../plugins-feature';

/**
 * Snapshot feature for capturing page accessibility trees.
 *
 * Features:
 * - Adds [ref=eXXX] tags to interactive elements for easy reference
 * - Integrates with state tracking to show <changed> markers
 * - Supports click/type by ref for stable selectors
 * - Captures CSS selectors for reliable drag operations on unnamed elements
 */
export class SnapshotFeature extends BaseFeature {
  public readonly name = 'Snapshot';
  private refCounter: { value: number } = { value: 0 };
  private refMap: Map<string, RefData> = new Map();
  private stateTracking: StateTrackingFeature | null = null;
  private refVersionManager = new RefVersionManager();
  private stabilityTracker = new RefStabilityTracker();

  // Incremental snapshot storage
  private previousSnapshot: string | null = null;
  private previousRefMap: Map<string, RefData> = new Map();

  /**
   * Set the state tracking feature for change detection
   */
  setStateTracking(stateTracking: StateTrackingFeature): void {
    this.stateTracking = stateTracking;
  }

  private pluginsFeature?: PluginsFeature;

  /**
   * Set the plugins feature for hook triggering
   */
  setPluginsFeature(plugins: PluginsFeature): void {
    this.pluginsFeature = plugins;
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['snapshot', this.snapshot.bind(this)],
      ['changes', this.getChanges.bind(this)],
      ['clickByRef', this.clickByRef.bind(this)],
      ['dblclickByRef', this.dblclickByRef.bind(this)],
      ['typeByRef', this.typeByRef.bind(this)],
      ['hoverByRef', this.hoverByRef.bind(this)],
      ['waitForSelectorByRef', this.waitForSelectorByRef.bind(this)],
    ]);
  }

  /**
   * Capture accessibility snapshot
   */
  async snapshot(args: {
    selector?: string;
    full?: boolean;      // Enhanced snapshot with state + forms (opt-in)
    forms?: boolean;     // Forms only mode
    minimal?: boolean;   // Ignored (minimal is now default)
    stableRefs?: boolean; // Include ref stability tracking
    incremental?: boolean; // Show only changes since last snapshot
  }): Promise<CommandResponse> {
    this.log('Capturing snapshot...');

    try {
      // Mark new snapshot taken - generates new snapshotId
      this.refVersionManager.markSnapshotTaken();
      const snapshotId = this.refVersionManager.getSnapshotId();

      let snapshot: string | undefined;
      let fallbackUsed = false;

      if (args.selector) {
        const element = await this.page.locator(args.selector).first();
        snapshot = await element.ariaSnapshot();
      } else {
        snapshot = await this.page.locator('body').ariaSnapshot();
      }

      // Handle undefined result (common with Radix Dialog portals)
      if (!snapshot || snapshot === 'undefined' || snapshot.trim() === '') {
        this.log('Warning: ariaSnapshot() returned undefined/empty, using DOM fallback');
        snapshot = await buildFallbackSnapshot(this.page);
        fallbackUsed = true;
      }

      // Safety net: ensure snapshot is never undefined
      if (!snapshot) {
        snapshot = '- document [FALLBACK SAFETY: buildFallbackSnapshot returned empty]';
        fallbackUsed = true;
      }

      // Create lifecycle object for ref tracking
      const lifecycle: RefLifecycle = {
        snapshotId,
        generatedAt: Date.now(),
        cssValidated: false, // Will be set to true after CSS capture
      };

      // Add refs to snapshot with lifecycle data
      snapshot = addRefsToSnapshot(snapshot, this.refMap, this.refCounter, lifecycle);

      // Capture CSS selectors AND element state for all refs
      let cssValidated = false;
      try {
        await captureCssSelectors(this.page, this.refMap, this.log.bind(this));
        cssValidated = true;
        // Update cssValidated flag on all refs
        for (const [ref, data] of this.refMap) {
          data.cssValidated = true;
        }
      } catch (cssError) {
        this.log('Warning: captureCssSelectors() failed, continuing without CSS data');
      }

      // Trigger plugin onSnapshot hook after snapshot capture
      await this.pluginsFeature?.triggerOnSnapshot(snapshot);

      // Track ref stability if requested
      let stability: {
        score: number;
        stable: number;
        new: number;
        lost: number;
        message: string;
      } | undefined;
      
      if (args.stableRefs) {
        const report = this.stabilityTracker.trackSnapshot(this.refMap);
        const stableCount = report.stableRefs.length;
        const totalRefs = this.refMap.size;
        const percentage = Math.round(report.stabilityScore * 100);
        
        stability = {
          score: report.stabilityScore,
          stable: stableCount,
          new: report.newRefs.length,
          lost: report.lostRefs.length,
          message: this.stabilityTracker.hasPreviousSnapshot() || stableCount > 0
            ? `${stableCount}/${totalRefs} refs remained stable (${percentage}%)`
            : 'First snapshot - no stability data yet'
        };
      }

      // Handle incremental mode
      if (args.incremental) {
        const hasPrevious = this.previousSnapshot !== null;
        const diff = hasPrevious
          ? this.computeIncrementalDiff(snapshot, this.refMap)
          : null;

        // Store current as previous for next incremental call
        this.previousSnapshot = snapshot;
        this.previousRefMap = new Map(this.refMap);

        if (!hasPrevious) {
          // First snapshot - show full snapshot with note
          return {
            status: 'ok',
            data: {
              snapshot,
              refCount: this.refCounter.value,
              snapshotId,
              fallbackUsed,
              incremental: {
                isFirst: true,
                message: 'First snapshot captured. Future --incremental calls will show changes.'
              },
              ...(stability && { stability })
            }
          };
        }

        // Return incremental diff data
        return {
          status: 'ok',
          data: {
            snapshot, // Full snapshot still available
            refCount: this.refCounter.value,
            snapshotId,
            fallbackUsed,
            incremental: {
              isFirst: false,
              added: diff!.added,
              removed: diff!.removed,
              changed: diff!.changed,
              unchanged: diff!.unchanged,
              summary: {
                addedCount: diff!.added.length,
                removedCount: diff!.removed.length,
                changedCount: diff!.changed.length,
                unchangedCount: diff!.unchanged
              }
            },
            ...(stability && { stability })
          }
        };
      }

      // Store snapshot for future incremental comparisons (even in non-incremental mode)
      this.previousSnapshot = snapshot;
      this.previousRefMap = new Map(this.refMap);

      // Mark state changes (if state tracking enabled)
      if (this.stateTracking) {
        snapshot = this.stateTracking.markStateChanges(snapshot);
      }

      // Enhanced mode: --full or --forms flag required
      const showFull = args.full === true;
      const showForms = args.forms === true;

      if (showFull || showForms) {
        const formAnalysis = await analyzeForms(this.page, this.refMap);
        const enhancedRefs = formatEnhancedRefs(this.refMap);

        let output = '';

        if (showFull) {
          output += '=== SNAPSHOT+ ===\n\n';
          if (fallbackUsed) {
            output += 'FALLBACK MODE (ariaSnapshot unavailable)\n\n';
          }

          // Element state summary
          output += 'ELEMENT STATE\n';
          output += enhancedRefs + '\n\n';
        }

        // Form analysis (for --full or --forms)
        output += 'FORMS\n';
        if (formAnalysis.forms.length === 0) {
          output += 'No forms detected on page\n';
        } else {
          output += formAnalysis.formatted + '\n';
        }

        if (showFull) {
          output += '\nACCESSIBILITY TREE\n';
          output += snapshot;
        }

        return {
          status: 'ok',
          data: {
            snapshot: output,
            refCount: this.refCounter.value,
            snapshotId,
            forms: formAnalysis.forms,
            enhancedRefs: Object.fromEntries(this.refMap),
            fallbackUsed,
            ...(stability && { stability })
          }
        };
      }

      // Default: minimal mode (just refs + accessibility tree)
      return {
        status: 'ok',
        data: {
          snapshot,
          refCount: this.refCounter.value,
          snapshotId,
          fallbackUsed,
          ...(stability && { stability })
        }
      };
    } catch (error: any) {
      return {
        status: 'ok',
        data: {
          snapshot: `- document [ERROR: ${error.message}]`,
          refCount: 0,
          fallbackUsed: true
        }
      };
    }
  }

  /**
   * Click element by reference
   */
  async clickByRef(args: {
    ref: string;
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
  }): Promise<CommandResponse> {
    return clickByRef(
      this.page,
      args.ref,
      this.refMap,
      this.log.bind(this),
      { button: args.button, clickCount: args.clickCount }
    );
  }

  /**
   * Double-click element by reference
   */
  async dblclickByRef(args: {
    ref: string;
    button?: 'left' | 'right' | 'middle';
  }): Promise<CommandResponse> {
    return dblclickByRef(
      this.page,
      args.ref,
      this.refMap,
      this.log.bind(this),
      { button: args.button }
    );
  }

  /**
   * Type into element by reference
   */
  async typeByRef(args: {
    ref: string;
    text: string;
    delay?: number;
  }): Promise<CommandResponse> {
    return typeByRef(
      this.page,
      args.ref,
      args.text,
      this.refMap,
      this.log.bind(this)
    );
  }

  /**
   * Hover over element by reference
   */
  async hoverByRef(args: { ref: string }): Promise<CommandResponse> {
    return hoverByRef(
      this.page,
      args.ref,
      this.refMap,
      this.log.bind(this)
    );
  }

  /**
   * Wait for element by reference
   */
  async waitForSelectorByRef(args: {
    ref: string;
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }): Promise<CommandResponse> {
    const { ref, state, timeout } = args;
    const refData = this.refMap.get(ref);

    if (!refData) {
      return {
        status: 'error',
        message: `Invalid ref: ${ref}. Capture a snapshot first to generate refs.`
      };
    }

    this.log(`Waiting for ref ${ref}: ${refData.roleSelector}`);

    try {
      // Use name if available, otherwise use CSS selector
      if (refData.name) {
        await this.page.getByRole(refData.role as any, { name: refData.name }).waitFor({ state, timeout });
        return {
          status: 'ok',
          data: { ref, selector: refData.roleSelector },
          code: `await page.getByRole('${refData.role}', { name: '${refData.name}' }).waitFor(${state || timeout ? `{ state: '${state}', timeout: ${timeout} }` : ''});`
        };
      } else if (refData.cssSelector) {
        await this.page.locator(refData.cssSelector).waitFor({ state, timeout });
        return {
          status: 'ok',
          data: { ref, selector: refData.cssSelector },
          code: `await page.locator('${refData.cssSelector}').waitFor(${state || timeout ? `{ state: '${state}', timeout: ${timeout} }` : ''});`
        };
      } else {
        // Fallback to nth for same role
        await this.page.getByRole(refData.role as any).nth(refData.roleIndex).waitFor({ state, timeout });
        return {
          status: 'ok',
          data: { ref, selector: refData.roleSelector },
          code: `await page.getByRole('${refData.role}').nth(${refData.roleIndex}).waitFor(${state || timeout ? `{ state: '${state}', timeout: ${timeout} }` : ''});`
        };
      }
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Get list of changed elements from last snapshot comparison
   */
  async getChanges(): Promise<CommandResponse> {
    if (!this.stateTracking) {
      return {
        status: 'error',
        message: 'State tracking not enabled'
      };
    }

    const changedRefs = this.stateTracking.getChangedElements();
    const changeCount = this.stateTracking.getChangeCount();

    return {
      status: 'ok',
      data: {
        changes: changedRefs,
        count: changeCount
      }
    };
  }

  /**
   * Get the current ref map (for testing/debugging)
   */
  getRefMap(): Map<string, RefData> {
    return new Map(this.refMap);
  }


  /**
   * Compute incremental diff between current and previous snapshot
   * Returns added, removed, and changed elements
   */
  private computeIncrementalDiff(
    currentSnapshot: string,
    currentRefMap: Map<string, RefData>
  ): {
    added: Array<{ ref: string; description: string }>;
    removed: Array<{ ref: string; description: string }>;
    changed: Array<{ ref: string; description: string; changeType: string }>;
    unchanged: number;
  } {
    const added: Array<{ ref: string; description: string }> = [];
    const removed: Array<{ ref: string; description: string }> = [];
    const changed: Array<{ ref: string; description: string; changeType: string }> = [];
    let unchanged = 0;

    // Build lookup of previous refs by roleSelector for comparison
    const prevByRole = new Map<string, { ref: string; data: RefData }>();
    for (const [ref, data] of this.previousRefMap) {
      prevByRole.set(data.roleSelector, { ref, data });
    }

    // Build lookup of current refs by roleSelector
    const currByRole = new Map<string, { ref: string; data: RefData }>();
    for (const [ref, data] of currentRefMap) {
      currByRole.set(data.roleSelector, { ref, data });
    }

    // Find added and changed elements
    for (const [ref, data] of currentRefMap) {
      const prevEntry = prevByRole.get(data.roleSelector);
      
      if (!prevEntry) {
        // Element is new (not in previous snapshot)
        const description = data.name 
          ? `${data.role} "${data.name}"` 
          : data.role;
        added.push({ ref, description });
      } else {
        // Element exists in both - check for changes
        const prevData = prevEntry.data;
        const changes: string[] = [];
        
        // Check value changes
        if (data.value !== prevData.value) {
          changes.push('value changed');
        }
        // Check state changes
        if (data.state !== prevData.state) {
          changes.push(`${prevData.state || 'enabled'} -> ${data.state || 'enabled'}`);
        }
        // Check visibility changes
        if (data.visible !== prevData.visible) {
          changes.push(data.visible ? 'now visible' : 'now hidden');
        }
        // Check checked state changes
        if (data.checked !== prevData.checked) {
          changes.push(data.checked ? 'checked' : 'unchecked');
        }
        // Check validation changes
        if (data.validationError !== prevData.validationError) {
          if (data.validationError) {
            changes.push(`invalid: ${data.validationError}`);
          } else {
            changes.push('now valid');
          }
        }

        if (changes.length > 0) {
          const description = data.name 
            ? `${data.role} "${data.name}"` 
            : data.role;
          changed.push({ ref, description, changeType: changes.join(', ') });
        } else {
          unchanged++;
        }
      }
    }

    // Find removed elements (in previous but not in current)
    for (const [ref, data] of this.previousRefMap) {
      if (!currByRole.has(data.roleSelector)) {
        const description = data.name 
          ? `${data.role} "${data.name}"` 
          : data.role;
        removed.push({ ref, description });
      }
    }

    return { added, removed, changed, unchanged };
  }


  /**
   * Get ref validation status (freshness check)
   * @param maxAge - Maximum age in milliseconds (default 30000ms)
   * @returns RefValidation with fresh status and optional warning
   */
  getRefValidation(maxAge: number = 30000): RefValidation {
    return this.refVersionManager.validateRefFreshness(maxAge);
  }

  /**
   * Get the ref version manager for external access
   * Allows interaction handlers to check ref freshness
   */
  getRefVersionManager(): RefVersionManager {
    return this.refVersionManager;
  }
}
