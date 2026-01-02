/**
 * CONTEXT HUB TYPES
 * Type definitions for context hub operations
 */

import * as fs from "fs";
import * as path from "path";

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface ContextHubConfig {
  basePath: string;
  sessionId: string;
  sessionPath: string;
  maxHistoryItems: number;
}

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface WriteResult {
  success: boolean;
  path: string;
  error?: string;
}

export interface ReadResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  path?: string;
}

// =============================================================================
// SESSION TYPES
// =============================================================================

export interface SessionInfo {
  sessionId: string;
  createdAt: string;
  lastModified: string;
  promptCount: number;
  planCount: number;
  handoffCount: number;
}

export interface SessionAge {
  days: number;
  lastModified: Date;
}

export interface PurgeResult {
  purged: string[];
  kept: string[];
  errors: Array<{ sessionId: string; error: string }>;
}

// =============================================================================
// MEMORY TYPES
// =============================================================================

export interface LinkedMemoryInfo {
  name: string;
  linkedAt: string;
  serenaPath: string;
  summary?: string;
  forAgents?: string[];
  hasTraceability?: boolean;
}

export interface MemoryTraceability {
  analyzed_symbols?: string[];
  entry_points?: string[];
  data_flow_map?: {
    ui_to_api?: string[];
    api_to_db?: string[];
    db_to_ui?: string[];
  };
}

// =============================================================================
// GATE TYPES
// =============================================================================

export interface GateCheckResult {
  phaseId: string;
  passed: boolean;
  checkedAt: string;
  results: Array<{ check: string; passed: boolean; message: string }>;
  blockers: string[];
}

export interface GateListItem {
  phaseId: string;
  passed: boolean;
  checkedAt: string;
}

// =============================================================================
// HANDOFF TYPES
// =============================================================================

export interface HandoffListItem {
  id: string;
  fromAgent: string;
  timestamp: string;
}


// =============================================================================
// ARTIFACT WRITE HELPER
// =============================================================================

/**
 * Generic artifact write configuration
 */
export interface ArtifactWriteConfig<T extends { id: string }> {
  subdir: string;
  filenamePrefix: string;
  currentPointerFile: string;
  historyType: string;
  validate: (artifact: T) => T;
}

/**
 * Internal helper to DRY up artifact writes (prompts, plans, etc.)
 * Shared logic for writing artifacts to the context hub.
 */
export function writeArtifactInternal<T extends { id: string }>(
  config: ContextHubConfig,
  artifact: T,
  writeConfig: ArtifactWriteConfig<T>,
  appendHistory: (type: string, id: string) => void
): WriteResult {
  try {
    const validated = writeConfig.validate(artifact);
    const filename = `${writeConfig.filenamePrefix}-${validated.id}.json`;
    const filepath = path.join(config.sessionPath, writeConfig.subdir, filename);

    fs.writeFileSync(filepath, JSON.stringify(validated, null, 2));

    // Update current pointer
    const currentPath = path.join(config.sessionPath, writeConfig.currentPointerFile);
    fs.writeFileSync(currentPath, JSON.stringify(validated, null, 2));

    appendHistory(writeConfig.historyType, validated.id);

    return { success: true, path: filepath };
  } catch (error) {
    return {
      success: false,
      path: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
