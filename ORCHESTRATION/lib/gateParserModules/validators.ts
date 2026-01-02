/**
 * GATE DSL PARSER - VALIDATORS
 * Check implementations for gate conditions
 *
 * All check functions return a CheckResult indicating pass/fail with optional message.
 * These are used by the evaluator to determine gate outcomes.
 */

import * as fs from "fs";
import * as path from "path";
import type { GateContext, CheckResult } from "./types.js";

// =============================================================================
// TYPECHECK VALIDATOR
// =============================================================================

/**
 * Runs TypeScript type checking via npm run typecheck
 * Returns passed=true if exit code is 0 (no errors)
 */
import { logWarn } from "../utils/logger.js";

export async function checkTypecheck(context: GateContext): Promise<CheckResult> {
  try {
    const { stderr, exitCode } = await context.runCommand("npm run typecheck", 60000);

    if (exitCode === 0) {
      return { check: "typecheck", passed: true, message: "0 errors" };
    }

    const errorMatch = stderr.match(/Found (\d+) error/);
    const errorCount = errorMatch ? errorMatch[1] : "unknown";
    return { check: "typecheck", passed: false, message: `${errorCount} errors` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Typecheck failed";
    return { check: "typecheck", passed: false, message };
  }
}

// =============================================================================
// TESTS VALIDATOR
// =============================================================================

/**
 * Runs test suite via npm test
 * Returns passed=true if exit code is 0
 */
export async function checkTests(context: GateContext): Promise<CheckResult> {
  try {
    const { exitCode } = await context.runCommand("npm test", 120000);

    if (exitCode === 0) {
      return { check: "tests", passed: true };
    }
    return { check: "tests", passed: false, message: "Tests failed" };
  } catch (error) {
    logWarn("gateParser:checkTests", error);
    return { check: "tests", passed: false, message: "Tests failed" };
  }
}

// =============================================================================
// MEMORY VALIDATOR
// =============================================================================

/**
 * Checks if a Serena memory file matching the pattern exists
 * Pattern supports * wildcard (glob-style matching)
 */
export async function checkMemory(pattern: string, context: GateContext): Promise<CheckResult> {
  try {
    const memoryFiles = fs.existsSync(context.memoriesPath)
      ? fs.readdirSync(context.memoriesPath).filter(f => f.endsWith(".md"))
      : [];

    // Simple glob matching (supports * wildcard)
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "\\.md$");
    const matches = memoryFiles.filter(f => regex.test(f));

    if (matches.length > 0) {
      return { check: `memory:${pattern}`, passed: true, message: `Found: ${matches.join(", ")}` };
    }
    return { check: `memory:${pattern}`, passed: false, message: `No memory matching '${pattern}' found` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Memory check failed";
    return { check: `memory:${pattern}`, passed: false, message };
  }
}

// =============================================================================
// TRACEABILITY VALIDATOR
// =============================================================================

/**
 * Checks if traceability data exists in linked memories
 * Fields: analyzed_symbols, entry_points, data_flow_map
 */
export async function checkTraceability(field: string, context: GateContext): Promise<CheckResult> {
  try {
    // Read linked memories from session to check traceability fields
    const linkedMemoriesPath = path.join(context.sessionPath, "memory");

    if (!fs.existsSync(linkedMemoriesPath)) {
      return { check: `traceability:${field}`, passed: false, message: "No linked memories found" };
    }

    const files = fs.readdirSync(linkedMemoriesPath).filter(f => f.endsWith(".json"));

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(linkedMemoriesPath, file), "utf-8");
        const data = JSON.parse(content);

        if (data.traceabilityData) {
          const td = data.traceabilityData;
          if (field === "analyzed_symbols" && td.analyzed_symbols?.length > 0) {
            return { check: `traceability:${field}`, passed: true };
          }
          if (field === "entry_points" && td.entry_points?.length > 0) {
            return { check: `traceability:${field}`, passed: true };
          }
          if (field === "data_flow_map" && Object.keys(td.data_flow_map || {}).length > 0) {
            return { check: `traceability:${field}`, passed: true };
          }
        }
      } catch (error) {
        logWarn("gateParser:checkTraceability:file", error);
        // Skip invalid files
      }
    }

    return { check: `traceability:${field}`, passed: false, message: `Missing traceability field: ${field}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Traceability check failed";
    return { check: `traceability:${field}`, passed: false, message };
  }
}

// =============================================================================
// EVIDENCE VALIDATOR
// =============================================================================

/**
 * Checks evidence chain existence or coverage
 * - evidence:CHAIN_ID exists - checks if specific chain file exists
 * - evidence:coverage - checks if any coverage > 0
 */
export async function checkEvidence(
  pattern: string | undefined,
  field: string | undefined,
  context: GateContext
): Promise<CheckResult> {
  const evidenceDir = path.join(context.sessionPath, "evidence");

  // evidence:CHAIN_ID exists
  if (pattern && (field === "exists" || !field)) {
    const chainPath = path.join(evidenceDir, `${pattern}.json`);
    const exists = fs.existsSync(chainPath);

    return {
      check: `evidence:${pattern} exists`,
      passed: exists,
      message: exists ? "Evidence chain found" : "Evidence chain not found"
    };
  }

  // evidence:coverage (without threshold - just check if any coverage > 0)
  if (field === "coverage" && !pattern) {
    if (!fs.existsSync(evidenceDir)) {
      return { check: "evidence:coverage", passed: false, message: "No evidence directory found" };
    }

    const files = fs.readdirSync(evidenceDir).filter(f => f.endsWith(".json"));

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(evidenceDir, file), "utf-8");
        const data = JSON.parse(content);
        if (data.chainStatus?.coveragePercent > 0) {
          return { check: "evidence:coverage", passed: true, message: `Coverage: ${data.chainStatus.coveragePercent}%` };
        }
      } catch (error) {
        logWarn("gateParser:checkEvidence:file", error);
        // Skip invalid files
      }
    }

    return { check: "evidence:coverage", passed: false, message: "No evidence with coverage found" };
  }

  return { check: "evidence", passed: false, message: "Invalid evidence check specification" };
}

// =============================================================================
// EVIDENCE THRESHOLD VALIDATOR
// =============================================================================

/**
 * Checks evidence coverage against a threshold
 * Aggregates coverage across all evidence chains and compares to value
 */
export async function checkEvidenceThreshold(
  field: string,
  operator: string,
  value: number,
  context: GateContext
): Promise<CheckResult> {
  if (field !== "coverage") {
    return { check: `evidence:${field}`, passed: false, message: `Unknown evidence field: ${field}` };
  }

  const evidenceDir = path.join(context.sessionPath, "evidence");

  if (!fs.existsSync(evidenceDir)) {
    return {
      check: `evidence:${field}${operator}${value}`,
      passed: false,
      message: "No evidence directory found"
    };
  }

  const files = fs.readdirSync(evidenceDir).filter(f => f.endsWith(".json"));
  let totalCoverage = 0;
  let count = 0;

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(evidenceDir, file), "utf-8");
      const data = JSON.parse(content);
      if (typeof data.chainStatus?.coveragePercent === "number") {
        totalCoverage += data.chainStatus.coveragePercent;
        count++;
      }
    } catch (error) {
      logWarn("gateParser:checkEvidenceThreshold:file", error);
      // Skip invalid files
    }
  }

  const avgCoverage = count > 0 ? totalCoverage / count : 0;

  let passed = false;
  switch (operator) {
    case ">=": passed = avgCoverage >= value; break;
    case "<=": passed = avgCoverage <= value; break;
    case ">": passed = avgCoverage > value; break;
    case "<": passed = avgCoverage < value; break;
    case "=": passed = avgCoverage === value; break;
  }

  return {
    check: `evidence:${field}${operator}${value}`,
    passed,
    message: `Coverage: ${avgCoverage.toFixed(1)}% (required: ${operator}${value}%)`
  };
}

// =============================================================================
// TESTS THRESHOLD VALIDATOR
// =============================================================================

/**
 * Checks test pass rate against a threshold
 * Attempts to parse test output for pass/fail counts
 */
export async function checkTestsThreshold(
  field: string,
  operator: string,
  value: number,
  context: GateContext
): Promise<CheckResult> {
  try {
    const { stdout, exitCode } = await context.runCommand("npm test -- --json 2>/dev/null || npm test", 120000);

    // Try to parse JSON output for detailed results
    // This is a simplified implementation - real test runners may vary
    let passed = 0;
    let total = 0;

    // Try to extract test counts from common formats
    const passedMatch = stdout.match(/(\d+)\s+pass(?:ed|ing)?/i);
    const failedMatch = stdout.match(/(\d+)\s+fail(?:ed|ing)?/i);
    const totalMatch = stdout.match(/(\d+)\s+(?:test|spec)s?(?:\s+total)?/i);

    if (passedMatch) passed = parseInt(passedMatch[1], 10);
    if (failedMatch) total = passed + parseInt(failedMatch[1], 10);
    if (totalMatch) total = parseInt(totalMatch[1], 10);

    // If we couldn't parse, fall back to exit code
    if (total === 0) {
      const result = exitCode === 0;
      return {
        check: `tests[${field}]${operator}${value}`,
        passed: result,
        message: result ? "Tests passed" : "Tests failed (could not parse count)"
      };
    }

    const percentage = (passed / total) * 100;

    let checkPassed = false;
    switch (operator) {
      case ">=": checkPassed = percentage >= value; break;
      case "<=": checkPassed = percentage <= value; break;
      case ">": checkPassed = percentage > value; break;
      case "<": checkPassed = percentage < value; break;
      case "=": checkPassed = percentage === value; break;
    }

    return {
      check: `tests[${field}]${operator}${value}`,
      passed: checkPassed,
      message: `${field}: ${percentage.toFixed(1)}% (${passed}/${total})`
    };
  } catch (error) {
    logWarn("gateParser:checkTestsThreshold", error);
    return { check: `tests[${field}]${operator}${value}`, passed: false, message: "Tests failed" };
  }
}
