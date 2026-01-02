/**
 * Template Instantiation Functions
 *
 * Variable substitution and plan creation from templates.
 */

import {
  Plan,
  PlanSchema,
  Phase,
  createSessionId,
  createTimestamp,
} from "../../schemas/index.js";
import type { SessionTemplate, TemplateVariable, TemplatePhase } from "./schemas.js";
import type { InstantiationResult } from "./types.js";

// =============================================================================
// Variable Substitution
// =============================================================================

/**
 * Substitute template variables in text
 */
export function substituteVariables(
  text: string,
  variables: Record<string, string>
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] ?? match;
  });
}

/**
 * Extract variables from a plan for template creation
 * This is a heuristic extraction - looks for patterns that might be variables
 */
export function extractVariablesFromPlan(plan: Plan): TemplateVariable[] {
  const variables: TemplateVariable[] = [];
  const seen = new Set<string>();

  // Common patterns that might indicate variables
  const patterns = [
    /\b(?:feature|component|module|path|name|description):\s*["']?([^"'\n]+)["']?/gi,
  ];

  const textFields = [
    plan.summary,
    ...plan.phases.flatMap((phase) => [
      phase.description,
      ...phase.subtasks.map((s) => s.description),
    ]),
  ];

  for (const text of textFields) {
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const value = match[1].trim();
        if (value && !seen.has(value) && value.length < 50) {
          seen.add(value);
          // Generate a variable name from the match
          const varName = match[0]
            .split(":")[0]
            .toLowerCase()
            .replace(/\s+/g, "_");
          if (!seen.has(varName)) {
            seen.add(varName);
            variables.push({
              name: varName,
              description: `Extracted from plan: ${value}`,
              default: value,
              required: false,
            });
          }
        }
      }
    }
  }

  return variables;
}

// =============================================================================
// Template Instantiation
// =============================================================================

/**
 * Instantiate a template with variable substitution
 */
export function instantiate(
  template: SessionTemplate,
  variables: Record<string, string>,
  sessionId?: string,
  promptId?: string
): InstantiationResult {
  const errors: string[] = [];
  const missingVariables: string[] = [];
  const substitutedVariables: Record<string, string> = {};

  // Build variable map with defaults
  const variableMap: Record<string, string> = {};
  for (const varDef of template.variables) {
    if (variables[varDef.name] !== undefined) {
      variableMap[varDef.name] = variables[varDef.name];
      substitutedVariables[varDef.name] = variables[varDef.name];
    } else if (varDef.default !== undefined) {
      variableMap[varDef.name] = varDef.default;
      substitutedVariables[varDef.name] = varDef.default;
    } else if (varDef.required) {
      missingVariables.push(varDef.name);
    }
  }

  if (missingVariables.length > 0) {
    return {
      success: false,
      errors: [
        `Missing required variables: ${missingVariables.join(", ")}`,
      ],
      missingVariables,
      substitutedVariables,
    };
  }

  // Substitute variables in phases
  const substitutedPhases: Phase[] = template.phases.map((phase) => ({
    id: phase.id,
    name: substituteVariables(phase.name, variableMap),
    description:
      phase.description !== undefined
        ? substituteVariables(phase.description, variableMap)
        : substituteVariables(phase.name, variableMap),
    subtasks: phase.subtasks.map((subtask) => ({
      id: subtask.id,
      description: substituteVariables(
        subtask.description,
        variableMap
      ),
      agentType: subtask.agentType,
      priority: subtask.priority,
      dependencies: subtask.dependencies,
      estimatedTokens: subtask.estimatedTokens,
    })),
    parallelizable: phase.parallelizable,
    gateCondition: phase.gateCondition
      ? substituteVariables(phase.gateCondition, variableMap)
      : undefined,
  }));

  // Calculate total estimated tokens
  const totalEstimatedTokens =
    template.estimatedTokens ??
    substitutedPhases.reduce(
      (sum, phase) =>
        sum +
        phase.subtasks.reduce(
          (taskSum, task) => taskSum + (task.estimatedTokens ?? 0),
          0
        ),
      0
    );

  // Create the plan
  const plan: Plan = {
    id: crypto.randomUUID(),
    type: "plan",
    metadata: {
      promptId: promptId ?? crypto.randomUUID(),
      sessionId: sessionId ?? createSessionId(),
      timestamp: createTimestamp(),
      version: "1.0.0",
    },
    summary: substituteVariables(template.description, variableMap),
    phases: substitutedPhases,
    totalEstimatedTokens:
      totalEstimatedTokens > 0 ? totalEstimatedTokens : undefined,
  };

  // Validate the generated plan
  const planValidation = PlanSchema.safeParse(plan);
  if (!planValidation.success) {
    errors.push(`Generated plan validation failed: ${planValidation.error.message}`);
    return {
      success: false,
      errors,
      missingVariables,
      substitutedVariables,
    };
  }

  return {
    success: true,
    plan: planValidation.data,
    errors: [],
    missingVariables: [],
    substitutedVariables,
  };
}

// =============================================================================
// Template Creation from Plan
// =============================================================================

/**
 * Create a template from an existing plan
 */
export function createTemplateFromPlan(
  plan: Plan,
  templateId: string,
  name: string,
  description: string,
  tags: string[] = []
): SessionTemplate {
  // Extract potential variables from the plan
  const extractedVars = extractVariablesFromPlan(plan);

  // Convert phases to template phases
  const templatePhases: TemplatePhase[] = plan.phases.map((phase) => ({
    id: phase.id,
    name: phase.name,
    description: phase.description,
    subtasks: phase.subtasks.map((subtask) => ({
      id: subtask.id,
      description: subtask.description,
      agentType: subtask.agentType,
      priority: subtask.priority,
      dependencies: subtask.dependencies,
      estimatedTokens: subtask.estimatedTokens,
    })),
    parallelizable: phase.parallelizable,
    gateCondition: phase.gateCondition,
  }));

  return {
    id: templateId,
    name,
    description,
    tags,
    variables: extractedVars,
    phases: templatePhases,
    estimatedTokens: plan.totalEstimatedTokens,
  };
}
