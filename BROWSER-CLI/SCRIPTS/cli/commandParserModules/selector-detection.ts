/**
 * Selector detection utilities for command parsing
 */

/**
 * Check if a selector is a ref (e.g., e123 or --ref=e123)
 */
export function isRef(selector: string): boolean {
  return /^e\d+$/.test(selector) || selector.startsWith('--ref=');
}

/**
 * Extract ref value from selector
 */
export function extractRef(selector: string): string {
  return selector.startsWith('--ref=') ? selector.split('=')[1] : selector;
}

/**
 * Check if a selector is a semantic selector (role:, text:, label:, placeholder:)
 */
export function isSemantic(selector: string): boolean {
  return selector.includes(':') && (
    selector.startsWith('role:') ||
    selector.startsWith('text:') ||
    selector.startsWith('label:') ||
    selector.startsWith('placeholder:')
  );
}

/**
 * Check if a selector is semantic for type command (excludes text:)
 */
export function isSemanticForType(selector: string): boolean {
  return selector.includes(':') && (
    selector.startsWith('role:') ||
    selector.startsWith('label:') ||
    selector.startsWith('placeholder:')
  );
}
