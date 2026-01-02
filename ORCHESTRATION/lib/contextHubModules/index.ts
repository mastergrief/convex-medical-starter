/**
 * CONTEXT HUB MODULES
 * Barrel exports for all context hub operations
 */

// Types
export type {
  ContextHubConfig,
  WriteResult,
  ReadResult,
  SessionInfo,
  SessionAge,
  PurgeResult,
  LinkedMemoryInfo,
  MemoryTraceability,
  GateCheckResult,
  GateListItem,
  HandoffListItem
} from "./types.js";

// Session operations
export {
  getSessionId,
  getSessionPath,
  getSessionInfo,
  listSessions,
  getLatestSession,
  getSessionAge,
  purgeSession,
  purgeOldSessions,
  createNewSession,
  ensureSessionDirectories
} from "./session.js";

// Prompt operations
export {
  writePrompt,
  readPrompt,
  listPrompts
} from "./prompts.js";

// Plan operations
export {
  writePlan,
  readPlan,
  listPlans
} from "./plans.js";

// Handoff operations
export {
  writeHandoff,
  readHandoff,
  listHandoffs
} from "./handoffs.js";

// State operations
export {
  writeOrchestratorState,
  readOrchestratorState
} from "./state.js";

// History operations
export type { HistoryEntry } from "./history.js";
export {
  appendHistory,
  trimHistory,
  getHistory
} from "./history.js";

// Memory operations
export type { LinkMemoryOptions, LinkedMemoryData } from "./memory.js";
export {
  extractTraceabilityFromMemory,
  linkMemory,
  listLinkedMemories,
  getLinkedMemory
} from "./memory.js";

// Gate operations
export type { AdvancePhaseResult } from "./gates.js";
export {
  parseGateCondition,
  checkGate,
  writeGateResult,
  readGateResult,
  listGateResults,
  advancePhase
} from "./gates.js";

// Validation operations
export type { ValidationResult } from "./validation.js";
export { validateFile } from "./validation.js";
