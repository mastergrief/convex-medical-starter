/**
 * Trace module - Evidence chain traceability commands
 */

import * as fs from "fs";
import * as path from "path";
import { createContextHub } from "../../lib/context-hub.js";
import {
  createEvidenceChain,
  loadEvidenceChain,
  saveEvidenceChain,
  formatChainSummary
} from "../../lib/evidence-chain.js";
import {
  printHeader,
  printError,
  printInfo,
  printJson,
  isJsonOutput,
  printUsage
} from "./output.js";
import { getSessionId, getStringFlag, filterFlags } from "./flags.js";

// =============================================================================
// TRACE COMMANDS
// =============================================================================

/**
 * Creates a new evidence chain for tracking task traceability.
 *
 * @description Handles the `trace create` CLI command. Creates an evidence chain
 * that links requirements to analysis, implementation, and validation stages.
 * The chain provides end-to-end traceability for orchestrated tasks.
 *
 * @param {string} taskId - The task identifier to create the chain for
 *
 * @returns {Promise<void>} Outputs chain creation result to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Create basic evidence chain
 * npx tsx ORCHESTRATION/cli/orch.ts trace create task-1.1
 *
 * # Create with description
 * npx tsx ORCHESTRATION/cli/orch.ts trace create task-1.1 --desc "Implement dark mode"
 *
 * # Create with acceptance criteria
 * npx tsx ORCHESTRATION/cli/orch.ts trace create task-1.1 --criteria "toggle works,persists"
 *
 * # Create with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts trace create task-1.1 --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 */

export async function traceCreate(taskId: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No active session. Run 'session new' first or set ORCH_SESSION");
    process.exit(1);
  }

  const description = getStringFlag("--desc") || `Task ${taskId}`;
  const criteriaStr = getStringFlag("--criteria") || "";
  const criteria = criteriaStr.split(",").filter(c => c.trim().length > 0);

  const hub = createContextHub(sessionId);
  const chainDir = path.join(hub.getSessionPath(), "evidence-chains");

  if (!fs.existsSync(chainDir)) {
    fs.mkdirSync(chainDir, { recursive: true });
  }

  const chain = createEvidenceChain(sessionId, taskId, description, criteria);
  const built = chain.build();
  const chainPath = path.join(chainDir, `${built.id}.json`);

  saveEvidenceChain(chain, chainPath);

  if (isJsonOutput()) {
    printJson({
      success: true,
      chainId: built.id,
      path: chainPath,
      chain: built
    });
  } else {
    printHeader("Evidence Chain Created");
    printInfo("Chain ID", built.id);
    printInfo("Task ID", taskId);
    printInfo("Description", description);
    printInfo("Criteria", criteria.length.toString());
    printInfo("Path", chainPath);
  }
}

/**
 * Reads detailed information about an evidence chain.
 *
 * @description Handles the `trace read` CLI command. Retrieves and displays
 * the full evidence chain including requirement, analysis links, implementation
 * links, validation links, and chain status.
 *
 * @param {string} chainId - The evidence chain identifier to read
 *
 * @returns {Promise<void>} Outputs chain details to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Read evidence chain details
 * npx tsx ORCHESTRATION/cli/orch.ts trace read chain-uuid-here
 *
 * # Read with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts trace read chain-uuid-here --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if chain not found
 */

export async function traceRead(chainId: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No active session. Run 'session new' first or set ORCH_SESSION");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const chainDir = path.join(hub.getSessionPath(), "evidence-chains");
  const chainPath = path.join(chainDir, `${chainId}.json`);

  if (!fs.existsSync(chainPath)) {
    printError(`Evidence chain not found: ${chainId}`);
    process.exit(1);
  }

  const chain = loadEvidenceChain(chainPath);
  const built = chain.build();

  if (isJsonOutput()) {
    printJson(built);
  } else {
    console.log("\n" + formatChainSummary(built));
  }
}

/**
 * Lists all evidence chains in the current session.
 *
 * @description Handles the `trace list` CLI command. Displays summary information
 * for all evidence chains including task IDs, descriptions, coverage percentages,
 * and linked stages (analysis, implementation, validation).
 *
 * @returns {Promise<void>} Outputs chain list to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # List all evidence chains
 * npx tsx ORCHESTRATION/cli/orch.ts trace list
 *
 * # List with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts trace list --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 */

export async function traceList(): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No active session. Run 'session new' first or set ORCH_SESSION");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const chainDir = path.join(hub.getSessionPath(), "evidence-chains");

  if (!fs.existsSync(chainDir)) {
    if (isJsonOutput()) {
      printJson({ chains: [] });
    } else {
      printInfo("Evidence Chains", "None");
    }
    return;
  }

  const files = fs.readdirSync(chainDir).filter(f => f.endsWith(".json"));
  const chains: Array<{
    id: string;
    taskId: string;
    description: string;
    coverage: number;
    stages: string[];
  }> = [];

  for (const file of files) {
    try {
      const chainPath = path.join(chainDir, file);
      const chain = loadEvidenceChain(chainPath);
      const built = chain.build();

      const stages: string[] = [];
      if (built.chainStatus.analysisLinked) stages.push("analysis");
      if (built.chainStatus.implementationLinked) stages.push("implementation");
      if (built.chainStatus.validationLinked) stages.push("validation");

      chains.push({
        id: built.id,
        taskId: built.requirement.taskId,
        description: built.requirement.description,
        coverage: built.chainStatus.coveragePercent,
        stages
      });
    } catch {
      // Skip invalid files
    }
  }

  if (isJsonOutput()) {
    printJson({ chains });
  } else {
    printHeader("Evidence Chains");
    if (chains.length === 0) {
      console.log("  No evidence chains found");
    } else {
      for (const c of chains) {
        console.log(`\n  ${c.id}`);
        printInfo("  Task", c.taskId);
        printInfo("  Description", c.description);
        printInfo("  Coverage", `${c.coverage}%`);
        printInfo("  Stages", c.stages.join(", ") || "none");
      }
    }
  }
}

/**
 * Validates the integrity of an evidence chain.
 *
 * @description Handles the `trace validate` CLI command. Checks that all chain
 * links are valid, coverage is complete, and no broken references exist.
 * Reports errors and warnings for any issues found.
 *
 * @param {string} chainId - The evidence chain identifier to validate
 *
 * @returns {Promise<void>} Outputs validation result to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Validate evidence chain
 * npx tsx ORCHESTRATION/cli/orch.ts trace validate chain-uuid-here
 *
 * # Validate with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts trace validate chain-uuid-here --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if chain not found
 */

export async function traceValidate(chainId: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No active session. Run 'session new' first or set ORCH_SESSION");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const chainDir = path.join(hub.getSessionPath(), "evidence-chains");
  const chainPath = path.join(chainDir, `${chainId}.json`);

  if (!fs.existsSync(chainPath)) {
    printError(`Evidence chain not found: ${chainId}`);
    process.exit(1);
  }

  const chain = loadEvidenceChain(chainPath);
  const validation = chain.validateChainLinks();

  if (isJsonOutput()) {
    printJson(validation);
  } else {
    printHeader("Chain Validation");
    printInfo("Valid", validation.valid ? "YES" : "NO");
    printInfo("Coverage", `${validation.coveragePercent}%`);

    if (validation.errors.length > 0) {
      console.log("\n  Errors:");
      for (const e of validation.errors) {
        console.log(`    - ${e}`);
      }
    }

    if (validation.warnings.length > 0) {
      console.log("\n  Warnings:");
      for (const w of validation.warnings) {
        console.log(`    - ${w}`);
      }
    }
  }
}

// =============================================================================
// TRACE ROUTER
// =============================================================================

/**
 * Main router for trace CLI subcommands.
 *
 * @description Handles the `trace` CLI command and routes to appropriate subcommand handlers:
 * - `create`: Create a new evidence chain for a task
 * - `read`: Read evidence chain details
 * - `list`: List all evidence chains
 * - `validate`: Validate chain integrity
 *
 * @returns {Promise<void>} Routes to appropriate subcommand handler
 *
 * @example
 * ```bash
 * # Create evidence chain
 * npx tsx ORCHESTRATION/cli/orch.ts trace create task-1.1 --desc "Feature"
 *
 * # Read chain details
 * npx tsx ORCHESTRATION/cli/orch.ts trace read chain-uuid
 *
 * # List all chains
 * npx tsx ORCHESTRATION/cli/orch.ts trace list
 *
 * # Validate chain
 * npx tsx ORCHESTRATION/cli/orch.ts trace validate chain-uuid
 * ```
 *
 * @throws Exits with code 1 if required ID not provided for create/read/validate
 * @throws Prints usage if unknown subcommand provided
 */

export async function handleTrace(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const arg3 = args[2];

  switch (subcommand) {
    case "create":
      if (!arg3) {
        printError("Task ID required");
        process.exit(1);
      }
      await traceCreate(arg3);
      break;
    case "read":
      if (!arg3) {
        printError("Chain ID required");
        process.exit(1);
      }
      await traceRead(arg3);
      break;
    case "list":
      await traceList();
      break;
    case "validate":
      if (!arg3) {
        printError("Chain ID required");
        process.exit(1);
      }
      await traceValidate(arg3);
      break;
    default:
      printUsage();
  }
}
