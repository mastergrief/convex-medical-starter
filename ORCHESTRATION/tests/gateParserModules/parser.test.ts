/**
 * @vitest-environment node
 */
/**
 * Parser Tests
 * Comprehensive unit tests for the gate condition parser
 *
 * Tests the parse() function which converts token arrays into AST nodes.
 * Covers simple checks, boolean expressions, thresholds, and error cases.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../lib/gateParserModules/parser.js';
import { tokenize } from '../../lib/gateParserModules/lexer.js';
import { GateParseError, type GateASTNode } from '../../lib/gateParserModules/types.js';

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Helper to parse from string input (tokenize + parse)
 */
const parseString = (input: string): GateASTNode => parse(tokenize(input));

/**
 * Type guard for check nodes
 */
const isCheckNode = (node: GateASTNode): node is Extract<GateASTNode, { type: 'check' }> =>
  node.type === 'check';

/**
 * Type guard for threshold nodes
 */
const isThresholdNode = (node: GateASTNode): node is Extract<GateASTNode, { type: 'threshold' }> =>
  node.type === 'threshold';

/**
 * Type guard for and nodes
 */
const isAndNode = (node: GateASTNode): node is Extract<GateASTNode, { type: 'and' }> =>
  node.type === 'and';

/**
 * Type guard for or nodes
 */
const isOrNode = (node: GateASTNode): node is Extract<GateASTNode, { type: 'or' }> =>
  node.type === 'or';

/**
 * Type guard for not nodes
 */
const isNotNode = (node: GateASTNode): node is Extract<GateASTNode, { type: 'not' }> =>
  node.type === 'not';

// =============================================================================
// Simple Check Nodes (6 tests)
// =============================================================================

describe('parser', () => {
  describe('parse', () => {
    describe('simple checks', () => {
      it('parses typecheck as check node', () => {
        const ast = parseString('typecheck');
        expect(ast.type).toBe('check');
        expect(isCheckNode(ast) && ast.checkType).toBe('typecheck');
      });

      it('parses tests as check node', () => {
        const ast = parseString('tests');
        expect(ast.type).toBe('check');
        expect(isCheckNode(ast) && ast.checkType).toBe('tests');
      });

      it('parses memory:PATTERN as check node with pattern', () => {
        const ast = parseString('memory:ANALYSIS_*');
        expect(ast.type).toBe('check');
        if (isCheckNode(ast)) {
          expect(ast.checkType).toBe('memory');
          expect(ast.pattern).toBe('ANALYSIS_*');
        }
      });

      it('parses traceability:field as check node with field', () => {
        const ast = parseString('traceability:implementation');
        expect(ast.type).toBe('check');
        if (isCheckNode(ast)) {
          expect(ast.checkType).toBe('traceability');
          expect(ast.field).toBe('implementation');
        }
      });

      it('parses evidence:CHAIN_ID as check node with pattern', () => {
        const ast = parseString('evidence:CHAIN_001');
        expect(ast.type).toBe('check');
        if (isCheckNode(ast)) {
          expect(ast.checkType).toBe('evidence');
          expect(ast.pattern).toBe('CHAIN_001');
        }
      });

      it('parses evidence:coverage as check node with field (shorthand)', () => {
        const ast = parseString('evidence:coverage');
        expect(ast.type).toBe('check');
        if (isCheckNode(ast)) {
          expect(ast.checkType).toBe('evidence');
          expect(ast.field).toBe('coverage');
        }
      });
    });

    // =============================================================================
    // Boolean Expression Nodes (8 tests)
    // =============================================================================

    describe('boolean expressions', () => {
      it('parses A AND B as and node with left/right', () => {
        const ast = parseString('typecheck AND tests');
        expect(ast.type).toBe('and');
        if (isAndNode(ast)) {
          expect(ast.left.type).toBe('check');
          expect(ast.right.type).toBe('check');
          expect(isCheckNode(ast.left) && ast.left.checkType).toBe('typecheck');
          expect(isCheckNode(ast.right) && ast.right.checkType).toBe('tests');
        }
      });

      it('parses A OR B as or node with left/right', () => {
        const ast = parseString('typecheck OR tests');
        expect(ast.type).toBe('or');
        if (isOrNode(ast)) {
          expect(ast.left.type).toBe('check');
          expect(ast.right.type).toBe('check');
          expect(isCheckNode(ast.left) && ast.left.checkType).toBe('typecheck');
          expect(isCheckNode(ast.right) && ast.right.checkType).toBe('tests');
        }
      });

      it('parses NOT A as not node with operand', () => {
        const ast = parseString('NOT typecheck');
        expect(ast.type).toBe('not');
        if (isNotNode(ast)) {
          expect(ast.operand.type).toBe('check');
          expect(isCheckNode(ast.operand) && ast.operand.checkType).toBe('typecheck');
        }
      });

      it('parses A AND B AND C as nested and nodes (left-associative)', () => {
        const ast = parseString('typecheck AND tests AND memory:FOO');
        // Should be ((typecheck AND tests) AND memory:FOO)
        expect(ast.type).toBe('and');
        if (isAndNode(ast)) {
          expect(ast.left.type).toBe('and'); // Nested and
          expect(ast.right.type).toBe('check');
          if (isCheckNode(ast.right)) {
            expect(ast.right.checkType).toBe('memory');
            expect(ast.right.pattern).toBe('FOO');
          }
        }
      });

      it('parses A OR B OR C as nested or nodes (left-associative)', () => {
        const ast = parseString('typecheck OR tests OR memory:BAR');
        // Should be ((typecheck OR tests) OR memory:BAR)
        expect(ast.type).toBe('or');
        if (isOrNode(ast)) {
          expect(ast.left.type).toBe('or'); // Nested or
          expect(ast.right.type).toBe('check');
          if (isCheckNode(ast.right)) {
            expect(ast.right.checkType).toBe('memory');
            expect(ast.right.pattern).toBe('BAR');
          }
        }
      });

      it('handles operator precedence: A AND B OR C groups as (A AND B) OR C', () => {
        const ast = parseString('typecheck AND tests OR memory:X');
        // Parser is left-associative, so: ((typecheck AND tests) OR memory:X)
        expect(ast.type).toBe('or');
        if (isOrNode(ast)) {
          expect(ast.left.type).toBe('and');
          expect(ast.right.type).toBe('check');
        }
      });

      it('handles parentheses: (A OR B) AND C', () => {
        const ast = parseString('(typecheck OR tests) AND memory:Y');
        expect(ast.type).toBe('and');
        if (isAndNode(ast)) {
          expect(ast.left.type).toBe('or');
          expect(ast.right.type).toBe('check');
          if (isOrNode(ast.left)) {
            expect(isCheckNode(ast.left.left) && ast.left.left.checkType).toBe('typecheck');
            expect(isCheckNode(ast.left.right) && ast.left.right.checkType).toBe('tests');
          }
        }
      });

      it('parses complex: NOT (A AND B)', () => {
        const ast = parseString('NOT (typecheck AND tests)');
        expect(ast.type).toBe('not');
        if (isNotNode(ast)) {
          expect(ast.operand.type).toBe('and');
          if (isAndNode(ast.operand)) {
            expect(isCheckNode(ast.operand.left) && ast.operand.left.checkType).toBe('typecheck');
            expect(isCheckNode(ast.operand.right) && ast.operand.right.checkType).toBe('tests');
          }
        }
      });
    });

    // =============================================================================
    // Threshold Expression Nodes (6 tests)
    // =============================================================================

    describe('threshold expressions', () => {
      it('parses tests[passed] >= 80 as threshold node', () => {
        const ast = parseString('tests[passed] >= 80');
        expect(ast.type).toBe('threshold');
        if (isThresholdNode(ast)) {
          expect(ast.checkType).toBe('tests');
          expect(ast.field).toBe('passed');
          expect(ast.operator).toBe('>=');
          expect(ast.value).toBe(80);
        }
      });

      it('parses evidence:coverage >= 50 as evidence threshold', () => {
        const ast = parseString('evidence:coverage >= 50');
        expect(ast.type).toBe('threshold');
        if (isThresholdNode(ast)) {
          expect(ast.checkType).toBe('evidence');
          expect(ast.field).toBe('coverage');
          expect(ast.operator).toBe('>=');
          expect(ast.value).toBe(50);
        }
      });

      it('parses threshold with > operator', () => {
        const ast = parseString('tests[count] > 5');
        expect(ast.type).toBe('threshold');
        if (isThresholdNode(ast)) {
          expect(ast.operator).toBe('>');
          expect(ast.value).toBe(5);
        }
      });

      it('parses threshold with < operator', () => {
        const ast = parseString('tests[failed] < 3');
        expect(ast.type).toBe('threshold');
        if (isThresholdNode(ast)) {
          expect(ast.operator).toBe('<');
          expect(ast.value).toBe(3);
        }
      });

      it('parses threshold with <= operator', () => {
        const ast = parseString('tests[errors] <= 0');
        expect(ast.type).toBe('threshold');
        if (isThresholdNode(ast)) {
          expect(ast.operator).toBe('<=');
          expect(ast.value).toBe(0);
        }
      });

      it('parses threshold with = operator', () => {
        const ast = parseString('tests[total] = 10');
        expect(ast.type).toBe('threshold');
        if (isThresholdNode(ast)) {
          expect(ast.operator).toBe('=');
          expect(ast.value).toBe(10);
        }
      });

      it('parses threshold with percent sign', () => {
        const ast = parseString('tests[passed] >= 75%');
        expect(ast.type).toBe('threshold');
        if (isThresholdNode(ast)) {
          expect(ast.value).toBe(75);
        }
      });

      it('parses coverage shorthand: coverage >= 75', () => {
        const ast = parseString('coverage >= 75');
        expect(ast.type).toBe('threshold');
        if (isThresholdNode(ast)) {
          expect(ast.checkType).toBe('evidence');
          expect(ast.field).toBe('coverage');
          expect(ast.operator).toBe('>=');
          expect(ast.value).toBe(75);
        }
      });
    });

    // =============================================================================
    // Error Cases (6 tests)
    // =============================================================================

    describe('error cases', () => {
      it('throws GateParseError for missing operand after AND', () => {
        expect(() => parseString('typecheck AND')).toThrow(GateParseError);
        expect(() => parseString('typecheck AND')).toThrow(/Expected check type/);
      });

      it('throws GateParseError for unclosed parenthesis', () => {
        expect(() => parseString('(typecheck AND tests')).toThrow(GateParseError);
        expect(() => parseString('(typecheck AND tests')).toThrow(/Expected 'RPAREN'/);
      });

      it('throws GateParseError for invalid check type', () => {
        expect(() => parseString('unknown_check')).toThrow(GateParseError);
        expect(() => parseString('unknown_check')).toThrow(/Unknown check type/);
      });

      it('throws GateParseError for unexpected token after expression', () => {
        expect(() => parseString('typecheck tests')).toThrow(GateParseError);
        expect(() => parseString('typecheck tests')).toThrow(/Unexpected token/);
      });

      it('throws GateParseError for empty input', () => {
        expect(() => parseString('')).toThrow(GateParseError);
      });

      it('throws GateParseError for malformed threshold syntax', () => {
        // Missing bracket
        expect(() => parseString('tests[passed >= 80')).toThrow(GateParseError);
        expect(() => parseString('tests[passed >= 80')).toThrow(/Expected 'RBRACKET'/);
      });
    });

    // =============================================================================
    // Complex Expressions (4 tests)
    // =============================================================================

    describe('complex expressions', () => {
      it('parses typecheck AND tests AND memory:ANALYSIS_*', () => {
        const ast = parseString('typecheck AND tests AND memory:ANALYSIS_*');
        expect(ast.type).toBe('and');
        if (isAndNode(ast)) {
          // Outer right should be memory check
          expect(isCheckNode(ast.right) && ast.right.checkType).toBe('memory');
          expect(isCheckNode(ast.right) && ast.right.pattern).toBe('ANALYSIS_*');
          // Outer left should be and node
          expect(ast.left.type).toBe('and');
        }
      });

      it('parses (typecheck OR tests) AND evidence:coverage >= 50', () => {
        const ast = parseString('(typecheck OR tests) AND evidence:coverage >= 50');
        expect(ast.type).toBe('and');
        if (isAndNode(ast)) {
          expect(ast.left.type).toBe('or');
          expect(ast.right.type).toBe('threshold');
          if (isThresholdNode(ast.right)) {
            expect(ast.right.checkType).toBe('evidence');
            expect(ast.right.field).toBe('coverage');
            expect(ast.right.value).toBe(50);
          }
        }
      });

      it('parses NOT memory:BLOCKED_* AND typecheck', () => {
        const ast = parseString('NOT memory:BLOCKED_* AND typecheck');
        // Should parse as (NOT memory:BLOCKED_*) AND typecheck
        expect(ast.type).toBe('and');
        if (isAndNode(ast)) {
          expect(ast.left.type).toBe('not');
          expect(ast.right.type).toBe('check');
          if (isNotNode(ast.left)) {
            expect(isCheckNode(ast.left.operand) && ast.left.operand.checkType).toBe('memory');
            expect(isCheckNode(ast.left.operand) && ast.left.operand.pattern).toBe('BLOCKED_*');
          }
        }
      });

      it('parses full DSL example: typecheck AND tests[passed] >= 80 AND memory:ANALYSIS_* AND evidence:coverage >= 50', () => {
        const ast = parseString(
          'typecheck AND tests[passed] >= 80 AND memory:ANALYSIS_* AND evidence:coverage >= 50'
        );
        // Result should be nested AND nodes
        expect(ast.type).toBe('and');

        // Walk through the nested structure
        let current: GateASTNode = ast;
        const checks: string[] = [];

        // Collect all rightmost nodes going down the left spine
        while (isAndNode(current)) {
          if (isCheckNode(current.right)) {
            checks.push(current.right.checkType);
          } else if (isThresholdNode(current.right)) {
            checks.push(`${current.right.checkType}[${current.right.field}]`);
          }
          current = current.left;
        }
        // Add the leftmost node
        if (isCheckNode(current)) {
          checks.push(current.checkType);
        } else if (isThresholdNode(current)) {
          checks.push(`${current.checkType}[${current.field}]`);
        }

        // Should have 4 checks total (collected in reverse)
        expect(checks).toHaveLength(4);
        expect(checks).toContain('typecheck');
        expect(checks).toContain('memory');
      });
    });

    // =============================================================================
    // Edge Cases and Additional Coverage (6 tests)
    // =============================================================================

    describe('edge cases', () => {
      it('handles case insensitivity for keywords: TypeCheck and TESTS', () => {
        const ast = parseString('TypeCheck AND TESTS');
        expect(ast.type).toBe('and');
        if (isAndNode(ast)) {
          expect(isCheckNode(ast.left) && ast.left.checkType).toBe('typecheck');
          expect(isCheckNode(ast.right) && ast.right.checkType).toBe('tests');
        }
      });

      it('does not support double NOT without parentheses (grammar limitation)', () => {
        // The grammar defines: term := 'NOT'? factor
        // This means NOT expects a factor (check or parenthesized expression), not another NOT
        // Double NOT requires parentheses: NOT (NOT typecheck)
        expect(() => parseString('NOT NOT typecheck')).toThrow(GateParseError);
        expect(() => parseString('NOT NOT typecheck')).toThrow(/Expected check type/);
      });

      it('handles double NOT with parentheses: NOT (NOT typecheck)', () => {
        const ast = parseString('NOT (NOT typecheck)');
        expect(ast.type).toBe('not');
        if (isNotNode(ast)) {
          expect(ast.operand.type).toBe('not');
          if (isNotNode(ast.operand)) {
            expect(isCheckNode(ast.operand.operand) && ast.operand.operand.checkType).toBe(
              'typecheck'
            );
          }
        }
      });

      it('handles deeply nested parentheses: (((typecheck)))', () => {
        const ast = parseString('(((typecheck)))');
        expect(ast.type).toBe('check');
        expect(isCheckNode(ast) && ast.checkType).toBe('typecheck');
      });

      it('handles evidence:CHAIN_ID exists syntax', () => {
        const ast = parseString('evidence:IMPL_001 exists');
        expect(ast.type).toBe('check');
        if (isCheckNode(ast)) {
          expect(ast.checkType).toBe('evidence');
          expect(ast.pattern).toBe('IMPL_001');
          expect(ast.field).toBe('exists');
        }
      });

      it('handles mixed AND/OR with parentheses: A AND (B OR C) AND D', () => {
        const ast = parseString('typecheck AND (tests OR memory:X) AND evidence:coverage');
        expect(ast.type).toBe('and');
        // Structure: ((typecheck AND (tests OR memory:X)) AND evidence:coverage)
        if (isAndNode(ast)) {
          expect(ast.right.type).toBe('check');
          expect(ast.left.type).toBe('and');
          if (isAndNode(ast.left)) {
            expect(ast.left.right.type).toBe('or');
          }
        }
      });

      it('parses traceability with underscore-separated fields', () => {
        const ast = parseString('traceability:analysis_implementation');
        expect(ast.type).toBe('check');
        if (isCheckNode(ast)) {
          expect(ast.checkType).toBe('traceability');
          expect(ast.field).toBe('analysis_implementation');
        }
      });
    });
  });
});
