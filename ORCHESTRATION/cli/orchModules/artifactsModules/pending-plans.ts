/**
 * Pending plans module - Write, list, load, and archive pending plans
 * Used for /orch-plan -> /orch-execute workflow
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import {
  printHeader,
  printSuccess,
  printError,
  printInfo,
  printJson,
  isJsonOutput
} from "../output.js";

// =============================================================================
// CONSTANTS & TYPES
// =============================================================================

export const PENDING_PLANS_DIR = path.join(
  process.cwd(),
  "ORCHESTRATION/context-hub/pending-plans"
);

export interface PendingPlan {
  id: string;
  timestamp: string;
  description: string;
  design: Record<string, unknown>;
  scoutResults?: {
    ui?: Record<string, unknown>;
    api?: Record<string, unknown>;
    db?: Record<string, unknown>;
  };
  status: "pending" | "archived";
}

// =============================================================================
// HELPERS
// =============================================================================

export function ensurePendingPlansDir(): void {
  if (!fs.existsSync(PENDING_PLANS_DIR)) {
    fs.mkdirSync(PENDING_PLANS_DIR, { recursive: true });
  }
}

// =============================================================================
// PENDING PLAN COMMANDS
// =============================================================================

export async function pendingPlanWrite(designJson: string): Promise<void> {
  ensurePendingPlansDir();

  let design: Record<string, unknown>;
  try {
    design = JSON.parse(designJson);
  } catch {
    printError("Invalid JSON for design");
    process.exit(1);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const id = crypto.randomUUID();
  const pendingPlan: PendingPlan = {
    id,
    timestamp: new Date().toISOString(),
    description: (design.description as string) || "Orchestration plan",
    design,
    status: "pending"
  };

  const filename = `plan-${timestamp}.json`;
  const filepath = path.join(PENDING_PLANS_DIR, filename);

  fs.writeFileSync(filepath, JSON.stringify(pendingPlan, null, 2));

  if (isJsonOutput()) {
    printJson({ success: true, id, path: filepath, filename });
  } else {
    printHeader("Pending Plan Written");
    printInfo("Plan ID", id);
    printInfo("Filename", filename);
    printInfo("Path", filepath);
    printSuccess("Run '/orch-execute' to begin implementation");
  }
}

export async function pendingPlanList(): Promise<void> {
  ensurePendingPlansDir();

  const files = fs.readdirSync(PENDING_PLANS_DIR)
    .filter(f => f.startsWith("plan-") && f.endsWith(".json"))
    .sort()
    .reverse(); // Most recent first

  const plans: Array<{ filename: string; timestamp: string; description: string; status: string }> = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(PENDING_PLANS_DIR, file), "utf-8");
      const plan = JSON.parse(content) as PendingPlan;
      plans.push({
        filename: file,
        timestamp: plan.timestamp,
        description: plan.description.slice(0, 50) + (plan.description.length > 50 ? "..." : ""),
        status: plan.status
      });
    } catch {
      // Skip invalid files
    }
  }

  if (isJsonOutput()) {
    printJson({ plans, count: plans.length });
  } else {
    printHeader("Pending Plans");
    if (plans.length === 0) {
      console.log("  No pending plans found");
      console.log("  Run '/orch-plan' to create one");
    } else {
      for (const p of plans) {
        const statusIcon = p.status === "pending" ? "..." : "[done]";
        console.log(`  ${statusIcon} ${p.filename}`);
        console.log(`     ${p.description}`);
      }
      console.log(`\n  Total: ${plans.length} plan(s)`);
    }
  }
}

export async function pendingPlanLoad(filename?: string): Promise<void> {
  ensurePendingPlansDir();

  let targetFile: string;

  if (filename) {
    targetFile = filename.endsWith(".json") ? filename : `${filename}.json`;
  } else {
    // Load latest pending plan
    const files = fs.readdirSync(PENDING_PLANS_DIR)
      .filter(f => f.startsWith("plan-") && f.endsWith(".json"))
      .sort()
      .reverse();

    const pendingFiles = files.filter(f => {
      try {
        const content = fs.readFileSync(path.join(PENDING_PLANS_DIR, f), "utf-8");
        const plan = JSON.parse(content) as PendingPlan;
        return plan.status === "pending";
      } catch {
        return false;
      }
    });

    if (pendingFiles.length === 0) {
      printError("No pending plans found. Run '/orch-plan' first.");
      process.exit(1);
    }
    targetFile = pendingFiles[0];
  }

  const filepath = path.join(PENDING_PLANS_DIR, targetFile);

  if (!fs.existsSync(filepath)) {
    printError(`Plan not found: ${targetFile}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filepath, "utf-8");
    const plan = JSON.parse(content) as PendingPlan;

    if (isJsonOutput()) {
      printJson({ success: true, plan, path: filepath });
    } else {
      printHeader("Loaded Pending Plan");
      printInfo("Plan ID", plan.id);
      printInfo("Description", plan.description);
      printInfo("Status", plan.status);
      printInfo("Created", plan.timestamp);
      console.log("\n--- Design ---");
      console.log(JSON.stringify(plan.design, null, 2));
    }
  } catch (error) {
    printError(`Failed to load plan: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

export async function pendingPlanArchive(filename?: string): Promise<void> {
  ensurePendingPlansDir();

  let targetFile: string;

  if (filename) {
    targetFile = filename.endsWith(".json") ? filename : `${filename}.json`;
  } else {
    // Archive latest pending plan
    const files = fs.readdirSync(PENDING_PLANS_DIR)
      .filter(f => f.startsWith("plan-") && f.endsWith(".json"))
      .sort()
      .reverse();

    const pendingFiles = files.filter(f => {
      try {
        const content = fs.readFileSync(path.join(PENDING_PLANS_DIR, f), "utf-8");
        const plan = JSON.parse(content) as PendingPlan;
        return plan.status === "pending";
      } catch {
        return false;
      }
    });

    if (pendingFiles.length === 0) {
      printError("No pending plans to archive");
      process.exit(1);
    }
    targetFile = pendingFiles[0];
  }

  const filepath = path.join(PENDING_PLANS_DIR, targetFile);

  if (!fs.existsSync(filepath)) {
    printError(`Plan not found: ${targetFile}`);
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filepath, "utf-8");
    const plan = JSON.parse(content) as PendingPlan;
    plan.status = "archived";
    fs.writeFileSync(filepath, JSON.stringify(plan, null, 2));

    if (isJsonOutput()) {
      printJson({ success: true, filename: targetFile, status: "archived" });
    } else {
      printHeader("Plan Archived");
      printInfo("Filename", targetFile);
      printSuccess("Plan marked as executed");
    }
  } catch (error) {
    printError(`Failed to archive plan: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
