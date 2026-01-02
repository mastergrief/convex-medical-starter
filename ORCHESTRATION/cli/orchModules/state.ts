/**
 * State module - State and memory commands
 */

import * as fs from "fs";
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
// STATE COMMANDS
// =============================================================================

/**
 * Reads the current orchestrator state from the session.
 *
 * @description Handles the `state read` CLI command. Retrieves the persisted
 * orchestrator state including status, current phase, agents, and token usage.
 *
 * @returns {Promise<void>} Outputs state to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Read orchestrator state
 * npx tsx ORCHESTRATION/cli/orch.ts state read
 *
 * # Read with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts state read --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if state read fails
 */

export async function stateRead(): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const result = hub.readOrchestratorState();

  if (isJsonOutput()) {
    printJson(result);
  } else {
    if (result.success && result.data) {
      printHeader("Orchestrator State");
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      printError(`Failed to read state: ${result.error}`);
      process.exit(1);
    }
  }
}

/**
 * Writes orchestrator state from a JSON file to the session.
 *
 * @description Handles the `state write` CLI command. Reads a JSON file containing
 * orchestrator state and persists it to the current session. The file must have
 * type "orchestrator_state".
 *
 * @param {string} filePath - Path to the JSON file containing state data
 *
 * @returns {Promise<void>} Outputs write result to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Write state from file
 * npx tsx ORCHESTRATION/cli/orch.ts state write ./state.json
 *
 * # Write with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts state write ./state.json --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if file not found
 * @throws Exits with code 1 if JSON parsing fails
 * @throws Exits with code 1 if state type is not "orchestrator_state"
 * @throws Exits with code 1 if write fails
 */

export async function stateWrite(filePath: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    printError(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    // Write orchestrator state
    const hub = createContextHub(sessionId);

    if (data.type === "orchestrator_state") {
      const result = hub.writeOrchestratorState(data);
      if (isJsonOutput()) {
        printJson({ success: result.success, path: result.path });
      } else {
        if (result.success) {
          printHeader("State Written");
          printInfo("Type", "orchestrator_state");
          printInfo("Path", result.path);
          printSuccess("State saved successfully");
        } else {
          printError(`Failed to write state: ${result.error}`);
          process.exit(1);
        }
      }
    } else {
      printError(`Unknown state type: ${data.type}. Expected 'orchestrator_state'`);
      process.exit(1);
    }
  } catch (error) {
    printError(`Invalid state file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// =============================================================================
// MEMORY COMMANDS
// =============================================================================

/**
 * Links a Serena memory to the current orchestration session.
 *
 * @description Handles the `memory link` CLI command. Creates a reference from
 * the session to a Serena memory file, optionally extracting traceability data
 * (analyzed symbols, entry points, data flow) for use by agents.
 *
 * @param {string} memoryName - Name of the Serena memory to link
 * @param {string} [summary] - Optional summary describing the memory's purpose
 *
 * @returns {Promise<void>} Outputs link result to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Link a memory with summary
 * npx tsx ORCHESTRATION/cli/orch.ts memory link ANALYSIS_FEATURE "Feature analysis"
 *
 * # Link with traceability extraction
 * npx tsx ORCHESTRATION/cli/orch.ts memory link ANALYSIS_FEATURE --extract
 *
 * # Link for specific agent types
 * npx tsx ORCHESTRATION/cli/orch.ts memory link ANALYSIS_FEATURE --for-agents developer,browser
 *
 * # Link with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts memory link ANALYSIS_FEATURE --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if memory file not found
 * @throws Exits with code 1 if link operation fails
 */

export async function memoryLink(memoryName: string, summary?: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found. Create one with: orch session new");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const extractTraceability = process.argv.includes("--extract");
  const forAgentsIdx = process.argv.indexOf("--for-agents");
  const forAgents = forAgentsIdx !== -1 && process.argv[forAgentsIdx + 1]
    ? process.argv[forAgentsIdx + 1].split(",")
    : undefined;

  const result = hub.linkMemory(memoryName, {
    summary,
    forAgents,
    extractTraceability
  });

  if (isJsonOutput()) {
    printJson({ success: result.success, memoryName, path: result.path, error: result.error });
  } else {
    if (result.success) {
      printHeader("Memory Linked");
      printInfo("Memory", memoryName);
      printInfo("Session", sessionId.slice(0, 24) + "...");
      printInfo("Path", result.path);
      if (extractTraceability) {
        printInfo("Traceability", "Extracted from memory content");
      }
      printSuccess("Memory linked to session successfully");
    } else {
      printError(`Failed to link memory: ${result.error}`);
      process.exit(1);
    }
  }
}

/**
 * Lists all memories linked to the current session.
 *
 * @description Handles the `memory list` CLI command. Displays all Serena memories
 * that have been linked to the current session, including paths, summaries,
 * agent targeting, and traceability status.
 *
 * @returns {Promise<void>} Outputs memory list to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # List linked memories
 * npx tsx ORCHESTRATION/cli/orch.ts memory list
 *
 * # List with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts memory list --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 */

export async function memoryList(): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const memories = hub.listLinkedMemories();

  if (isJsonOutput()) {
    printJson({ memories });
  } else {
    printHeader("Linked Memories");
    if (memories.length === 0) {
      console.log("  No memories linked to this session");
      console.log("\n  Link one with: orch memory link <name> [summary]");
    } else {
      for (const mem of memories) {
        console.log(`  - ${mem.name}`);
        console.log(`    Path: ${mem.serenaPath}`);
        if (mem.summary) {
          console.log(`    Summary: ${mem.summary}`);
        }
        if (mem.forAgents && mem.forAgents.length > 0) {
          console.log(`    For Agents: ${mem.forAgents.join(", ")}`);
        }
        console.log(`    Traceability: ${mem.hasTraceability ? "[OK] Available" : "[X] None"}`);
        console.log(`    Linked: ${mem.linkedAt}`);
        console.log("");
      }
      console.log(`  Total: ${memories.length} linked memory(ies)`);
    }
  }
}

/**
 * Gets detailed information about a linked memory including traceability data.
 *
 * @description Handles the `memory get` CLI command. Retrieves comprehensive
 * information about a specific linked memory including path, link timestamp,
 * summary, agent targeting, and extracted traceability data (symbols, entry points,
 * data flow map).
 *
 * @param {string} memoryName - Name of the linked memory to retrieve
 *
 * @returns {Promise<void>} Outputs memory details to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Get memory details
 * npx tsx ORCHESTRATION/cli/orch.ts memory get ANALYSIS_FEATURE
 *
 * # Get with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts memory get ANALYSIS_FEATURE --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if memory not found
 */

export async function memoryGet(memoryName: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const result = hub.getLinkedMemory(memoryName);

  if (isJsonOutput()) {
    printJson(result);
  } else {
    if (result.success && result.data) {
      printHeader(`Memory: ${memoryName}`);
      printInfo("Path", result.data.serenaPath);
      printInfo("Linked At", result.data.linkedAt);
      if (result.data.summary) {
        printInfo("Summary", result.data.summary);
      }
      if (result.data.forAgents) {
        printInfo("For Agents", result.data.forAgents.join(", "));
      }

      if (result.data.traceabilityData) {
        console.log("\n  Traceability Data:");
        const td = result.data.traceabilityData;
        if (td.analyzed_symbols && td.analyzed_symbols.length > 0) {
          console.log(`    Symbols: ${td.analyzed_symbols.slice(0, 5).join(", ")}${td.analyzed_symbols.length > 5 ? ` (+${td.analyzed_symbols.length - 5} more)` : ""}`);
        }
        if (td.entry_points && td.entry_points.length > 0) {
          console.log(`    Entry Points: ${td.entry_points.slice(0, 5).join(", ")}${td.entry_points.length > 5 ? ` (+${td.entry_points.length - 5} more)` : ""}`);
        }
        if (td.data_flow_map && Object.keys(td.data_flow_map).length > 0) {
          console.log("    Data Flow:");
          for (const [key, value] of Object.entries(td.data_flow_map)) {
            console.log(`      ${key}: ${value}`);
          }
        }
      } else {
        console.log("\n  No traceability data available.");
        console.log("  Re-link with --extract flag to extract traceability.");
      }
    } else {
      printError(`Failed to get memory: ${result.error}`);
      process.exit(1);
    }
  }
}

// =============================================================================
// ROUTERS
// =============================================================================

/**
 * Main router for state CLI subcommands.
 *
 * @description Handles the `state` CLI command and routes to appropriate subcommand handlers:
 * - `read`: Read current orchestrator state
 * - `write`: Write orchestrator state from file
 *
 * @returns {Promise<void>} Routes to appropriate subcommand handler
 *
 * @example
 * ```bash
 * # Read orchestrator state
 * npx tsx ORCHESTRATION/cli/orch.ts state read
 *
 * # Write orchestrator state from file
 * npx tsx ORCHESTRATION/cli/orch.ts state write ./state.json
 * ```
 *
 * @throws Exits with code 1 if file path not provided for write
 * @throws Prints usage if unknown subcommand provided
 */

export async function handleState(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const arg3 = args[2];

  switch (subcommand) {
    case "read":
      await stateRead();
      break;
    case "write":
      if (!arg3) {
        printError("File path required");
        process.exit(1);
      }
      await stateWrite(arg3);
      break;
    default:
      printUsage();
  }
}

/**
 * Main router for memory CLI subcommands.
 *
 * @description Handles the `memory` CLI command and routes to appropriate subcommand handlers:
 * - `link`: Link a Serena memory to the session
 * - `list`: List all linked memories
 * - `get`: Get details of a specific linked memory
 *
 * @returns {Promise<void>} Routes to appropriate subcommand handler
 *
 * @example
 * ```bash
 * # Link a memory to session
 * npx tsx ORCHESTRATION/cli/orch.ts memory link ANALYSIS_FEATURE "Summary text"
 *
 * # List linked memories
 * npx tsx ORCHESTRATION/cli/orch.ts memory list
 *
 * # Get memory details
 * npx tsx ORCHESTRATION/cli/orch.ts memory get ANALYSIS_FEATURE
 * ```
 *
 * @throws Exits with code 1 if memory name not provided for link/get
 * @throws Prints usage if unknown subcommand provided
 */

export async function handleMemory(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const arg3 = args[2];

  switch (subcommand) {
    case "link":
      if (!arg3) {
        printError("Memory name required");
        process.exit(1);
      }
      await memoryLink(arg3, args[3]);
      break;
    case "list":
      await memoryList();
      break;
    case "get":
      if (!arg3) {
        printError("Memory name required");
        process.exit(1);
      }
      await memoryGet(arg3);
      break;
    default:
      printUsage();
  }
}
