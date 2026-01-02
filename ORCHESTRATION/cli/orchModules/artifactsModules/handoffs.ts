/**
 * Handoff operations module - Write, read, and list handoffs
 */

import * as fs from "fs";
import { createContextHub } from "../../../lib/context-hub.js";
import { validateHandoff } from "../../../schemas/index.js";
import {
  printHeader,
  printSuccess,
  printError,
  printInfo,
  printJson,
  isJsonOutput,
  printUsage
} from "../output.js";
import { getSessionId, filterFlags } from "../flags.js";

// =============================================================================
// HANDOFF COMMANDS
// =============================================================================

export async function handoffWrite(filePath: string): Promise<void> {
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
    const handoff = validateHandoff(data);

    const hub = createContextHub(sessionId);
    const result = await hub.writeHandoff(handoff);

    if (isJsonOutput()) {
      printJson({ success: result.success, handoffId: handoff.id, path: result.path });
    } else {
      if (result.success) {
        printHeader("Handoff Written");
        printInfo("Handoff ID", handoff.id);
        printInfo("From Agent", handoff.metadata.fromAgent.type);
        printInfo("To Agent", handoff.metadata.toAgent.type);
        printInfo("Path", result.path);
        printSuccess("Handoff saved successfully");
      } else {
        printError(`Failed to write handoff: ${result.error}`);
        process.exit(1);
      }
    }
  } catch (error) {
    printError(`Invalid handoff file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export async function handoffRead(handoffId?: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const result = hub.readHandoff(handoffId);

  if (isJsonOutput()) {
    printJson(result);
  } else {
    if (result.success && result.data) {
      printHeader("Handoff");
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      printError(`Failed to read handoff: ${result.error}`);
      process.exit(1);
    }
  }
}

export async function handoffList(): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const handoffs = hub.listHandoffs();

  if (isJsonOutput()) {
    printJson({ handoffs });
  } else {
    printHeader("Handoffs");
    if (handoffs.length === 0) {
      console.log("  No handoffs found");
    } else {
      for (const h of handoffs) {
        console.log(`  - ${h.fromAgent.padEnd(12)} | ${h.timestamp} | ${h.id.slice(0, 8)}...`);
      }
      console.log(`\n  Total: ${handoffs.length} handoff(s)`);
    }
  }
}

// =============================================================================
// ROUTER
// =============================================================================

export async function handleHandoff(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const arg3 = args[2];

  switch (subcommand) {
    case "write":
      if (!arg3) {
        printError("File path required");
        process.exit(1);
      }
      await handoffWrite(arg3);
      break;
    case "read":
      await handoffRead(arg3);
      break;
    case "list":
      await handoffList();
      break;
    default:
      printUsage();
  }
}
