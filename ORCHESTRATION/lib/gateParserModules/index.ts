/**
 * GATE PARSER MODULES
 * Modular implementation of the Gate DSL parser
 *
 * Module structure:
 * - types.ts: Type definitions, interfaces, constants
 * - lexer.ts: Tokenization (Phase 2)
 * - parser.ts: AST construction (Phase 3)
 * - validators.ts: Check implementations (Phase 4)
 * - evaluator.ts: AST evaluation (Phase 5)
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type {
  TokenType,
  Token,
  GateASTNode,
  GateContext,
  CheckResult,
  GateEvalResult
} from "./types.js";

// =============================================================================
// VALUE EXPORTS
// =============================================================================

export { GateParseError, KEYWORDS } from "./types.js";

// =============================================================================
// MODULE EXPORTS (FUTURE PHASES)
// =============================================================================

// Phase 2: Lexer
export { tokenize } from "./lexer.js";

// Phase 3: Parser
export { parse } from "./parser.js";

// Phase 4: Validators
export {
  checkTypecheck,
  checkTests,
  checkMemory,
  checkTraceability,
  checkEvidence,
  checkEvidenceThreshold,
  checkTestsThreshold
} from "./validators.js";

// Phase 5: Evaluator
export { evaluateGate, createDefaultContext } from "./evaluator.js";
