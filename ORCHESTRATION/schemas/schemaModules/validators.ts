/**
 * VALIDATORS
 * Validation functions for all schemas
 */

// Import schemas for validation
import { PromptSchema, PlanSchema, HandoffSchema, type Prompt, type Plan, type Handoff } from "./contracts.js";
import { OrchestratorStateSchema, TokenStateSchema, type OrchestratorState, type TokenState } from "./state.js";
import { AgentResultSchema, type AgentResult } from "./results.js";
import { EvidenceChainSchema, type EvidenceChain } from "./evidence.js";
import {
  GateResultSchema,
  ExecutionStrategySchema,
  DispatchInstructionSchema,
  LinkedMemorySchema,
  type GateResult,
  type ExecutionStrategy,
  type DispatchInstruction,
  type LinkedMemory
} from "./execution.js";

// =============================================================================
// PROMPT VALIDATORS
// =============================================================================

export function validatePrompt(data: unknown): Prompt {
  return PromptSchema.parse(data);
}

export function safeValidatePrompt(data: unknown) {
  return PromptSchema.safeParse(data);
}

// =============================================================================
// PLAN VALIDATORS
// =============================================================================

export function validatePlan(data: unknown): Plan {
  return PlanSchema.parse(data);
}

export function safeValidatePlan(data: unknown) {
  return PlanSchema.safeParse(data);
}

// =============================================================================
// HANDOFF VALIDATORS
// =============================================================================

export function validateHandoff(data: unknown): Handoff {
  return HandoffSchema.parse(data);
}

export function safeValidateHandoff(data: unknown) {
  return HandoffSchema.safeParse(data);
}

// =============================================================================
// STATE VALIDATORS
// =============================================================================

export function validateOrchestratorState(data: unknown): OrchestratorState {
  return OrchestratorStateSchema.parse(data);
}

export function safeValidateOrchestratorState(data: unknown) {
  return OrchestratorStateSchema.safeParse(data);
}

export function validateTokenState(data: unknown): TokenState {
  return TokenStateSchema.parse(data);
}

export function safeValidateTokenState(data: unknown) {
  return TokenStateSchema.safeParse(data);
}

// =============================================================================
// RESULT VALIDATORS
// =============================================================================

export function validateAgentResult(data: unknown): AgentResult {
  return AgentResultSchema.parse(data);
}

export function safeValidateAgentResult(data: unknown) {
  return AgentResultSchema.safeParse(data);
}

// =============================================================================
// EVIDENCE CHAIN VALIDATORS
// =============================================================================

export function validateEvidenceChain(data: unknown): EvidenceChain {
  return EvidenceChainSchema.parse(data);
}

export function safeValidateEvidenceChain(data: unknown) {
  return EvidenceChainSchema.safeParse(data);
}

// =============================================================================
// EXECUTION VALIDATORS
// =============================================================================

export function validateGateResult(data: unknown): GateResult {
  return GateResultSchema.parse(data);
}

export function safeValidateGateResult(data: unknown) {
  return GateResultSchema.safeParse(data);
}

export function validateExecutionStrategy(data: unknown): ExecutionStrategy {
  return ExecutionStrategySchema.parse(data);
}

export function safeValidateExecutionStrategy(data: unknown) {
  return ExecutionStrategySchema.safeParse(data);
}

export function validateDispatchInstruction(data: unknown): DispatchInstruction {
  return DispatchInstructionSchema.parse(data);
}

export function safeValidateDispatchInstruction(data: unknown) {
  return DispatchInstructionSchema.safeParse(data);
}

export function validateLinkedMemory(data: unknown): LinkedMemory {
  return LinkedMemorySchema.parse(data);
}

export function safeValidateLinkedMemory(data: unknown) {
  return LinkedMemorySchema.safeParse(data);
}
