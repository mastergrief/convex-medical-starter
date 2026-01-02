/**
 * Browser-CLI Interactive REPL
 *
 * Provides an interactive command-line interface for browser automation.
 * Features:
 * - Tab completion for commands and element refs
 * - Command history
 * - Meta-commands (.help, .exit, .refs, .history)
 * - Automatic ref tracking from snapshots
 *
 * Usage:
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts --interactive
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts -i
 */

export { REPLSession, startREPL } from './REPLSession';
export type { SendCommandFn } from './REPLSession';
export { createCompleter, getAllCommands, getMetaCommands } from './completer';
export type { CompleterFunction } from './completer';
