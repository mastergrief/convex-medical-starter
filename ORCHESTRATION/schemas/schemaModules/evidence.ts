/**
 * EVIDENCE SCHEMAS
 * Evidence chain and traceability schemas
 */

import { z } from "zod";
import { TraceabilityDataSchema } from "./components.js";

// =============================================================================
// LINKS TO SCHEMAS (Bidirectional Traceability)
// =============================================================================

export const LinksToUpstreamSchema = z.object({
  requirementTaskId: z.string().optional(),
  planPhaseId: z.string().optional(),
  analysisTaskId: z.string().optional(),
  analysisMemory: z.string().optional(),
  implementationTaskId: z.string().optional(),
  acceptanceCriteria: z.array(z.string()).optional()
});

export type LinksToUpstream = z.infer<typeof LinksToUpstreamSchema>;

export const LinksToDownstreamSchema = z.object({
  symbolsForImplementation: z.array(z.string()).optional(),
  modificationScope: z.object({
    files: z.array(z.string()),
    symbols: z.array(z.string())
  }).optional(),
  symbolsForTesting: z.array(z.string()).optional(),
  testableActions: z.array(z.string()).optional(),
  expectedBehaviors: z.array(z.string()).optional()
});

export type LinksToDownstream = z.infer<typeof LinksToDownstreamSchema>;

export const LinksToVerificationSchema = z.object({
  acceptanceCriteriaVerified: z.array(z.object({
    criterion: z.string(),
    verified: z.boolean(),
    evidence: z.string().optional(),
    assertions: z.number().int().nonnegative().optional()
  })).optional(),
  symbolsCoveredWithEvidence: z.record(z.string(), z.object({
    tested: z.boolean(),
    screenshot: z.string().optional(),
    assertions: z.number().int().nonnegative().optional()
  })).optional()
});

export type LinksToVerification = z.infer<typeof LinksToVerificationSchema>;

export const LinksToSchema = z.object({
  upstream: LinksToUpstreamSchema.optional(),
  downstream: LinksToDownstreamSchema.optional(),
  verification: LinksToVerificationSchema.optional()
});

export type LinksTo = z.infer<typeof LinksToSchema>;

// =============================================================================
// EVIDENCE SECTION SCHEMAS
// =============================================================================

export const EvidenceRequirementSchema = z.object({
  taskId: z.string(),
  description: z.string(),
  acceptanceCriteria: z.array(z.string())
});

export type EvidenceRequirement = z.infer<typeof EvidenceRequirementSchema>;

export const EvidenceAnalysisSchema = z.object({
  agentId: z.string(),
  taskId: z.string(),
  memoryName: z.string(),
  traceabilityData: TraceabilityDataSchema,
  linksTo: LinksToSchema.optional()
});

export type EvidenceAnalysis = z.infer<typeof EvidenceAnalysisSchema>;

export const EvidenceImplementationSchema = z.object({
  agentId: z.string(),
  taskId: z.string(),
  filesModified: z.array(z.object({
    path: z.string(),
    action: z.enum(["created", "modified", "deleted"]),
    summary: z.string()
  })),
  symbolsChanged: z.array(z.string()),
  typecheckPassed: z.boolean(),
  linksTo: LinksToSchema.optional()
});

export type EvidenceImplementation = z.infer<typeof EvidenceImplementationSchema>;

export const EvidenceValidationSchema = z.object({
  agentId: z.string(),
  taskId: z.string(),
  testsPassed: z.number().int().nonnegative(),
  testsFailed: z.number().int().nonnegative(),
  screenshots: z.array(z.string()),
  linksTo: LinksToSchema.optional()
});

export type EvidenceValidation = z.infer<typeof EvidenceValidationSchema>;

export const ChainStatusSchema = z.object({
  analysisLinked: z.boolean(),
  implementationLinked: z.boolean(),
  validationLinked: z.boolean(),
  coveragePercent: z.number().min(0).max(100),
  acceptanceCriteriaVerified: z.number().int().nonnegative(),
  acceptanceCriteriaTotal: z.number().int().nonnegative()
});

export type ChainStatus = z.infer<typeof ChainStatusSchema>;

export const EvidenceChainSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  requirement: EvidenceRequirementSchema,
  analysis: EvidenceAnalysisSchema.optional(),
  implementation: EvidenceImplementationSchema.optional(),
  validation: EvidenceValidationSchema.optional(),
  chainStatus: ChainStatusSchema
});

export type EvidenceChain = z.infer<typeof EvidenceChainSchema>;
