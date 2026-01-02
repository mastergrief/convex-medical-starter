/**
 * LEGACY GATE CHECKING
 * Gate validation using legacy validation object format
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import {
  GateValidation,
  GateResult,
  createTimestamp
} from "../../../../schemas/index.js";
import type { ContextHubConfig, WriteResult, ReadResult, LinkedMemoryInfo } from "../../types.js";
import type { LinkedMemoryData } from "../../memory.js";
import { logWarn } from "../../../utils/logger.js";
import { asyncSpawn } from "../../../utils/asyncSpawn.js";
import { TOTAL_GATE_TIMEOUT_MS, createTimeoutTracker } from "./timeout.js";

/**
 * Check gate using legacy validation object format (internal use)
 */
export function checkGateLegacy(
  _config: ContextHubConfig,
  phaseId: string,
  gateValidation: GateValidation,
  listLinkedMemories: () => LinkedMemoryInfo[],
  getLinkedMemory: (name: string) => ReadResult<LinkedMemoryData>,
  writeGateResultFn: (result: GateResult) => WriteResult
): GateResult {
  const timeout = createTimeoutTracker(TOTAL_GATE_TIMEOUT_MS);
  const results: Array<{ check: string; passed: boolean; message?: string }> = [];
  const blockers: string[] = [];

  // Check required memories (glob patterns)
  if (gateValidation.requiredMemories && gateValidation.requiredMemories.length > 0) {
    const serenaMemoriesDir = path.join(process.cwd(), ".serena", "memories");

    for (const pattern of gateValidation.requiredMemories) {
      const memoryFiles = fs.existsSync(serenaMemoriesDir)
        ? fs.readdirSync(serenaMemoriesDir).filter(f => f.endsWith(".md"))
        : [];

      // Simple glob matching (supports * wildcard)
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "\\.md$");
      const matches = memoryFiles.filter(f => regex.test(f));

      if (matches.length > 0) {
        results.push({ check: `memory:${pattern}`, passed: true, message: `Found: ${matches.join(", ")}` });
      } else {
        results.push({ check: `memory:${pattern}`, passed: false, message: `No memory matching '${pattern}' found` });
        blockers.push(`Missing memory: ${pattern}`);
      }
    }
  }

  // Check required traceability fields in linked memories
  if (gateValidation.requiredTraceability && gateValidation.requiredTraceability.length > 0) {
    const linkedMemories = listLinkedMemories();
    const memoriesWithTraceability = linkedMemories.filter(m => m.hasTraceability);

    if (memoriesWithTraceability.length === 0) {
      results.push({
        check: "traceability",
        passed: false,
        message: "No linked memories with traceability data"
      });
      blockers.push("No traceability data available");
    } else {
      // Check each required field
      for (const field of gateValidation.requiredTraceability) {
        let found = false;
        for (const mem of memoriesWithTraceability) {
          const memData = getLinkedMemory(mem.name);
          if (memData.success && memData.data?.traceabilityData) {
            const td = memData.data.traceabilityData;
            if (field === "analyzed_symbols" && td.analyzed_symbols?.length > 0) found = true;
            if (field === "entry_points" && td.entry_points?.length > 0) found = true;
            if (field === "data_flow_map" && Object.keys(td.data_flow_map || {}).length > 0) found = true;
          }
        }
        if (found) {
          results.push({ check: `traceability:${field}`, passed: true });
        } else {
          results.push({ check: `traceability:${field}`, passed: false, message: `Missing traceability field: ${field}` });
          blockers.push(`Missing traceability: ${field}`);
        }
      }
    }
  }

  // Check for timeout before typecheck
  if (timeout.isExpired()) {
    results.push({ check: "timeout", passed: false, message: `Gate check timed out after ${TOTAL_GATE_TIMEOUT_MS / 1000}s` });
    blockers.push("Gate check timed out");
    const gateResult: GateResult = {
      phaseId,
      passed: false,
      checkedAt: createTimestamp(),
      results,
      blockers,
      duration: timeout.elapsedMs()
    };
    writeGateResultFn(gateResult);
    return gateResult;
  }

  // Check typecheck if required
  if (gateValidation.requiredTypecheck) {
    try {
      execSync("npm run typecheck", {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 60000
      });
      results.push({ check: "typecheck", passed: true, message: "0 errors" });
    } catch (error) {
      const stderr = error instanceof Error && "stderr" in error
        ? String((error as { stderr: Buffer }).stderr)
        : "Unknown error";
      const errorMatch = stderr.match(/Found (\d+) error/);
      const errorCount = errorMatch ? errorMatch[1] : "unknown";
      results.push({ check: "typecheck", passed: false, message: `${errorCount} errors` });
      blockers.push(`Typecheck failed: ${errorCount} errors`);
    }
  }

  // Check for timeout before tests
  if (timeout.isExpired()) {
    results.push({ check: "timeout", passed: false, message: `Gate check timed out after ${TOTAL_GATE_TIMEOUT_MS / 1000}s` });
    blockers.push("Gate check timed out");
    const gateResult: GateResult = {
      phaseId,
      passed: false,
      checkedAt: createTimestamp(),
      results,
      blockers,
      duration: timeout.elapsedMs()
    };
    writeGateResultFn(gateResult);
    return gateResult;
  }

  // Check tests if required
  if (gateValidation.requiredTests) {
    try {
      execSync("npm test", {
        cwd: process.cwd(),
        stdio: "pipe",
        timeout: 120000
      });
      results.push({ check: "tests", passed: true });
    } catch (error) {
      logWarn("gates:checking:tests", error);
      results.push({ check: "tests", passed: false, message: "Tests failed" });
      blockers.push("Tests failed");
    }
  }

  // Run custom checks
  if (gateValidation.customChecks && gateValidation.customChecks.length > 0) {
    for (const check of gateValidation.customChecks) {
      // Check for timeout before each custom check
      if (timeout.isExpired()) {
        results.push({ check: "timeout", passed: false, message: `Gate check timed out after ${TOTAL_GATE_TIMEOUT_MS / 1000}s` });
        blockers.push("Gate check timed out");
        break;
      }

      try {
        const output = execSync(check.command, {
          cwd: process.cwd(),
          stdio: "pipe",
          timeout: 30000
        }).toString().trim();

        if (check.expectedOutput) {
          const passed = output.includes(check.expectedOutput);
          results.push({
            check: `custom:${check.name}`,
            passed,
            message: passed ? output : `Expected '${check.expectedOutput}', got '${output}'`
          });
          if (!passed) blockers.push(`Custom check '${check.name}' failed`);
        } else {
          results.push({ check: `custom:${check.name}`, passed: true, message: output });
        }
      } catch (error) {
        results.push({
          check: `custom:${check.name}`,
          passed: false,
          message: error instanceof Error ? error.message : "Command failed"
        });
        blockers.push(`Custom check '${check.name}' failed`);
      }
    }
  }

  const passed = blockers.length === 0;
  const gateResult: GateResult = {
    phaseId,
    passed,
    checkedAt: createTimestamp(),
    results,
    blockers,
    duration: timeout.elapsedMs()
  };

  // Save gate result
  writeGateResultFn(gateResult);

  return gateResult;
}


/**
 * Async version of checkGateLegacy with streaming progress callbacks.
 * Uses asyncSpawn for non-blocking subprocess execution.
 */
export async function checkGateLegacyAsync(
  _config: ContextHubConfig,
  phaseId: string,
  gateValidation: GateValidation,
  listLinkedMemories: () => LinkedMemoryInfo[],
  getLinkedMemory: (name: string) => ReadResult<LinkedMemoryData>,
  writeGateResultFn: (result: GateResult) => WriteResult,
  options?: { onProgress?: (msg: string) => void }
): Promise<GateResult> {
  const onProgress = options?.onProgress || (() => {});
  const timeout = createTimeoutTracker(TOTAL_GATE_TIMEOUT_MS);
  const results: Array<{ check: string; passed: boolean; message?: string }> = [];
  const blockers: string[] = [];

  // Check required memories (glob patterns) - no subprocess needed
  if (gateValidation.requiredMemories && gateValidation.requiredMemories.length > 0) {
    const serenaMemoriesDir = path.join(process.cwd(), ".serena", "memories");

    for (const pattern of gateValidation.requiredMemories) {
      const memoryFiles = fs.existsSync(serenaMemoriesDir)
        ? fs.readdirSync(serenaMemoriesDir).filter(f => f.endsWith(".md"))
        : [];

      // Simple glob matching (supports * wildcard)
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "\\.md$");
      const matches = memoryFiles.filter(f => regex.test(f));

      if (matches.length > 0) {
        results.push({ check: `memory:${pattern}`, passed: true, message: `Found: ${matches.join(", ")}` });
      } else {
        results.push({ check: `memory:${pattern}`, passed: false, message: `No memory matching '${pattern}' found` });
        blockers.push(`Missing memory: ${pattern}`);
      }
    }
  }

  // Check required traceability fields in linked memories - no subprocess needed
  if (gateValidation.requiredTraceability && gateValidation.requiredTraceability.length > 0) {
    const linkedMemories = listLinkedMemories();
    const memoriesWithTraceability = linkedMemories.filter(m => m.hasTraceability);

    if (memoriesWithTraceability.length === 0) {
      results.push({
        check: "traceability",
        passed: false,
        message: "No linked memories with traceability data"
      });
      blockers.push("No traceability data available");
    } else {
      // Check each required field
      for (const field of gateValidation.requiredTraceability) {
        let found = false;
        for (const mem of memoriesWithTraceability) {
          const memData = getLinkedMemory(mem.name);
          if (memData.success && memData.data?.traceabilityData) {
            const td = memData.data.traceabilityData;
            if (field === "analyzed_symbols" && td.analyzed_symbols?.length > 0) found = true;
            if (field === "entry_points" && td.entry_points?.length > 0) found = true;
            if (field === "data_flow_map" && Object.keys(td.data_flow_map || {}).length > 0) found = true;
          }
        }
        if (found) {
          results.push({ check: `traceability:${field}`, passed: true });
        } else {
          results.push({ check: `traceability:${field}`, passed: false, message: `Missing traceability field: ${field}` });
          blockers.push(`Missing traceability: ${field}`);
        }
      }
    }
  }

  // Check for timeout before typecheck
  if (timeout.isExpired()) {
    results.push({ check: "timeout", passed: false, message: `Gate check timed out after ${TOTAL_GATE_TIMEOUT_MS / 1000}s` });
    blockers.push("Gate check timed out");
    const gateResult: GateResult = {
      phaseId,
      passed: false,
      checkedAt: createTimestamp(),
      results,
      blockers,
      duration: timeout.elapsedMs()
    };
    writeGateResultFn(gateResult);
    return gateResult;
  }

  // Check typecheck if required (async with streaming)
  if (gateValidation.requiredTypecheck) {
    onProgress("Running typecheck...");
    const result = await asyncSpawn("npm", ["run", "typecheck"], {
      timeout: Math.min(60000, timeout.remainingMs()),
      onStderr: (data) => {
        if (data.includes("error")) {
          onProgress(`  TypeScript: ${data.trim()}`);
        }
      }
    });

    if (result.timedOut) {
      results.push({ check: "typecheck", passed: false, message: "Timed out (>60s)" });
      blockers.push("Typecheck timed out");
      onProgress("  [X] Typecheck timed out");
    } else if (result.exitCode === 0) {
      results.push({ check: "typecheck", passed: true, message: "0 errors" });
      onProgress("  [OK] Typecheck passed");
    } else {
      const errorMatch = result.stderr.match(/Found (\d+) error/);
      const errorCount = errorMatch ? errorMatch[1] : "unknown";
      results.push({ check: "typecheck", passed: false, message: `${errorCount} errors` });
      blockers.push(`Typecheck failed: ${errorCount} errors`);
      onProgress(`  [X] Typecheck failed: ${errorCount} errors`);
    }
  }

  // Check for timeout before tests
  if (timeout.isExpired()) {
    results.push({ check: "timeout", passed: false, message: `Gate check timed out after ${TOTAL_GATE_TIMEOUT_MS / 1000}s` });
    blockers.push("Gate check timed out");
    const gateResult: GateResult = {
      phaseId,
      passed: false,
      checkedAt: createTimestamp(),
      results,
      blockers,
      duration: timeout.elapsedMs()
    };
    writeGateResultFn(gateResult);
    return gateResult;
  }

  // Check tests if required (async with streaming)
  if (gateValidation.requiredTests) {
    onProgress("Running tests...");
    const result = await asyncSpawn("npm", ["test", "--", "--run"], {
      timeout: Math.min(120000, timeout.remainingMs()),
      onStdout: (data) => {
        // Stream test progress (show pass/fail indicators)
        const lines = data.split("\n").filter((l: string) => l.includes("PASS") || l.includes("FAIL"));
        lines.forEach((l: string) => onProgress(`  ${l.trim()}`));
      }
    });

    if (result.timedOut) {
      results.push({ check: "tests", passed: false, message: "Timed out (>120s)" });
      blockers.push("Tests timed out");
      onProgress("  [X] Tests timed out");
    } else if (result.exitCode === 0) {
      results.push({ check: "tests", passed: true, message: "All tests passed" });
      onProgress("  [OK] All tests passed");
    } else {
      results.push({ check: "tests", passed: false, message: "Test suite failed" });
      blockers.push("Test suite failed");
      onProgress("  [X] Tests failed");
    }
  }

  // Run custom checks (async with streaming)
  if (gateValidation.customChecks && gateValidation.customChecks.length > 0) {
    for (const check of gateValidation.customChecks) {
      // Check for timeout before each custom check
      if (timeout.isExpired()) {
        results.push({ check: "timeout", passed: false, message: `Gate check timed out after ${TOTAL_GATE_TIMEOUT_MS / 1000}s` });
        blockers.push("Gate check timed out");
        break;
      }

      onProgress(`Running custom check: ${check.name}...`);
      const result = await asyncSpawn("sh", ["-c", check.command], {
        timeout: Math.min(30000, timeout.remainingMs())
      });

      if (result.timedOut) {
        results.push({ check: `custom:${check.name}`, passed: false, message: "Timed out (>30s)" });
        blockers.push(`Custom check '${check.name}' timed out`);
        onProgress(`  [X] ${check.name} timed out`);
      } else if (result.exitCode === 0) {
        if (check.expectedOutput) {
          const output = result.stdout.trim();
          const passed = output.includes(check.expectedOutput);
          results.push({
            check: `custom:${check.name}`,
            passed,
            message: passed ? output : `Expected '${check.expectedOutput}', got '${output}'`
          });
          if (!passed) {
            blockers.push(`Custom check '${check.name}' failed`);
            onProgress(`  [X] ${check.name} failed: expected output not found`);
          } else {
            onProgress(`  [OK] ${check.name} passed`);
          }
        } else {
          results.push({ check: `custom:${check.name}`, passed: true, message: result.stdout.trim() });
          onProgress(`  [OK] ${check.name} passed`);
        }
      } else {
        results.push({
          check: `custom:${check.name}`,
          passed: false,
          message: result.stderr || "Command failed"
        });
        blockers.push(`Custom check '${check.name}' failed`);
        onProgress(`  [X] ${check.name} failed`);
      }
    }
  }

  const passed = blockers.length === 0;
  const gateResult: GateResult = {
    phaseId,
    passed,
    checkedAt: createTimestamp(),
    results,
    blockers,
    duration: timeout.elapsedMs()
  };

  // Save gate result
  writeGateResultFn(gateResult);

  return gateResult;
}
