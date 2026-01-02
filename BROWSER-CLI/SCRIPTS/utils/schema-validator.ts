/**
 * JSON Schema Validator for Network Mocks
 * Validates mock response data against JSON schemas
 */

import Ajv, { JSONSchemaType, ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import * as fs from 'fs';
import * as path from 'path';

export interface SchemaValidationError {
  field: string;
  message: string;
  value: any;
}

export class SchemaValidator {
  private ajv: Ajv;
  private schemas: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      strict: false // Allow additional properties by default
    });
    addFormats(this.ajv);
  }

  /**
   * Register schema from JSON Schema definition
   */
  registerSchema(name: string, schema: JSONSchemaType<any>): void {
    const validate = this.ajv.compile(schema);
    this.schemas.set(name, validate);
  }

  /**
   * Load schema from file
   */
  loadSchemaFromFile(name: string, filepath: string): void {
    const schemaContent = fs.readFileSync(filepath, 'utf-8');
    const schema = JSON.parse(schemaContent);
    this.registerSchema(name, schema);
  }

  /**
   * Load all schemas from directory
   */
  loadSchemasFromDirectory(dirPath: string): void {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));

    for (const file of files) {
      const name = path.basename(file, '.json');
      const filepath = path.join(dirPath, file);
      this.loadSchemaFromFile(name, filepath);
    }
  }

  /**
   * Validate data against registered schema
   */
  validate(schemaName: string, data: any): {
    valid: boolean;
    errors: SchemaValidationError[];
  } {
    const validate = this.schemas.get(schemaName);

    if (!validate) {
      return {
        valid: false,
        errors: [{
          field: 'schema',
          message: `Schema not found: ${schemaName}`,
          value: null
        }]
      };
    }

    const valid = validate(data);

    if (!valid && validate.errors) {
      const errors: SchemaValidationError[] = validate.errors.map(err => ({
        field: err.instancePath || err.schemaPath,
        message: err.message || 'Validation error',
        value: err.data
      }));

      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }

  /**
   * Get list of registered schema names
   */
  getSchemaNames(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Check if schema exists
   */
  hasSchema(name: string): boolean {
    return this.schemas.has(name);
  }
}

/**
 * Default schema validator instance
 */
let defaultValidator: SchemaValidator | null = null;

export function getDefaultValidator(): SchemaValidator {
  if (!defaultValidator) {
    defaultValidator = new SchemaValidator();

    // Load schemas from default directory if it exists
    const schemaDir = path.join(process.cwd(), 'BROWSER-CLI', 'schemas');
    if (fs.existsSync(schemaDir)) {
      defaultValidator.loadSchemasFromDirectory(schemaDir);
    }
  }

  return defaultValidator;
}
