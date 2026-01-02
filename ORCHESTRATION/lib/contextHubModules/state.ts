/**
 * STATE MODULE
 * Orchestrator and token state operations
 */

import * as fs from "fs";
import * as path from "path";
import {
  OrchestratorState,
  validateOrchestratorState,
  createTimestamp
} from "../../schemas/index.js";
import type { ContextHubConfig, WriteResult, ReadResult } from "./types.js";

// =============================================================================
// ORCHESTRATOR STATE OPERATIONS
// =============================================================================

/**
 * Write orchestrator state with automatic archiving
 */
export function writeOrchestratorState(
  config: ContextHubConfig,
  state: OrchestratorState
): WriteResult {
  try {
    const validated = validateOrchestratorState(state);
    const filepath = path.join(config.sessionPath, "state", "orchestrator.json");

    // Archive previous state
    if (fs.existsSync(filepath)) {
      const timestamp = createTimestamp().replace(/[:.]/g, "-");
      const archivePath = path.join(
        config.sessionPath,
        "state",
        `orchestrator-${timestamp}.json`
      );
      fs.copyFileSync(filepath, archivePath);
    }

    fs.writeFileSync(filepath, JSON.stringify(validated, null, 2));

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
 * Read orchestrator state
 */
export function readOrchestratorState(config: ContextHubConfig): ReadResult<OrchestratorState> {
  try {
    const filepath = path.join(config.sessionPath, "state", "orchestrator.json");

    if (!fs.existsSync(filepath)) {
      return { success: false, error: "Orchestrator state not found" };
    }

    const content = fs.readFileSync(filepath, "utf-8");
    const data = JSON.parse(content);
    const validated = validateOrchestratorState(data);

    return { success: true, data: validated, path: filepath };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

