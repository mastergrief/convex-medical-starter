/**
 * CHECKING MODULES
 * Re-exports for gate checking functionality
 */

// Timeout utilities
export {
  TOTAL_GATE_TIMEOUT_MS,
  createTimeoutTracker,
  type TimeoutTracker
} from "./timeout.js";

// Legacy gate checking
export {
  checkGateLegacy,
  checkGateLegacyAsync
} from "./legacy.js";

// Modern gate checking (public API)
export {
  checkGate,
  checkGateAsync
} from "./modern.js";
