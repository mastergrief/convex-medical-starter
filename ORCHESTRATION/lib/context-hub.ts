/**
 * CONTEXT HUB FACADE
 * Central state management for orchestration system
 *
 * This facade delegates to focused modules in contextHubModules/
 * See: types, session, prompts, plans, handoffs, state, history, memory, gates, validation
 */

import * as path from "path";
import {
  Prompt,
  Plan,
  Handoff,
  OrchestratorState,
  GateValidation,
  GateResult,
  createSessionId
} from "../schemas/index.js";

// Import all module operations
import * as SessionOps from "./contextHubModules/session.js";
import * as PromptOps from "./contextHubModules/prompts.js";
import * as PlanOps from "./contextHubModules/plans.js";
import * as HandoffOps from "./contextHubModules/handoffs.js";
import * as StateOps from "./contextHubModules/state.js";
import * as HistoryOps from "./contextHubModules/history.js";
import * as MemoryOps from "./contextHubModules/memory.js";
import * as GateOps from "./contextHubModules/gates.js";
import * as ValidationOps from "./contextHubModules/validation.js";

// Re-export types for backwards compatibility
export type {
  ContextHubConfig,
  WriteResult,
  ReadResult,
  SessionInfo,
  LinkedMemoryInfo,
  GateListItem,
  HandoffListItem
} from "./contextHubModules/types.js";

import type { ContextHubConfig, WriteResult, ReadResult, SessionInfo, LinkedMemoryInfo } from "./contextHubModules/types.js";
import type { LinkMemoryOptions, LinkedMemoryData } from "./contextHubModules/memory.js";

// =============================================================================
// CONTEXT HUB CLASS (Facade)
// =============================================================================

export class ContextHub {
  private config: ContextHubConfig;

  constructor(config: { basePath: string; sessionId?: string; maxHistoryItems?: number }) {
    const sessionId = config.sessionId || createSessionId();
    this.config = {
      basePath: config.basePath,
      sessionId,
      sessionPath: path.join(config.basePath, "sessions", sessionId),
      maxHistoryItems: config.maxHistoryItems || 50
    };
    SessionOps.ensureSessionDirectories(this.config);
  }

  // ===========================================================================
  // SESSION OPERATIONS
  // ===========================================================================

  getSessionId(): string {
    return SessionOps.getSessionId(this.config);
  }

  getSessionPath(): string {
    return SessionOps.getSessionPath(this.config);
  }

  getSessionInfo(): SessionInfo {
    return SessionOps.getSessionInfo(
      this.config,
      () => this.getHistory(),
      () => this.listPrompts(),
      () => this.listPlans(),
      () => this.listHandoffs()
    );
  }

  static listSessions(basePath: string): string[] {
    return SessionOps.listSessions(basePath);
  }

  static getLatestSession(basePath: string): string | null {
    return SessionOps.getLatestSession(basePath);
  }

  static getSessionAge(basePath: string, sessionId: string) {
    return SessionOps.getSessionAge(basePath, sessionId);
  }

  static purgeSession(basePath: string, sessionId: string) {
    return SessionOps.purgeSession(basePath, sessionId);
  }

  static purgeOldSessions(basePath: string, options?: { olderThanDays?: number; keepCount?: number; dryRun?: boolean }) {
    return SessionOps.purgeOldSessions(basePath, options);
  }

  // ===========================================================================
  // PROMPT OPERATIONS
  // ===========================================================================

  writePrompt(prompt: Prompt): WriteResult {
    return PromptOps.writePrompt(this.config, prompt, (type, id) => this.appendHistory(type, id));
  }

  readPrompt(promptId?: string): ReadResult<Prompt> {
    return PromptOps.readPrompt(this.config, promptId);
  }

  listPrompts(): string[] {
    return PromptOps.listPrompts(this.config);
  }

  // ===========================================================================
  // PLAN OPERATIONS
  // ===========================================================================

  writePlan(plan: Plan): WriteResult {
    return PlanOps.writePlan(this.config, plan, (type, id) => this.appendHistory(type, id));
  }

  readPlan(planId?: string): ReadResult<Plan> {
    return PlanOps.readPlan(this.config, planId);
  }

  listPlans(): string[] {
    return PlanOps.listPlans(this.config);
  }

  // ===========================================================================
  // HANDOFF OPERATIONS
  // ===========================================================================

  async writeHandoff(handoff: Handoff): Promise<WriteResult> {
    return HandoffOps.writeHandoff(this.config, handoff, (type, id) => this.appendHistory(type, id));
  }

  readHandoff(handoffId?: string): ReadResult<Handoff> {
    return HandoffOps.readHandoff(this.config, handoffId);
  }

  listHandoffs() {
    return HandoffOps.listHandoffs(this.config);
  }

  // ===========================================================================
  // STATE OPERATIONS
  // ===========================================================================

  writeOrchestratorState(state: OrchestratorState): WriteResult {
    return StateOps.writeOrchestratorState(this.config, state);
  }

  readOrchestratorState(): ReadResult<OrchestratorState> {
    return StateOps.readOrchestratorState(this.config);
  }

  // ===========================================================================
  // HISTORY OPERATIONS
  // ===========================================================================

  private appendHistory(type: string, id: string): void {
    HistoryOps.appendHistory(this.config, type, id, () => this.trimHistory());
  }

  private trimHistory(): void {
    HistoryOps.trimHistory(this.config);
  }

  getHistory(limit?: number) {
    return HistoryOps.getHistory(this.config, limit);
  }

  // ===========================================================================
  // MEMORY OPERATIONS
  // ===========================================================================

  linkMemory(memoryName: string, options?: LinkMemoryOptions): WriteResult {
    return MemoryOps.linkMemory(this.config, memoryName, options, (type, id) => this.appendHistory(type, id));
  }

  listLinkedMemories(): LinkedMemoryInfo[] {
    return MemoryOps.listLinkedMemories(this.config);
  }

  getLinkedMemory(memoryName: string): ReadResult<LinkedMemoryData> {
    return MemoryOps.getLinkedMemory(this.config, memoryName);
  }

  // ===========================================================================
  // GATE OPERATIONS
  // ===========================================================================

  /**
   * Validates whether a phase's gate conditions are satisfied before allowing phase transition.
   * Supports both legacy validation objects and DSL condition strings.
   *
   * @param phaseId - Phase identifier to check (e.g., "phase-1", "analysis")
   * @param validation - Optional validation criteria. Can be a GateValidation object with explicit
   *   requirements (requiredMemories, requiredTypecheck, etc.) or use the plan's gateCondition if omitted.
   *   For DSL condition strings, use checkGateAsync instead.
   * @returns GateResult containing passed status, individual check results, and blockers array
   * @example
   * ```typescript
   * // Check with explicit validation
   * const result = hub.checkGate('phase-1', {
   *   requiredMemories: ['ANALYSIS_*'],
   *   requiredTypecheck: true
   * });
   * if (!result.passed) {
   *   console.log('Blockers:', result.blockers);
   * }
   * ```
   */

  checkGate(phaseId: string, validation?: GateValidation): GateResult {
    return GateOps.checkGate(
      this.config,
      phaseId,
      validation,
      () => this.readPlan(),
      () => this.listLinkedMemories(),
      (name) => this.getLinkedMemory(name),
      (result) => this.writeGateResult(result)
    );
  }

  /**
   * Async version of checkGate with streaming progress support.
   * Use this for CLI commands that want real-time feedback.
   *
   * @param phaseId - The phase to check gates for
   * @param validation - Optional gate validation criteria
   * @param options - Optional progress callback for streaming output
   * @returns Promise<GateResult>
   */
  async checkGateAsync(
    phaseId: string,
    validation?: GateValidation,
    options?: { onProgress?: (msg: string) => void }
  ): Promise<GateResult> {
    return GateOps.checkGateAsync(
      this.config,
      phaseId,
      validation,
      () => this.readPlan(),
      () => this.listLinkedMemories(),
      (name) => this.getLinkedMemory(name),
      (result) => this.writeGateResult(result),
      options
    );
  }

  private writeGateResult(result: GateResult): WriteResult {
    return GateOps.writeGateResult(this.config, result, (type, id) => this.appendHistory(type, id));
  }

  /**
   * Retrieves the most recent gate check result for a specific phase from persistent storage.
   * Returns the latest snapshot stored at `gates/gate-{phaseId}-latest.json`.
   *
   * @param phaseId - Phase identifier to retrieve result for (e.g., "phase-1")
   * @returns ReadResult containing GateResult data if found, or error message if not
   * @example
   * ```typescript
   * const result = hub.readGateResult('phase-1');
   * if (result.success && result.data) {
   *   console.log(`Phase 1 ${result.data.passed ? 'passed' : 'failed'}`);
   *   console.log(`Checked at: ${result.data.checkedAt}`);
   * } else {
   *   console.log('No gate result found:', result.error);
   * }
   * ```
   */

  readGateResult(phaseId: string): ReadResult<GateResult> {
    return GateOps.readGateResult(this.config, phaseId);
  }

  /**
   * Advances orchestration to the next phase after validating gate conditions.
   *
   * @param phaseId - Phase to advance from (e.g., "phase-1")
   * @param validation - Optional validation criteria to check before advancing
   * @returns AdvancePhaseResult with success status, next phase ID, and gate result
   * @example
   * ```typescript
   * const result = hub.advancePhase('phase-1');
   * if (result.success) {
   *   console.log('Advanced to:', result.nextPhase);
   * } else {
   *   console.log('Blocked:', result.gateResult.blockers);
   * }
   * ```
   */
  advancePhase(phaseId: string, validation?: GateValidation) {
    return GateOps.advancePhase(
      this.config,
      phaseId,
      validation,
      (pid, val) => this.checkGate(pid, val),
      () => this.readPlan(),
      () => this.readOrchestratorState(),
      (state) => this.writeOrchestratorState(state),
      (type, id) => this.appendHistory(type, id)
    );
  }

  /**
   * Lists all gate check results, optionally filtered by phase.
   *
   * @param phaseId - Optional phase ID to filter results
   * @returns Array of GateListItem with phaseId, passed status, and timestamp
   * @example
   * ```typescript
   * // List all gate results
   * const allResults = hub.listGateResults();
   *
   * // Filter by phase
   * const phase1Results = hub.listGateResults('phase-1');
   * console.log(`Phase 1 checks: ${phase1Results.length}`);
   * ```
   */
  listGateResults(phaseId?: string) {
    return GateOps.listGateResults(this.config, phaseId);
  }

  // ===========================================================================
  // VALIDATION OPERATIONS
  // ===========================================================================

  validateFile(filepath: string) {
    return ValidationOps.validateFile(filepath);
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createContextHub(sessionId?: string): ContextHub {
  const basePath = path.join(process.cwd(), "ORCHESTRATION", "context-hub");
  return new ContextHub({ basePath, sessionId });
}
