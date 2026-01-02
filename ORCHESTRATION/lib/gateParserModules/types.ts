/**
 * GATE DSL PARSER - TYPE DEFINITIONS
 * Boolean expression parser for orchestration gate conditions
 *
 * Grammar (BNF):
 * gate_condition := expression
 * expression := term (('AND' | 'OR') term)*
 * term := 'NOT'? factor
 * factor := check | '(' expression ')'
 * check := simple_check | threshold_check
 * simple_check := 'typecheck' | 'tests' | memory_check | traceability_check | evidence_check
 * memory_check := 'memory:' PATTERN
 * traceability_check := 'traceability:' FIELD_LIST
 * evidence_check := 'evidence:' (CHAIN_ID 'exists' | 'coverage')
 * threshold_check := check_name '[' FIELD ']' OPERATOR NUMBER
 * OPERATOR := '>=' | '<=' | '>' | '<' | '='
 */

// =============================================================================
// TOKEN TYPES
// =============================================================================

export type TokenType =
  | "AND"
  | "OR"
  | "NOT"
  | "LPAREN"
  | "RPAREN"
  | "LBRACKET"
  | "RBRACKET"
  | "GTE"
  | "LTE"
  | "GT"
  | "LT"
  | "EQ"
  | "NUMBER"
  | "IDENTIFIER"
  | "PATTERN"
  | "COLON"
  | "PERCENT"
  | "EOF";

export interface Token {
  type: TokenType;
  value: string;
  position: number;
}

// =============================================================================
// AST TYPES
// =============================================================================

export type GateASTNode =
  | { type: "and"; left: GateASTNode; right: GateASTNode }
  | { type: "or"; left: GateASTNode; right: GateASTNode }
  | { type: "not"; operand: GateASTNode }
  | { type: "check"; checkType: string; pattern?: string; field?: string }
  | { type: "threshold"; checkType: string; field: string; operator: string; value: number };

// =============================================================================
// CONTEXT & RESULT TYPES
// =============================================================================

export interface GateContext {
  sessionPath: string;
  memoriesPath: string;
  runCommand: (cmd: string, timeout?: number) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

export interface CheckResult {
  check: string;
  passed: boolean;
  message?: string;
}

export interface GateEvalResult {
  passed: boolean;
  results: CheckResult[];
  blockers: string[];
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

export class GateParseError extends Error {
  constructor(
    message: string,
    public position: number,
    public found?: string
  ) {
    super(`${message} at position ${position}${found ? `, found '${found}'` : ""}`);
    this.name = "GateParseError";
  }
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const KEYWORDS: Record<string, TokenType> = {
  and: "AND",
  or: "OR",
  not: "NOT",
  exists: "IDENTIFIER"
};
