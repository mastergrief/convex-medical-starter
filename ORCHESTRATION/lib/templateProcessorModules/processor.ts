/**
 * Template Processor Class
 *
 * Main class for template management operations.
 */

import * as fs from "fs";
import * as path from "path";
import type { Plan } from "../../schemas/index.js";
import {
  SessionTemplateSchema,
  TemplateRegistrySchema,
  type SessionTemplate,
  type TemplateRegistry,
  type TemplateRegistryEntry,
} from "./schemas.js";
import type { TemplateInfo, ValidationResult, InstantiationResult } from "./types.js";
import { validate, extractVariables } from "./validation.js";
import { instantiate, createTemplateFromPlan } from "./instantiation.js";

// =============================================================================
// Default Templates Directory
// =============================================================================

import { logWarn } from "../utils/logger.js";

export const DEFAULT_TEMPLATES_DIR = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../../templates"
);

// =============================================================================
// Template Processor Class
// =============================================================================

/**
 * TemplateProcessor manages session templates for the orchestration system.
 * It provides loading, saving, validation, and instantiation of templates.
 */
export class TemplateProcessor {
  private templatesDir: string;
  private registryCache: TemplateRegistry | null = null;

  constructor(templatesDir?: string) {
    this.templatesDir = templatesDir ?? DEFAULT_TEMPLATES_DIR;
  }

  /**
   * List all available templates with metadata
   */
  listTemplates(): TemplateInfo[] {
    const registry = this.loadRegistry();
    return registry.templates.map((entry) => {
      try {
        const template = this.loadTemplate(entry.id);
        return {
          id: template.id,
          name: template.name,
          description: template.description,
          tags: template.tags,
          variables: template.variables,
          estimatedTokens: template.estimatedTokens,
        };
      } catch (error) {
        logWarn("template:listTemplates", error);
        // Return basic info if template fails to load
        return {
          id: entry.id,
          name: entry.name,
          description: entry.description,
          tags: [],
          variables: [],
          estimatedTokens: undefined,
        };
      }
    });
  }

  /**
   * Load a template by ID
   */
  loadTemplate(templateId: string): SessionTemplate {
    const registry = this.loadRegistry();
    const entry = registry.templates.find((t) => t.id === templateId);

    if (!entry) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const templatePath = path.join(this.templatesDir, entry.file);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file not found: ${templatePath}`);
    }

    const content = fs.readFileSync(templatePath, "utf-8");
    const data = JSON.parse(content);

    const parseResult = SessionTemplateSchema.safeParse(data);
    if (!parseResult.success) {
      throw new Error(
        `Invalid template format: ${parseResult.error.message}`
      );
    }

    return parseResult.data;
  }

  /**
   * Validate a template for correctness
   */
  validate(template: SessionTemplate): ValidationResult {
    return validate(template);
  }

  /**
   * Instantiate a template with variable substitution
   */
  instantiate(
    template: SessionTemplate,
    variables: Record<string, string>,
    sessionId?: string,
    promptId?: string
  ): InstantiationResult {
    return instantiate(template, variables, sessionId, promptId);
  }

  /**
   * Create a template from an existing plan
   */
  createFromPlan(
    plan: Plan,
    templateId: string,
    name: string,
    description: string,
    tags: string[] = []
  ): SessionTemplate {
    return createTemplateFromPlan(plan, templateId, name, description, tags);
  }

  /**
   * Save a template to the templates directory
   */
  saveTemplate(template: SessionTemplate): void {
    // Validate the template first
    const validation = this.validate(template);
    if (!validation.valid) {
      throw new Error(
        `Invalid template: ${validation.errors.join(", ")}`
      );
    }

    // Save template file
    const templatePath = path.join(this.templatesDir, `${template.id}.json`);
    fs.writeFileSync(templatePath, JSON.stringify(template, null, 2), "utf-8");

    // Update registry
    this.updateRegistry(template);
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  loadRegistry(): TemplateRegistry {
    if (this.registryCache) {
      return this.registryCache;
    }

    const registryPath = path.join(this.templatesDir, "index.json");

    if (!fs.existsSync(registryPath)) {
      // Return empty registry if file doesn't exist
      return { version: "1.0.0", templates: [] };
    }

    const content = fs.readFileSync(registryPath, "utf-8");
    const data = JSON.parse(content);

    const parseResult = TemplateRegistrySchema.safeParse(data);
    if (!parseResult.success) {
      throw new Error(`Invalid registry format: ${parseResult.error.message}`);
    }

    this.registryCache = parseResult.data;
    return parseResult.data;
  }

  private updateRegistry(template: SessionTemplate): void {
    const registry = this.loadRegistry();

    // Update or add entry
    const existingIndex = registry.templates.findIndex(
      (t) => t.id === template.id
    );
    const entry: TemplateRegistryEntry = {
      id: template.id,
      name: template.name,
      description: template.description,
      file: `${template.id}.json`,
    };

    if (existingIndex >= 0) {
      registry.templates[existingIndex] = entry;
    } else {
      registry.templates.push(entry);
    }

    // Save registry
    const registryPath = path.join(this.templatesDir, "index.json");
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), "utf-8");

    // Clear cache
    this.registryCache = null;
  }

  /**
   * Get the substitution function (exposed for backward compatibility)
   */
  substituteVariables(
    text: string,
    variables: Record<string, string>
  ): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
      return variables[varName] ?? match;
    });
  }

  /**
   * Extract variables from template (exposed for backward compatibility)
   */
  extractVariables(template: SessionTemplate): Set<string> {
    return extractVariables(template);
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new TemplateProcessor instance
 */
export function createTemplateProcessor(
  templatesDir?: string
): TemplateProcessor {
  return new TemplateProcessor(templatesDir);
}

/**
 * Load a template by ID using the default templates directory
 */
export function loadTemplateById(templateId: string): SessionTemplate {
  const processor = new TemplateProcessor();
  return processor.loadTemplate(templateId);
}

/**
 * Instantiate a template with variables using the default templates directory
 */
export function instantiateTemplate(
  templateId: string,
  variables: Record<string, string>,
  sessionId?: string
): InstantiationResult {
  const processor = new TemplateProcessor();
  const template = processor.loadTemplate(templateId);
  return processor.instantiate(template, variables, sessionId);
}
