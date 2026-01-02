/**
 * Dashboard Types - Type definitions for terminal dashboard UI.
 * Uses simple text output (no blessed dependency due to ESM issues).
 */

/**
 * Configuration for the orchestration dashboard
 */
export interface DashboardConfig {
  /** Refresh interval in ms (default: 1000) */
  refreshInterval: number;
  /** Maximum events to show (default: 10) */
  maxEvents: number;
}

/**
 * Default dashboard configuration values
 */
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
  refreshInterval: 1000,
  maxEvents: 10
};
