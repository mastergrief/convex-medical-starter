/**
 * HISTORY MODULE
 * History/audit trail operations
 */

import * as fs from "fs";
import * as path from "path";
import { createTimestamp } from "../../schemas/index.js";
import type { ContextHubConfig } from "./types.js";

// =============================================================================
// HISTORY TYPES
// =============================================================================

export interface HistoryEntry {
  timestamp: string;
  type: string;
  id: string;
}

// =============================================================================
// HISTORY OPERATIONS
// =============================================================================

/**
 * Append an entry to the history log
 */
export function appendHistory(
  config: ContextHubConfig,
  type: string,
  id: string,
  trimHistory: () => void
): void {
  const historyPath = path.join(config.sessionPath, "history", "log.jsonl");
  const entry: HistoryEntry = {
    timestamp: createTimestamp(),
    type,
    id
  };

  fs.appendFileSync(historyPath, JSON.stringify(entry) + "\n");

  // Trim history if needed
  trimHistory();
}

/**
 * Trim history to max items
 */
export function trimHistory(config: ContextHubConfig, maxItems?: number): void {
  const historyPath = path.join(config.sessionPath, "history", "log.jsonl");
  if (!fs.existsSync(historyPath)) return;

  const max = maxItems ?? config.maxHistoryItems;
  const lines = fs.readFileSync(historyPath, "utf-8").trim().split("\n");
  if (lines.length > max) {
    const trimmed = lines.slice(-max);
    fs.writeFileSync(historyPath, trimmed.join("\n") + "\n");
  }
}

/**
 * Get history entries
 */
export function getHistory(config: ContextHubConfig, limit?: number): HistoryEntry[] {
  const historyPath = path.join(config.sessionPath, "history", "log.jsonl");
  if (!fs.existsSync(historyPath)) return [];

  const lines = fs.readFileSync(historyPath, "utf-8").trim().split("\n");
  const entries = lines
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as HistoryEntry);

  if (limit && limit > 0) {
    return entries.slice(-limit);
  }

  return entries;
}
