import { z } from 'zod';

// ============================================================================
// Response Base Schemas
// ============================================================================

export const CLIErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.any().optional(),
});

export const ResponseMetadataSchema = z.object({
  executionTime: z.number().nonnegative(),
  timestamp: z.string().datetime(),
  command: z.string(),
});

export function createCLIResponseSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: CLIErrorSchema.optional(),
    metadata: ResponseMetadataSchema,
  });
}

// ============================================================================
// Deployment & Status Schemas
// ============================================================================

export const ConvexDeploymentSchema = z.object({
  kind: z.enum(['ownDev', 'prod', 'preview']),
  deploymentSelector: z.string(),
  url: z.string().url(),
  dashboardUrl: z.string().url(),
  team: z.string().optional(),
  project: z.string().optional(),
});

export const StatusDataSchema = z.object({
  deployments: z.array(ConvexDeploymentSchema),
  active: z.boolean(),
});

export const StatusResponseSchema = createCLIResponseSchema(StatusDataSchema);

// ============================================================================
// Tables Schemas
// ============================================================================

export const TablesDataSchema = z.object({
  tables: z.array(z.string()),
  count: z.number().nonnegative(),
});

export const TablesResponseSchema = createCLIResponseSchema(TablesDataSchema);

// ============================================================================
// Data Query Schemas
// ============================================================================

export const DataDocumentSchema = z.object({
  _id: z.string(),
  _creationTime: z.number(),
}).passthrough(); // Allow additional properties

export function createDataDataSchema<T extends z.ZodTypeAny>(documentSchema: T) {
  return z.object({
    documents: z.array(documentSchema),
    count: z.number().nonnegative(),
    table: z.string(),
  });
}

export const DataDataSchema = createDataDataSchema(DataDocumentSchema);

export const DataResponseSchema = createCLIResponseSchema(DataDataSchema);

// Helper to create custom data response schema with specific document type
export function createDataResponseSchema<T extends z.ZodTypeAny>(documentSchema: T) {
  return createCLIResponseSchema(createDataDataSchema(documentSchema));
}

// ============================================================================
// Function Schemas
// ============================================================================

export const FunctionInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  size: z.number().optional(),
  modified: z.string().optional(),
});

export const FunctionsDataSchema = z.object({
  functions: z.array(FunctionInfoSchema),
  count: z.number().nonnegative(),
});

export const FunctionsResponseSchema = createCLIResponseSchema(FunctionsDataSchema);

export function createFunctionRunDataSchema<T extends z.ZodTypeAny>(resultSchema: T) {
  return z.object({
    result: resultSchema,
    functionName: z.string(),
  });
}

export const FunctionRunDataSchema = createFunctionRunDataSchema(z.any());

export const FunctionRunResponseSchema = createCLIResponseSchema(FunctionRunDataSchema);

// Helper to create custom function run response schema with specific result type
export function createFunctionRunResponseSchema<T extends z.ZodTypeAny>(resultSchema: T) {
  return createCLIResponseSchema(createFunctionRunDataSchema(resultSchema));
}

// ============================================================================
// Environment Variable Schemas
// ============================================================================

export const EnvVariableSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const EnvListDataSchema = z.object({
  variables: z.array(EnvVariableSchema),
  count: z.number().nonnegative(),
});

export const EnvListResponseSchema = createCLIResponseSchema(EnvListDataSchema);

export const EnvGetDataSchema = z.object({
  name: z.string(),
  value: z.string(),
});

export const EnvGetResponseSchema = createCLIResponseSchema(EnvGetDataSchema);

export const EnvSetDataSchema = z.object({
  name: z.string(),
  value: z.string(),
  message: z.string(),
});

export const EnvSetResponseSchema = createCLIResponseSchema(EnvSetDataSchema);

// ============================================================================
// Logs Schemas
// ============================================================================

export const LogEntrySchema = z.object({
  timestamp: z.string(),
  level: z.enum(['info', 'warn', 'error']),
  message: z.string(),
});

export const LogsDataSchema = z.object({
  logs: z.array(LogEntrySchema),
  count: z.number().nonnegative(),
});

export const LogsResponseSchema = createCLIResponseSchema(LogsDataSchema);

// ============================================================================
// Validation Helpers
// ============================================================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly zodError: z.ZodError,
    public readonly rawData: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  /**
   * Get a formatted error message with detailed validation issues
   */
  getDetailedMessage(): string {
    const issues = this.zodError.issues.map(issue => {
      const path = issue.path.join('.');
      return `  - ${path}: ${issue.message}`;
    }).join('\n');

    return `${this.message}\nValidation issues:\n${issues}`;
  }

  /**
   * Get validation issues as structured data
   */
  getIssues() {
    return this.zodError.issues.map(issue => ({
      path: issue.path,
      message: issue.message,
      code: issue.code,
    }));
  }
}

/**
 * Safely parse data with a Zod schema, throwing ValidationError on failure
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new ValidationError(
      `Validation failed for ${context}`,
      result.error,
      data
    );
  }

  return result.data;
}

/**
 * Safely parse data with a Zod schema, returning null on failure
 */
export function tryValidateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}
