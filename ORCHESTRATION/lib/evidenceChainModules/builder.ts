/**
 * EVIDENCE CHAIN BUILDER
 * Builder class for constructing evidence chains with fluent API
 */

import * as crypto from "crypto";
import {
  EvidenceChain,
  EvidenceRequirement,
  EvidenceAnalysis,
  EvidenceImplementation,
  EvidenceValidation,
  ChainStatus,
  LinksTo,
  TraceabilityData,
  validateEvidenceChain,
  safeValidateEvidenceChain,
  createTimestamp
} from "../../schemas/index.js";
import type { ChainValidationResult } from "./validation.js";

// =============================================================================
// TYPES
// =============================================================================

export interface AnalysisParams {
  agentId: string;
  taskId: string;
  memoryName: string;
  traceabilityData: TraceabilityData;
  linksTo?: LinksTo;
}

export interface ImplementationParams {
  agentId: string;
  taskId: string;
  filesModified: Array<{
    path: string;
    action: "created" | "modified" | "deleted";
    summary: string;
  }>;
  symbolsChanged: string[];
  typecheckPassed: boolean;
  linksTo?: LinksTo;
}

export interface ValidationParams {
  agentId: string;
  taskId: string;
  testsPassed: number;
  testsFailed: number;
  screenshots: string[];
  linksTo?: LinksTo;
}

// =============================================================================
// EVIDENCE CHAIN BUILDER CLASS
// =============================================================================

export class EvidenceChainBuilder {
  private id: string;
  private sessionId: string;
  private createdAt: string;
  private requirement: EvidenceRequirement | null = null;
  private analysis: EvidenceAnalysis | null = null;
  private implementation: EvidenceImplementation | null = null;
  private validation: EvidenceValidation | null = null;

  constructor(sessionId: string, id?: string) {
    this.sessionId = sessionId;
    this.id = id ?? crypto.randomUUID();
    this.createdAt = createTimestamp();
  }

  /**
   * Set the requirement that this evidence chain tracks
   */
  setRequirement(
    taskId: string,
    description: string,
    acceptanceCriteria: string[]
  ): EvidenceChainBuilder {
    this.requirement = {
      taskId,
      description,
      acceptanceCriteria
    };
    return this;
  }

  /**
   * Set the analysis phase evidence
   */
  setAnalysis(params: AnalysisParams): EvidenceChainBuilder {
    this.analysis = {
      agentId: params.agentId,
      taskId: params.taskId,
      memoryName: params.memoryName,
      traceabilityData: params.traceabilityData,
      linksTo: params.linksTo
    };
    return this;
  }

  /**
   * Set the implementation phase evidence
   */
  setImplementation(params: ImplementationParams): EvidenceChainBuilder {
    this.implementation = {
      agentId: params.agentId,
      taskId: params.taskId,
      filesModified: params.filesModified,
      symbolsChanged: params.symbolsChanged,
      typecheckPassed: params.typecheckPassed,
      linksTo: params.linksTo
    };
    return this;
  }

  /**
   * Set the validation phase evidence
   */
  setValidation(params: ValidationParams): EvidenceChainBuilder {
    this.validation = {
      agentId: params.agentId,
      taskId: params.taskId,
      testsPassed: params.testsPassed,
      testsFailed: params.testsFailed,
      screenshots: params.screenshots,
      linksTo: params.linksTo
    };
    return this;
  }

  /**
   * Validate chain links and calculate coverage
   */
  validateChainLinks(): ChainValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let coveragePercent = 0;

    // Requirement is mandatory
    if (!this.requirement) {
      errors.push("Requirement is required for evidence chain");
      return { valid: false, errors, warnings, coveragePercent: 0 };
    }

    const totalCriteria = this.requirement.acceptanceCriteria.length;
    let verifiedCriteria = 0;

    // Check analyst -> developer link
    if (this.analysis && this.implementation) {
      const analysisSymbols = this.analysis.traceabilityData.entry_points;
      const implementedSymbols = this.implementation.symbolsChanged;

      // Check if analysis entry points are covered by implementation
      const uncoveredSymbols = analysisSymbols.filter(
        (symbol) =>
          !implementedSymbols.some((impl) =>
            impl.toLowerCase().includes(symbol.split("/")[0].toLowerCase())
          )
      );

      if (uncoveredSymbols.length > 0) {
        warnings.push(
          `Analysis symbols not found in implementation: ${uncoveredSymbols.join(", ")}`
        );
      }

      // Check upstream linkage
      if (this.implementation.linksTo?.upstream?.analysisTaskId) {
        if (
          this.implementation.linksTo.upstream.analysisTaskId !==
          this.analysis.taskId
        ) {
          errors.push(
            `Implementation links to wrong analysis task: expected ${this.analysis.taskId}, got ${this.implementation.linksTo.upstream.analysisTaskId}`
          );
        }
      } else {
        warnings.push(
          "Implementation does not explicitly link to analysis task"
        );
      }
    }

    // Check developer -> browser link
    if (this.implementation && this.validation) {
      // Check upstream linkage
      if (this.validation.linksTo?.upstream?.implementationTaskId) {
        if (
          this.validation.linksTo.upstream.implementationTaskId !==
          this.implementation.taskId
        ) {
          errors.push(
            `Validation links to wrong implementation task: expected ${this.implementation.taskId}, got ${this.validation.linksTo.upstream.implementationTaskId}`
          );
        }
      } else {
        warnings.push(
          "Validation does not explicitly link to implementation task"
        );
      }

      // Check acceptance criteria verification
      if (this.validation.linksTo?.verification?.acceptanceCriteriaVerified) {
        const verifiedMap = new Map(
          this.validation.linksTo.verification.acceptanceCriteriaVerified.map(
            (v) => [v.criterion, v.verified]
          )
        );

        for (const criterion of this.requirement.acceptanceCriteria) {
          if (verifiedMap.get(criterion) === true) {
            verifiedCriteria++;
          } else if (!verifiedMap.has(criterion)) {
            warnings.push(`Acceptance criterion not verified: "${criterion}"`);
          }
        }
      }
    }

    // Calculate coverage
    if (totalCriteria > 0) {
      coveragePercent = Math.round((verifiedCriteria / totalCriteria) * 100);
    } else if (this.validation) {
      // If no criteria but validation exists, consider it covered
      coveragePercent =
        this.validation.testsFailed === 0 &&
        this.validation.testsPassed > 0
          ? 100
          : 0;
    }

    // Baseline coverage based on chain completion
    if (coveragePercent === 0 && errors.length === 0) {
      const stages = [this.analysis, this.implementation, this.validation].filter(
        Boolean
      ).length;
      coveragePercent = Math.round((stages / 3) * 100);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      coveragePercent
    };
  }

  /**
   * Build the evidence chain
   */
  build(): EvidenceChain {
    if (!this.requirement) {
      throw new Error("Requirement is required to build evidence chain");
    }

    const validation = this.validateChainLinks();
    const chainStatus: ChainStatus = {
      analysisLinked: this.analysis !== null,
      implementationLinked: this.implementation !== null,
      validationLinked: this.validation !== null,
      coveragePercent: validation.coveragePercent,
      acceptanceCriteriaVerified:
        this.validation?.linksTo?.verification?.acceptanceCriteriaVerified?.filter(
          (v) => v.verified
        ).length ?? 0,
      acceptanceCriteriaTotal: this.requirement.acceptanceCriteria.length
    };

    const chain: EvidenceChain = {
      id: this.id,
      sessionId: this.sessionId,
      createdAt: this.createdAt,
      updatedAt: createTimestamp(),
      requirement: this.requirement,
      analysis: this.analysis ?? undefined,
      implementation: this.implementation ?? undefined,
      validation: this.validation ?? undefined,
      chainStatus
    };

    // Validate against schema
    return validateEvidenceChain(chain);
  }

  /**
   * Serialize to JSON
   */
  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }

  /**
   * Load from existing chain data
   */
  static fromJSON(json: string): EvidenceChainBuilder {
    const data = JSON.parse(json);
    const result = safeValidateEvidenceChain(data);

    if (!result.success) {
      throw new Error(
        `Invalid evidence chain JSON: ${result.error?.message ?? "Unknown error"}`
      );
    }

    const chain = result.data;
    const builder = new EvidenceChainBuilder(chain.sessionId, chain.id);
    builder.createdAt = chain.createdAt;

    builder.setRequirement(
      chain.requirement.taskId,
      chain.requirement.description,
      chain.requirement.acceptanceCriteria
    );

    if (chain.analysis) {
      builder.setAnalysis({
        agentId: chain.analysis.agentId,
        taskId: chain.analysis.taskId,
        memoryName: chain.analysis.memoryName,
        traceabilityData: chain.analysis.traceabilityData,
        linksTo: chain.analysis.linksTo
      });
    }

    if (chain.implementation) {
      builder.setImplementation({
        agentId: chain.implementation.agentId,
        taskId: chain.implementation.taskId,
        filesModified: chain.implementation.filesModified,
        symbolsChanged: chain.implementation.symbolsChanged,
        typecheckPassed: chain.implementation.typecheckPassed,
        linksTo: chain.implementation.linksTo
      });
    }

    if (chain.validation) {
      builder.setValidation({
        agentId: chain.validation.agentId,
        taskId: chain.validation.taskId,
        testsPassed: chain.validation.testsPassed,
        testsFailed: chain.validation.testsFailed,
        screenshots: chain.validation.screenshots,
        linksTo: chain.validation.linksTo
      });
    }

    return builder;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a new evidence chain
 */
export function createEvidenceChain(
  sessionId: string,
  taskId: string,
  description: string,
  acceptanceCriteria: string[]
): EvidenceChainBuilder {
  return new EvidenceChainBuilder(sessionId).setRequirement(
    taskId,
    description,
    acceptanceCriteria
  );
}
