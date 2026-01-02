/**
 * Prompt operations module - Write and read prompts
 */

import { createContextHub } from "../../../lib/context-hub.js";
import {
  createEmptyPrompt,
  createSessionId
} from "../../../schemas/index.js";
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
// PROMPT COMMANDS
// =============================================================================

export async function promptWrite(description: string): Promise<void> {
  const sessionId = getSessionId() || createSessionId();
  const hub = createContextHub(sessionId);

  // Check if additional args contain JSON
  const argsStr = process.argv.slice(process.argv.indexOf(description) + 1).join(" ");
  let additionalData = {};
  if (argsStr.startsWith("{")) {
    try {
      additionalData = JSON.parse(argsStr);
    } catch {
      // Ignore parse errors
    }
  }

  const prompt = createEmptyPrompt(sessionId, description);
  if (additionalData && typeof additionalData === "object") {
    Object.assign(prompt.request, additionalData);
  }

  const result = hub.writePrompt(prompt);

  if (isJsonOutput()) {
    printJson({ success: result.success, promptId: prompt.id, path: result.path });
  } else {
    if (result.success) {
      printHeader("Prompt Written");
      printInfo("Prompt ID", prompt.id);
      printInfo("Session", sessionId);
      printInfo("Path", result.path);
      printSuccess("Prompt saved successfully");
    } else {
      printError(`Failed to write prompt: ${result.error}`);
      process.exit(1);
    }
  }
}

export async function promptRead(promptId?: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found. Create one with: orch session new");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const result = hub.readPrompt(promptId);

  if (isJsonOutput()) {
    printJson(result);
  } else {
    if (result.success && result.data) {
      printHeader("Prompt");
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      printError(`Failed to read prompt: ${result.error}`);
      process.exit(1);
    }
  }
}

// =============================================================================
// ROUTER
// =============================================================================

export async function handlePrompt(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const arg3 = args[2];

  switch (subcommand) {
    case "write":
      if (!arg3) {
        printError("Description required");
        process.exit(1);
      }
      await promptWrite(arg3);
      break;
    case "read":
      await promptRead(arg3);
      break;
    default:
      printUsage();
  }
}
