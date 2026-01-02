/**
 * Snapshot Capture Module
 * Core snapshot capture logic including ref generation and CSS selectors
 */

import type { Page } from 'playwright';
import type { RefData, LogFn } from './types';

/**
 * Context for capture operations containing mutable state
 */
import type { RefLifecycle } from './ref-version';

export interface CaptureContext {
  page: Page;
  refMap: Map<string, RefData>;
  refCounter: { value: number };
  log: LogFn;
}

/**
 * Builds a fallback snapshot when ariaSnapshot() fails
 * Common with Radix Dialog portals
 * @param page - Playwright page object
 * @returns Fallback snapshot string
 */
export async function buildFallbackSnapshot(page: Page): Promise<string> {
  try {
    const result = await page.evaluate('(function() { return "- document [FALLBACK]\\n  - dialog present"; })()');
    return (result as string) || '- document [FALLBACK EMPTY]';
  } catch (outerError: any) {
    return '- document [FALLBACK ERROR: ' + (outerError.message || 'unknown') + ']';
  }
}

/**
 * Adds [ref=eXXX] tags to interactive elements in the snapshot
 * Also assigns sub-refs (eXXXa/b/c) to important children
 * @param snapshot - Raw accessibility tree snapshot
 * @param refMap - Map to store ref data (mutated)
 * @param counter - Counter object for ref IDs (mutated)
 * @returns Snapshot with refs added
 */
export function addRefsToSnapshot(
  snapshot: string,
  refMap: Map<string, RefData>,
  counter: { value: number },
  lifecycle?: RefLifecycle
): string {
  // Reset ref counter and map for new snapshot
  counter.value = 0;
  refMap.clear();

  // Track indices per role type for reliable element location
  const roleIndexCounters = new Map<string, number>();

  // Add [ref=eXXX] to interactive elements and [ref=eXXXa/b/c] to important children
  const lines = snapshot.split('\n');
  const processedLines: string[] = [];
  let currentParentRef: string | null = null;
  let currentIndentLevel = 0;
  const childRefCounters = new Map<string, number>(); // Track child counters per parent

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Calculate indent level (number of leading spaces)
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;

    // Match lines with interactive elements (buttons, links, inputs, etc.)
    const interactivePattern = /^(\s*-\s+)(button|link|textbox|checkbox|radio|combobox|slider|menuitem|tab|option)(\s+.*)?$/i;
    const interactiveMatch = line.match(interactivePattern);

    if (interactiveMatch) {
      // This is a parent interactive element
      const ref = `e${++counter.value}`;
      const role = interactiveMatch[2].toLowerCase();

      // Extract name if present (e.g., "Submit" from 'button "Submit"')
      const nameMatch = (interactiveMatch[3] || '').match(/^\s+"([^"]+)"/);
      const name = nameMatch ? nameMatch[1] : undefined;

      // Track role index (how many of this role type we've seen)
      const roleIndex = roleIndexCounters.get(role) || 0;
      roleIndexCounters.set(role, roleIndex + 1);

      // Store RefData with role info and lifecycle data
      refMap.set(ref, {
        roleSelector: line.trim(),
        role,
        name,
        roleIndex,
        snapshotId: lifecycle?.snapshotId,
        generatedAt: lifecycle?.generatedAt,
        cssValidated: lifecycle?.cssValidated ?? false,
      });

      processedLines.push(`${interactiveMatch[1]}${interactiveMatch[2]}${interactiveMatch[3] || ''} [ref=${ref}]`);

      // Track this as current parent for child elements
      currentParentRef = ref;
      currentIndentLevel = indent;
      childRefCounters.set(ref, 0);
    } else {
      // Check if this is a child element of an interactive parent
      const childPattern = /^(\s*-\s+)(generic|group|img|paragraph|text|heading)(\s+.*)?$/i;
      const childMatch = line.match(childPattern);

      if (childMatch && currentParentRef && indent > currentIndentLevel) {
        // This is a child element - assign sub-ref
        const childType = childMatch[2].toLowerCase();

        // Only assign refs to semantically important children (img, paragraph, etc.)
        if (['img', 'paragraph', 'heading', 'generic'].includes(childType)) {
          const childCounter = childRefCounters.get(currentParentRef) || 0;
          const childSuffix = String.fromCharCode(97 + childCounter); // 'a', 'b', 'c', etc.
          const childRef = `${currentParentRef}${childSuffix}`;

          // Store child ref with parent reference and lifecycle data
          refMap.set(childRef, {
            roleSelector: `${currentParentRef}:child:${line.trim()}`,
            role: childType,
            roleIndex: childCounter,
            snapshotId: lifecycle?.snapshotId,
            generatedAt: lifecycle?.generatedAt,
            cssValidated: lifecycle?.cssValidated ?? false,
          });
          processedLines.push(`${childMatch[1]}${childMatch[2]}${childMatch[3] || ''} [ref=${childRef}]`);

          childRefCounters.set(currentParentRef, childCounter + 1);
        } else {
          // Not a ref-worthy child, keep as-is
          processedLines.push(line);
        }
      } else {
        // Not a child of current parent or not a child pattern
        if (indent <= currentIndentLevel) {
          // Reset parent tracking when we exit the indent level
          currentParentRef = null;
        }
        processedLines.push(line);
      }
    }
  }

  return processedLines.join('\n');
}

/**
 * Captures CSS selectors and element state for all refs in the refMap
 * @param page - Playwright page object
 * @param refMap - Map of refs to update with CSS selectors and state
 * @param log - Logging function
 */
export async function captureCssSelectors(
  page: Page,
  refMap: Map<string, RefData>,
  log: LogFn
): Promise<void> {
  // Get CSS selectors AND element state for all interactive elements from the DOM
  const elementData = await page.evaluate(() => {
    const roles = ['button', 'link', 'textbox', 'checkbox', 'radio', 'combobox', 'slider', 'menuitem', 'tab', 'option'];
    const results: Array<{
      role: string;
      name: string | null;
      index: number;
      cssSelector: string;
      cssValidated: boolean;
      // Phase 1: Element State
      state: 'enabled' | 'disabled' | 'readonly' | 'loading';
      visible: boolean;
      value?: string;
      placeholder?: string;
      checked?: boolean;
      required?: boolean;
      validationError?: string;
      options?: string[];
      selectedOption?: string;
      expanded?: boolean;
    }> = [];

    // Process each role type
    for (const role of roles) {
      const selector = role === 'textbox' ? 'input, textarea, [role="textbox"]' :
                      role === 'link' ? 'a, [role="link"]' :
                      role === 'button' ? 'button, [role="button"]' :
                      role === 'checkbox' ? 'input[type="checkbox"], [role="checkbox"]' :
                      role === 'radio' ? 'input[type="radio"], [role="radio"]' :
                      role === 'combobox' ? 'select, [role="combobox"]' :
                      `[role="${role}"]`;

      const elements = document.querySelectorAll(selector);
      let roleIndex = 0;

      elements.forEach((el) => {
        const htmlEl = el as HTMLInputElement | HTMLSelectElement | HTMLButtonElement;

        // Get accessible name
        const name = el.getAttribute('aria-label') ||
                    el.textContent?.trim().substring(0, 100) ||
                    null;

        // Generate CSS selector inline with proper escaping
        let cssSelector = '';
        let cssValidated = false;

        if (el.hasAttribute('data-testid')) {
          const testId = el.getAttribute('data-testid')!;
          cssSelector = `[data-testid="${CSS.escape(testId)}"]`;
          cssValidated = true;
        } else if (el.hasAttribute('data-date')) {
          const parentHasDate = el.parentElement?.hasAttribute('data-date');
          if (parentHasDate) {
            const parentDate = el.parentElement!.getAttribute('data-date')!;
            cssSelector = `[data-date="${CSS.escape(parentDate)}"] ${el.tagName.toLowerCase()}`;
          } else {
            const date = el.getAttribute('data-date')!;
            cssSelector = `[data-date="${CSS.escape(date)}"]`;
          }
          cssValidated = true;
        } else if (el.hasAttribute('aria-label')) {
          const label = el.getAttribute('aria-label')!;
          cssSelector = `[aria-label="${CSS.escape(label)}"]`;
          cssValidated = true;
        } else if (el.id) {
          cssSelector = `#${CSS.escape(el.id)}`;
          cssValidated = true;
        } else if (el.classList.length > 0) {
          // Escape ALL class names (handles Tailwind peer/, group/, [var(...)], @container, etc.)
          const escapedClasses = Array.from(el.classList).map(c => CSS.escape(c));
          if (escapedClasses.length > 0) {
            cssSelector = `${el.tagName.toLowerCase()}.${escapedClasses.join('.')}`;
            cssValidated = true;
          } else {
            cssSelector = el.tagName.toLowerCase();
          }
        } else {
          cssSelector = el.tagName.toLowerCase();
        }

        // Get element state inline
        let state: 'enabled' | 'disabled' | 'readonly' | 'loading' = 'enabled';
        if ((htmlEl as any).disabled) state = 'disabled';
        else if ((htmlEl as HTMLInputElement).readOnly) state = 'readonly';
        else if (el.getAttribute('aria-busy') === 'true' || el.classList.contains('loading')) state = 'loading';

        // Check visibility inline
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        const visible = rect.width > 0 && rect.height > 0 &&
                       style.visibility !== 'hidden' &&
                       style.display !== 'none' &&
                       style.opacity !== '0';

        // Get validation error inline
        let validationError: string | undefined;
        const inputEl = el as HTMLInputElement;
        if (inputEl.validity && !inputEl.validity.valid) {
          validationError = inputEl.validationMessage || 'Invalid';
        } else if (el.getAttribute('aria-invalid') === 'true') {
          const errorId = el.getAttribute('aria-describedby');
          if (errorId) {
            const errorEl = document.getElementById(errorId);
            if (errorEl) validationError = errorEl.textContent?.trim();
          }
          if (!validationError) validationError = 'Invalid';
        }

        // Build result
        const result: typeof results[0] = {
          role,
          name,
          index: roleIndex++,
          cssSelector,
          cssValidated,
          state,
          visible,
        };

        // Add input-specific properties
        if (role === 'textbox' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          result.value = htmlEl.value || undefined;
          result.placeholder = (htmlEl as HTMLInputElement).placeholder || undefined;
          result.required = (htmlEl as HTMLInputElement).required || undefined;
          result.validationError = validationError;
        }

        // Add checkbox/radio properties
        if (role === 'checkbox' || role === 'radio') {
          result.checked = (htmlEl as HTMLInputElement).checked;
        }

        // Add select/combobox properties
        if (role === 'combobox' || el.tagName === 'SELECT') {
          const selectEl = el as HTMLSelectElement;
          result.options = Array.from(selectEl.options).map(opt => opt.text).slice(0, 10);
          result.selectedOption = selectEl.options[selectEl.selectedIndex]?.text;
          result.expanded = el.getAttribute('aria-expanded') === 'true';
        }

        results.push(result);
      });
    }

    return results;
  });

  // Match DOM elements to refMap entries
  // Priority: 1) role + name (most reliable), 2) role + index (fallback)
  for (const [ref, refData] of refMap.entries()) {
    // Skip child refs (they have ':child:' in roleSelector)
    if (refData.roleSelector.includes(':child:')) continue;

    // Find matching element from DOM query
    let match = null;

    // Priority 1: Match by role + name (more reliable than index)
    if (refData.name) {
      match = elementData.find(
        el => el.role === refData.role && el.name === refData.name
      );
    }

    // Priority 2: Fallback to role + index if no name match
    if (!match) {
      match = elementData.find(
        el => el.role === refData.role && el.index === refData.roleIndex
      );
    }

    if (match) {
      refData.cssSelector = match.cssSelector;
      refData.cssValidated = match.cssValidated;
      // Phase 1: Add state info to refData
      refData.state = match.state;
      refData.visible = match.visible;
      refData.value = match.value;
      refData.placeholder = match.placeholder;
      refData.checked = match.checked;
      refData.required = match.required;
      refData.validationError = match.validationError;
      refData.options = match.options;
      refData.selectedOption = match.selectedOption;
      refData.expanded = match.expanded;
    }
  }
}
