/**
 * Dashboard Data Collector
 *
 * Aggregates orchestration session state for real-time dashboard display.
 * Provides both snapshot collection and file watching capabilities.
 */

import * as fs from "fs";
import * as path from "path";
import { ContextHub, createContextHub } from "./context-hub.js";

// ===========================================================================
// INTERFACES
// ===========================================================================

import { logWarn } from "./utils/logger.js";

export interface DashboardState {
  /** Current session info */
  session: {
    id: string;
    createdAt: string;
    lastModified: string;
  };
  /** Current phase progress */
  currentPhase: {
    id: string;
    name: string;
    progress: number; // 0-100
  } | null;
  /** Active agents */
  agents: Array<{
    id: string;
    type: string;
    taskId: string;
    status: "pending" | "running" | "completed" | "failed";
    startTime: string;
    tokensUsed?: number;
  }>;
  /** Token budget tracking */
  tokenBudget: {
    limit: number;
    consumed: number;
    remaining: number;
    percentage: number;
  };
  /** Recent events from log.jsonl */
  recentEvents: Array<{
    timestamp: string;
    type: string;
    id: string;
  }>;
}

// ===========================================================================
// DASHBOARD DATA COLLECTOR CLASS
// ===========================================================================

export class DashboardDataCollector {
  private contextHub: ContextHub;
  private watcher: fs.FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 100;

  constructor(contextHub: ContextHub) {
    this.contextHub = contextHub;
  }

  /**
   * Collect current dashboard state from all context hub sources
   */
  collectState(): DashboardState {
    // Get session info
    const sessionInfo = this.contextHub.getSessionInfo();
    const session = {
      id: sessionInfo.sessionId,
      createdAt: sessionInfo.createdAt,
      lastModified: sessionInfo.lastModified
    };

    // Get orchestrator state for phase and agents
    let currentPhase: DashboardState["currentPhase"] = null;
    let agents: DashboardState["agents"] = [];

    const stateResult = this.contextHub.readOrchestratorState();
    if (stateResult.success && stateResult.data) {
      const state = stateResult.data;

      // Extract current phase
      if (state.currentPhase) {
        currentPhase = {
          id: state.currentPhase.id,
          name: state.currentPhase.name,
          progress: state.currentPhase.progress
        };
      }

      // Extract agents with status mapping
      agents = state.agents.map((agent) => ({
        id: agent.id,
        type: agent.type,
        taskId: agent.taskId || "",
        status: this.mapAgentStatus(agent.status),
        startTime: agent.startTime || "",
        tokensUsed: agent.tokensUsed
      }));
    }

    // Get token budget
    const tokenBudget = this.getTokenBudget();

    // Get recent events
    const recentEvents = this.getRecentEvents();

    return {
      session,
      currentPhase,
      agents,
      tokenBudget,
      recentEvents
    };
  }

  /**
   * Watch session directory for changes and invoke callback with updated state
   */
  watch(callback: (state: DashboardState) => void): void {
    const sessionPath = this.contextHub.getSessionPath();

    // Stop any existing watcher
    this.stopWatch();

    // Create watcher on session directory
    this.watcher = fs.watch(
      sessionPath,
      { recursive: true },
      (_eventType, _filename) => {
        // Debounce rapid changes
        if (this.debounceTimer) {
          clearTimeout(this.debounceTimer);
        }

        this.debounceTimer = setTimeout(() => {
          try {
            const state = this.collectState();
            callback(state);
          } catch (error) {
            // Silently ignore errors during watch - the file might be mid-write
            console.error("Dashboard watcher error:", error);
          }
        }, this.DEBOUNCE_MS);
      }
    );

    // Handle watcher errors
    this.watcher.on("error", (error) => {
      console.error("Dashboard watcher error:", error);
    });
  }

  /**
   * Stop watching for changes
   */
  stopWatch(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Get recent events from log.jsonl
   */
  getRecentEvents(limit: number = 20): DashboardState["recentEvents"] {
    const sessionPath = this.contextHub.getSessionPath();
    const historyPath = path.join(sessionPath, "history", "log.jsonl");

    if (!fs.existsSync(historyPath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(historyPath, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      // Get last N entries
      const recentLines = lines.slice(-limit);

      return recentLines.map((line) => {
        const entry = JSON.parse(line) as {
          timestamp: string;
          type: string;
          id: string;
        };
        return {
          timestamp: entry.timestamp,
          type: entry.type,
          id: entry.id
        };
      });
    } catch (error) {
      logWarn("dashboard:getRecentEvents", error);
      return [];
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  /**
   * Map agent status from schema to dashboard status
   */
  private mapAgentStatus(
    schemaStatus: string
  ): "pending" | "running" | "completed" | "failed" {
    switch (schemaStatus) {
      case "idle":
        return "pending";
      case "running":
        return "running";
      case "completed":
        return "completed";
      case "failed":
        return "failed";
      default:
        return "pending";
    }
  }

  /**
   * Get token budget from orchestrator state or return defaults
   * Note: Token tracking deprecated on Claude Max subscriptions
   */
  private getTokenBudget(): DashboardState["tokenBudget"] {
    // Try to get from orchestrator state tokenUsage
    const stateResult = this.contextHub.readOrchestratorState();
    if (stateResult.success && stateResult.data?.tokenUsage) {
      const usage = stateResult.data.tokenUsage;
      return {
        limit: usage.limit,
        consumed: usage.consumed,
        remaining: usage.remaining,
        percentage: usage.percentage
      };
    }

    // Return defaults if no token state exists
    return {
      limit: 120000,
      consumed: 0,
      remaining: 120000,
      percentage: 0
    };
  }
}

// ===========================================================================
// FACTORY FUNCTION
// ===========================================================================

/**
 * Create a DashboardDataCollector for the given session (or latest session)
 */
export function createDashboardCollector(
  sessionId?: string
): DashboardDataCollector {
  const contextHub = createContextHub(sessionId);
  return new DashboardDataCollector(contextHub);
}
