/**
 * GATE CHECKING (FACADE)
 * Re-exports gate checking functionality from modular implementation.
 *
 * Module structure:
 * - checkingModules/timeout.ts: Timeout utilities
 * - checkingModules/legacy.ts: Legacy gate checking (validation object format)
 * - checkingModules/modern.ts: Modern gate checking (DSL support)
 */

// Re-export all gate checking functionality
export {
  // Timeout utilities
  TOTAL_GATE_TIMEOUT_MS,
  createTimeoutTracker,
  type TimeoutTracker,

  // Legacy checking
  checkGateLegacy,
  checkGateLegacyAsync,

  // Modern checking (public API)
  checkGate,
  checkGateAsync
} from "./checkingModules/index.js";
