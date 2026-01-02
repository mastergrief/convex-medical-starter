/**
 * Debug logging utility for ORCHESTRATION
 * Logs are only visible when ORCH_DEBUG=true environment variable is set
 */

const DEBUG = process.env.ORCH_DEBUG === 'true';

/**
 * Log a warning message with context
 * @param context - The module/function context (e.g., 'evidenceAutoPopulator:parseFile')
 * @param error - The error to log
 */
export function logWarn(context: string, error: unknown): void {
  if (DEBUG) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[ORCH:${context}] ${msg}`);
  }
}

/**
 * Log a debug message with context
 * @param context - The module/function context
 * @param message - The message to log
 */
export function logDebug(context: string, message: string): void {
  if (DEBUG) {
    console.debug(`[ORCH:${context}] ${message}`);
  }
}

/**
 * Log an error with full stack trace (always logs, not just in DEBUG mode)
 * @param context - The module/function context
 * @param error - The error to log
 */
export function logError(context: string, error: unknown): void {
  const msg = error instanceof Error ? error.stack || error.message : String(error);
  console.error(`[ORCH:${context}] ${msg}`);
}
