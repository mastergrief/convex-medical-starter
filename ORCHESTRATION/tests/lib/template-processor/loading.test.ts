/**
 * @vitest-environment node
 */
/**
 * Template Processor Loading Tests
 *
 * Tests for TemplateProcessor class, factory functions, and template loading.
 * Covers: TemplateProcessor, createTemplateProcessor, loadTemplateById, instantiateTemplate
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import * as fs from "fs";

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
  TemplateProcessor,
  createTemplateProcessor,
  loadTemplateById,
  instantiateTemplate,
  DEFAULT_TEMPLATES_DIR,
} from "../../../lib/template-processor.js";
import {
  createMockSessionTemplate,
  createMockTemplateVariable,
} from "../../setup.js";

// =============================================================================
// TemplateProcessor Class Tests (8 tests)
// =============================================================================

describe("TemplateProcessor", () => {
  const mockFs = fs as unknown as {
    existsSync: Mock;
    readFileSync: Mock;
    writeFileSync: Mock;
    mkdirSync: Mock;
    readdirSync: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructor sets templates directory to default when not provided", () => {
    const processor = new TemplateProcessor();

    // DEFAULT_TEMPLATES_DIR should be set and processor should be created
    expect(DEFAULT_TEMPLATES_DIR).toContain("templates");
    expect(processor).toBeInstanceOf(TemplateProcessor);
  });

  it("constructor accepts custom templates directory", () => {
    const customDir = "/custom/templates";
    const processor = new TemplateProcessor(customDir);

    // The processor should use the custom directory internally
    // We can verify this by checking that loadRegistry looks in the right place
    mockFs.existsSync.mockReturnValue(false);

    const registry = processor.loadRegistry();

    expect(registry.templates).toEqual([]);
    // existsSync should have been called with the custom path
    expect(mockFs.existsSync).toHaveBeenCalledWith(expect.stringContaining(customDir));
  });

  it("loadRegistry returns empty registry when file does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);

    const processor = new TemplateProcessor("/test");
    const registry = processor.loadRegistry();

    expect(registry.version).toBe("1.0.0");
    expect(registry.templates).toEqual([]);
  });

  it("loadRegistry reads and parses registry file", () => {
    const mockRegistry = {
      version: "1.0.0",
      templates: [
        {
          id: "test-template",
          name: "Test",
          description: "Test template",
          file: "test-template.json",
        },
      ],
    };

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(mockRegistry));

    const processor = new TemplateProcessor("/test");
    const registry = processor.loadRegistry();

    expect(registry.templates).toHaveLength(1);
    expect(registry.templates[0].id).toBe("test-template");
  });

  it("listTemplates returns template info array", () => {
    const mockRegistry = {
      version: "1.0.0",
      templates: [
        {
          id: "tmpl-1",
          name: "Template 1",
          description: "First template",
          file: "tmpl-1.json",
        },
      ],
    };

    const mockTemplate = createMockSessionTemplate({
      id: "tmpl-1",
      name: "Template 1",
      description: "First template",
      tags: ["test"],
    });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((path: string) => {
      if (path.includes("index.json")) {
        return JSON.stringify(mockRegistry);
      }
      return JSON.stringify(mockTemplate);
    });

    const processor = new TemplateProcessor("/test");
    const templates = processor.listTemplates();

    expect(templates).toHaveLength(1);
    expect(templates[0].id).toBe("tmpl-1");
    expect(templates[0].tags).toEqual(["test"]);
  });

  it("loadTemplate throws when template not found in registry", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(
      JSON.stringify({ version: "1.0.0", templates: [] })
    );

    const processor = new TemplateProcessor("/test");

    expect(() => processor.loadTemplate("nonexistent")).toThrow(
      "Template not found"
    );
  });

  it("saveTemplate writes template file and updates registry", () => {
    const mockRegistry = { version: "1.0.0", templates: [] };
    const template = createMockSessionTemplate({
      id: "new-template",
      name: "New Template",
      description: "A new template",
    });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(mockRegistry));
    mockFs.writeFileSync.mockImplementation(() => {});

    const processor = new TemplateProcessor("/test");
    processor.saveTemplate(template);

    // Should have written the template file
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("new-template.json"),
      expect.any(String),
      "utf-8"
    );

    // Should have written the updated registry
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining("index.json"),
      expect.any(String),
      "utf-8"
    );
  });

  it("saveTemplate throws when template validation fails", () => {
    const invalidTemplate = createMockSessionTemplate({
      phases: [
        { id: "p1", name: "Phase", subtasks: [], parallelizable: false },
        { id: "p1", name: "Duplicate", subtasks: [], parallelizable: false },
      ],
    });

    mockFs.existsSync.mockReturnValue(false);

    const processor = new TemplateProcessor("/test");

    expect(() => processor.saveTemplate(invalidTemplate)).toThrow(
      "Invalid template"
    );
  });
});

// =============================================================================
// Factory Function Tests (4 tests)
// =============================================================================

describe("createTemplateProcessor", () => {
  it("creates processor with default directory", () => {
    const processor = createTemplateProcessor();

    expect(processor).toBeInstanceOf(TemplateProcessor);
  });

  it("creates processor with custom directory", () => {
    const processor = createTemplateProcessor("/custom/path");

    expect(processor).toBeInstanceOf(TemplateProcessor);
  });
});

describe("loadTemplateById", () => {
  const mockFs = fs as unknown as {
    existsSync: Mock;
    readFileSync: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads template using default directory", () => {
    const mockRegistry = {
      version: "1.0.0",
      templates: [
        { id: "my-template", name: "My", description: "Test", file: "my-template.json" },
      ],
    };
    const mockTemplate = createMockSessionTemplate({ id: "my-template" });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((path: string) => {
      if (path.includes("index.json")) {
        return JSON.stringify(mockRegistry);
      }
      return JSON.stringify(mockTemplate);
    });

    const template = loadTemplateById("my-template");

    expect(template.id).toBe("my-template");
  });
});

describe("instantiateTemplate", () => {
  const mockFs = fs as unknown as {
    existsSync: Mock;
    readFileSync: Mock;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("instantiates template by ID with variables", () => {
    const mockRegistry = {
      version: "1.0.0",
      templates: [
        { id: "feature-template", name: "Feature", description: "Test", file: "feature-template.json" },
      ],
    };
    const mockTemplate = createMockSessionTemplate({
      id: "feature-template",
      description: "Implement {{NAME}}",
      variables: [createMockTemplateVariable({ name: "NAME", required: true })],
    });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockImplementation((path: string) => {
      if (path.includes("index.json")) {
        return JSON.stringify(mockRegistry);
      }
      return JSON.stringify(mockTemplate);
    });

    const result = instantiateTemplate("feature-template", { NAME: "login" });

    expect(result.success).toBe(true);
    expect(result.plan?.summary).toBe("Implement login");
  });
});
