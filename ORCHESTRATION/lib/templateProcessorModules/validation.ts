/**
 * Template Validation Functions
 *
 * Validation logic for templates including:
 * - Structure validation
 * - Circular dependency detection
 * - Variable usage validation
 */

import type { SessionTemplate } from "./schemas.js";
import type { ValidationResult } from "./types.js";

// =============================================================================
// Variable Extraction
// =============================================================================

/**
 * Extract all variable references from a template
 */
export function extractVariables(template: SessionTemplate): Set<string> {
  const variables = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;

  // Check all text fields for variables
  const textFields: string[] = [
    template.description,
    ...template.phases.flatMap((phase) => [
      phase.name,
      phase.description ?? "",
      phase.gateCondition ?? "",
      ...phase.subtasks.map((s) => s.description),
    ]),
  ];

  for (const text of textFields) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      variables.add(match[1]);
    }
  }

  return variables;
}

// =============================================================================
// Circular Dependency Detection
// =============================================================================

/**
 * Detect circular dependencies in template subtasks
 * @returns The circular path if found, null otherwise
 */
export function detectCircularDependencies(
  template: SessionTemplate
): string | null {
  // Build dependency graph
  const graph = new Map<string, string[]>();

  for (const phase of template.phases) {
    for (const subtask of phase.subtasks) {
      graph.set(subtask.id, subtask.dependencies);
    }
  }

  // DFS to detect cycles
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (taskId: string, path: string[]): string | null => {
    if (recursionStack.has(taskId)) {
      return [...path, taskId].join(" -> ");
    }
    if (visited.has(taskId)) {
      return null;
    }

    visited.add(taskId);
    recursionStack.add(taskId);

    const deps = graph.get(taskId) ?? [];
    for (const dep of deps) {
      const cycle = hasCycle(dep, [...path, taskId]);
      if (cycle) {
        return cycle;
      }
    }

    recursionStack.delete(taskId);
    return null;
  };

  for (const taskId of graph.keys()) {
    const cycle = hasCycle(taskId, []);
    if (cycle) {
      return cycle;
    }
  }

  return null;
}

// =============================================================================
// Template Validation
// =============================================================================

/**
 * Validate a template for correctness
 */
export function validate(template: SessionTemplate): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Collect all task and phase IDs
  const phaseIds = new Set<string>();
  const taskIds = new Set<string>();
  const allDependencies: string[] = [];

  for (const phase of template.phases) {
    // Check for duplicate phase IDs
    if (phaseIds.has(phase.id)) {
      errors.push(`Duplicate phase ID: ${phase.id}`);
    }
    phaseIds.add(phase.id);

    for (const subtask of phase.subtasks) {
      // Check for duplicate task IDs
      if (taskIds.has(subtask.id)) {
        errors.push(`Duplicate task ID: ${subtask.id}`);
      }
      taskIds.add(subtask.id);

      // Collect dependencies for validation
      allDependencies.push(...subtask.dependencies);
    }
  }

  // Validate dependencies reference existing tasks
  for (const dep of allDependencies) {
    if (!taskIds.has(dep)) {
      errors.push(`Invalid dependency: ${dep} does not exist`);
    }
  }

  // Check for circular dependencies
  const circularCheck = detectCircularDependencies(template);
  if (circularCheck) {
    errors.push(`Circular dependency detected: ${circularCheck}`);
  }

  // Validate variable usage in descriptions
  const variableNames = new Set(template.variables.map((v) => v.name));
  const usedVariables = extractVariables(template);

  for (const varName of usedVariables) {
    if (!variableNames.has(varName)) {
      warnings.push(
        `Variable {{${varName}}} used but not defined in variables list`
      );
    }
  }

  // Check required variables
  for (const variable of template.variables) {
    if (variable.required && !usedVariables.has(variable.name)) {
      warnings.push(
        `Required variable ${variable.name} defined but never used`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate template structure using the schema
 * This is a convenience wrapper that parses and validates in one step
 */
export function validateStructure(
  data: unknown
): { valid: true; template: SessionTemplate } | { valid: false; error: string } {
  // Import dynamically to avoid circular deps at module level
  const { SessionTemplateSchema } = require("./schemas.js");
  const parseResult = SessionTemplateSchema.safeParse(data);

  if (!parseResult.success) {
    return {
      valid: false,
      error: parseResult.error.message,
    };
  }

  return {
    valid: true,
    template: parseResult.data,
  };
}
