/**
 * PROMPTS MODULE
 * Prompt CRUD operations
 */

import * as fs from "fs";
import * as path from "path";
import { Prompt, validatePrompt } from "../../schemas/index.js";
import { type ContextHubConfig, type WriteResult, type ReadResult, writeArtifactInternal } from "./types.js";

// =============================================================================
// PROMPT OPERATIONS
// =============================================================================

/**
 * Writes a prompt artifact to the orchestration session.
 *
 * Prompts are agent instruction documents that define task parameters and context.
 * This function validates the prompt against the Prompt schema, stores it in the
 * prompts/ subdirectory with a unique filename, and updates the current-prompt.json
 * pointer file to reference the latest prompt.
 *
 * @description Persists a prompt artifact with validation, file storage, and history tracking.
 *
 * @param config - The context hub configuration containing session paths
 * @param config.sessionPath - Absolute path to the session directory
 * @param config.basePath - Base path for the context hub
 * @param config.sessionId - Unique identifier for the current session
 * @param config.maxHistoryItems - Maximum number of history entries to retain
 * @param prompt - The prompt object to write, must conform to Prompt schema
 * @param prompt.id - Unique identifier for the prompt (UUID)
 * @param prompt.type - Must be "prompt"
 * @param prompt.metadata - Prompt metadata including timestamp and version
 * @param prompt.content - The actual prompt content/instructions
 * @param appendHistory - Callback function to append entries to session history log
 *
 * @returns WriteResult object indicating success or failure
 * @returns {boolean} WriteResult.success - true if write succeeded, false otherwise
 * @returns {string} WriteResult.path - Absolute path to the written file (on success)
 * @returns {string} [WriteResult.error] - Error message if write failed
 *
 * @throws Validation errors are caught and returned in WriteResult.error
 *
 * @example
 * ```typescript
 * const result = writePrompt(config, {
 *   id: "abc-123",
 *   type: "prompt",
 *   metadata: { timestamp: "2024-01-15T10:00:00Z", version: "1.0.0" },
 *   content: { instructions: "Implement feature X..." }
 * }, appendHistory);
 *
 * if (result.success) {
 *   console.log(`Prompt written to: ${result.path}`);
 *   // File created: session/prompts/prompt-abc-123.json
 *   // Pointer updated: session/current-prompt.json
 * } else {
 *   console.error(`Write failed: ${result.error}`);
 * }
 * ```
 */
export function writePrompt(
  config: ContextHubConfig,
  prompt: Prompt,
  appendHistory: (type: string, id: string) => void
): WriteResult {
  return writeArtifactInternal(config, prompt, {
    subdir: "prompts",
    filenamePrefix: "prompt",
    currentPointerFile: "current-prompt.json",
    historyType: "prompt",
    validate: validatePrompt
  }, appendHistory);
}

/**
 * Reads a prompt artifact from the orchestration session.
 *
 * Retrieves a prompt by its unique ID from the prompts/ subdirectory, or reads the
 * current prompt via the current-prompt.json pointer file if no ID is specified.
 * The retrieved data is validated against the Prompt schema before being returned.
 *
 * @description Retrieves and validates a prompt artifact by ID or reads the current prompt pointer.
 *
 * @param config - The context hub configuration containing session paths
 * @param config.sessionPath - Absolute path to the session directory
 * @param promptId - Optional unique identifier of the prompt to read.
 *                   If omitted, reads the current prompt from current-prompt.json pointer.
 *
 * @returns ReadResult<Prompt> object containing the prompt data or error information
 * @returns {boolean} ReadResult.success - true if read succeeded, false otherwise
 * @returns {Prompt} [ReadResult.data] - The validated prompt object (on success)
 * @returns {string} [ReadResult.path] - Absolute path to the file that was read
 * @returns {string} [ReadResult.error] - Error message if read failed
 *
 * @throws Validation errors and file read errors are caught and returned in ReadResult.error
 *
 * @example
 * ```typescript
 * // Read current prompt (via pointer file)
 * const current = readPrompt(config);
 * if (current.success) {
 *   console.log(`Current prompt: ${current.data.id}`);
 * }
 *
 * // Read specific prompt by ID
 * const specific = readPrompt(config, "abc-123");
 * if (specific.success) {
 *   console.log(`Prompt content: ${JSON.stringify(specific.data.content)}`);
 *   console.log(`Read from: ${specific.path}`);
 * } else {
 *   console.error(`Read failed: ${specific.error}`);
 * }
 * ```
 */
export function readPrompt(config: ContextHubConfig, promptId?: string): ReadResult<Prompt> {
  try {
    let filepath: string;

    if (promptId) {
      filepath = path.join(config.sessionPath, "prompts", `prompt-${promptId}.json`);
    } else {
      filepath = path.join(config.sessionPath, "current-prompt.json");
    }

    if (!fs.existsSync(filepath)) {
      return { success: false, error: `Prompt not found: ${filepath}` };
    }

    const content = fs.readFileSync(filepath, "utf-8");
    const data = JSON.parse(content);
    const validated = validatePrompt(data);

    return { success: true, data: validated, path: filepath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Lists all prompt artifact IDs in the orchestration session.
 *
 * Scans the prompts/ subdirectory for all stored prompt files and extracts their IDs.
 * Only files matching the pattern prompt-{id}.json are included in the results.
 * The current-prompt.json pointer file is not included in the list.
 *
 * @description Returns an array of prompt IDs from the session's prompts/ directory.
 *
 * @param config - The context hub configuration containing session paths
 * @param config.sessionPath - Absolute path to the session directory
 *
 * @returns Array of prompt ID strings extracted from filenames.
 *          Returns empty array if prompts/ directory does not exist or contains no prompts.
 *
 * @example
 * ```typescript
 * const promptIds = listPrompts(config);
 * // Returns: ["abc-123", "def-456", "ghi-789"]
 *
 * // Use with readPrompt to iterate all prompts
 * for (const id of promptIds) {
 *   const result = readPrompt(config, id);
 *   if (result.success) {
 *     console.log(`Prompt ${id}: ${result.data.metadata.timestamp}`);
 *   }
 * }
 *
 * // Check if any prompts exist
 * if (listPrompts(config).length === 0) {
 *   console.log("No prompts in session");
 * }
 * ```
 */
export function listPrompts(config: ContextHubConfig): string[] {
  const promptsDir = path.join(config.sessionPath, "prompts");
  if (!fs.existsSync(promptsDir)) return [];

  return fs
    .readdirSync(promptsDir)
    .filter((f) => f.startsWith("prompt-") && f.endsWith(".json"))
    .map((f) => f.replace("prompt-", "").replace(".json", ""));
}
