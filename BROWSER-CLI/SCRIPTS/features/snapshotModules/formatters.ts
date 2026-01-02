/**
 * Snapshot Formatters Module
 * Output formatting for different snapshot modes
 */

import type { RefData, FormAnalysis } from './types';

/**
 * Formats enhanced refs showing element state groupings
 * @param refMap - Map of element refs to their data
 * @returns Formatted string showing state groups
 */
export function formatEnhancedRefs(refMap: Map<string, RefData>): string {
  let output = '';
  const stateGroups = {
    disabled: [] as string[],
    readonly: [] as string[],
    invalid: [] as string[],
    withValue: [] as string[]
  };

  for (const [ref, data] of refMap.entries()) {
    if (data.state === 'disabled') {
      stateGroups.disabled.push(`[${ref}] ${data.name || data.role}`);
    }
    if (data.state === 'readonly') {
      stateGroups.readonly.push(`[${ref}] ${data.name || data.role}`);
    }
    if (data.validationError) {
      stateGroups.invalid.push(`[${ref}] ${data.name || data.role}: ${data.validationError}`);
    }
    if (data.value) {
      stateGroups.withValue.push(`[${ref}] ${data.name || data.role} = "${data.value.substring(0, 30)}${data.value.length > 30 ? '...' : ''}"`);
    }
  }

  if (stateGroups.disabled.length > 0) {
    output += `Disabled (${stateGroups.disabled.length}): ${stateGroups.disabled.join(', ')}\n`;
  }
  if (stateGroups.readonly.length > 0) {
    output += `Readonly (${stateGroups.readonly.length}): ${stateGroups.readonly.join(', ')}\n`;
  }
  if (stateGroups.invalid.length > 0) {
    output += `Invalid (${stateGroups.invalid.length}):\n${stateGroups.invalid.map(s => `  ${s}`).join('\n')}\n`;
  }
  if (stateGroups.withValue.length > 0) {
    output += `With Values (${stateGroups.withValue.length}):\n${stateGroups.withValue.map(s => `  ${s}`).join('\n')}\n`;
  }

  if (output === '') {
    output = 'All elements enabled, no values captured\n';
  }

  return output;
}

/**
 * Formats a minimal snapshot output
 * @param snapshot - Raw accessibility tree snapshot
 * @param refCount - Number of refs generated
 * @param fallbackUsed - Whether fallback mode was used
 * @returns Formatted minimal response data
 */
export function formatMinimalOutput(
  snapshot: string,
  refCount: number,
  fallbackUsed: boolean
): { snapshot: string; refCount: number; fallbackUsed: boolean } {
  return { snapshot, refCount, fallbackUsed };
}

/**
 * Formats full enhanced snapshot output with state and forms
 * @param snapshot - Raw accessibility tree snapshot with refs
 * @param refCount - Number of refs generated
 * @param refMap - Map of element refs to their data
 * @param formAnalysis - Form analysis results
 * @param fallbackUsed - Whether fallback mode was used
 * @param showFull - Whether to show full output including tree
 * @returns Formatted enhanced response data
 */
export function formatEnhancedOutput(
  snapshot: string,
  refCount: number,
  refMap: Map<string, RefData>,
  formAnalysis: FormAnalysis,
  fallbackUsed: boolean,
  showFull: boolean
): {
  snapshot: string;
  refCount: number;
  forms: FormAnalysis['forms'];
  enhancedRefs: Record<string, RefData>;
  fallbackUsed: boolean;
} {
  const enhancedRefs = formatEnhancedRefs(refMap);

  let output = '';

  if (showFull) {
    output += '=== SNAPSHOT+ ===\n\n';
    if (fallbackUsed) {
      output += '⚠️ FALLBACK MODE (ariaSnapshot unavailable)\n\n';
    }

    // Element state summary
    output += '📊 ELEMENT STATE\n';
    output += enhancedRefs + '\n\n';
  }

  // Form analysis (always included for --full or --forms)
  output += '📋 FORMS\n';
  if (formAnalysis.forms.length === 0) {
    output += 'No forms detected on page\n';
  } else {
    output += formAnalysis.formatted + '\n';
  }

  if (showFull) {
    output += '\n📄 ACCESSIBILITY TREE\n';
    output += snapshot;
  }

  return {
    snapshot: output,
    refCount,
    forms: formAnalysis.forms,
    enhancedRefs: Object.fromEntries(refMap),
    fallbackUsed
  };
}
