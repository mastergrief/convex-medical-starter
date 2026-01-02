/**
 * CSS Selector Escape Tests
 * Validates proper escaping of special characters in CSS selectors
 */

import { describe, it, expect, beforeAll } from 'vitest';
// @ts-expect-error - css.escape has no types but is widely used
import cssEscape from 'css.escape';

import {
  PROBLEMATIC_PATTERNS,
  EXPECTED_CLASS_ESCAPES,
  EXPECTED_ATTR_ESCAPES,
  EXPECTED_ID_ESCAPES,
} from '../fixtures/css-selector-test-data';

// Setup CSS.escape polyfill for Node.js environment
beforeAll(() => {
  if (typeof globalThis.CSS === 'undefined') {
    (globalThis as { CSS?: { escape: (str: string) => string } }).CSS = {
      escape: cssEscape,
    };
  }
});

describe('CSS Selector Escaping', () => {
  describe('CSS.escape() for Tailwind patterns', () => {
    it('escapes peer/ modifier', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.peerModifier);
      expect(escaped).toBe(EXPECTED_CLASS_ESCAPES.peerModifier);
    });

    it('escapes group/ modifier', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.groupModifier);
      expect(escaped).toBe(EXPECTED_CLASS_ESCAPES.groupModifier);
    });

    it('escapes [var(...)] arbitrary values', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.arbitraryValue);
      expect(escaped).toBe(EXPECTED_CLASS_ESCAPES.arbitraryValue);
    });

    it('escapes [calc(...)] expressions', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.calcExpression);
      expect(escaped).toBe(EXPECTED_CLASS_ESCAPES.calcExpression);
    });

    it('escapes group-data-[...] patterns', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.groupData);
      expect(escaped).toBe(EXPECTED_CLASS_ESCAPES.groupData);
    });

    it('escapes [[...]] double brackets', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.doubleBracket);
      expect(escaped).toBe(EXPECTED_CLASS_ESCAPES.doubleBracket);
    });

    it('escapes @container/ patterns', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.containerQuery);
      expect(escaped).toBe(EXPECTED_CLASS_ESCAPES.containerQuery);
    });
  });

  describe('CSS.escape() for attribute values', () => {
    it('escapes double quotes in attribute value', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.quoteInAttr);
      expect(escaped).toBe(EXPECTED_ATTR_ESCAPES.quoteInAttr);
    });

    it('escapes single quotes in attribute value', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.singleQuote);
      expect(escaped).toBe(EXPECTED_ATTR_ESCAPES.singleQuote);
    });

    it('escapes backslashes', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.backslash);
      expect(escaped).toBe(EXPECTED_ATTR_ESCAPES.backslash);
    });

    it('escapes closing brackets', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.closingBracket);
      expect(escaped).toBe(EXPECTED_ATTR_ESCAPES.closingBracket);
    });
  });

  describe('CSS.escape() for ID selectors', () => {
    it('escapes colons in ID', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.colonInId);
      expect(escaped).toBe(EXPECTED_ID_ESCAPES.colonInId);
    });

    it('escapes leading digits in ID', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.leadingDigit);
      expect(escaped).toBe(EXPECTED_ID_ESCAPES.leadingDigit);
    });
  });

  describe('Edge cases', () => {
    it('handles empty string', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.emptyString);
      expect(escaped).toBe('');
    });

    it('handles unicode characters without escaping', () => {
      const escaped = CSS.escape(PROBLEMATIC_PATTERNS.unicode);
      // Unicode chars pass through unescaped in CSS.escape
      expect(escaped).toBe('button-\u4e2d\u6587');
    });

    it('handles very long class names', () => {
      const longClass = 'a'.repeat(1000);
      const escaped = CSS.escape(longClass);
      expect(escaped).toBe(longClass);
      expect(escaped.length).toBe(1000);
    });

    it('handles null/undefined safely via String coercion', () => {
      // CSS.escape coerces to string, so null becomes "null"
      expect(CSS.escape(null as unknown as string)).toBe('null');
      expect(CSS.escape(undefined as unknown as string)).toBe('undefined');
    });
  });

  describe('Generated CSS selector validity', () => {
    it('generates valid class selector from peer/menu-button', () => {
      const className = PROBLEMATIC_PATTERNS.peerModifier;
      const escaped = CSS.escape(className);
      const selector = `.${escaped}`;

      // Verify escaped selector matches expected format
      expect(selector).toBe('.peer\\/menu-button');
      // Verify the slash is properly escaped with backslash
      expect(escaped).toContain('\\/');
    });

    it('generates valid attribute selector from quoted value', () => {
      const value = PROBLEMATIC_PATTERNS.quoteInAttr;
      const escaped = CSS.escape(value);
      const selector = `[data-testid="${escaped}"]`;

      // Verify escaped selector properly escapes the quote
      expect(selector).toContain('\\"');
      expect(selector).toBe('[data-testid="form\\"submit"]');
    });

    it('generates valid ID selector from colon ID', () => {
      const id = PROBLEMATIC_PATTERNS.colonInId;
      const escaped = CSS.escape(id);
      const selector = `#${escaped}`;

      // Verify the colon is properly escaped
      expect(selector).toBe('#modal\\:open');
      expect(selector).not.toMatch(/[^\\]:/); // no unescaped colons
    });

    it('generates valid class selector from arbitrary value', () => {
      const className = PROBLEMATIC_PATTERNS.arbitraryValue;
      const escaped = CSS.escape(className);
      const selector = `.${escaped}`;

      // Verify brackets and special chars are escaped
      expect(selector).toBe('.w-\\[var\\(--sidebar-width\\)\\]');
      expect(selector).not.toMatch(/[^\\]\[/); // no unescaped opening brackets
      expect(selector).not.toMatch(/[^\\]\]/); // no unescaped closing brackets
    });

    it('generates valid class selector from container query pattern', () => {
      const className = PROBLEMATIC_PATTERNS.containerQuery;
      const escaped = CSS.escape(className);
      const selector = `.${escaped}`;

      // Verify @ and / are escaped
      expect(selector).toBe('.\\@container\\/card-header');
      expect(selector).not.toMatch(/[^\\]@/); // no unescaped @
    });
  });

  describe('Selector construction patterns', () => {
    it('properly escapes for data-testid selectors', () => {
      const testId = 'submit-form';
      const escaped = CSS.escape(testId);
      const selector = `[data-testid="${escaped}"]`;
      expect(selector).toBe('[data-testid="submit-form"]');
    });

    it('properly escapes for data-date selectors with leading digit', () => {
      const dateValue = '2025-12-30';
      const escaped = CSS.escape(dateValue);
      const selector = `[data-date="${escaped}"]`;
      // CSS.escape escapes leading digits with \3X format followed by space
      // "2" becomes "\32 " (hex 32 = ASCII 50 = char '2')
      expect(selector).toBe('[data-date="\\32 025-12-30"]');
    });

    it('properly escapes for aria-label with special chars', () => {
      const label = 'Close "dialog"';
      const escaped = CSS.escape(label);
      const selector = `[aria-label="${escaped}"]`;
      // CSS.escape escapes spaces with backslash and quotes with backslash
      expect(selector).toBe('[aria-label="Close\\ \\"dialog\\""]');
    });

    it('properly escapes for combined class selectors', () => {
      const class1 = 'peer/menu-button';
      const class2 = 'group-data-[collapsible=icon]';
      const selector = `.${CSS.escape(class1)}.${CSS.escape(class2)}`;
      expect(selector).toBe('.peer\\/menu-button.group-data-\\[collapsible\\=icon\\]');
    });
  });
});
