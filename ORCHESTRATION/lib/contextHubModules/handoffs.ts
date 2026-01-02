/**
 * HANDOFFS MODULE
 * Handoff CRUD operations
 */

import * as fs from "fs";
import * as path from "path";
import { Handoff, validateHandoff } from "../../schemas/index.js";
import type { ContextHubConfig, WriteResult, ReadResult, HandoffListItem } from "./types.js";
import { autoPopulateEvidence } from "../evidenceAutoPopulator.js";

// =============================================================================
// HANDOFF OPERATIONS
// =============================================================================

import { logWarn } from "../utils/logger.js";

/**
 * Writes a handoff artifact to the orchestration session with automatic evidence chain linking.
 *
 * Handoffs are agent transition documents that capture the state, results, and context
 * when one agent completes work and hands off to another. This function validates the
 * handoff against the Handoff schema, stores it in the handoffs/ subdirectory with a
 * timestamped filename, and updates the latest-handoff.json pointer file.
 *
 * **Async Behavior - Evidence Auto-Linking:**
 * After successfully writing the handoff, this function automatically attempts to
 * populate the evidence chain by calling `autoPopulateEvidence()`. This links the
 * handoff results to their corresponding analysis tasks, creating traceability
 * between analyst findings and implementation outcomes. Evidence auto-population
 * failures are logged but do not cause the handoff write to fail.
 *
 * **File Naming Convention:**
 * Handoff files use the pattern: `handoff-{agentType}-{timestamp}.json`
 * where timestamp has colons and periods replaced with dashes for filesystem compatibility.
 *
 * @description Persists a handoff artifact with validation, evidence chain auto-linking, and history tracking.
 *
 * @param config - The context hub configuration containing session paths
 * @param config.sessionPath - Absolute path to the session directory
 * @param config.basePath - Base path for the context hub
 * @param config.sessionId - Unique identifier for the current session
 * @param config.maxHistoryItems - Maximum number of history entries to retain
 * @param handoff - The handoff object to write, must conform to Handoff schema
 * @param handoff.id - Unique identifier for the handoff (UUID)
 * @param handoff.type - Must be "handoff"
 * @param handoff.metadata - Handoff metadata including fromAgent, toAgent, and timestamp
 * @param handoff.reason - Reason for handoff (e.g., "task_complete", "blocked")
 * @param handoff.results - Array of task results with status and output
 * @param handoff.state - Current execution state snapshot
 * @param appendHistory - Callback function to append entries to session history log.
 *                        Called twice: once for handoff write, once for evidence creation if successful.
 *
 * @returns Promise<WriteResult> object indicating success or failure
 * @returns {boolean} WriteResult.success - true if write succeeded, false otherwise
 * @returns {string} WriteResult.path - Absolute path to the written file (on success)
 * @returns {string} [WriteResult.error] - Error message if write failed
 *
 * @throws Validation errors are caught and returned in WriteResult.error
 *
 * @example
 * ```typescript
 * const result = await writeHandoff(config, {
 *   id: "handoff-123",
 *   type: "handoff",
 *   metadata: {
 *     sessionId: "session-abc",
 *     planId: "plan-xyz",
 *     fromAgent: { type: "developer", id: "task-1.1" },
 *     toAgent: { type: "browser" },
 *     timestamp: "2024-01-15T10:00:00Z",
 *     version: "1.0.0"
 *   },
 *   reason: "task_complete",
 *   results: [{
 *     taskId: "task-1.1",
 *     status: "completed",
 *     summary: "Implemented feature X",
 *     output: { filesModified: ["src/feature.ts"] }
 *   }],
 *   state: { currentPhase: "phase-1", completedTasks: ["task-1.1"] }
 * }, appendHistory);
 *
 * if (result.success) {
 *   console.log(`Handoff written to: ${result.path}`);
 *   // File created: session/handoffs/handoff-developer-2024-01-15T10-00-00Z.json
 *   // Pointer updated: session/latest-handoff.json
 *   // Evidence chain auto-populated (if applicable)
 * }
 * ```
 */
export async function writeHandoff(
  config: ContextHubConfig,
  handoff: Handoff,
  appendHistory: (type: string, id: string) => void
): Promise<WriteResult> {
  try {
    const validated = validateHandoff(handoff);
    const timestamp = validated.metadata.timestamp.replace(/[:.]/g, "-");
    const filename = `handoff-${validated.metadata.fromAgent.type}-${timestamp}.json`;
    const filepath = path.join(config.sessionPath, "handoffs", filename);

    fs.writeFileSync(filepath, JSON.stringify(validated, null, 2));

    // Update latest handoff pointer
    const latestPath = path.join(config.sessionPath, "latest-handoff.json");
    fs.writeFileSync(latestPath, JSON.stringify(validated, null, 2));

    appendHistory("handoff", validated.id);

    // Auto-populate evidence chain from completed handoff
    try {
      const evidenceResult = await autoPopulateEvidence(config.sessionPath, validated);
      if (evidenceResult.created && evidenceResult.chainId) {
        appendHistory("evidence_created", evidenceResult.chainId);
      }
    } catch (error) {
      // Log but don't fail handoff write
      console.warn("Evidence auto-population failed:", error);
    }

    return { success: true, path: filepath };
  } catch (error) {
    return {
      success: false,
      path: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Reads a handoff artifact from the orchestration session.
 *
 * Retrieves a handoff by its unique ID by searching the handoffs/ subdirectory,
 * or reads the latest handoff via the latest-handoff.json pointer file if no ID
 * is specified. The retrieved data is validated against the Handoff schema.
 *
 * **ID-based Lookup:**
 * When a handoffId is provided, the function scans all JSON files in the handoffs/
 * directory and matches against the internal `id` field (not the filename), since
 * handoff filenames use timestamps rather than IDs.
 *
 * **Pointer File Relationship:**
 * The latest-handoff.json pointer file contains the full handoff document (not a reference),
 * making it a fast path to retrieve the most recent handoff without directory scanning.
 *
 * @description Retrieves and validates a handoff artifact by ID or reads the latest handoff pointer.
 *
 * @param config - The context hub configuration containing session paths
 * @param config.sessionPath - Absolute path to the session directory
 * @param handoffId - Optional unique identifier of the handoff to read.
 *                    If omitted, reads the latest handoff from latest-handoff.json pointer.
 *
 * @returns ReadResult<Handoff> object containing the handoff data or error information
 * @returns {boolean} ReadResult.success - true if read succeeded, false otherwise
 * @returns {Handoff} [ReadResult.data] - The validated handoff object (on success)
 * @returns {string} [ReadResult.path] - Absolute path to the file that was read
 * @returns {string} [ReadResult.error] - Error message if read failed
 *
 * @throws Validation errors and file read errors are caught and returned in ReadResult.error
 *
 * @example
 * ```typescript
 * // Read latest handoff (via pointer file)
 * const latest = readHandoff(config);
 * if (latest.success) {
 *   const handoff = latest.data;
 *   console.log(`Latest handoff from: ${handoff.metadata.fromAgent.type}`);
 *   console.log(`Reason: ${handoff.reason}`);
 *   console.log(`Results: ${handoff.results.length} task(s)`);
 * }
 *
 * // Read specific handoff by ID
 * const specific = readHandoff(config, "handoff-123");
 * if (specific.success) {
 *   console.log(`Handoff ${specific.data.id} completed ${specific.data.results.length} tasks`);
 * } else {
 *   console.error(`Read failed: ${specific.error}`);
 * }
 * ```
 */
export function readHandoff(config: ContextHubConfig, handoffId?: string): ReadResult<Handoff> {
  try {
    let filepath: string;

    if (handoffId) {
      // Search for handoff by ID
      const handoffsDir = path.join(config.sessionPath, "handoffs");
      const files = fs.readdirSync(handoffsDir);
      const matchingFile = files.find((f) => {
        if (!f.endsWith(".json")) return false;
        const content = fs.readFileSync(path.join(handoffsDir, f), "utf-8");
        const data = JSON.parse(content);
        return data.id === handoffId;
      });

      if (!matchingFile) {
        return { success: false, error: `Handoff not found: ${handoffId}` };
      }

      filepath = path.join(handoffsDir, matchingFile);
    } else {
      filepath = path.join(config.sessionPath, "latest-handoff.json");
    }

    if (!fs.existsSync(filepath)) {
      return { success: false, error: `Handoff not found: ${filepath}` };
    }

    const content = fs.readFileSync(filepath, "utf-8");
    const data = JSON.parse(content);
    const validated = validateHandoff(data);

    return { success: true, data: validated, path: filepath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Lists all handoff artifacts in the orchestration session with summary metadata.
 *
 * Scans the handoffs/ subdirectory for all stored handoff files and extracts
 * summary information from each. Unlike listPrompts and listPlans which return
 * simple ID arrays, this function returns rich metadata objects for display purposes.
 *
 * **Return Structure:**
 * Each HandoffListItem contains:
 * - `id`: The handoff's unique identifier
 * - `fromAgent`: The agent type that created the handoff (e.g., "developer", "analyst")
 * - `timestamp`: ISO timestamp string for ordering and display
 *
 * **Sorting:**
 * Results are sorted by timestamp in descending order (newest first).
 *
 * **Error Handling:**
 * Invalid or malformed JSON files are silently skipped with a warning logged,
 * ensuring partial results are still returned even if some files are corrupted.
 *
 * @description Returns an array of handoff metadata objects sorted by timestamp (newest first).
 *
 * @param config - The context hub configuration containing session paths
 * @param config.sessionPath - Absolute path to the session directory
 *
 * @returns Array of HandoffListItem objects containing summary metadata.
 *          Returns empty array if handoffs/ directory does not exist or contains no valid handoffs.
 * @returns {string} HandoffListItem.id - Unique identifier for the handoff
 * @returns {string} HandoffListItem.fromAgent - Agent type that created the handoff
 * @returns {string} HandoffListItem.timestamp - ISO timestamp string
 *
 * @example
 * ```typescript
 * const handoffs = listHandoffs(config);
 * // Returns: [
 * //   { id: "h-456", fromAgent: "browser", timestamp: "2024-01-15T12:00:00Z" },
 * //   { id: "h-123", fromAgent: "developer", timestamp: "2024-01-15T10:00:00Z" }
 * // ]
 *
 * // Display handoff history
 * for (const h of handoffs) {
 *   console.log(`${h.timestamp}: ${h.fromAgent} -> handoff ${h.id}`);
 * }
 *
 * // Get most recent handoff metadata
 * if (handoffs.length > 0) {
 *   const latest = handoffs[0]; // Already sorted newest first
 *   console.log(`Latest handoff: ${latest.id} from ${latest.fromAgent}`);
 * }
 *
 * // Count handoffs by agent type
 * const byAgent = handoffs.reduce((acc, h) => {
 *   acc[h.fromAgent] = (acc[h.fromAgent] || 0) + 1;
 *   return acc;
 * }, {} as Record<string, number>);
 * ```
 */
export function listHandoffs(config: ContextHubConfig): HandoffListItem[] {
  const handoffsDir = path.join(config.sessionPath, "handoffs");
  if (!fs.existsSync(handoffsDir)) return [];

  const files = fs.readdirSync(handoffsDir).filter((f) => f.endsWith(".json"));
  const handoffs: HandoffListItem[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(handoffsDir, file), "utf-8");
      const data = JSON.parse(content);
      handoffs.push({
        id: data.id,
        fromAgent: data.metadata?.fromAgent?.type || "unknown",
        timestamp: data.metadata?.timestamp || ""
      });
    } catch (error) {
      logWarn("handoffs:listHandoffs", error);
      // Skip invalid files
    }
  }

  return handoffs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
