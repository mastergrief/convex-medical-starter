/**
 * PARALLEL ENGINE MODULES
 * Modular implementation of parallel agent execution engine
 *
 * Module structure:
 * - types.ts: Type definitions (ParallelExecutionConfig, AgentSpawnRequest, etc.)
 * - scheduling.ts: Task grouping and dependency calculation
 * - execution.ts: Dispatch generation, result aggregation, utilities
 * - engine.ts: ParallelEngine class with core methods
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
} from "./types.js";

export { DEFAULT_CONFIG } from "./types.js";

// =============================================================================
// SCHEDULING EXPORTS
// =============================================================================

export {
  buildParallelGroups,
  calculateDependencyLevels,
  canExecute,
  chunkArray,
} from "./scheduling.js";

// =============================================================================
// EXECUTION EXPORTS
// =============================================================================

export {
  generateDispatchInstructions,
  aggregateResults,
  injectDependencies,
  formatHandoffForInjection,
  buildSpawnCommand,
  withinTokenBudget,
  getRemainingBudget,
  createEmptyContext,
  mergeContexts,
  createExecutionResult,
  formatDispatchInstruction,
} from "./execution.js";

// =============================================================================
// ENGINE EXPORTS
// =============================================================================

export { ParallelEngine, createParallelEngine } from "./engine.js";
