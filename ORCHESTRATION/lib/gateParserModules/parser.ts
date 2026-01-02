/**
 * GATE DSL PARSER
 * Parses tokens into an Abstract Syntax Tree (AST)
 *
 * Grammar (BNF):
 * expression := term (('AND' | 'OR') term)*
 * term := 'NOT'? factor
 * factor := check | '(' expression ')'
 * check := simple_check | threshold_check
 */

import { Token, TokenType, GateASTNode, GateParseError } from "./types.js";

// =============================================================================
// PARSER CLASS (Internal)
// =============================================================================

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? { type: "EOF", value: "", position: -1 };
  }

  private advance(): Token {
    const token = this.peek();
    if (token.type !== "EOF") {
      this.pos++;
    }
    return token;
  }

  private expect(type: TokenType): Token {
    const token = this.peek();
    if (token.type !== type) {
      throw new GateParseError(`Expected '${type}'`, token.position, token.value || token.type);
    }
    return this.advance();
  }

  private isOperator(type: TokenType): boolean {
    return type === "GTE" || type === "LTE" || type === "GT" || type === "LT" || type === "EQ";
  }

  parse(): GateASTNode {
    const ast = this.parseExpression();

    // Ensure we consumed all tokens
    if (this.peek().type !== "EOF") {
      throw new GateParseError("Unexpected token after expression", this.peek().position, this.peek().value);
    }

    return ast;
  }

  /**
   * expression := term (('AND' | 'OR') term)*
   */
  private parseExpression(): GateASTNode {
    let left = this.parseTerm();

    while (this.peek().type === "AND" || this.peek().type === "OR") {
      const op = this.advance();
      const right = this.parseTerm();

      if (op.type === "AND") {
        left = { type: "and", left, right };
      } else {
        left = { type: "or", left, right };
      }
    }

    return left;
  }

  /**
   * term := 'NOT'? factor
   */
  private parseTerm(): GateASTNode {
    if (this.peek().type === "NOT") {
      this.advance();
      const operand = this.parseFactor();
      return { type: "not", operand };
    }
    return this.parseFactor();
  }

  /**
   * factor := check | '(' expression ')'
   */
  private parseFactor(): GateASTNode {
    if (this.peek().type === "LPAREN") {
      this.advance(); // consume '('
      const expr = this.parseExpression();
      this.expect("RPAREN");
      return expr;
    }
    return this.parseCheck();
  }

  /**
   * check := simple_check | threshold_check
   * simple_check := 'typecheck' | 'tests' | memory_check | traceability_check | evidence_check
   */
  private parseCheck(): GateASTNode {
    const token = this.peek();

    if (token.type !== "IDENTIFIER" && token.type !== "PATTERN") {
      throw new GateParseError("Expected check type", token.position, token.value || token.type);
    }

    const checkName = this.advance().value;
    const lowerName = checkName.toLowerCase();

    // Simple checks without colon
    if (lowerName === "typecheck" || lowerName === "tests") {
      // Check for threshold: tests[passed] >= 80
      if (this.peek().type === "LBRACKET") {
        return this.parseThreshold(checkName);
      }
      return { type: "check", checkType: lowerName };
    }

    // Coverage shorthand: coverage >= 75 (without evidence: prefix)
    if (lowerName === "coverage") {
      if (this.isOperator(this.peek().type)) {
        const op = this.advance();
        const numToken = this.expect("NUMBER");
        // Optional percent sign
        if (this.peek().type === "PERCENT") {
          this.advance();
        }
        return {
          type: "threshold",
          checkType: "evidence",
          field: "coverage",
          operator: op.value,
          value: parseInt(numToken.value, 10)
        };
      }
      throw new GateParseError("Expected operator after 'coverage'", this.peek().position, this.peek().value);
    }

    // Checks with colon: memory:PATTERN, traceability:fields, evidence:spec
    if (this.peek().type === "COLON") {
      this.advance(); // consume ':'
      return this.parseColonCheck(checkName);
    }

    // Pattern-only (e.g., ANALYSIS_*)
    if (token.type === "PATTERN") {
      return { type: "check", checkType: "memory", pattern: checkName };
    }

    // Threshold check: checkType[field] operator value
    if (this.peek().type === "LBRACKET") {
      return this.parseThreshold(checkName);
    }

    throw new GateParseError(`Unknown check type '${checkName}'`, token.position, checkName);
  }

  /**
   * Parse checks with colon: memory:PATTERN, traceability:fields, evidence:spec
   */
  private parseColonCheck(checkType: string): GateASTNode {
    const lowerType = checkType.toLowerCase();

    if (lowerType === "memory") {
      // memory:PATTERN
      const patternToken = this.peek();
      if (patternToken.type !== "IDENTIFIER" && patternToken.type !== "PATTERN") {
        throw new GateParseError("Expected memory pattern", patternToken.position, patternToken.value);
      }
      const pattern = this.advance().value;
      return { type: "check", checkType: "memory", pattern };
    }

    if (lowerType === "traceability") {
      // traceability:field_list (comma-separated within single token or multiple underscore-separated)
      const fieldToken = this.peek();
      if (fieldToken.type !== "IDENTIFIER" && fieldToken.type !== "PATTERN") {
        throw new GateParseError("Expected traceability field", fieldToken.position, fieldToken.value);
      }
      const field = this.advance().value;
      return { type: "check", checkType: "traceability", field };
    }

    if (lowerType === "evidence") {
      // evidence:coverage >= N or evidence:CHAIN_ID exists
      const specToken = this.peek();
      if (specToken.type !== "IDENTIFIER" && specToken.type !== "PATTERN") {
        throw new GateParseError("Expected evidence specifier", specToken.position, specToken.value);
      }
      const spec = this.advance().value;
      const lowerSpec = spec.toLowerCase();

      // evidence:coverage >= N
      if (lowerSpec === "coverage") {
        if (this.isOperator(this.peek().type)) {
          const op = this.advance();
          const numToken = this.expect("NUMBER");
          // Optional percent sign
          if (this.peek().type === "PERCENT") {
            this.advance();
          }
          return {
            type: "threshold",
            checkType: "evidence",
            field: "coverage",
            operator: op.value,
            value: parseInt(numToken.value, 10)
          };
        }
        // Just evidence:coverage (without threshold)
        return { type: "check", checkType: "evidence", field: "coverage" };
      }

      // evidence:CHAIN_ID exists
      if (this.peek().type === "IDENTIFIER" && this.peek().value.toLowerCase() === "exists") {
        this.advance(); // consume 'exists'
        return { type: "check", checkType: "evidence", pattern: spec, field: "exists" };
      }

      // Just evidence:CHAIN_ID (implicit exists check)
      return { type: "check", checkType: "evidence", pattern: spec };
    }

    throw new GateParseError(`Unknown check type '${checkType}'`, 0, checkType);
  }

  /**
   * threshold_check := check_name '[' FIELD ']' OPERATOR NUMBER
   */
  private parseThreshold(checkType: string): GateASTNode {
    this.expect("LBRACKET");
    const fieldToken = this.expect("IDENTIFIER");
    this.expect("RBRACKET");

    const opToken = this.peek();
    if (!this.isOperator(opToken.type)) {
      throw new GateParseError("Expected comparison operator", opToken.position, opToken.value);
    }
    this.advance();

    const numToken = this.expect("NUMBER");

    // Optional percent sign
    if (this.peek().type === "PERCENT") {
      this.advance();
    }

    return {
      type: "threshold",
      checkType: checkType.toLowerCase(),
      field: fieldToken.value,
      operator: opToken.value,
      value: parseInt(numToken.value, 10)
    };
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Parse tokens into an AST
 * @param tokens Array of tokens from tokenize()
 * @returns AST node representing the gate condition
 */
export function parse(tokens: Token[]): GateASTNode {
  const parser = new Parser(tokens);
  return parser.parse();
}
