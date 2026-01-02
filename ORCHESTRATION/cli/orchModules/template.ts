/**
 * Template module - Workflow template commands
 */

import * as fs from "fs";
import * as path from "path";
import { createTemplateProcessor, SessionTemplateSchema } from "../../lib/template-processor.js";
import {
  printHeader,
  printSuccess,
  printError,
  printInfo,
  printJson,
  isJsonOutput,
  printUsage
} from "./output.js";
import { filterFlags } from "./flags.js";

// =============================================================================
// TEMPLATE COMMANDS
// =============================================================================

/**
 * Lists all available session templates.
 *
 * @description Handles the `template list` CLI command. Scans the templates directory
 * and displays information about each available template including name, description,
 * variable count, tags, and estimated token usage.
 *
 * @returns {Promise<void>} Outputs template list to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # List templates with text output
 * npx tsx ORCHESTRATION/cli/orch.ts template list
 *
 * # List templates with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts template list --json
 * ```
 *
 * @throws Never throws - exits with code 0 on success
 */

export async function handleTemplateList(): Promise<void> {
  const processor = createTemplateProcessor();
  const templates = processor.listTemplates();

  if (isJsonOutput()) {
    printJson({
      success: true,
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        variablesCount: t.variables.length,
        tags: t.tags,
        estimatedTokens: t.estimatedTokens
      }))
    });
  } else {
    printHeader("Available Templates");

    if (templates.length === 0) {
      console.log("  No templates found");
      return;
    }

    for (const template of templates) {
      console.log(`\n  ${template.id}`);
      console.log(`    Name: ${template.name}`);
      console.log(`    Description: ${template.description}`);
      console.log(`    Variables: ${template.variables.length}`);
      if (template.tags.length > 0) {
        console.log(`    Tags: ${template.tags.join(", ")}`);
      }
      if (template.estimatedTokens) {
        console.log(`    Est. Tokens: ${template.estimatedTokens.toLocaleString()}`);
      }
    }
  }
}

/**
 * Shows detailed information about a specific template.
 *
 * @description Handles the `template show` CLI command. Loads and displays comprehensive
 * details about a template including variables with defaults, phases with subtasks,
 * gate conditions, and dependencies.
 *
 * @param {string} templateId - The template identifier to show (e.g., "feature-implementation")
 *
 * @returns {Promise<void>} Outputs template details to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Show template details
 * npx tsx ORCHESTRATION/cli/orch.ts template show feature-implementation
 *
 * # Show with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts template show feature-implementation --json
 * ```
 *
 * @throws Exits with code 1 if template ID not provided
 * @throws Exits with code 1 if template not found
 */

export async function handleTemplateShow(templateId: string): Promise<void> {
  if (!templateId) {
    printError("Template ID required");
    process.exit(1);
  }

  const processor = createTemplateProcessor();

  try {
    const template = processor.loadTemplate(templateId);

    if (isJsonOutput()) {
      printJson({
        success: true,
        template
      });
    } else {
      printHeader(`Template: ${template.name}`);

      printInfo("ID", template.id);
      printInfo("Description", template.description);

      if (template.tags.length > 0) {
        printInfo("Tags", template.tags.join(", "));
      }

      if (template.estimatedTokens) {
        printInfo("Est. Tokens", template.estimatedTokens.toLocaleString());
      }

      // Show variables
      console.log("\n  Variables:");
      if (template.variables.length === 0) {
        console.log("    (none)");
      } else {
        for (const variable of template.variables) {
          const required = variable.required ? " (required)" : "";
          const defaultVal = variable.default ? ` [default: ${variable.default}]` : "";
          console.log(`    {{${variable.name}}}${required}${defaultVal}`);
          console.log(`      ${variable.description}`);
        }
      }

      // Show phases
      console.log("\n  Phases:");
      for (const phase of template.phases) {
        const parallel = phase.parallelizable ? " [parallel]" : "";
        console.log(`\n    ${phase.id}: ${phase.name}${parallel}`);

        if (phase.gateCondition) {
          console.log(`      Gate: ${phase.gateCondition}`);
        }

        console.log("      Subtasks:");
        for (const subtask of phase.subtasks) {
          const deps = subtask.dependencies.length > 0
            ? ` (deps: ${subtask.dependencies.join(", ")})`
            : "";
          console.log(`        - ${subtask.id} [${subtask.agentType}]${deps}`);
          console.log(`          ${subtask.description.substring(0, 60)}${subtask.description.length > 60 ? "..." : ""}`);
        }
      }
    }
  } catch (error) {
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

/**
 * Validates a template JSON file against schema and logic rules.
 *
 * @description Handles the `template validate` CLI command. Performs two-stage validation:
 * 1. Schema validation using Zod SessionTemplateSchema
 * 2. Logic validation for variable references, phase dependencies, etc.
 * Reports errors and warnings for both stages.
 *
 * @param {string} filePath - Path to the template JSON file to validate
 *
 * @returns {Promise<void>} Outputs validation results to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Validate template file
 * npx tsx ORCHESTRATION/cli/orch.ts template validate ./my-template.json
 *
 * # Validate with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts template validate ./my-template.json --json
 * ```
 *
 * @throws Exits with code 1 if file path not provided
 * @throws Exits with code 1 if file not found
 * @throws Exits with code 1 if schema validation fails
 * @throws Exits with code 1 if logic validation fails
 */

export async function handleTemplateValidate(filePath: string): Promise<void> {
  if (!filePath) {
    printError("File path required");
    process.exit(1);
  }

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(process.cwd(), filePath);

  if (!fs.existsSync(absolutePath)) {
    printError(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(absolutePath, "utf-8");
    const data = JSON.parse(content);

    // First validate schema
    const schemaResult = SessionTemplateSchema.safeParse(data);

    if (!schemaResult.success) {
      if (isJsonOutput()) {
        printJson({
          success: false,
          valid: false,
          schemaErrors: schemaResult.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
      } else {
        printError("Schema validation failed:");
        for (const issue of schemaResult.error.issues) {
          console.log(`  - ${issue.path.join(".")}: ${issue.message}`);
        }
      }
      process.exit(1);
    }

    // Then validate template logic
    const processor = createTemplateProcessor();
    const validation = processor.validate(schemaResult.data);

    if (isJsonOutput()) {
      printJson({
        success: validation.valid,
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings
      });
    } else {
      if (validation.valid) {
        printSuccess("Template is valid");
        if (validation.warnings.length > 0) {
          console.log("\n  Warnings:");
          for (const warning of validation.warnings) {
            console.log(`    - ${warning}`);
          }
        }
      } else {
        printError("Template validation failed:");
        for (const error of validation.errors) {
          console.log(`  - ${error}`);
        }
        if (validation.warnings.length > 0) {
          console.log("\n  Warnings:");
          for (const warning of validation.warnings) {
            console.log(`    - ${warning}`);
          }
        }
        process.exit(1);
      }
    }
  } catch (error) {
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// =============================================================================
// TEMPLATE ROUTER
// =============================================================================

/**
 * Main router for template CLI subcommands.
 *
 * @description Handles the `template` CLI command and routes to appropriate subcommand handlers:
 * - `list`: List all available templates
 * - `show`: Show details of a specific template
 * - `validate`: Validate a template JSON file
 *
 * @returns {Promise<void>} Routes to appropriate subcommand handler
 *
 * @example
 * ```bash
 * # List available templates
 * npx tsx ORCHESTRATION/cli/orch.ts template list
 *
 * # Show template details
 * npx tsx ORCHESTRATION/cli/orch.ts template show feature-implementation
 *
 * # Validate template file
 * npx tsx ORCHESTRATION/cli/orch.ts template validate ./my-template.json
 * ```
 *
 * @throws Prints usage if unknown subcommand provided
 */

export async function handleTemplate(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const arg3 = args[2];

  switch (subcommand) {
    case "list":
      await handleTemplateList();
      break;
    case "show":
      await handleTemplateShow(arg3);
      break;
    case "validate":
      await handleTemplateValidate(arg3);
      break;
    default:
      printUsage();
  }
}
