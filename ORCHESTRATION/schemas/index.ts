/**
 * ORCHESTRATION SCHEMAS - Facade
 * Type-safe contract definitions with runtime validation
 *
 * This facade re-exports all schemas from focused modules in schemaModules/
 * Maintains backwards compatibility - all existing imports continue to work.
 *
 * Module structure:
 * - foundation.ts: Base enums (AgentType, TaskStatus, Priority)
 * - components.ts: Building blocks (TokenUsage, SessionId, ContextFile)
 * - contracts.ts: Core contracts (Prompt, Plan, Handoff)
 * - state.ts: State tracking (OrchestratorState, TokenState)
 * - results.ts: Agent results (discriminated union)
 * - evidence.ts: Traceability (EvidenceChain, LinksTo)
 * - execution.ts: Execution (Gates, Dispatch, ParallelGroup)
 * - validators.ts: Validation functions
 * - factories.ts: Factory functions
 */

// =============================================================================
// FOUNDATION - Base enums with no dependencies
// =============================================================================
export {
  AGENTS_DIR,
  AgentTypeSchema,
  type AgentType,
  TaskStatusSchema,
  type TaskStatus,
  PrioritySchema,
  type Priority,
  resolveAgentPath,
  getValidAgentTypes
} from "./schemaModules/foundation.js";

// =============================================================================
// COMPONENTS - Building block schemas
// =============================================================================
export {
  SessionIdSchema,
  PromptMetadataSchema,
  ContextFileSchema,
  FileModificationSchema,
  DiscoverySchema,
  TokenUsageSchema,
  type TokenUsage,
  TaskResultSchema,
  HandoffReasonSchema,
  TraceabilityDataSchema,
  type TraceabilityData,
  AgentInstanceSchema
} from "./schemaModules/components.js";

// =============================================================================
// CONTRACTS - Core contract definitions
// =============================================================================
export {
  PromptSchema,
  type Prompt,
  SubtaskSchema,
  type Subtask,
  PhaseSchema,
  type Phase,
  PlanSchema,
  type Plan,
  HandoffSchema,
  type Handoff
} from "./schemaModules/contracts.js";

// =============================================================================
// STATE - Orchestrator and token state
// =============================================================================
export {
  OrchestratorStateSchema,
  type OrchestratorState,
  AgentTokenStateSchema,
  type AgentTokenState,
  TokenStateSchema,
  type TokenState
} from "./schemaModules/state.js";

// =============================================================================
// RESULTS - Agent-specific results
// =============================================================================
export {
  AnalystResultSchema,
  type AnalystResult,
  DeveloperResultSchema,
  type DeveloperResult,
  BrowserResultSchema,
  type BrowserResult,
  ComposerResultSchema,
  type ComposerResult,
  OrchestratorResultSchema,
  type OrchestratorResult,
  AgentResultSchema,
  type AgentResult
} from "./schemaModules/results.js";

// =============================================================================
// EVIDENCE - Traceability schemas
// =============================================================================
export {
  LinksToUpstreamSchema,
  type LinksToUpstream,
  LinksToDownstreamSchema,
  type LinksToDownstream,
  LinksToVerificationSchema,
  type LinksToVerification,
  LinksToSchema,
  type LinksTo,
  EvidenceRequirementSchema,
  type EvidenceRequirement,
  EvidenceAnalysisSchema,
  type EvidenceAnalysis,
  EvidenceImplementationSchema,
  type EvidenceImplementation,
  EvidenceValidationSchema,
  type EvidenceValidation,
  ChainStatusSchema,
  type ChainStatus,
  EvidenceChainSchema,
  type EvidenceChain
} from "./schemaModules/evidence.js";

// =============================================================================
// EXECUTION - Gates, dispatch, parallel execution
// =============================================================================
export {
  GateValidationSchema,
  type GateValidation,
  GateResultSchema,
  type GateResult,
  LinkedMemorySchema,
  type LinkedMemory,
  ParallelGroupSchema,
  type ParallelGroup,
  ExecutionStrategySchema,
  type ExecutionStrategy,
  AgentDispatchSchema,
  type AgentDispatch,
  DispatchInstructionSchema,
  type DispatchInstruction
} from "./schemaModules/execution.js";

// =============================================================================
// VALIDATORS - Validation functions
// =============================================================================
export {
  validatePrompt,
  safeValidatePrompt,
  validatePlan,
  safeValidatePlan,
  validateHandoff,
  safeValidateHandoff,
  validateOrchestratorState,
  safeValidateOrchestratorState,
  validateTokenState,
  safeValidateTokenState,
  validateAgentResult,
  safeValidateAgentResult,
  validateEvidenceChain,
  safeValidateEvidenceChain,
  validateGateResult,
  safeValidateGateResult,
  validateExecutionStrategy,
  safeValidateExecutionStrategy,
  validateDispatchInstruction,
  safeValidateDispatchInstruction,
  validateLinkedMemory,
  safeValidateLinkedMemory
} from "./schemaModules/validators.js";

// =============================================================================
// FACTORIES - Factory functions
// =============================================================================
export {
  createPromptId,
  createSessionId,
  createTimestamp,
  createEmptyPrompt,
  createTokenUsage
} from "./schemaModules/factories.js";
