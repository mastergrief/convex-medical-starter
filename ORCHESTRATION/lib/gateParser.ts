/**
 * GATE DSL PARSER - FACADE
 *
 * Boolean expression parser for orchestration gate conditions.
 * This facade delegates to focused modules in gateParserModules/.
 *
 * @see gateParserModules/types.ts - Type definitions
 * @see gateParserModules/lexer.ts - Tokenization
 * @see gateParserModules/parser.ts - AST parsing
 * @see gateParserModules/validators.ts - Check implementations
 * @see gateParserModules/evaluator.ts - AST evaluation
 */

// Re-export public types for backward compatibility
export type { GateASTNode, GateContext, GateEvalResult, CheckResult } from "./gateParserModules/index.js";
export { GateParseError } from "./gateParserModules/index.js";

// Import modules for public API implementation
import { tokenize } from "./gateParserModules/lexer.js";
import { parse } from "./gateParserModules/parser.js";
import { evaluateGate as evaluateGateInternal, createDefaultContext as createDefaultContextInternal } from "./gateParserModules/evaluator.js";
import type { GateASTNode, GateContext, GateEvalResult } from "./gateParserModules/types.js";

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Parse a gate condition string into an AST
 */
export function parseGateCondition(condition: string): GateASTNode {
  const trimmed = condition.trim();
  if (!trimmed) {
    throw new Error("Empty condition");
  }
  const tokens = tokenize(trimmed);
  return parse(tokens);
}

/**
 * Evaluate a parsed AST against the given context
 */
export async function evaluateGate(ast: GateASTNode, context: GateContext): Promise<GateEvalResult> {
  return evaluateGateInternal(ast, context);
}

/**
 * Detect if a condition string uses legacy comma-separated format
 * Legacy format: no boolean operators (AND/OR/NOT) and no comparison operators (><=)
 */
export function isLegacyFormat(condition: string): boolean {
  return !condition.match(/\b(AND|OR|NOT)\b/i) && !condition.match(/[><=]/);
}

/**
 * Create a default GateContext with standard command runner
 */
export function createDefaultContext(sessionPath: string, memoriesPath?: string): GateContext {
  return createDefaultContextInternal(sessionPath, memoriesPath);
}
