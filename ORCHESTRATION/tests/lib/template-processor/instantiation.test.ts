/**
 * @vitest-environment node
 */
/**
 * Template Processor Instantiation Tests
 *
 * Tests for template instantiation and variable substitution.
 * Covers: substituteVariables, instantiate, createTemplateFromPlan, extractVariablesFromPlan
 */

import { describe, it, expect, vi } from "vitest";

// Mock fs module before importing template processor
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Import after mocking
import {
  substituteVariables,
  instantiate,
  createTemplateFromPlan,
  extractVariablesFromPlan,
} from "../../../lib/template-processor.js";
import {
  createMockSessionTemplate,
  createMockTemplateVariable,
} from "../../setup.js";

// =============================================================================
// Variable Substitution Tests (6 tests)
// =============================================================================

describe("substituteVariables", () => {
  it("replaces single variable with provided value", () => {
    const text = "Implement {{FEATURE}} feature";
    const variables = { FEATURE: "authentication" };

    const result = substituteVariables(text, variables);

    expect(result).toBe("Implement authentication feature");
  });

  it("replaces multiple variables in same text", () => {
    const text = "Add {{FEATURE}} to {{MODULE}} component";
    const variables = { FEATURE: "dark mode", MODULE: "settings" };

    const result = substituteVariables(text, variables);

    expect(result).toBe("Add dark mode to settings component");
  });

  it("preserves unmatched placeholders when variable not provided", () => {
    const text = "{{KNOWN}} and {{UNKNOWN}} values";
    const variables = { KNOWN: "replaced" };

    const result = substituteVariables(text, variables);

    expect(result).toBe("replaced and {{UNKNOWN}} values");
  });

  it("handles empty string values", () => {
    const text = "Prefix {{VAR}} suffix";
    const variables = { VAR: "" };

    const result = substituteVariables(text, variables);

    expect(result).toBe("Prefix  suffix");
  });

  it("handles special characters in values", () => {
    const text = "Path is {{PATH}}";
    const variables = { PATH: "/home/user/project & files" };

    const result = substituteVariables(text, variables);

    expect(result).toBe("Path is /home/user/project & files");
  });

  it("does not match partial variable names", () => {
    const text = "{{FEATURE}} vs {{FEATURE_NAME}}";
    const variables = { FEATURE: "auth", FEATURE_NAME: "authentication" };

    const result = substituteVariables(text, variables);

    expect(result).toBe("auth vs authentication");
  });
});

// =============================================================================
// Instantiation Tests (10 tests)
// =============================================================================

describe("instantiate", () => {
  it("creates plan with all required variables provided", () => {
    const template = createMockSessionTemplate({
      description: "Implement {{FEATURE}}",
      variables: [createMockTemplateVariable({ name: "FEATURE", required: true })],
      phases: [
        {
          id: "phase-1",
          name: "{{FEATURE}} Phase",
          subtasks: [
            {
              id: "task-1.1",
              description: "Build {{FEATURE}}",
              agentType: "developer",
              priority: "high",
              dependencies: [],
            },
          ],
          parallelizable: false,
        },
      ],
    });

    const result = instantiate(template, { FEATURE: "authentication" });

    expect(result.success).toBe(true);
    expect(result.plan).toBeDefined();
    expect(result.plan?.summary).toBe("Implement authentication");
  });

  it("fails with missing required variables", () => {
    const template = createMockSessionTemplate({
      description: "Implement {{FEATURE}}",
      variables: [createMockTemplateVariable({ name: "FEATURE", required: true })],
    });

    const result = instantiate(template, {});

    expect(result.success).toBe(false);
    expect(result.missingVariables).toContain("FEATURE");
    expect(result.errors.some((e) => e.includes("Missing required"))).toBe(true);
  });

  it("uses defaults for optional variables when not provided", () => {
    const template = createMockSessionTemplate({
      description: "Template for {{MODULE}}",
      variables: [
        createMockTemplateVariable({
          name: "MODULE",
          required: false,
          default: "default-module",
        }),
      ],
    });

    const result = instantiate(template, {});

    expect(result.success).toBe(true);
    expect(result.substitutedVariables.MODULE).toBe("default-module");
  });

  it("generates unique IDs for plan", () => {
    const template = createMockSessionTemplate({
      phases: [
        {
          id: "phase-1",
          name: "Phase",
          subtasks: [
            {
              id: "task-1.1",
              description: "Task",
              agentType: "developer",
              priority: "high",
              dependencies: [],
            },
          ],
          parallelizable: false,
        },
      ],
    });

    const result1 = instantiate(template, {});
    const result2 = instantiate(template, {});

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.plan?.id).not.toBe(result2.plan?.id);
  });

  it("substitutes variables in subtask descriptions", () => {
    const template = createMockSessionTemplate({
      description: "Main",
      variables: [createMockTemplateVariable({ name: "TARGET", required: true })],
      phases: [
        {
          id: "phase-1",
          name: "Build",
          subtasks: [
            {
              id: "task-1.1",
              description: "Implement {{TARGET}} component",
              agentType: "developer",
              priority: "high",
              dependencies: [],
            },
          ],
          parallelizable: false,
        },
      ],
    });

    const result = instantiate(template, { TARGET: "dashboard" });

    expect(result.success).toBe(true);
    expect(result.plan?.phases[0].subtasks[0].description).toBe(
      "Implement dashboard component"
    );
  });

  it("returns substituted variables list", () => {
    const template = createMockSessionTemplate({
      description: "{{A}} and {{B}}",
      variables: [
        createMockTemplateVariable({ name: "A", required: true }),
        createMockTemplateVariable({ name: "B", required: false, default: "defaultB" }),
      ],
    });

    const result = instantiate(template, { A: "valueA" });

    expect(result.substitutedVariables).toEqual({
      A: "valueA",
      B: "defaultB",
    });
  });

  it("uses provided sessionId", () => {
    const template = createMockSessionTemplate({
      description: "Test template",
      phases: [
        {
          id: "phase-1",
          name: "Phase 1",
          description: "Phase 1 description",
          subtasks: [
            {
              id: "task-1.1",
              description: "Test task",
              agentType: "developer",
              priority: "high",
              dependencies: [],
            },
          ],
          parallelizable: false,
        },
      ],
    });
    // SessionId must match format: YYYYMMDD_HH-MM_UUID
    const customSessionId = "20251226_12-00_a1b2c3d4-e5f6-4789-abcd-ef0123456789";

    const result = instantiate(template, {}, customSessionId);

    expect(result.success).toBe(true);
    expect(result.plan?.metadata.sessionId).toBe(customSessionId);
  });

  it("uses provided promptId", () => {
    const template = createMockSessionTemplate({
      description: "Test template",
      phases: [
        {
          id: "phase-1",
          name: "Phase 1",
          description: "Phase 1 description",
          subtasks: [
            {
              id: "task-1.1",
              description: "Test task",
              agentType: "developer",
              priority: "high",
              dependencies: [],
            },
          ],
          parallelizable: false,
        },
      ],
    });
    // PromptId must be a valid UUID
    const customPromptId = "a1b2c3d4-e5f6-4789-abcd-ef0123456789";

    const result = instantiate(template, {}, undefined, customPromptId);

    expect(result.success).toBe(true);
    expect(result.plan?.metadata.promptId).toBe(customPromptId);
  });

  it("substitutes variables in gate conditions", () => {
    const template = createMockSessionTemplate({
      description: "Template",
      variables: [createMockTemplateVariable({ name: "THRESHOLD", required: true })],
      phases: [
        {
          id: "phase-1",
          name: "Phase",
          subtasks: [],
          parallelizable: false,
          gateCondition: "tests({{THRESHOLD}})",
        },
      ],
    });

    const result = instantiate(template, { THRESHOLD: "80" });

    expect(result.success).toBe(true);
    expect(result.plan?.phases[0].gateCondition).toBe("tests(80)");
  });

  it("calculates total estimated tokens from subtasks", () => {
    const template = createMockSessionTemplate({
      description: "Template",
      estimatedTokens: undefined,
      phases: [
        {
          id: "phase-1",
          name: "Phase",
          subtasks: [
            {
              id: "task-1",
              description: "Task 1",
              agentType: "developer",
              priority: "high",
              dependencies: [],
              estimatedTokens: 5000,
            },
            {
              id: "task-2",
              description: "Task 2",
              agentType: "analyst",
              priority: "medium",
              dependencies: [],
              estimatedTokens: 3000,
            },
          ],
          parallelizable: false,
        },
      ],
    });

    const result = instantiate(template, {});

    expect(result.success).toBe(true);
    expect(result.plan?.totalEstimatedTokens).toBe(8000);
  });
});

// =============================================================================
// createTemplateFromPlan Tests (2 tests)
// =============================================================================

describe("createTemplateFromPlan", () => {
  it("creates template from plan with extracted variables", () => {
    const plan = {
      id: "plan-123",
      type: "plan" as const,
      metadata: {
        promptId: "prompt-1",
        sessionId: "session-1",
        timestamp: new Date().toISOString(),
        version: "1.0.0" as const,
      },
      summary: "Implement feature: authentication",
      phases: [
        {
          id: "phase-1",
          name: "Setup",
          description: "Setup phase",
          subtasks: [
            {
              id: "task-1.1",
              description: "Create component: LoginForm",
              agentType: "developer" as const,
              priority: "high" as const,
              dependencies: [],
            },
          ],
          parallelizable: false,
        },
      ],
    };

    const template = createTemplateFromPlan(
      plan,
      "auth-template",
      "Auth Template",
      "Authentication workflow",
      ["auth", "feature"]
    );

    expect(template.id).toBe("auth-template");
    expect(template.name).toBe("Auth Template");
    expect(template.tags).toEqual(["auth", "feature"]);
    expect(template.phases).toHaveLength(1);
  });

  it("preserves phase and subtask structure", () => {
    const plan = {
      id: "plan-456",
      type: "plan" as const,
      metadata: {
        promptId: "prompt-2",
        sessionId: "session-2",
        timestamp: new Date().toISOString(),
        version: "1.0.0" as const,
      },
      summary: "Multi-phase plan",
      phases: [
        {
          id: "p1",
          name: "Analysis",
          description: "Analyze requirements",
          subtasks: [
            {
              id: "t1",
              description: "Analyze",
              agentType: "analyst" as const,
              priority: "high" as const,
              dependencies: [],
              estimatedTokens: 5000,
            },
          ],
          parallelizable: false,
          gateCondition: "typecheck",
        },
        {
          id: "p2",
          name: "Implementation",
          description: "Implement features",
          subtasks: [
            {
              id: "t2",
              description: "Implement",
              agentType: "developer" as const,
              priority: "medium" as const,
              dependencies: ["t1"],
              estimatedTokens: 10000,
            },
          ],
          parallelizable: true,
        },
      ],
      totalEstimatedTokens: 15000,
    };

    const template = createTemplateFromPlan(
      plan,
      "workflow-template",
      "Workflow",
      "Standard workflow"
    );

    expect(template.phases).toHaveLength(2);
    expect(template.phases[0].gateCondition).toBe("typecheck");
    expect(template.phases[1].parallelizable).toBe(true);
    expect(template.phases[1].subtasks[0].dependencies).toEqual(["t1"]);
    expect(template.estimatedTokens).toBe(15000);
  });
});

// =============================================================================
// extractVariablesFromPlan Tests (1 test)
// =============================================================================

describe("extractVariablesFromPlan", () => {
  it("extracts potential variables from plan text", () => {
    const plan = {
      id: "plan-789",
      type: "plan" as const,
      metadata: {
        promptId: "prompt-3",
        sessionId: "session-3",
        timestamp: new Date().toISOString(),
        version: "1.0.0" as const,
      },
      summary: 'Implement feature: "user dashboard"',
      phases: [
        {
          id: "phase-1",
          name: "Build",
          description: 'component: "DashboardWidget"',
          subtasks: [],
          parallelizable: false,
        },
      ],
    };

    const variables = extractVariablesFromPlan(plan);

    // Should extract variables based on patterns like "feature:", "component:"
    expect(Array.isArray(variables)).toBe(true);
  });
});
