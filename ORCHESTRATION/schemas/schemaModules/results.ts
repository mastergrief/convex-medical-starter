/**
 * RESULTS SCHEMAS
 * Agent-specific result schemas with discriminated union
 */

import { z } from "zod";
import { FileModificationSchema, TraceabilityDataSchema } from "./components.js";

// =============================================================================
// AGENT-SPECIFIC RESULT SCHEMAS
// =============================================================================

export const AnalystResultSchema = z.object({
  agentType: z.literal("analyst"),
  memoryName: z.string(),
  traceabilityData: TraceabilityDataSchema,
  diagramsGenerated: z.array(z.string()).optional(),
  layersAnalyzed: z.object({
    ui: z.boolean(),
    api: z.boolean(),
    database: z.boolean()
  })
});

export type AnalystResult = z.infer<typeof AnalystResultSchema>;

export const DeveloperResultSchema = z.object({
  agentType: z.literal("developer"),
  filesModified: z.array(FileModificationSchema),
  typecheckPassed: z.boolean(),
  symbolsChanged: z.array(z.string()),
  testsRun: z.boolean().optional(),
  testsPassed: z.boolean().optional()
});

export type DeveloperResult = z.infer<typeof DeveloperResultSchema>;

export const BrowserResultSchema = z.object({
  agentType: z.literal("browser"),
  testsPassed: z.number().int().nonnegative(),
  testsFailed: z.number().int().nonnegative(),
  screenshots: z.array(z.string()),
  consoleErrors: z.array(z.string()),
  networkFailures: z.array(z.string()),
  evidenceChain: z.object({
    relatedTasks: z.array(z.string()),
    filesTestedFrom: z.array(z.string()),
    symbolsCovered: z.array(z.string()),
    coverageMap: z.record(z.string(), z.object({
      tested: z.boolean(),
      screenshots: z.array(z.string()),
      assertions: z.number().int().nonnegative(),
      passed: z.number().int().nonnegative()
    }))
  }).optional()
});

export type BrowserResult = z.infer<typeof BrowserResultSchema>;

export const ComposerResultSchema = z.object({
  agentType: z.literal("composer"),
  planId: z.string().uuid(),
  phasesCreated: z.number().int().positive(),
  totalSubtasks: z.number().int().positive(),
  estimatedTokens: z.number().int().positive()
});

export type ComposerResult = z.infer<typeof ComposerResultSchema>;

export const OrchestratorResultSchema = z.object({
  agentType: z.literal("orchestrator"),
  strategyGenerated: z.boolean(),
  parallelGroups: z.number().int().nonnegative(),
  sequentialTasks: z.number().int().nonnegative(),
  tokenBudget: z.object({
    estimated: z.number().int().positive(),
    percentOfLimit: z.number().min(0).max(100)
  })
});

export type OrchestratorResult = z.infer<typeof OrchestratorResultSchema>;

// Union type for all agent results
export const AgentResultSchema = z.discriminatedUnion("agentType", [
  AnalystResultSchema,
  DeveloperResultSchema,
  BrowserResultSchema,
  ComposerResultSchema,
  OrchestratorResultSchema
]);

export type AgentResult = z.infer<typeof AgentResultSchema>;
