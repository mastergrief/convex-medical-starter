/**
 * Output module - CLI output helpers and usage display
 */

// =============================================================================
// OUTPUT HELPERS
// =============================================================================

/**
 * Prints a formatted header with title surrounded by separator lines.
 *
 * @description Outputs a visually distinct header for CLI command output sections.
 * Uses equals signs as separators for clear visual hierarchy.
 *
 * @param {string} title - The header title to display
 *
 * @returns {void} Outputs header to stdout
 *
 * @example
 * ```typescript
 * printHeader("Session Info");
 * // Output:
 * // ============================================================
 * //   Session Info
 * // ============================================================
 * ```
 */

export function printHeader(title: string): void {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${title}`);
  console.log("=".repeat(60));
}

/**
 * Prints a success message with [OK] prefix.
 *
 * @description Outputs a success message to stdout with visual indicator.
 * Used to confirm successful operations in CLI output.
 *
 * @param {string} message - The success message to display
 *
 * @returns {void} Outputs message to stdout
 *
 * @example
 * ```typescript
 * printSuccess("Session created successfully");
 * // Output: [OK] Session created successfully
 * ```
 */

export function printSuccess(message: string): void {
  console.log(`[OK] ${message}`);
}

/**
 * Prints an error message with [ERROR] prefix to stderr.
 *
 * @description Outputs an error message to stderr with visual indicator.
 * Used to report failures and issues in CLI operations.
 *
 * @param {string} message - The error message to display
 *
 * @returns {void} Outputs message to stderr
 *
 * @example
 * ```typescript
 * printError("Session not found");
 * // Output to stderr: [ERROR] Session not found
 * ```
 */

export function printError(message: string): void {
  console.error(`[ERROR] ${message}`);
}

/**
 * Prints a labeled info line with consistent formatting.
 *
 * @description Outputs a key-value pair with the label right-padded to 15 characters
 * for aligned output. Used for displaying session info, status, and metadata.
 *
 * @param {string} label - The label/key to display (padded to 15 chars)
 * @param {string} value - The value to display
 *
 * @returns {void} Outputs formatted line to stdout
 *
 * @example
 * ```typescript
 * printInfo("Session ID", "abc-123-def");
 * // Output:   Session ID     : abc-123-def
 * ```
 */

export function printInfo(label: string, value: string): void {
  console.log(`  ${label.padEnd(15)}: ${value}`);
}

/**
 * Prints data as formatted JSON to stdout.
 *
 * @description Outputs any data structure as pretty-printed JSON with 2-space
 * indentation. Used when --json flag is provided to CLI commands.
 *
 * @param {unknown} data - The data to serialize and print
 *
 * @returns {void} Outputs formatted JSON to stdout
 *
 * @example
 * ```typescript
 * printJson({ success: true, sessionId: "abc-123" });
 * // Output:
 * // {
 * //   "success": true,
 * //   "sessionId": "abc-123"
 * // }
 * ```
 */

export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Checks if JSON output mode is enabled via --json flag.
 *
 * @description Examines process.argv to determine if the user requested
 * JSON output format. Used by handlers to decide between text and JSON output.
 *
 * @returns {boolean} True if --json flag is present in command line arguments
 *
 * @example
 * ```typescript
 * if (isJsonOutput()) {
 *   printJson({ success: true });
 * } else {
 *   printSuccess("Operation completed");
 * }
 * ```
 */

export function isJsonOutput(): boolean {
  return process.argv.includes("--json");
}

// =============================================================================
// USAGE TEXT
// =============================================================================

/**
 * Prints comprehensive CLI usage information and help text.
 *
 * @description Outputs full documentation of all available CLI commands,
 * subcommands, options, and usage examples. Called when unknown command
 * is provided or when help is needed.
 *
 * @returns {void} Outputs usage documentation to stdout
 *
 * @example
 * ```bash
 * # Displays when unknown command or no command provided
 * npx tsx ORCHESTRATION/cli/orch.ts
 * npx tsx ORCHESTRATION/cli/orch.ts unknown-command
 * ```
 */

export function printUsage(): void {
  console.log(`
ORCHESTRATION CLI
=============================================================

Usage: npx tsx ORCHESTRATION/cli/orch.ts <command> [options]

Commands:
  session new              Create new orchestration session
  session new --template <id> [--var k=v]...  Create session from template
  session list             List all sessions
  session info [id]        Show session info
  session purge            Purge old sessions (see options below)

  template list            List available templates
  template show <id>       Show template details
  template validate <file> Validate template JSON file

  prompt write <desc>      Write initial prompt
  prompt read [id]         Read prompt

  plan write <file>        Write plan from JSON file
  plan read [id]           Read current/specific plan

  handoff write <file>     Write handoff from JSON file
  handoff read [id]        Read latest/specific handoff
  handoff list             List all handoffs

  state read               Read orchestrator state
  state write <file>       Write orchestrator or token state

  tokens                   [DEPRECATED] Read persisted token state
  tokens read              [DEPRECATED] Read persisted token state
  tokens show <agentId>    [DEPRECATED] Show in-memory token usage

  memory link <name> [summary]  Link Serena memory to session
  memory list              List linked memories
  memory get <name>        Get linked memory with traceability data

  history list             List session history/audit trail
  history tail             Show recent history entries

  gate check <phaseId>     Check if phase gate passes
  gate advance <phaseId>   Advance to next phase (if gate passes)
  gate list [phaseId]      List gate check history
  gate read <phaseId>      Read latest gate result details

  trace create <taskId>    Create evidence chain for task
  trace read <chainId>     Read evidence chain details
  trace list               List all evidence chains
  trace validate <chainId> Validate chain integrity

  execute <phaseId>        Generate dispatch instructions for phase
  execute-plan             Generate dispatch instructions for all phases

  agents list              List active agent sessions
  agents kill <agentId>    Mark agent as killed

  validate <file>          Validate JSON file
  status                   Show overall status
  dashboard                Show real-time orchestration dashboard

Options:
  --session <id>           Use specific session
  --json                   Output as JSON

Session Purge Options:
  --days <n>               Purge sessions older than n days (default: 7)
  --keep <n>               Always keep n most recent sessions (default: 3)
  --dry-run                Preview what would be purged
  --force                  Confirm deletion (required for actual purge)

Session Template Options:
  --template <id>          Create session from template
  --var <key>=<value>      Substitute variable in template (can repeat)

Memory Link Options:
  --extract                Extract traceability data from memory content
  --for-agents <list>      Comma-separated agent types (default: developer,browser)

History Options:
  --limit <n>              Number of entries to show (default: 20)
  --type <type>            Filter by event type (prompt, plan, handoff, gate, memory, state)

Gate Check Options:
  --memory <patterns>      Comma-separated memory glob patterns (e.g., ANALYSIS_*)
  --traceability <fields>  Comma-separated fields (analyzed_symbols,entry_points,data_flow_map)
  --typecheck              Require npm run typecheck to pass
  --tests                  Require npm test to pass

Trace Create Options:
  --desc <description>     Description for the evidence chain
  --criteria <list>        Comma-separated acceptance criteria

Execute Options:
  --parallel               Enable parallel execution mode
  --max-agents <n>         Max concurrent agents (default: 5)
  --json                   Output as JSON

Execute Plan Options:
  --resume-from <phaseId>  Start from specific phase
  --json                   Output as JSON

Dashboard Options:
  --once                   Render once and exit
  --interval=<ms>          Refresh interval (default: 1000)
  --json                   Output state as JSON (no TUI)

Environment:
  ORCH_SESSION             Default session ID

Examples:
  # Start new session
  npx tsx ORCHESTRATION/cli/orch.ts session new

  # Create session from template with variables
  npx tsx ORCHESTRATION/cli/orch.ts session new --template feature-implementation \\
    --var feature_name="dark mode" --var component_path="src/contexts/Theme"

  # List available templates
  npx tsx ORCHESTRATION/cli/orch.ts template list --json

  # Show template details
  npx tsx ORCHESTRATION/cli/orch.ts template show feature-implementation

  # Write initial prompt
  npx tsx ORCHESTRATION/cli/orch.ts prompt write "Implement user auth"

  # Write state from file
  npx tsx ORCHESTRATION/cli/orch.ts state write state.json

  # Preview old session purge
  npx tsx ORCHESTRATION/cli/orch.ts session purge --dry-run

  # Purge sessions older than 14 days, keep 5 most recent
  npx tsx ORCHESTRATION/cli/orch.ts session purge --days 14 --keep 5 --force

  # Link a memory to current session
  npx tsx ORCHESTRATION/cli/orch.ts memory link BOTTOM_NAV_ARCHITECTURE "Navigation system docs"

  # Check phase gate with custom requirements
  npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --typecheck --memory "ANALYSIS_*"

  # Advance to next phase (checks gate first)
  npx tsx ORCHESTRATION/cli/orch.ts gate advance phase-1

  # Create evidence chain for a task
  npx tsx ORCHESTRATION/cli/orch.ts trace create task-1.1 --desc "Implement feature" --criteria "criterion1,criterion2"

  # List all evidence chains
  npx tsx ORCHESTRATION/cli/orch.ts trace list --json

  # Generate dispatch instructions for a phase
  npx tsx ORCHESTRATION/cli/orch.ts execute phase-1 --parallel --json

  # Generate dispatch instructions for entire plan
  npx tsx ORCHESTRATION/cli/orch.ts execute-plan --json

  # Resume plan execution from a specific phase
  npx tsx ORCHESTRATION/cli/orch.ts execute-plan --resume-from phase-2 --json

  # List active agents
  npx tsx ORCHESTRATION/cli/orch.ts agents list --json

  # Mark an agent as killed
  npx tsx ORCHESTRATION/cli/orch.ts agents kill agent-uuid-here

  # Check status
  npx tsx ORCHESTRATION/cli/orch.ts status

  # List session history
  npx tsx ORCHESTRATION/cli/orch.ts history list --limit 30

  # Show recent history filtered by type
  npx tsx ORCHESTRATION/cli/orch.ts history tail --type handoff

  # Show real-time dashboard
  npx tsx ORCHESTRATION/cli/orch.ts dashboard

  # Show dashboard once and exit
  npx tsx ORCHESTRATION/cli/orch.ts dashboard --once

  # Get dashboard state as JSON
  npx tsx ORCHESTRATION/cli/orch.ts dashboard --json
`);
}
