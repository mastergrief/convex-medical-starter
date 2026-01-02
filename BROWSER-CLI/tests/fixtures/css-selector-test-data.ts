/**
 * CSS Selector Escape Test Data
 * Patterns that require proper CSS escaping
 */

// Tailwind and special character patterns that need escaping
export const PROBLEMATIC_PATTERNS = {
  // Tailwind peer/group modifiers
  peerModifier: 'peer/menu-button',
  groupModifier: 'group/sidebar-wrapper',

  // Arbitrary values with brackets
  arbitraryValue: 'w-[var(--sidebar-width)]',
  calcExpression: 'left-[calc(100%-2rem)]',

  // Data attribute modifiers
  groupData: 'group-data-[collapsible=icon]',
  doubleBracket: '[[data-side=left]_&]',

  // Container queries
  containerQuery: '@container/card-header',

  // Special characters in attribute values
  quoteInAttr: 'form"submit',
  singleQuote: "it's-here",
  backslash: 'btn\\escape',
  closingBracket: 'test]bracket',

  // Edge cases
  colonInId: 'modal:open',
  leadingDigit: '123-button',
  unicode: 'button-\u4e2d\u6587',
  emptyString: '',
};

// Expected CSS.escape() outputs for class selectors
export const EXPECTED_CLASS_ESCAPES = {
  peerModifier: 'peer\\/menu-button',
  groupModifier: 'group\\/sidebar-wrapper',
  arbitraryValue: 'w-\\[var\\(--sidebar-width\\)\\]',
  calcExpression: 'left-\\[calc\\(100\\%-2rem\\)\\]',
  groupData: 'group-data-\\[collapsible\\=icon\\]',
  doubleBracket: '\\[\\[data-side\\=left\\]_\\&\\]',
  containerQuery: '\\@container\\/card-header',
};

// Expected CSS.escape() outputs for attribute values
export const EXPECTED_ATTR_ESCAPES = {
  quoteInAttr: 'form\\"submit',
  singleQuote: "it\\'s-here",
  backslash: 'btn\\\\escape',
  closingBracket: 'test\\]bracket',
};

// Expected CSS.escape() outputs for ID selectors
export const EXPECTED_ID_ESCAPES = {
  colonInId: 'modal\\:open',
  leadingDigit: '\\31 23-button', // CSS escapes leading digits
};
