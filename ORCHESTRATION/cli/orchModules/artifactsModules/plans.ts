/**
 * Session-based plan operations module - Write and read plans
 */

import * as fs from "fs";
import { createContextHub } from "../../../lib/context-hub.js";
import { validatePlan } from "../../../schemas/index.js";
import {
  printHeader,
  printSuccess,
  printError,
  printInfo,
  printJson,
  isJsonOutput
} from "../output.js";
import { getSessionId } from "../flags.js";

// =============================================================================
// PLAN COMMANDS (session-based)
// =============================================================================

export async function planWrite(filePath: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found. Create one with: orch session new");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    printError(`File not found: ${filePath}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    const plan = validatePlan(data);

    const hub = createContextHub(sessionId);
    const result = hub.writePlan(plan);

    if (isJsonOutput()) {
      printJson({ success: result.success, planId: plan.id, path: result.path });
    } else {
      if (result.success) {
        printHeader("Plan Written");
        printInfo("Plan ID", plan.id);
        printInfo("Phases", String(plan.phases.length));
        printInfo("Path", result.path);
        printSuccess("Plan saved successfully");
      } else {
        printError(`Failed to write plan: ${result.error}`);
        process.exit(1);
      }
    }
  } catch (error) {
    printError(`Invalid plan file: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export async function planRead(planId?: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No session found");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const result = hub.readPlan(planId);

  if (isJsonOutput()) {
    printJson(result);
  } else {
    if (result.success && result.data) {
      printHeader("Plan");
      console.log(JSON.stringify(result.data, null, 2));
    } else {
      printError(`Failed to read plan: ${result.error}`);
      process.exit(1);
    }
  }
}
