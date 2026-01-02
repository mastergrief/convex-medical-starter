/**
 * Parallel Execution Engine for Multi-Agent Orchestration
 *
 * FACADE MODULE - Re-exports from parallelEngineModules/
 *
 * Manages parallel agent execution with dependency resolution,
 * token budget tracking, and result aggregation.
 *
 * @module parallel-engine
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  ParallelExecutionConfig,
  AgentSpawnRequest,
  ExecutionResult,
  AggregatedContext,
  DispatchInstruction,
} from "./parallelEngineModules/index.js";

export { DEFAULT_CONFIG } from "./parallelEngineModules/index.js";

// =============================================================================
// ENGINE EXPORTS
// =============================================================================

export { ParallelEngine, createParallelEngine } from "./parallelEngineModules/index.js";

// =============================================================================
// UTILITY EXPORTS
// =============================================================================

export {
  createEmptyContext,
  mergeContexts,
  createExecutionResult,
  formatDispatchInstruction,
} from "./parallelEngineModules/index.js";

// =============================================================================
// RE-EXPORTS FROM RETRY UTILITY
// =============================================================================

export { withRetry, withRetryMetrics, isTransientError, RETRY_DELAYS } from "./utils/retry.js";
export type { RetryConfig, RetryMetrics } from "./utils/retry.js";
