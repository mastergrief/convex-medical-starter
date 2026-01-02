/**
 * History module - Session history/audit trail commands
 */

import { createContextHub } from "../../lib/context-hub.js";
import {
  printHeader,
  printError,
  printInfo,
  printJson,
  isJsonOutput,
} from "./output.js";
import { getSessionId, filterFlags, getStringFlag } from "./flags.js";

// =============================================================================
// HISTORY COMMANDS
// =============================================================================

/**
 * Lists history entries for the current session.
 *
 * @description Handles the `history list` CLI command. Retrieves audit trail
 * entries showing prompts, plans, handoffs, gates, and memory operations.
 *
 * @returns {Promise<void>} Outputs history entries to stdout
 *
 * @example
 * ```bash
 * # List last 20 history entries
 * npx tsx ORCHESTRATION/cli/orch.ts history list
 *
 * # List last 50 entries
 * npx tsx ORCHESTRATION/cli/orch.ts history list --limit 50
 *
 * # Filter by type
 * npx tsx ORCHESTRATION/cli/orch.ts history list --type handoff
 *
 * # JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts history list --json
 * ```
 */
export async function historyList(): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const limit = parseInt(getStringFlag("--limit") ?? "20");
  const typeFilter = getStringFlag("--type");

  const hub = createContextHub(sessionId);
  let entries = hub.getHistory(limit * 2); // Get extra to filter

  // Filter by type if specified
  if (typeFilter) {
    entries = entries.filter((e) => e.type === typeFilter);
  }

  // Apply limit after filtering
  entries = entries.slice(-limit);

  if (isJsonOutput()) {
    printJson({
      success: true,
      sessionId,
      count: entries.length,
      entries,
    });
  } else {
    printHeader("Session History");
    printInfo("Session", sessionId);
    printInfo("Count", String(entries.length));
    if (typeFilter) {
      printInfo("Filter", typeFilter);
    }
    console.log("");

    if (entries.length === 0) {
      console.log("  No history entries found");
    } else {
      // Print entries in reverse chronological order (newest first)
      const reversed = [...entries].reverse();
      for (const entry of reversed) {
        const time = entry.timestamp.split("T")[1]?.split(".")[0] ?? entry.timestamp;
        const typeLabel = entry.type.padEnd(10);
        console.log(`  [${time}] ${typeLabel} ${entry.id}`);
      }
    }
  }
}

/**
 * Shows recent history entries in tail-like format.
 *
 * @description Handles the `history tail` CLI command. Shows the most recent
 * history entries, useful for monitoring orchestration progress.
 *
 * @returns {Promise<void>} Outputs recent entries to stdout
 *
 * @example
 * ```bash
 * # Show last 10 entries
 * npx tsx ORCHESTRATION/cli/orch.ts history tail
 *
 * # Show last 5 entries of specific type
 * npx tsx ORCHESTRATION/cli/orch.ts history tail --type gate
 * ```
 */
export async function historyTail(): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const typeFilter = getStringFlag("--type");
  const hub = createContextHub(sessionId);
  let entries = hub.getHistory(50);

  // Filter by type if specified
  if (typeFilter) {
    entries = entries.filter((e) => e.type === typeFilter);
  }

  // Take last 10
  entries = entries.slice(-10);

  if (isJsonOutput()) {
    printJson({
      success: true,
      sessionId,
      entries,
    });
  } else {
    if (entries.length === 0) {
      console.log("No history entries");
    } else {
      for (const entry of entries) {
        const date = entry.timestamp.split("T")[0];
        const time = entry.timestamp.split("T")[1]?.split(".")[0] ?? "";
        console.log(`${date} ${time}  ${entry.type.padEnd(10)}  ${entry.id}`);
      }
    }
  }
}

// =============================================================================
// HANDLER ROUTER
// =============================================================================

/**
 * Routes history subcommands to appropriate handlers.
 *
 * @description Main entry point for `history` CLI commands.
 * Routes to list or tail based on subcommand.
 *
 * @returns {Promise<void>} Executes the appropriate subcommand handler
 *
 * @example
 * ```bash
 * npx tsx ORCHESTRATION/cli/orch.ts history list
 * npx tsx ORCHESTRATION/cli/orch.ts history tail
 * ```
 */
export async function handleHistory(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];

  switch (subcommand) {
    case "list":
      return historyList();

    case "tail":
      return historyTail();

    default:
      printError(`Unknown history subcommand: ${subcommand}`);
      console.log("\nAvailable subcommands:");
      console.log("  history list [--limit N] [--type TYPE] [--json]");
      console.log("  history tail [--type TYPE] [--json]");
      console.log("\nEvent types: prompt, plan, handoff, gate, memory, state");
      process.exit(1);
  }
}
