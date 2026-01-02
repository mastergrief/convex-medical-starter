/**
 * @vitest-environment node
 */
/**
 * Lexer Unit Tests
 * Tests for tokenize() function in gateParserModules/lexer.ts
 */

import { describe, it, expect } from 'vitest';
import { tokenize } from '../../lib/gateParserModules/lexer.js';
import { GateParseError } from '../../lib/gateParserModules/types.js';

describe('lexer', () => {
  describe('tokenize', () => {
    // =========================================================================
    // Keyword Recognition (6 tests)
    // =========================================================================
    describe('keyword recognition', () => {
      it('tokenizes AND keyword (uppercase)', () => {
        const tokens = tokenize('AND');
        expect(tokens[0]).toMatchObject({ type: 'AND', value: 'AND', position: 0 });
        expect(tokens[1]).toMatchObject({ type: 'EOF' });
      });

      it('tokenizes AND keyword (lowercase)', () => {
        const tokens = tokenize('and');
        expect(tokens[0]).toMatchObject({ type: 'AND', value: 'and', position: 0 });
      });

      it('tokenizes OR keyword (case-insensitive)', () => {
        const tokens = tokenize('Or');
        expect(tokens[0]).toMatchObject({ type: 'OR', value: 'Or', position: 0 });
      });

      it('tokenizes NOT keyword', () => {
        const tokens = tokenize('NOT');
        expect(tokens[0]).toMatchObject({ type: 'NOT', value: 'NOT', position: 0 });
      });

      it('tokenizes exists as IDENTIFIER (special keyword)', () => {
        const tokens = tokenize('exists');
        expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'exists', position: 0 });
      });

      it('tokenizes mixed case keywords correctly', () => {
        const tokens = tokenize('AnD oR nOt');
        expect(tokens[0]).toMatchObject({ type: 'AND', value: 'AnD' });
        expect(tokens[1]).toMatchObject({ type: 'OR', value: 'oR' });
        expect(tokens[2]).toMatchObject({ type: 'NOT', value: 'nOt' });
      });
    });

    // =========================================================================
    // Operator Tokenization (6 tests)
    // =========================================================================
    describe('operator tokenization', () => {
      it('tokenizes greater than or equal operator', () => {
        const tokens = tokenize('>=');
        expect(tokens[0]).toMatchObject({ type: 'GTE', value: '>=', position: 0 });
      });

      it('tokenizes less than or equal operator', () => {
        const tokens = tokenize('<=');
        expect(tokens[0]).toMatchObject({ type: 'LTE', value: '<=', position: 0 });
      });

      it('tokenizes single-character comparison operators', () => {
        const tokens = tokenize('> < =');
        expect(tokens[0]).toMatchObject({ type: 'GT', value: '>', position: 0 });
        expect(tokens[1]).toMatchObject({ type: 'LT', value: '<', position: 2 });
        expect(tokens[2]).toMatchObject({ type: 'EQ', value: '=', position: 4 });
      });

      it('tokenizes parentheses', () => {
        const tokens = tokenize('()');
        expect(tokens[0]).toMatchObject({ type: 'LPAREN', value: '(', position: 0 });
        expect(tokens[1]).toMatchObject({ type: 'RPAREN', value: ')', position: 1 });
      });

      it('tokenizes brackets', () => {
        const tokens = tokenize('[]');
        expect(tokens[0]).toMatchObject({ type: 'LBRACKET', value: '[', position: 0 });
        expect(tokens[1]).toMatchObject({ type: 'RBRACKET', value: ']', position: 1 });
      });

      it('tokenizes colon delimiter', () => {
        const tokens = tokenize(':');
        expect(tokens[0]).toMatchObject({ type: 'COLON', value: ':', position: 0 });
      });
    });

    // =========================================================================
    // Identifier & Pattern Detection (5 tests)
    // =========================================================================
    describe('identifier and pattern detection', () => {
      it('tokenizes simple identifiers', () => {
        const tokens = tokenize('typecheck');
        expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'typecheck', position: 0 });
      });

      it('tokenizes identifiers with underscores and hyphens', () => {
        const tokens = tokenize('task_complete test-runner');
        expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'task_complete', position: 0 });
        expect(tokens[1]).toMatchObject({ type: 'IDENTIFIER', value: 'test-runner', position: 14 });
      });

      it('tokenizes patterns with trailing wildcard', () => {
        const tokens = tokenize('ANALYSIS_*');
        expect(tokens[0]).toMatchObject({ type: 'PATTERN', value: 'ANALYSIS_*', position: 0 });
      });

      it('throws error for patterns with leading wildcard (not supported)', () => {
        // Lexer requires identifiers/patterns to start with a letter or underscore
        expect(() => tokenize('*_COMPLETE')).toThrow(GateParseError);
        expect(() => tokenize('*_COMPLETE')).toThrow(/Unexpected character '\*'/);
      });

      it('tokenizes colon-separated expressions', () => {
        const tokens = tokenize('memory:PATTERN');
        expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'memory', position: 0 });
        expect(tokens[1]).toMatchObject({ type: 'COLON', value: ':', position: 6 });
        expect(tokens[2]).toMatchObject({ type: 'IDENTIFIER', value: 'PATTERN', position: 7 });
      });
    });

    // =========================================================================
    // Number Tokenization (3 tests)
    // =========================================================================
    describe('number tokenization', () => {
      it('tokenizes single digit numbers', () => {
        const tokens = tokenize('5');
        expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '5', position: 0 });
      });

      it('tokenizes multi-digit numbers', () => {
        const tokens = tokenize('100');
        expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '100', position: 0 });
      });

      it('tokenizes numbers with percent sign', () => {
        const tokens = tokenize('80%');
        expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '80', position: 0 });
        expect(tokens[1]).toMatchObject({ type: 'PERCENT', value: '%', position: 2 });
      });
    });

    // =========================================================================
    // Whitespace Handling (2 tests)
    // =========================================================================
    describe('whitespace handling', () => {
      it('skips single spaces between tokens', () => {
        const tokens = tokenize('a b');
        expect(tokens).toHaveLength(3); // a, b, EOF
        expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'a', position: 0 });
        expect(tokens[1]).toMatchObject({ type: 'IDENTIFIER', value: 'b', position: 2 });
      });

      it('skips multiple spaces and different whitespace types', () => {
        const tokens = tokenize('a    b\tc\nd');
        expect(tokens).toHaveLength(5); // a, b, c, d, EOF
        expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'a' });
        expect(tokens[1]).toMatchObject({ type: 'IDENTIFIER', value: 'b' });
        expect(tokens[2]).toMatchObject({ type: 'IDENTIFIER', value: 'c' });
        expect(tokens[3]).toMatchObject({ type: 'IDENTIFIER', value: 'd' });
      });
    });

    // =========================================================================
    // Edge Cases & Errors (3 tests)
    // =========================================================================
    describe('edge cases and errors', () => {
      it('returns only EOF for empty input', () => {
        const tokens = tokenize('');
        expect(tokens).toHaveLength(1);
        expect(tokens[0]).toMatchObject({ type: 'EOF', value: '', position: 0 });
      });

      it('throws GateParseError for unknown character', () => {
        expect(() => tokenize('@')).toThrow(GateParseError);
        expect(() => tokenize('@')).toThrow(/Unexpected character '@'/);
      });

      it('includes position information in error', () => {
        try {
          tokenize('abc @');
          expect.fail('Should have thrown GateParseError');
        } catch (error) {
          expect(error).toBeInstanceOf(GateParseError);
          const parseError = error as GateParseError;
          expect(parseError.position).toBe(4);
          expect(parseError.found).toBe('@');
        }
      });
    });

    // =========================================================================
    // Complex Expressions (additional coverage)
    // =========================================================================
    describe('complex expressions', () => {
      it('tokenizes a complete gate condition', () => {
        const tokens = tokenize('typecheck AND memory:ANALYSIS_* >= 1');
        expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'typecheck' });
        expect(tokens[1]).toMatchObject({ type: 'AND', value: 'AND' });
        expect(tokens[2]).toMatchObject({ type: 'IDENTIFIER', value: 'memory' });
        expect(tokens[3]).toMatchObject({ type: 'COLON', value: ':' });
        expect(tokens[4]).toMatchObject({ type: 'PATTERN', value: 'ANALYSIS_*' });
        expect(tokens[5]).toMatchObject({ type: 'GTE', value: '>=' });
        expect(tokens[6]).toMatchObject({ type: 'NUMBER', value: '1' });
        expect(tokens[7]).toMatchObject({ type: 'EOF' });
      });

      it('tokenizes nested parentheses expression', () => {
        const tokens = tokenize('(a OR b) AND (c OR d)');
        expect(tokens.filter(t => t.type === 'LPAREN')).toHaveLength(2);
        expect(tokens.filter(t => t.type === 'RPAREN')).toHaveLength(2);
        expect(tokens.filter(t => t.type === 'OR')).toHaveLength(2);
        expect(tokens.filter(t => t.type === 'AND')).toHaveLength(1);
      });

      it('tokenizes bracket expression with percentage', () => {
        const tokens = tokenize('coverage[80%]');
        expect(tokens[0]).toMatchObject({ type: 'IDENTIFIER', value: 'coverage' });
        expect(tokens[1]).toMatchObject({ type: 'LBRACKET', value: '[' });
        expect(tokens[2]).toMatchObject({ type: 'NUMBER', value: '80' });
        expect(tokens[3]).toMatchObject({ type: 'PERCENT', value: '%' });
        expect(tokens[4]).toMatchObject({ type: 'RBRACKET', value: ']' });
      });

      it('tokenizes NOT expression', () => {
        const tokens = tokenize('NOT failed');
        expect(tokens[0]).toMatchObject({ type: 'NOT', value: 'NOT', position: 0 });
        expect(tokens[1]).toMatchObject({ type: 'IDENTIFIER', value: 'failed', position: 4 });
      });

      it('tracks positions correctly across the entire input', () => {
        const tokens = tokenize('a >= 10');
        expect(tokens[0].position).toBe(0); // 'a'
        expect(tokens[1].position).toBe(2); // '>='
        expect(tokens[2].position).toBe(5); // '10'
      });
    });
  });
});
