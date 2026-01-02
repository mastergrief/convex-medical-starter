/**
 * GATE DSL LEXER
 * Tokenizes gate condition strings into tokens for parsing
 */

import { Token, GateParseError, KEYWORDS } from "./types.js";

// =============================================================================
// TOKENIZER
// =============================================================================

/**
 * Tokenize a gate condition string into tokens
 * @param input The gate condition string to tokenize
 * @returns Array of tokens
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;

  function peek(offset = 0): string {
    return input[pos + offset] ?? "";
  }

  function advance(): string {
    return input[pos++] ?? "";
  }

  function skipWhitespace(): void {
    while (pos < input.length && /\s/.test(peek())) {
      advance();
    }
  }

  function readNumber(): string {
    let num = "";
    while (pos < input.length && /\d/.test(peek())) {
      num += advance();
    }
    return num;
  }

  function readIdentifierOrPattern(): string {
    let str = "";
    // Identifiers can contain letters, digits, underscores, hyphens, asterisks (wildcards), and dots
    while (pos < input.length && /[a-zA-Z0-9_\-*.]/.test(peek())) {
      str += advance();
    }
    return str;
  }

  while (pos < input.length) {
    skipWhitespace();
    if (pos >= input.length) break;

    const startPos = pos;
    const char = peek();

    // Two-character operators
    if (char === ">" && peek(1) === "=") {
      tokens.push({ type: "GTE", value: ">=", position: startPos });
      advance();
      advance();
      continue;
    }
    if (char === "<" && peek(1) === "=") {
      tokens.push({ type: "LTE", value: "<=", position: startPos });
      advance();
      advance();
      continue;
    }

    // Single-character tokens
    switch (char) {
      case "(":
        tokens.push({ type: "LPAREN", value: "(", position: startPos });
        advance();
        continue;
      case ")":
        tokens.push({ type: "RPAREN", value: ")", position: startPos });
        advance();
        continue;
      case "[":
        tokens.push({ type: "LBRACKET", value: "[", position: startPos });
        advance();
        continue;
      case "]":
        tokens.push({ type: "RBRACKET", value: "]", position: startPos });
        advance();
        continue;
      case ":":
        tokens.push({ type: "COLON", value: ":", position: startPos });
        advance();
        continue;
      case "%":
        tokens.push({ type: "PERCENT", value: "%", position: startPos });
        advance();
        continue;
      case ">":
        tokens.push({ type: "GT", value: ">", position: startPos });
        advance();
        continue;
      case "<":
        tokens.push({ type: "LT", value: "<", position: startPos });
        advance();
        continue;
      case "=":
        tokens.push({ type: "EQ", value: "=", position: startPos });
        advance();
        continue;
    }

    // Numbers
    if (/\d/.test(char)) {
      const num = readNumber();
      tokens.push({ type: "NUMBER", value: num, position: startPos });
      continue;
    }

    // Identifiers, keywords, and patterns
    if (/[a-zA-Z_]/.test(char)) {
      const ident = readIdentifierOrPattern();
      const lower = ident.toLowerCase();

      // Check for keywords (case-insensitive)
      if (lower in KEYWORDS) {
        tokens.push({ type: KEYWORDS[lower], value: ident, position: startPos });
      } else if (ident.includes("*")) {
        // Pattern (contains wildcard)
        tokens.push({ type: "PATTERN", value: ident, position: startPos });
      } else {
        tokens.push({ type: "IDENTIFIER", value: ident, position: startPos });
      }
      continue;
    }

    // Unknown character
    throw new GateParseError(`Unexpected character '${char}'`, startPos, char);
  }

  tokens.push({ type: "EOF", value: "", position: pos });
  return tokens;
}
