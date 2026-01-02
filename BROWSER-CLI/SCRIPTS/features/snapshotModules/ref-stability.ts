/**
 * Ref Stability Tracking Module
 *
 * Tracks which refs remain stable across snapshots for reliability metrics.
 */

import { RefData } from './types';

export interface StableRef {
  currentRef: string; // Ref in current snapshot
  previousRef: string; // Ref in previous snapshot
  cssSelector: string; // Common identifier used for matching
  stableAcross: number; // How many consecutive snapshots this ref has remained stable
}

export interface StabilityReport {
  stableRefs: StableRef[];
  newRefs: string[]; // Refs that are new in current snapshot
  lostRefs: string[]; // Refs that existed in previous but not in current
  stabilityScore: number; // 0-1 (percentage of refs that remained stable)
}

export class RefStabilityTracker {
  private previousRefMap: Map<string, RefData> = new Map();
  private previousRefToKey: Map<string, string> = new Map(); // ref -> matching key
  private stableRefCounts: Map<string, number> = new Map(); // key -> stable count

  /**
   * Generate a matching key for a ref based on stable identifiers
   * Priority: cssSelector > (role + name) > (role + roleIndex)
   */
  private getMatchingKey(refData: RefData): string {
    if (refData.cssSelector) {
      return `css:${refData.cssSelector}`;
    }
    if (refData.name) {
      return `role:${refData.role}:name:${refData.name}`;
    }
    return `role:${refData.role}:index:${refData.roleIndex}`;
  }

  /**
   * Track a new snapshot and generate stability report
   */
  trackSnapshot(newRefMap: Map<string, RefData>): StabilityReport {
    const stableRefs: StableRef[] = [];
    const newRefs: string[] = [];
    const currentKeys = new Map<string, string>(); // key -> current ref

    // Build key map for current snapshot
    for (const [ref, refData] of newRefMap.entries()) {
      const key = this.getMatchingKey(refData);
      currentKeys.set(key, ref);
    }

    // Find stable refs (exist in both previous and current)
    for (const [ref, refData] of newRefMap.entries()) {
      const key = this.getMatchingKey(refData);
      const previousRef = this.findPreviousRefByKey(key);

      if (previousRef) {
        // This ref existed before - it's stable
        const stableCount = (this.stableRefCounts.get(key) || 0) + 1;
        this.stableRefCounts.set(key, stableCount);

        stableRefs.push({
          currentRef: ref,
          previousRef,
          cssSelector: refData.cssSelector || '',
          stableAcross: stableCount,
        });
      } else {
        // New ref
        newRefs.push(ref);
        this.stableRefCounts.set(key, 0);
      }
    }

    // Find lost refs (existed in previous but not in current)
    const lostRefs: string[] = [];
    for (const [prevRef, prevData] of this.previousRefMap.entries()) {
      const key = this.getMatchingKey(prevData);
      if (!currentKeys.has(key)) {
        lostRefs.push(prevRef);
        this.stableRefCounts.delete(key);
      }
    }

    // Calculate stability score
    const totalRefs = newRefMap.size;
    const stableCount = stableRefs.length;
    const stabilityScore = totalRefs > 0 ? stableCount / totalRefs : 1;

    // Update previous ref map for next comparison
    this.previousRefMap = new Map(newRefMap);
    this.previousRefToKey.clear();
    for (const [ref, refData] of newRefMap.entries()) {
      this.previousRefToKey.set(ref, this.getMatchingKey(refData));
    }

    return {
      stableRefs,
      newRefs,
      lostRefs,
      stabilityScore,
    };
  }

  private findPreviousRefByKey(key: string): string | undefined {
    for (const [ref, storedKey] of this.previousRefToKey.entries()) {
      if (storedKey === key) {
        return ref;
      }
    }
    return undefined;
  }

  /**
   * Get current stable refs with their stability counts
   */
  getStableRefs(): Map<string, number> {
    return new Map(this.stableRefCounts);
  }

  /**
   * Check if there's a previous snapshot to compare against
   */
  hasPreviousSnapshot(): boolean {
    return this.previousRefMap.size > 0;
  }
}
