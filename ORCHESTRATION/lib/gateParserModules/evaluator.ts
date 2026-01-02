/**
 * GATE DSL PARSER - EVALUATOR
 * AST evaluation and context creation
 *
 * Evaluates parsed gate AST nodes to determine pass/fail outcomes.
 * Supports boolean operators (AND, OR, NOT) with short-circuit evaluation.
 */

import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { GateASTNode, GateContext, CheckResult, GateEvalResult } from "./types.js";
import {
  checkTypecheck,
  checkTests,
  checkMemory,
  checkTraceability,
  checkEvidence,
  checkEvidenceThreshold,
  checkTestsThreshold
} from "./validators.js";

const execAsync = promisify(exec);

// =============================================================================
// AST EVALUATION (INTERNAL)
// =============================================================================

/**
 * Recursively evaluates an AST node
 * Supports short-circuit evaluation for AND/OR
 */
async function evaluateNode(
  node: GateASTNode,
  context: GateContext,
  results: CheckResult[]
): Promise<boolean> {
  switch (node.type) {
    case "and": {
      const leftResult = await evaluateNode(node.left, context, results);
      if (!leftResult) return false; // Short-circuit
      return evaluateNode(node.right, context, results);
    }

    case "or": {
      const leftResult = await evaluateNode(node.left, context, results);
      if (leftResult) return true; // Short-circuit
      return evaluateNode(node.right, context, results);
    }

    case "not": {
      const operandResult = await evaluateNode(node.operand, context, results);
      return !operandResult;
    }

    case "check": {
      let result: CheckResult;

      switch (node.checkType) {
        case "typecheck":
          result = await checkTypecheck(context);
          break;
        case "tests":
          result = await checkTests(context);
          break;
        case "memory":
          result = await checkMemory(node.pattern || "*", context);
          break;
        case "traceability":
          result = await checkTraceability(node.field || "", context);
          break;
        case "evidence":
          result = await checkEvidence(node.pattern, node.field, context);
          break;
        default:
          result = { check: node.checkType, passed: false, message: `Unknown check type: ${node.checkType}` };
      }

      results.push(result);
      return result.passed;
    }

    case "threshold": {
      let result: CheckResult;

      switch (node.checkType) {
        case "evidence":
          result = await checkEvidenceThreshold(node.field, node.operator, node.value, context);
          break;
        case "tests":
          result = await checkTestsThreshold(node.field, node.operator, node.value, context);
          break;
        default:
          result = {
            check: `${node.checkType}[${node.field}]${node.operator}${node.value}`,
            passed: false,
            message: `Threshold checks not supported for: ${node.checkType}`
          };
      }

      results.push(result);
      return result.passed;
    }
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Evaluates a parsed gate AST against the provided context
 * Returns overall pass/fail, individual results, and blocking messages
 */
export async function evaluateGate(ast: GateASTNode, context: GateContext): Promise<GateEvalResult> {
  const results: CheckResult[] = [];
  const passed = await evaluateNode(ast, context, results);

  const blockers = results
    .filter(r => !r.passed)
    .map(r => r.message || r.check);

  return { passed, results, blockers };
}

/**
 * Creates a default gate context with standard paths and command runner
 * Uses npm/node commands executed in the current working directory
 */
export function createDefaultContext(sessionPath: string, memoriesPath?: string): GateContext {
  return {
    sessionPath,
    memoriesPath: memoriesPath ?? path.join(process.cwd(), ".serena", "memories"),
    runCommand: async (cmd: string, timeout = 30000) => {
      try {
        const { stdout, stderr } = await execAsync(cmd, {
          cwd: process.cwd(),
          timeout
        });
        return { stdout, stderr, exitCode: 0 };
      } catch (error) {
        if (error && typeof error === "object" && "stdout" in error && "stderr" in error) {
          const execError = error as { stdout: string; stderr: string; code?: number };
          return {
            stdout: execError.stdout || "",
            stderr: execError.stderr || "",
            exitCode: execError.code ?? 1
          };
        }
        throw error;
      }
    }
  };
}
