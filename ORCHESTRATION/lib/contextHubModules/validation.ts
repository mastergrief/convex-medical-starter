/**
 * VALIDATION MODULE
 * File validation operations
 */

import * as fs from "fs";
import {
  safeValidatePrompt,
  safeValidatePlan,
  safeValidateHandoff,
  safeValidateOrchestratorState,
  safeValidateTokenState
} from "../../schemas/index.js";

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface ValidationResult {
  valid: boolean;
  type?: string;
  error?: string;
  details?: unknown;
}

// =============================================================================
// VALIDATION OPERATIONS
// =============================================================================

/**
 * Validate a file against all known schemas
 */
export function validateFile(filepath: string): ValidationResult {
  try {
    if (!fs.existsSync(filepath)) {
      return { valid: false, error: "File not found" };
    }

    const content = fs.readFileSync(filepath, "utf-8");
    const data = JSON.parse(content);

    // Collect errors for type-specific validation
    const errors: Record<string, unknown> = {};

    // Try each schema
    const promptResult = safeValidatePrompt(data);
    if (promptResult.success) {
      return { valid: true, type: "prompt" };
    }
    if (data.type === "prompt") {
      errors.prompt = promptResult.error?.format();
    }

    const planResult = safeValidatePlan(data);
    if (planResult.success) {
      return { valid: true, type: "plan" };
    }
    if (data.type === "plan") {
      errors.plan = planResult.error?.format();
    }

    const handoffResult = safeValidateHandoff(data);
    if (handoffResult.success) {
      return { valid: true, type: "handoff" };
    }
    if (data.type === "handoff") {
      errors.handoff = handoffResult.error?.format();
    }

    const stateResult = safeValidateOrchestratorState(data);
    if (stateResult.success) {
      return { valid: true, type: "orchestrator_state" };
    }
    if (data.type === "orchestrator_state") {
      errors.orchestrator_state = stateResult.error?.format();
    }

    const tokenResult = safeValidateTokenState(data);
    if (tokenResult.success) {
      return { valid: true, type: "token_state" };
    }
    if (data.type === "token_state") {
      errors.token_state = tokenResult.error?.format();
    }

    // Return specific errors based on declared type
    if (data.type && errors[data.type]) {
      return {
        valid: false,
        error: `Invalid ${data.type} schema`,
        details: errors[data.type]
      };
    }

    return { valid: false, error: "Does not match any known schema (missing or invalid 'type' field)" };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
