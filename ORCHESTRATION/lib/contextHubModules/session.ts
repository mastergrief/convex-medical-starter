/**
 * SESSION MODULE
 * Session lifecycle management operations
 */

import * as fs from "fs";
import * as path from "path";
import { createSessionId, createTimestamp } from "../../schemas/index.js";
import type { ContextHubConfig, SessionInfo, SessionAge, PurgeResult } from "./types.js";

// =============================================================================
// INSTANCE METHODS (require config)
// =============================================================================

/**
 * Retrieves the session ID from the provided configuration.
 *
 * @description Returns the unique identifier for the current orchestration session.
 * @param config - The context hub configuration containing session metadata
 * @returns The session ID string (format: YYYYMMDD_HH-MM_UUID)
 * @example
 * ```typescript
 * const config: ContextHubConfig = {
 *   basePath: "/path/to/context-hub",
 *   sessionId: "20251226_14-30_abc123-def456",
 *   sessionPath: "/path/to/context-hub/sessions/20251226_14-30_abc123-def456",
 *   maxHistoryItems: 1000
 * };
 * const id = getSessionId(config);
 * // Returns: "20251226_14-30_abc123-def456"
 * ```
 */
export function getSessionId(config: ContextHubConfig): string {
  return config.sessionId;
}

/**
 * Retrieves the session directory path from the provided configuration.
 *
 * @description Returns the absolute filesystem path where session data is stored.
 * @param config - The context hub configuration containing session metadata
 * @returns The absolute path to the session directory
 * @example
 * ```typescript
 * const config: ContextHubConfig = {
 *   basePath: "/home/user/orchestration/context-hub",
 *   sessionId: "20251226_14-30_abc123-def456",
 *   sessionPath: "/home/user/orchestration/context-hub/sessions/20251226_14-30_abc123-def456",
 *   maxHistoryItems: 1000
 * };
 * const sessionDir = getSessionPath(config);
 * // Returns: "/home/user/orchestration/context-hub/sessions/20251226_14-30_abc123-def456"
 * ```
 */
export function getSessionPath(config: ContextHubConfig): string {
  return config.sessionPath;
}

/**
 * Retrieves detailed information about the current session.
 *
 * @description Aggregates session metadata including timestamps and artifact counts.
 * Uses injected dependency functions to gather history, prompts, plans, and handoffs.
 * @param config - The context hub configuration containing session metadata
 * @param getHistory - Function that returns the session history entries
 * @param listPrompts - Function that returns an array of prompt filenames
 * @param listPlans - Function that returns an array of plan filenames
 * @param listHandoffs - Function that returns an array of handoff metadata objects
 * @returns SessionInfo object containing session ID, timestamps, and artifact counts
 * @example
 * ```typescript
 * const config: ContextHubConfig = {
 *   basePath: "/path/to/context-hub",
 *   sessionId: "20251226_14-30_abc123-def456",
 *   sessionPath: "/path/to/context-hub/sessions/20251226_14-30_abc123-def456",
 *   maxHistoryItems: 1000
 * };
 *
 * const info = getSessionInfo(
 *   config,
 *   () => [{ timestamp: "2025-12-26T14:30:00Z", type: "prompt", id: "p1" }],
 *   () => ["prompt-1.txt", "prompt-2.txt"],
 *   () => ["plan-abc.json"],
 *   () => [{ id: "h1", fromAgent: "analyst", timestamp: "2025-12-26T15:00:00Z" }]
 * );
 * // Returns: {
 * //   sessionId: "20251226_14-30_abc123-def456",
 * //   createdAt: "2025-12-26T14:30:00Z",
 * //   lastModified: "2025-12-26T14:30:00Z",
 * //   promptCount: 2,
 * //   planCount: 1,
 * //   handoffCount: 1
 * // }
 * ```
 */
export function getSessionInfo(
  config: ContextHubConfig,
  getHistory: () => Array<{ timestamp: string; type: string; id: string }>,
  listPrompts: () => string[],
  listPlans: () => string[],
  listHandoffs: () => Array<{ id: string; fromAgent: string; timestamp: string }>
): SessionInfo {
  const history = getHistory();

  let createdAt = createTimestamp();
  let lastModified = createTimestamp();

  if (history.length > 0) {
    createdAt = history[0].timestamp;
    lastModified = history[history.length - 1].timestamp;
  }

  return {
    sessionId: config.sessionId,
    createdAt,
    lastModified,
    promptCount: listPrompts().length,
    planCount: listPlans().length,
    handoffCount: listHandoffs().length
  };
}

// =============================================================================
// STATIC METHODS (only require basePath)
// =============================================================================

/**
 * Lists all session directories in the context hub.
 *
 * @description Scans the sessions directory and returns all session folder names.
 * Returns an empty array if the sessions directory does not exist.
 * @param basePath - The base path to the context hub directory
 * @returns Array of session directory names (format: YYYYMMDD_HH-MM_UUID)
 * @example
 * ```typescript
 * const sessions = listSessions("/home/user/orchestration/context-hub");
 * // Returns: [
 * //   "20251225_10-00_abc123-def456",
 * //   "20251226_14-30_xyz789-uvw012"
 * // ]
 * ```
 * @example
 * ```typescript
 * // When sessions directory doesn't exist
 * const sessions = listSessions("/nonexistent/path");
 * // Returns: []
 * ```
 */
export function listSessions(basePath: string): string[] {
  const sessionsDir = path.join(basePath, "sessions");
  if (!fs.existsSync(sessionsDir)) return [];

  return fs
    .readdirSync(sessionsDir)
    .filter((f) => {
      const fullPath = path.join(sessionsDir, f);
      return fs.statSync(fullPath).isDirectory();
    });
}

/**
 * Finds the most recently modified session in the context hub.
 *
 * @description Scans all sessions and identifies the one with the most recent
 * modification time based on the orchestrator.json state file.
 * @param basePath - The base path to the context hub directory
 * @returns The session ID of the most recently modified session, or null if no sessions exist
 * @example
 * ```typescript
 * const latestId = getLatestSession("/home/user/orchestration/context-hub");
 * // Returns: "20251226_14-30_abc123-def456" (most recently modified)
 * ```
 * @example
 * ```typescript
 * // When no sessions exist
 * const latestId = getLatestSession("/empty/context-hub");
 * // Returns: null
 * ```
 */
export function getLatestSession(basePath: string): string | null {
  const sessionsDir = path.join(basePath, "sessions");
  if (!fs.existsSync(sessionsDir)) return null;

  const sessions = fs.readdirSync(sessionsDir).filter((f) => {
    const fullPath = path.join(sessionsDir, f);
    return fs.statSync(fullPath).isDirectory();
  });

  if (sessions.length === 0) return null;

  // Find session with most recent modification
  let latestSession = sessions[0];
  let latestTime = 0;

  for (const session of sessions) {
    const statePath = path.join(sessionsDir, session, "state", "orchestrator.json");
    if (fs.existsSync(statePath)) {
      const stat = fs.statSync(statePath);
      if (stat.mtimeMs > latestTime) {
        latestTime = stat.mtimeMs;
        latestSession = session;
      }
    }
  }

  return latestSession;
}

/**
 * Calculates the age of a session in days since last modification.
 *
 * @description Determines session age by checking modification times of key files
 * (log.jsonl, latest-handoff.json, current-plan.json, orchestrator.json).
 * Falls back to session directory modification time if no key files exist.
 * @param basePath - The base path to the context hub directory
 * @param sessionId - The session ID to check (format: YYYYMMDD_HH-MM_UUID)
 * @returns SessionAge object with days count and lastModified Date, or null if session not found
 * @example
 * ```typescript
 * const age = getSessionAge(
 *   "/home/user/orchestration/context-hub",
 *   "20251220_10-00_abc123-def456"
 * );
 * // Returns: { days: 6, lastModified: Date("2025-12-20T10:00:00Z") }
 * ```
 * @example
 * ```typescript
 * // When session doesn't exist
 * const age = getSessionAge("/path/to/hub", "nonexistent-session");
 * // Returns: null
 * ```
 */
export function getSessionAge(basePath: string, sessionId: string): SessionAge | null {
  const sessionPath = path.join(basePath, "sessions", sessionId);
  if (!fs.existsSync(sessionPath)) return null;

  // Try to get modification time from various sources
  const candidates = [
    path.join(sessionPath, "history", "log.jsonl"),
    path.join(sessionPath, "latest-handoff.json"),
    path.join(sessionPath, "current-plan.json"),
    path.join(sessionPath, "state", "orchestrator.json")
  ];

  let latestTime = 0;
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      if (stat.mtimeMs > latestTime) {
        latestTime = stat.mtimeMs;
      }
    }
  }

  // Fallback to session directory itself
  if (latestTime === 0) {
    latestTime = fs.statSync(sessionPath).mtimeMs;
  }

  const lastModified = new Date(latestTime);
  const now = new Date();
  const days = Math.floor((now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24));

  return { days, lastModified };
}

/**
 * Deletes a single session and all its contents from the context hub.
 *
 * @description Recursively removes the session directory and all nested files.
 * Returns success status and error message if deletion fails.
 * @param basePath - The base path to the context hub directory
 * @param sessionId - The session ID to delete (format: YYYYMMDD_HH-MM_UUID)
 * @returns Object with success boolean and optional error message
 * @throws Never throws - all errors are captured in the return value
 * @example
 * ```typescript
 * const result = purgeSession(
 *   "/home/user/orchestration/context-hub",
 *   "20251220_10-00_abc123-def456"
 * );
 * // Returns: { success: true }
 * ```
 * @example
 * ```typescript
 * // When session doesn't exist
 * const result = purgeSession("/path/to/hub", "nonexistent-session");
 * // Returns: { success: false, error: "Session not found: nonexistent-session" }
 * ```
 */
export function purgeSession(basePath: string, sessionId: string): { success: boolean; error?: string } {
  try {
    const sessionPath = path.join(basePath, "sessions", sessionId);
    if (!fs.existsSync(sessionPath)) {
      return { success: false, error: `Session not found: ${sessionId}` };
    }

    fs.rmSync(sessionPath, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Purges multiple old sessions based on age threshold and retention count.
 *
 * @description Removes sessions older than the specified threshold while always
 * keeping a minimum number of most recent sessions. Supports dry-run mode for
 * previewing which sessions would be purged without actually deleting them.
 * @param basePath - The base path to the context hub directory
 * @param options - Purge configuration options
 * @param options.olderThanDays - Age threshold in days; sessions older than this may be purged (default: 7)
 * @param options.keepCount - Minimum number of most recent sessions to always keep (default: 3)
 * @param options.dryRun - If true, returns what would be purged without deleting (default: false)
 * @returns PurgeResult with arrays of purged session IDs, kept session IDs, and any errors
 * @example
 * ```typescript
 * // Purge sessions older than 14 days, keeping at least 5 recent ones
 * const result = purgeOldSessions("/home/user/orchestration/context-hub", {
 *   olderThanDays: 14,
 *   keepCount: 5
 * });
 * // Returns: {
 * //   purged: ["20251201_10-00_old-session"],
 * //   kept: ["20251226_14-30_recent1", "20251225_10-00_recent2"],
 * //   errors: []
 * // }
 * ```
 * @example
 * ```typescript
 * // Preview what would be purged (dry run)
 * const preview = purgeOldSessions("/path/to/hub", {
 *   olderThanDays: 7,
 *   dryRun: true
 * });
 * // Returns sessions that would be purged without actually deleting them
 * ```
 */
export function purgeOldSessions(
  basePath: string,
  options: {
    olderThanDays?: number;
    keepCount?: number;
    dryRun?: boolean;
  } = {}
): PurgeResult {
  const { olderThanDays = 7, keepCount = 3, dryRun = false } = options;
  const sessions = listSessions(basePath);

  // Get session ages
  const sessionAges = sessions
    .map((sessionId) => ({
      sessionId,
      age: getSessionAge(basePath, sessionId)
    }))
    .filter((s) => s.age !== null)
    .sort((a, b) => a.age!.days - b.age!.days); // Sort by age ascending (newest first)

  const purged: string[] = [];
  const kept: string[] = [];
  const errors: Array<{ sessionId: string; error: string }> = [];

  // Always keep the N most recent sessions
  const recentToKeep = sessionAges.slice(0, keepCount).map((s) => s.sessionId);

  for (const { sessionId, age } of sessionAges) {
    // Always keep recent sessions
    if (recentToKeep.includes(sessionId)) {
      kept.push(sessionId);
      continue;
    }

    // Keep sessions younger than threshold
    if (age!.days < olderThanDays) {
      kept.push(sessionId);
      continue;
    }

    // Purge old sessions
    if (!dryRun) {
      const result = purgeSession(basePath, sessionId);
      if (result.success) {
        purged.push(sessionId);
      } else {
        errors.push({ sessionId, error: result.error || "Unknown error" });
      }
    } else {
      purged.push(sessionId); // In dry-run, mark as "would be purged"
    }
  }

  return { purged, kept, errors };
}

/**
 * Creates a new session with a unique session ID.
 *
 * @description Generates a new session ID using the standard format (YYYYMMDD_HH-MM_UUID)
 * and computes the session path. Does NOT create directories - use ensureSessionDirectories
 * to create the required directory structure.
 * @param basePath - The base path to the context hub directory
 * @returns Object containing the new sessionId and computed sessionPath
 * @example
 * ```typescript
 * const { sessionId, sessionPath } = createNewSession("/home/user/orchestration/context-hub");
 * // Returns: {
 * //   sessionId: "20251226_14-30_a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 * //   sessionPath: "/home/user/orchestration/context-hub/sessions/20251226_14-30_a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 * // }
 *
 * // Next step: create directories
 * // ensureSessionDirectories({ basePath, sessionId, sessionPath, maxHistoryItems: 1000 });
 * ```
 */
export function createNewSession(basePath: string): { sessionId: string; sessionPath: string } {
  const sessionId = createSessionId();
  const sessionPath = path.join(basePath, "sessions", sessionId);
  return { sessionId, sessionPath };
}

/**
 * Creates all required directories for a session to operate.
 *
 * @description Ensures the base path, sessions directory, and all session subdirectories
 * exist (prompts, plans, handoffs, state, history). Creates directories recursively
 * if they do not exist.
 * @param config - The context hub configuration containing path information
 * @throws {Error} Throws if directory creation fails due to permissions or disk issues
 * @example
 * ```typescript
 * const config: ContextHubConfig = {
 *   basePath: "/home/user/orchestration/context-hub",
 *   sessionId: "20251226_14-30_abc123-def456",
 *   sessionPath: "/home/user/orchestration/context-hub/sessions/20251226_14-30_abc123-def456",
 *   maxHistoryItems: 1000
 * };
 *
 * ensureSessionDirectories(config);
 * // Creates:
 * //   /home/user/orchestration/context-hub/
 * //   /home/user/orchestration/context-hub/sessions/
 * //   /home/user/orchestration/context-hub/sessions/20251226_14-30_abc123-def456/
 * //   /home/user/orchestration/context-hub/sessions/20251226_14-30_abc123-def456/prompts/
 * //   /home/user/orchestration/context-hub/sessions/20251226_14-30_abc123-def456/plans/
 * //   /home/user/orchestration/context-hub/sessions/20251226_14-30_abc123-def456/handoffs/
 * //   /home/user/orchestration/context-hub/sessions/20251226_14-30_abc123-def456/state/
 * //   /home/user/orchestration/context-hub/sessions/20251226_14-30_abc123-def456/history/
 * ```
 */
export function ensureSessionDirectories(config: ContextHubConfig): void {
  const dirs = [
    config.basePath,
    path.join(config.basePath, "sessions"),
    config.sessionPath,
    path.join(config.sessionPath, "prompts"),
    path.join(config.sessionPath, "plans"),
    path.join(config.sessionPath, "handoffs"),
    path.join(config.sessionPath, "state"),
    path.join(config.sessionPath, "history")
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
