/**
 * Flags module - CLI flag parsing utilities
 */

import * as path from "path";
import { ContextHub } from "../../lib/context-hub.js";

// =============================================================================
// FLAG PARSING
// =============================================================================

/**
 * Filter out flags from command arguments, returning only positional args
 */
export function filterFlags(args: string[]): string[] {
  const result: string[] = [];
  let skipNext = false;

  for (const arg of args) {
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (arg.startsWith("--")) {
      // Boolean flags don't take values - skip only the flag itself
      const booleanFlags = ["--json", "--dry-run", "--force", "--extract", "--typecheck", "--tests", "--parallel", "--once"];
      if (!booleanFlags.includes(arg) && !arg.includes("=")) {
        skipNext = true; // Skip the next argument (the flag's value)
      }
      continue;
    }
    result.push(arg);
  }

  return result;
}

/**
 * Get positional argument at index (after filtering flags)
 */
export function getPositionalArg(index: number): string | undefined {
  const args = filterFlags(process.argv.slice(2));
  return args[index];
}

/**
 * Get numeric flag value
 */
export function getNumericFlag(flag: string): number | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    const val = parseInt(process.argv[idx + 1], 10);
    if (!isNaN(val)) return val;
  }
  return undefined;
}

/**
 * Get string flag value
 */
export function getStringFlag(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1];
  }
  return undefined;
}

/**
 * Get session ID from --session flag, ORCH_SESSION env, or latest session
 */
export function getSessionId(): string | undefined {
  // Check for --session flag
  const sessionIdx = process.argv.indexOf("--session");
  if (sessionIdx !== -1 && process.argv[sessionIdx + 1]) {
    return process.argv[sessionIdx + 1];
  }

  // Check for ORCH_SESSION env var
  if (process.env.ORCH_SESSION) {
    return process.env.ORCH_SESSION;
  }

  // Try to get latest session
  const basePath = path.join(process.cwd(), "ORCHESTRATION", "context-hub");
  return ContextHub.getLatestSession(basePath) || undefined;
}

/**
 * Parse --var key=value flags into a Record
 */
export function parseVariables(args: string[]): Record<string, string> {
  const variables: Record<string, string> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--var" && args[i + 1]) {
      const varArg = args[i + 1];
      const eqIndex = varArg.indexOf("=");
      if (eqIndex > 0) {
        const key = varArg.substring(0, eqIndex);
        const value = varArg.substring(eqIndex + 1);
        variables[key] = value;
      }
      i++; // Skip the next arg since we consumed it
    }
  }

  return variables;
}
