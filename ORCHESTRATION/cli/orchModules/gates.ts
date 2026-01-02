/**
 * Gates module - Phase gate validation commands
 */

import { createContextHub } from "../../lib/context-hub.js";
import {
  printHeader,
  printSuccess,
  printError,
  printInfo,
  printJson,
  isJsonOutput,
  printUsage
} from "./output.js";
import { getSessionId, filterFlags } from "./flags.js";

// =============================================================================
// GATE COMMANDS
// =============================================================================

/**
 * Checks if a phase gate passes based on configured validation criteria.
 *
 * @description Handles the `gate check` CLI command. Validates that all gate requirements
 * are met before allowing phase advancement. Supports memory patterns, traceability fields,
 * typecheck, tests, evidence chains, coverage thresholds, and custom DSL conditions.
 *
 * @param {string} phaseId - The phase identifier to check gate conditions for
 *
 * @returns {Promise<void>} Outputs gate check results to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Basic gate check
 * npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1
 *
 * # Check with memory pattern requirement
 * npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --memory "ANALYSIS_*"
 *
 * # Check with typecheck and tests
 * npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --typecheck --tests
 *
 * # Check with evidence chain requirement
 * npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --evidence
 *
 * # Check with coverage threshold
 * npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --coverage 80
 *
 * # Check with custom DSL condition
 * npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --condition "memory.exists('ANALYSIS_*')"
 *
 * # Output as JSON
 * npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if gate check fails
 * @throws Exits with code 1 if --coverage value is invalid (not 0-100)
 */

export async function gateCheck(phaseId: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found. Create one with: orch session new");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);

  // Parse optional validation flags
  const validation: {
    requiredMemories?: string[];
    requiredTraceability?: string[];
    requiredTypecheck?: boolean;
    requiredTests?: boolean;
    requiredEvidence?: boolean;
    requiredCoverage?: number;
    condition?: string;
  } = {};

  const memoryIdx = process.argv.indexOf("--memory");
  if (memoryIdx !== -1 && process.argv[memoryIdx + 1]) {
    validation.requiredMemories = process.argv[memoryIdx + 1].split(",");
  }

  const traceIdx = process.argv.indexOf("--traceability");
  if (traceIdx !== -1 && process.argv[traceIdx + 1]) {
    validation.requiredTraceability = process.argv[traceIdx + 1].split(",");
  }

  if (process.argv.includes("--typecheck")) {
    validation.requiredTypecheck = true;
  }

  if (process.argv.includes("--tests")) {
    validation.requiredTests = true;
  }

  // Parse --evidence flag for requiring evidence chains
  if (process.argv.includes("--evidence")) {
    validation.requiredEvidence = true;
  }

  // Parse --coverage flag for minimum coverage requirement
  const coverageIdx = process.argv.indexOf("--coverage");
  if (coverageIdx !== -1 && process.argv[coverageIdx + 1]) {
    const coverageValue = parseInt(process.argv[coverageIdx + 1], 10);
    if (!isNaN(coverageValue) && coverageValue >= 0 && coverageValue <= 100) {
      validation.requiredCoverage = coverageValue;
    } else {
      printError("--coverage value must be a number between 0 and 100");
      process.exit(1);
    }
  }

  // Parse --condition flag for DSL condition string
  const conditionIdx = process.argv.indexOf("--condition");
  if (conditionIdx !== -1 && process.argv[conditionIdx + 1]) {
    validation.condition = process.argv[conditionIdx + 1];
  }

  const hasValidation = Object.keys(validation).length > 0;
  
  // Use async gate check with progress streaming
  const result = await hub.checkGateAsync(
    phaseId,
    hasValidation ? validation : undefined,
    {
      onProgress: (msg) => {
        // Only show progress when not in JSON output mode
        if (!isJsonOutput()) {
          console.log(msg);
        }
      }
    }
  );

  if (isJsonOutput()) {
    printJson(result);
  } else {
    printHeader(`Gate Check: ${phaseId}`);
    printInfo("Status", result.passed ? "[OK] PASSED" : "[X] FAILED");
    printInfo("Checked At", result.checkedAt);

    if (result.results.length > 0) {
      console.log("\n  Check Results:");
      for (const r of result.results) {
        const icon = r.passed ? "[OK]" : "[X]";
        console.log(`    ${icon} ${r.check}${r.message ? `: ${r.message}` : ""}`);
      }
    }

    if (result.blockers.length > 0) {
      console.log("\n  Blockers:");
      for (const b of result.blockers) {
        console.log(`    - ${b}`);
      }
    }

    if (result.passed) {
      console.log("\n  Ready to advance: orch gate advance " + phaseId);
    }
  }

  if (!result.passed) {
    process.exit(1);
  }
}

/**
 * Advances to the next phase after verifying gate conditions pass.
 *
 * @description Handles the `gate advance` CLI command. First checks the gate conditions
 * for the specified phase, and if passed, updates the orchestrator state to advance
 * to the next phase in the plan.
 *
 * @param {string} phaseId - The phase identifier to advance from
 *
 * @returns {Promise<void>} Outputs advance results to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Advance from phase-1 to next phase
 * npx tsx ORCHESTRATION/cli/orch.ts gate advance phase-1
 *
 * # Advance with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts gate advance phase-1 --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if gate check fails (cannot advance)
 */

export async function gateAdvance(phaseId: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const result = hub.advancePhase(phaseId);

  if (isJsonOutput()) {
    printJson(result);
  } else {
    if (result.success) {
      printHeader("Phase Advanced");
      printInfo("From Phase", phaseId);
      printInfo("To Phase", result.nextPhase || "COMPLETE");
      printInfo("Gate", "[OK] PASSED");
      printSuccess("Successfully advanced to next phase");
    } else {
      printHeader("Phase Advance Failed");
      printInfo("Phase", phaseId);
      printInfo("Gate", "[X] FAILED");
      printError(result.error || "Unknown error");

      if (result.gateResult.blockers.length > 0) {
        console.log("\n  Blockers:");
        for (const b of result.gateResult.blockers) {
          console.log(`    - ${b}`);
        }
      }
      process.exit(1);
    }
  }
}

/**
 * Lists gate check history for a session or specific phase.
 *
 * @description Handles the `gate list` CLI command. Displays all recorded gate check
 * results with pass/fail status and timestamps. Can be filtered to a specific phase.
 *
 * @param {string} [phaseId] - Optional phase ID to filter results. If omitted, shows all phases.
 *
 * @returns {Promise<void>} Outputs gate history to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # List all gate check history
 * npx tsx ORCHESTRATION/cli/orch.ts gate list
 *
 * # List history for specific phase
 * npx tsx ORCHESTRATION/cli/orch.ts gate list phase-1
 *
 * # List with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts gate list --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 */

export async function gateList(phaseId?: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const results = hub.listGateResults(phaseId);

  if (isJsonOutput()) {
    printJson({ results });
  } else {
    printHeader(phaseId ? `Gate History: ${phaseId}` : "Gate History");
    if (results.length === 0) {
      console.log("  No gate checks recorded");
      console.log("\n  Check a gate with: orch gate check <phaseId>");
    } else {
      for (const r of results) {
        const icon = r.passed ? "[OK]" : "[X]";
        console.log(`  ${icon} ${r.phaseId.padEnd(20)} ${r.checkedAt}`);
      }
      console.log(`\n  Total: ${results.length} check(s)`);
    }
  }
}

/**
 * Reads detailed gate check result for a specific phase.
 *
 * @description Handles the `gate read` CLI command. Retrieves the most recent gate
 * check result for the specified phase, including all check details and blockers.
 *
 * @param {string} phaseId - The phase identifier to read gate result for
 *
 * @returns {Promise<void>} Outputs gate result details to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Read gate result for phase-1
 * npx tsx ORCHESTRATION/cli/orch.ts gate read phase-1
 *
 * # Read with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts gate read phase-1 --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if gate result not found
 */

export async function gateRead(phaseId: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const result = hub.readGateResult(phaseId);

  if (isJsonOutput()) {
    printJson(result);
  } else {
    if (result.success && result.data) {
      printHeader(`Gate Result: ${phaseId}`);
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      printError(`Failed to read gate result: ${result.error}`);
      process.exit(1);
    }
  }
}

// =============================================================================
// GATE ROUTER
// =============================================================================

/**
 * Main router for gate CLI subcommands.
 *
 * @description Handles the `gate` CLI command and routes to appropriate subcommand handlers:
 * - `check`: Check if phase gate conditions pass
 * - `advance`: Advance to next phase if gate passes
 * - `list`: List gate check history
 * - `read`: Read detailed gate result
 *
 * @returns {Promise<void>} Routes to appropriate subcommand handler
 *
 * @example
 * ```bash
 * # Check phase gate
 * npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --typecheck --memory "ANALYSIS_*"
 *
 * # Advance to next phase
 * npx tsx ORCHESTRATION/cli/orch.ts gate advance phase-1
 *
 * # List gate history
 * npx tsx ORCHESTRATION/cli/orch.ts gate list
 *
 * # Read gate details
 * npx tsx ORCHESTRATION/cli/orch.ts gate read phase-1
 * ```
 *
 * @throws Exits with code 1 if required phaseId missing for check/advance/read
 * @throws Prints usage if unknown subcommand provided
 */

export async function handleGate(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const arg3 = args[2];

  switch (subcommand) {
    case "check":
      if (!arg3) {
        printError("Phase ID required");
        process.exit(1);
      }
      await gateCheck(arg3);
      break;
    case "advance":
      if (!arg3) {
        printError("Phase ID required");
        process.exit(1);
      }
      await gateAdvance(arg3);
      break;
    case "list":
      await gateList(arg3);
      break;
    case "read":
      if (!arg3) {
        printError("Phase ID required");
        process.exit(1);
      }
      await gateRead(arg3);
      break;
    default:
      printUsage();
  }
}
