/**
 * OrchestrationDashboard class - Terminal-based dashboard for monitoring orchestration status.
 */

import type { DashboardDataCollector } from "../../lib/dashboard-data.js";
import {
  DashboardConfig,
  DEFAULT_DASHBOARD_CONFIG
} from "../../lib/dashboard-types.js";
import { renderDashboard } from "./renderer.js";

// ===========================================================================
// DASHBOARD CLASS
// ===========================================================================

/**
 * Terminal-based dashboard for monitoring orchestration status.
 * Supports auto-refresh and keyboard controls.
 */
export class OrchestrationDashboard {
  private collector: DashboardDataCollector;
  private config: DashboardConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  /**
   * Create a new dashboard instance
   * @param collector - DashboardDataCollector for state retrieval
   * @param config - Optional configuration overrides
   */
  constructor(
    collector: DashboardDataCollector,
    config?: Partial<DashboardConfig>
  ) {
    this.collector = collector;
    this.config = { ...DEFAULT_DASHBOARD_CONFIG, ...config };
  }

  /**
   * Start the dashboard with auto-refresh
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.setupKeyboardHandling();

    // Initial render
    this.renderOnce();

    // Set up auto-refresh interval
    this.intervalId = setInterval(() => {
      this.renderOnce();
    }, this.config.refreshInterval);
  }

  /**
   * Stop the dashboard and cleanup resources
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Restore terminal state
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    // Show cursor
    process.stdout.write("\x1b[?25h");
  }

  /**
   * Render a single frame of the dashboard
   */
  renderOnce(): void {
    try {
      const state = this.collector.collectState();
      this.render(state);
    } catch (error) {
      console.error("Dashboard render error:", error);
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  /**
   * Main render function - clears screen and outputs all sections
   */
  private render(state: Parameters<typeof renderDashboard>[0]): void {
    // Clear screen and move cursor to top-left
    console.clear();

    // Hide cursor during render for cleaner display
    process.stdout.write("\x1b[?25l");

    // Build and output the dashboard
    const output = renderDashboard(state, this.config);
    console.log(output);
  }

  /**
   * Set up keyboard handling for interactive controls
   */
  private setupKeyboardHandling(): void {
    if (!process.stdin.isTTY) {
      return;
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    process.stdin.on("data", (key: string) => {
      const keyStr = key.toString();

      // q or Ctrl+C to quit
      if (keyStr === "q" || keyStr === "\u0003") {
        this.stop();
        console.log("\nDashboard stopped.");
        process.exit(0);
      }

      // r to refresh
      if (keyStr === "r") {
        this.renderOnce();
      }
    });
  }
}
