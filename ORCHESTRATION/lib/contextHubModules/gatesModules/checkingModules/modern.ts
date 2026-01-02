/**
 * MODERN GATE CHECKING
 * Public gate checking API with DSL support
 */

import * as path from "path";
import {
  GateValidation,
  GateResult,
  Plan,
  createTimestamp
} from "../../../../schemas/index.js";
import type { ContextHubConfig, WriteResult, ReadResult, LinkedMemoryInfo } from "../../types.js";
import type { LinkedMemoryData } from "../../memory.js";
import {
  parseGateCondition as parseDSLCondition,
  evaluateGate,
  isLegacyFormat,
  createDefaultContext
} from "../../../gateParser.js";
import { parseGateCondition } from "../parsing.js";
import { checkGateLegacy, checkGateLegacyAsync } from "./legacy.js";

/**
 * Check gate synchronously (returns immediately, DSL conditions require async)
 * @deprecated Use checkGateAsync for non-blocking execution with progress streaming.
 * This sync version blocks the CLI and provides no feedback during long operations.
 */
export function checkGate(
  config: ContextHubConfig,
  phaseId: string,
  validation: GateValidation | undefined,
  readPlan: () => ReadResult<Plan>,
  listLinkedMemories: () => LinkedMemoryInfo[],
  getLinkedMemory: (name: string) => ReadResult<LinkedMemoryData>,
  writeGateResultFn: (result: GateResult) => WriteResult
): GateResult {
  // Get current plan to find phase gate conditions
  const planResult = readPlan();
  let gateValidation = validation;
  let condition: string | undefined = validation?.condition;

  // Get condition from plan phase if not provided in validation
  if (!condition && planResult.success && planResult.data) {
    const phase = planResult.data.phases.find(p => p.id === phaseId);
    if (phase?.gateCondition) {
      condition = phase.gateCondition;
    }
  }

  // No condition and no validation - gate passes by default
  if (!condition && !gateValidation) {
    const defaultResult: GateResult = {
      phaseId,
      passed: true,
      checkedAt: createTimestamp(),
      results: [{ check: "default", passed: true, message: "No gate conditions defined" }],
      blockers: []
    };
    writeGateResultFn(defaultResult);
    return defaultResult;
  }

  // If we have a condition string, check if it uses legacy or new DSL format
  if (condition) {
    if (isLegacyFormat(condition)) {
      // Parse legacy condition into validation object
      gateValidation = parseGateCondition(condition);
      return checkGateLegacy(
        config,
        phaseId,
        gateValidation,
        listLinkedMemories,
        getLinkedMemory,
        writeGateResultFn
      );
    }

    // New DSL format - use AST-based evaluation
    try {
      const ast = parseDSLCondition(condition);
      const memoriesPath = path.join(process.cwd(), ".serena", "memories");
      const context = createDefaultContext(config.sessionPath, memoriesPath);

      // Note: evaluateGate is async, but we need to handle it synchronously here
      // for backward compatibility. We use a synchronous wrapper approach.
      // The async result is not used in sync context - recommend using checkGateAsync instead.

      // Execute async evaluation (result captured by promise, not used synchronously)
      const evalPromise = evaluateGate(ast, context);
      evalPromise
        .then(_result => { /* async result handled elsewhere */ })
        .catch(_err => { /* async error handled elsewhere */ });

      // For true async support, the caller would need to await this.
      // For now, we return a pending result and recommend async usage.
      // However, to maintain backward compatibility, we'll execute synchronously
      // by returning a result that reflects the DSL was detected.
      // Full async support would require refactoring the function signature.

      // Synchronous fallback: execute checks that can be done sync
      // For full DSL support, recommend using checkGateAsync instead
      const syncResult: GateResult = {
        phaseId,
        passed: false,
        checkedAt: createTimestamp(),
        results: [{ check: "dsl", passed: false, message: `DSL condition detected: ${condition}. Use checkGateAsync for full DSL support.` }],
        blockers: ["DSL conditions require async evaluation"]
      };

      writeGateResultFn(syncResult);
      return syncResult;
    } catch (error) {
      const errorResult: GateResult = {
        phaseId,
        passed: false,
        checkedAt: createTimestamp(),
        results: [{ check: "dsl_parse", passed: false, message: error instanceof Error ? error.message : "DSL parse error" }],
        blockers: ["Failed to parse DSL condition"]
      };
      writeGateResultFn(errorResult);
      return errorResult;
    }
  }

  // Have validation object but no condition string - use legacy check
  if (gateValidation) {
    return checkGateLegacy(
      config,
      phaseId,
      gateValidation,
      listLinkedMemories,
      getLinkedMemory,
      writeGateResultFn
    );
  }

  // Fallback - should not reach here
  const fallbackResult: GateResult = {
    phaseId,
    passed: true,
    checkedAt: createTimestamp(),
    results: [{ check: "default", passed: true, message: "No gate conditions defined" }],
    blockers: []
  };
  writeGateResultFn(fallbackResult);
  return fallbackResult;
}

/**
 * Check gate asynchronously (full DSL support)
 */
export async function checkGateAsync(
  config: ContextHubConfig,
  phaseId: string,
  validation: GateValidation | undefined,
  readPlan: () => ReadResult<Plan>,
  listLinkedMemories: () => LinkedMemoryInfo[],
  getLinkedMemory: (name: string) => ReadResult<LinkedMemoryData>,
  writeGateResultFn: (result: GateResult) => WriteResult,
  options?: { onProgress?: (msg: string) => void }
): Promise<GateResult> {
  // Get current plan to find phase gate conditions
  const planResult = readPlan();
  let gateValidation = validation;
  let condition: string | undefined = validation?.condition;

  // Get condition from plan phase if not provided in validation
  if (!condition && planResult.success && planResult.data) {
    const phase = planResult.data.phases.find(p => p.id === phaseId);
    if (phase?.gateCondition) {
      condition = phase.gateCondition;
    }
  }

  // No condition and no validation - gate passes by default
  if (!condition && !gateValidation) {
    const defaultResult: GateResult = {
      phaseId,
      passed: true,
      checkedAt: createTimestamp(),
      results: [{ check: "default", passed: true, message: "No gate conditions defined" }],
      blockers: []
    };
    writeGateResultFn(defaultResult);
    return defaultResult;
  }

  // If we have a condition string, check if it uses legacy or new DSL format
  if (condition) {
    if (isLegacyFormat(condition)) {
      // Parse legacy condition into validation object
      gateValidation = parseGateCondition(condition);
      return checkGateLegacyAsync(
        config,
        phaseId,
        gateValidation,
        listLinkedMemories,
        getLinkedMemory,
        writeGateResultFn,
        options
      );
    }

    // New DSL format - use AST-based evaluation
    try {
      const ast = parseDSLCondition(condition);
      const memoriesPath = path.join(process.cwd(), ".serena", "memories");
      const context = createDefaultContext(config.sessionPath, memoriesPath);

      const evalResult = await evaluateGate(ast, context);

      const gateResult: GateResult = {
        phaseId,
        passed: evalResult.passed,
        checkedAt: createTimestamp(),
        results: evalResult.results,
        blockers: evalResult.blockers
      };

      writeGateResultFn(gateResult);
      return gateResult;
    } catch (error) {
      const errorResult: GateResult = {
        phaseId,
        passed: false,
        checkedAt: createTimestamp(),
        results: [{ check: "dsl_parse", passed: false, message: error instanceof Error ? error.message : "DSL parse error" }],
        blockers: ["Failed to parse DSL condition"]
      };
      writeGateResultFn(errorResult);
      return errorResult;
    }
  }

  // Have validation object but no condition string - use legacy check
  if (gateValidation) {
    return checkGateLegacyAsync(
      config,
      phaseId,
      gateValidation,
      listLinkedMemories,
      getLinkedMemory,
      writeGateResultFn,
      options
    );
  }

  // Fallback - should not reach here
  const fallbackResult: GateResult = {
    phaseId,
    passed: true,
    checkedAt: createTimestamp(),
    results: [{ check: "default", passed: true, message: "No gate conditions defined" }],
    blockers: []
  };
  writeGateResultFn(fallbackResult);
  return fallbackResult;
}
