/**
 * Session module - Session lifecycle management commands
 */

import * as path from "path";
import { ContextHub, createContextHub } from "../../lib/context-hub.js";
import { createSessionId } from "../../schemas/index.js";
import { createTemplateProcessor } from "../../lib/template-processor.js";
import {
  printHeader,
  printSuccess,
  printError,
  printInfo,
  printJson,
  isJsonOutput
} from "./output.js";
import { getSessionId, getStringFlag, getNumericFlag, parseVariables, filterFlags } from "./flags.js";

// =============================================================================
// SESSION COMMANDS
// =============================================================================

/**
 * Creates a new orchestration session with a unique ID.
 *
 * @description Handles the `session new` CLI command. Creates a new session directory
 * in the context hub and initializes it for orchestration workflow tracking.
 *
 * @returns {Promise<void>} Outputs session info to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Create new session with text output
 * npx tsx ORCHESTRATION/cli/orch.ts session new
 *
 * # Create new session with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts session new --json
 * ```
 *
 * @throws Never throws - exits with code 0 on success
 */

export async function sessionNew(): Promise<void> {
  const sessionId = createSessionId();
  const hub = createContextHub(sessionId);

  if (isJsonOutput()) {
    printJson({ success: true, sessionId, path: hub.getSessionId() });
  } else {
    printHeader("New Session Created");
    printInfo("Session ID", sessionId);
    printSuccess("Session initialized successfully");
    console.log(`\nExport for use: export ORCH_SESSION=${sessionId}`);
  }
}

/**
 * Lists all orchestration sessions in the context hub.
 *
 * @description Handles the `session list` CLI command. Scans the context hub directory
 * for all session folders and displays their IDs.
 *
 * @returns {Promise<void>} Outputs session list to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # List sessions with text output
 * npx tsx ORCHESTRATION/cli/orch.ts session list
 *
 * # List sessions with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts session list --json
 * ```
 *
 * @throws Never throws - exits with code 0 on success
 */

export async function sessionList(): Promise<void> {
  const basePath = path.join(process.cwd(), "ORCHESTRATION", "context-hub");
  const sessions = ContextHub.listSessions(basePath);

  if (isJsonOutput()) {
    printJson({ sessions });
  } else {
    printHeader("Sessions");
    if (sessions.length === 0) {
      console.log("  No sessions found");
    } else {
      for (const session of sessions) {
        console.log(`  - ${session}`);
      }
      console.log(`\n  Total: ${sessions.length} session(s)`);
    }
  }
}

/**
 * Displays detailed information about a specific session.
 *
 * @description Handles the `session info` CLI command. Shows metadata including
 * creation date, last modified, and counts of prompts, plans, and handoffs.
 *
 * @param {string} [sessionId] - Session ID to query. If omitted, uses current session from ORCH_SESSION or --session flag.
 *
 * @returns {Promise<void>} Outputs session info to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Show info for current session
 * npx tsx ORCHESTRATION/cli/orch.ts session info
 *
 * # Show info for specific session
 * npx tsx ORCHESTRATION/cli/orch.ts session info 20251226_10-00_abc123
 *
 * # Output as JSON
 * npx tsx ORCHESTRATION/cli/orch.ts session info --json
 * ```
 *
 * @throws Exits with code 1 if no session is specified and none is active
 */

export async function sessionInfo(sessionId?: string): Promise<void> {
  const sid = sessionId || getSessionId();
  if (!sid) {
    printError("No session specified. Use --session <id> or set ORCH_SESSION");
    process.exit(1);
  }

  const hub = createContextHub(sid);
  const info = hub.getSessionInfo();

  if (isJsonOutput()) {
    printJson(info);
  } else {
    printHeader(`Session: ${sid}`);
    printInfo("Created", info.createdAt);
    printInfo("Last Modified", info.lastModified);
    printInfo("Prompts", String(info.promptCount));
    printInfo("Plans", String(info.planCount));
    printInfo("Handoffs", String(info.handoffCount));
  }
}

/**
 * Purges old orchestration sessions from the context hub.
 *
 * @description Handles the `session purge` CLI command. Removes sessions older than
 * a specified number of days while keeping a minimum number of recent sessions.
 * Supports dry-run mode to preview what would be deleted.
 *
 * @param {Object} options - Purge configuration options
 * @param {number} [options.olderThanDays=7] - Delete sessions older than this many days
 * @param {number} [options.keepCount=3] - Always keep at least this many recent sessions
 * @param {boolean} [options.dryRun=false] - If true, only preview without deleting
 * @param {boolean} [options.force=false] - Required to confirm actual deletion
 *
 * @returns {Promise<void>} Outputs purge results to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Preview what would be purged (dry run)
 * npx tsx ORCHESTRATION/cli/orch.ts session purge --dry-run
 *
 * # Purge sessions older than 14 days, keep 5 most recent
 * npx tsx ORCHESTRATION/cli/orch.ts session purge --days 14 --keep 5 --force
 *
 * # Purge with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts session purge --force --json
 * ```
 *
 * @throws Never throws - exits with code 0 on success
 */

export async function sessionPurge(options: {
  olderThanDays?: number;
  keepCount?: number;
  dryRun?: boolean;
  force?: boolean;
}): Promise<void> {
  const basePath = path.join(process.cwd(), "ORCHESTRATION", "context-hub");
  const { olderThanDays = 7, keepCount = 3, dryRun = false, force = false } = options;

  // First, show what will be affected
  const preview = ContextHub.purgeOldSessions(basePath, {
    olderThanDays,
    keepCount,
    dryRun: true
  });

  if (isJsonOutput()) {
    if (dryRun) {
      printJson({ dryRun: true, wouldPurge: preview.purged, wouldKeep: preview.kept });
    } else {
      const result = ContextHub.purgeOldSessions(basePath, { olderThanDays, keepCount, dryRun: false });
      printJson({ success: true, purged: result.purged, kept: result.kept, errors: result.errors });
    }
    return;
  }

  printHeader("Session Purge");
  printInfo("Threshold", `${olderThanDays} days`);
  printInfo("Keep Recent", `${keepCount} sessions`);
  printInfo("Mode", dryRun ? "Dry Run" : "Execute");

  if (preview.purged.length === 0) {
    console.log("\n  No sessions to purge.");
    return;
  }

  console.log("\n  Sessions to PURGE:");
  for (const sessionId of preview.purged) {
    const age = ContextHub.getSessionAge(basePath, sessionId);
    console.log(`    [X] ${sessionId.slice(0, 24)}... (${age?.days ?? "?"} days old)`);
  }

  console.log("\n  Sessions to KEEP:");
  for (const sessionId of preview.kept) {
    const age = ContextHub.getSessionAge(basePath, sessionId);
    console.log(`    [OK] ${sessionId.slice(0, 24)}... (${age?.days ?? "?"} days old)`);
  }

  if (dryRun) {
    console.log("\n  [DRY RUN] No sessions were deleted.");
    return;
  }

  if (!force) {
    console.log("\n  Add --force to confirm deletion.");
    return;
  }

  // Execute purge
  const result = ContextHub.purgeOldSessions(basePath, { olderThanDays, keepCount, dryRun: false });

  console.log("");
  if (result.purged.length > 0) {
    printSuccess(`Purged ${result.purged.length} session(s)`);
  }
  if (result.errors.length > 0) {
    for (const err of result.errors) {
      printError(`Failed to purge ${err.sessionId}: ${err.error}`);
    }
  }
}

/**
 * Creates a new session from a template with variable substitution.
 *
 * @description Handles the `session new --template <id>` CLI command. Loads a session
 * template, substitutes variables, creates a new session, and writes the instantiated plan.
 *
 * @param {string} templateId - The template identifier to use (e.g., "feature-implementation")
 * @param {Record<string, string>} variables - Key-value pairs for template variable substitution
 *
 * @returns {Promise<void>} Outputs session and plan info to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Create session from template with variables
 * npx tsx ORCHESTRATION/cli/orch.ts session new --template feature-implementation \
 *   --var feature_name="dark mode" --var component_path="src/contexts/Theme"
 *
 * # Create session from template with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts session new --template feature-implementation \
 *   --var feature_name="auth" --json
 * ```
 *
 * @throws Exits with code 1 if template not found or required variables missing
 */

export async function handleSessionNewFromTemplate(
  templateId: string,
  variables: Record<string, string>
): Promise<void> {
  const processor = createTemplateProcessor();

  try {
    // Load template
    const template = processor.loadTemplate(templateId);

    // Create session first
    const sessionId = createSessionId();
    const hub = createContextHub(sessionId);

    // Instantiate template with variables
    const result = processor.instantiate(template, variables, sessionId);

    if (!result.success) {
      if (isJsonOutput()) {
        printJson({
          success: false,
          errors: result.errors,
          missingVariables: result.missingVariables
        });
      } else {
        printError("Template instantiation failed:");
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
        if (result.missingVariables.length > 0) {
          console.log("\n  Missing required variables:");
          for (const varName of result.missingVariables) {
            const varDef = template.variables.find(v => v.name === varName);
            console.log(`    --var ${varName}="<value>"`);
            if (varDef) {
              console.log(`      ${varDef.description}`);
            }
          }
        }
      }
      process.exit(1);
    }

    // Write the plan to the session
    if (result.plan) {
      hub.writePlan(result.plan);
    }

    if (isJsonOutput()) {
      printJson({
        success: true,
        sessionId,
        templateId,
        planId: result.plan?.id,
        substitutedVariables: result.substitutedVariables
      });
    } else {
      printHeader("Session Created from Template");
      printInfo("Session ID", sessionId);
      printInfo("Template", template.name);
      printInfo("Plan ID", result.plan?.id ?? "N/A");

      if (Object.keys(result.substitutedVariables).length > 0) {
        console.log("\n  Substituted Variables:");
        for (const [key, value] of Object.entries(result.substitutedVariables)) {
          console.log(`    {{${key}}} = "${value}"`);
        }
      }

      printSuccess("Session initialized with plan from template");
      console.log(`\nExport for use: export ORCH_SESSION=${sessionId}`);
    }
  } catch (error) {
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// =============================================================================
// SESSION ROUTER
// =============================================================================

/**
 * Main router for session CLI subcommands.
 *
 * @description Handles the `session` CLI command and routes to appropriate subcommand handlers:
 * - `new`: Creates a new session (optionally from template)
 * - `list`: Lists all sessions
 * - `info`: Shows session details
 * - `purge`: Removes old sessions
 *
 * @returns {Promise<void>} Routes to appropriate subcommand handler
 *
 * @example
 * ```bash
 * # Create new session
 * npx tsx ORCHESTRATION/cli/orch.ts session new
 *
 * # Create from template
 * npx tsx ORCHESTRATION/cli/orch.ts session new --template feature-implementation --var name="value"
 *
 * # List sessions
 * npx tsx ORCHESTRATION/cli/orch.ts session list
 *
 * # Show session info
 * npx tsx ORCHESTRATION/cli/orch.ts session info [sessionId]
 *
 * # Purge old sessions
 * npx tsx ORCHESTRATION/cli/orch.ts session purge --days 7 --keep 3 --force
 * ```
 *
 * @throws Prints usage and exits if unknown subcommand provided
 */

export async function handleSession(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const arg3 = args[2];

  switch (subcommand) {
    case "new": {
      const templateId = getStringFlag("--template");
      if (templateId) {
        const variables = parseVariables(process.argv);
        await handleSessionNewFromTemplate(templateId, variables);
      } else {
        await sessionNew();
      }
      break;
    }
    case "list":
      await sessionList();
      break;
    case "info":
      await sessionInfo(arg3);
      break;
    case "purge":
      await sessionPurge({
        olderThanDays: getNumericFlag("--days") ?? 7,
        keepCount: getNumericFlag("--keep") ?? 3,
        dryRun: process.argv.includes("--dry-run"),
        force: process.argv.includes("--force")
      });
      break;
    default:
      const { printUsage } = await import("./output.js");
      printUsage();
  }
}
