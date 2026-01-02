/**
 * TIMEOUT TRACKING
 * Timeout utilities for gate checking operations
 */

/** Maximum total time for all gate checks combined (5 minutes) */
export const TOTAL_GATE_TIMEOUT_MS = 300000;

/**
 * Creates a timeout tracker for aggregate timeout across multiple checks
 */
export function createTimeoutTracker(timeoutMs: number) {
  const startTime = Date.now();
  return {
    isExpired: () => Date.now() - startTime > timeoutMs,
    remainingMs: () => Math.max(0, timeoutMs - (Date.now() - startTime)),
    elapsedMs: () => Date.now() - startTime
  };
}

/** Type for the timeout tracker object */
export type TimeoutTracker = ReturnType<typeof createTimeoutTracker>;
