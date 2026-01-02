/**
 * Execute module - Phase execution and agent management commands
 */

import { createContextHub } from "../../lib/context-hub.js";
import { createParallelEngine, DispatchInstruction } from "../../lib/parallel-engine.js";
import {
  printHeader,
  printSuccess,
  printError,
  printInfo,
  printJson,
  isJsonOutput,
  printUsage
} from "./output.js";
import { getSessionId, getNumericFlag, getStringFlag, filterFlags } from "./flags.js";

// =============================================================================
// TYPES
// =============================================================================

export interface ExecuteOptions {
  parallel: boolean;
  maxAgents: number;
  json: boolean;
}

export interface ExecutePlanOptions {
  resumeFrom?: string;
  json: boolean;
}

// =============================================================================
// EXECUTE COMMANDS
// =============================================================================

/**
 * Generates dispatch instructions for executing a single phase.
 *
 * @description Handles the `execute <phaseId>` CLI command. Analyzes the phase's tasks,
 * builds parallel execution groups based on dependencies, and generates spawn commands
 * for each agent. Does not actually spawn agents - provides instructions for orchestrator.
 *
 * @param {string} phaseId - The phase identifier to generate execution instructions for
 * @param {ExecuteOptions} options - Execution configuration options
 * @param {boolean} [options.parallel=false] - Enable parallel execution mode
 * @param {number} [options.maxAgents=5] - Maximum concurrent agents
 * @param {boolean} [options.json=false] - Output as JSON
 *
 * @returns {Promise<void>} Outputs dispatch instructions to stdout
 *
 * @example
 * ```bash
 * # Generate dispatch instructions for phase
 * npx tsx ORCHESTRATION/cli/orch.ts execute phase-1
 *
 * # Generate with parallel mode enabled
 * npx tsx ORCHESTRATION/cli/orch.ts execute phase-1 --parallel
 *
 * # Generate with custom max agents and JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts execute phase-1 --max-agents 3 --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if phase ID not provided
 * @throws Exits with code 1 if plan not found
 * @throws Exits with code 1 if phase not found in plan
 */

export async function executePhase(phaseId: string, options: ExecuteOptions): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No active session. Run 'session new' first or set ORCH_SESSION");
    process.exit(1);
  }

  if (!phaseId) {
    printError("Phase ID required");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const planResult = hub.readPlan();

  if (!planResult.success || !planResult.data) {
    printError(`Failed to read plan: ${planResult.error}`);
    process.exit(1);
  }

  const plan = planResult.data;
  const phase = plan.phases.find((p: { id: string }) => p.id === phaseId);

  if (!phase) {
    printError(`Phase not found: ${phaseId}. Available phases: ${plan.phases.map((p: { id: string }) => p.id).join(", ")}`);
    process.exit(1);
  }

  // Create parallel engine with options
  const engine = createParallelEngine({
    maxConcurrentAgents: options.maxAgents,
    waitForAll: true
  }, hub);

  // Build parallel groups from phase
  const groups = engine.buildParallelGroups(phase);

  if (groups.length === 0) {
    if (options.json) {
      printJson({ success: true, data: { phaseId, groups: [] } });
    } else {
      printInfo("Phase", phaseId);
      console.log("  No tasks to execute in this phase.");
    }
    return;
  }

  // Generate dispatch instructions for each group
  const dispatchInstructions: DispatchInstruction[] = [];
  for (const group of groups) {
    const instruction = engine.generateDispatchInstructions(group);
    dispatchInstructions.push(instruction);
  }

  if (options.json) {
    printJson({
      success: true,
      data: {
        phaseId,
        parallel: options.parallel,
        maxAgents: options.maxAgents,
        groups: dispatchInstructions.map(di => ({
          groupId: di.groupId,
          agentCount: di.agentCount,
          waitForAll: di.waitForAll,
          spawns: di.spawns,
          estimatedTokens: di.estimatedTokens,
          summary: di.summary
        }))
      }
    });
  } else {
    printHeader(`Execute Phase: ${phaseId}`);
    printInfo("Groups", String(groups.length));
    printInfo("Parallel", options.parallel ? "YES" : "NO");
    printInfo("Max Agents", String(options.maxAgents));

    for (const instruction of dispatchInstructions) {
      console.log(`\n  Group: ${instruction.groupId}`);
      console.log(`    Agents: ${instruction.agentCount}`);
      console.log(`    Est. Tokens: ${instruction.estimatedTokens}`);
      console.log(`    Summary: ${instruction.summary}`);
      console.log(`    Spawns:`);
      for (const spawn of instruction.spawns) {
        console.log(`      - [${spawn.agentType}] ${spawn.taskId}`);
        console.log(`        ${spawn.command.substring(0, 80)}...`);
      }
    }
  }
}

/**
 * Generates dispatch instructions for executing an entire plan.
 *
 * @description Handles the `execute-plan` CLI command. Analyzes all phases in the plan,
 * builds parallel execution groups for each, and generates comprehensive dispatch
 * instructions. Supports resuming from a specific phase.
 *
 * @param {ExecutePlanOptions} options - Plan execution configuration options
 * @param {string} [options.resumeFrom] - Phase ID to resume execution from
 * @param {boolean} [options.json=false] - Output as JSON
 *
 * @returns {Promise<void>} Outputs full plan dispatch instructions to stdout
 *
 * @example
 * ```bash
 * # Generate dispatch instructions for entire plan
 * npx tsx ORCHESTRATION/cli/orch.ts execute-plan
 *
 * # Resume from specific phase
 * npx tsx ORCHESTRATION/cli/orch.ts execute-plan --resume-from phase-2
 *
 * # Output as JSON
 * npx tsx ORCHESTRATION/cli/orch.ts execute-plan --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if plan not found
 * @throws Exits with code 1 if resume phase not found in plan
 */

export async function executePlan(options: ExecutePlanOptions): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No active session. Run 'session new' first or set ORCH_SESSION");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const planResult = hub.readPlan();

  if (!planResult.success || !planResult.data) {
    printError(`Failed to read plan: ${planResult.error}`);
    process.exit(1);
  }

  const plan = planResult.data;
  let phases = plan.phases;

  // Filter phases if resumeFrom is provided
  if (options.resumeFrom) {
    const startIndex = phases.findIndex((p: { id: string }) => p.id === options.resumeFrom);
    if (startIndex === -1) {
      printError(`Resume phase not found: ${options.resumeFrom}. Available: ${phases.map((p: { id: string }) => p.id).join(", ")}`);
      process.exit(1);
    }
    phases = phases.slice(startIndex);
  }

  const engine = createParallelEngine({
    maxConcurrentAgents: 5,
    waitForAll: true
  }, hub);

  // Generate dispatch instructions for all phases
  const allInstructions: Array<{
    phaseId: string;
    phaseName: string;
    groups: DispatchInstruction[];
  }> = [];

  for (const phase of phases) {
    const groups = engine.buildParallelGroups(phase);
    const instructions: DispatchInstruction[] = [];
    for (const group of groups) {
      instructions.push(engine.generateDispatchInstructions(group));
    }
    allInstructions.push({
      phaseId: phase.id,
      phaseName: phase.name,
      groups: instructions
    });
  }

  if (options.json) {
    printJson({
      success: true,
      data: {
        planId: plan.id,
        resumeFrom: options.resumeFrom ?? null,
        totalPhases: phases.length,
        phases: allInstructions.map(pi => ({
          phaseId: pi.phaseId,
          phaseName: pi.phaseName,
          groupCount: pi.groups.length,
          groups: pi.groups.map(g => ({
            groupId: g.groupId,
            agentCount: g.agentCount,
            waitForAll: g.waitForAll,
            spawns: g.spawns,
            estimatedTokens: g.estimatedTokens,
            summary: g.summary
          }))
        }))
      }
    });
  } else {
    printHeader("Execute Plan");
    printInfo("Plan ID", plan.id);
    printInfo("Phases", String(phases.length));
    if (options.resumeFrom) {
      printInfo("Resume From", options.resumeFrom);
    }

    for (const phaseInstr of allInstructions) {
      console.log(`\n  Phase: ${phaseInstr.phaseId} (${phaseInstr.phaseName})`);
      console.log(`    Groups: ${phaseInstr.groups.length}`);

      let totalAgents = 0;
      let totalTokens = 0;
      for (const group of phaseInstr.groups) {
        totalAgents += group.agentCount;
        totalTokens += group.estimatedTokens;
      }
      console.log(`    Total Agents: ${totalAgents}`);
      console.log(`    Est. Tokens: ${totalTokens}`);
    }
  }
}

// =============================================================================
// AGENT COMMANDS
// =============================================================================

/**
 * Lists all active agents in the current session.
 *
 * @description Handles the `agents list` CLI command. Reads the orchestrator state
 * and displays information about all registered agents including type, task, status,
 * and start time.
 *
 * @param {boolean} json - Whether to output in JSON format
 *
 * @returns {Promise<void>} Outputs agent list to stdout
 *
 * @example
 * ```bash
 * # List active agents with text output
 * npx tsx ORCHESTRATION/cli/orch.ts agents list
 *
 * # List with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts agents list --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 */

export async function agentsList(json: boolean): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No active session. Run 'session new' first or set ORCH_SESSION");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const stateResult = hub.readOrchestratorState();

  // Default empty state if none exists
  const agentList: Array<{
    agentId: string;
    taskId: string;
    agentType: string;
    status: string;
    startedAt: string;
  }> = [];

  if (stateResult.success && stateResult.data) {
    const state = stateResult.data;
    // Extract agent info from agents array (per OrchestratorStateSchema)
    if (state.agents && Array.isArray(state.agents)) {
      for (const agent of state.agents) {
        agentList.push({
          agentId: agent.id ?? "unknown",
          taskId: agent.taskId ?? "unknown",
          agentType: agent.type ?? "unknown",
          status: agent.status ?? "running",
          startedAt: agent.startTime ?? "unknown"
        });
      }
    }
  }

  if (json) {
    printJson({
      success: true,
      data: {
        sessionId,
        agentCount: agentList.length,
        agents: agentList
      }
    });
  } else {
    printHeader("Active Agents");
    printInfo("Session", sessionId);
    printInfo("Count", String(agentList.length));

    if (agentList.length === 0) {
      console.log("\n  No active agents.");
    } else {
      console.log("\n  Agents:");
      for (const agent of agentList) {
        console.log(`    [${agent.agentType}] ${agent.taskId}`);
        console.log(`      ID: ${agent.agentId}`);
        console.log(`      Status: ${agent.status}`);
        console.log(`      Started: ${agent.startedAt}`);
      }
    }
  }
}

/**
 * Marks an agent as killed (failed) in the orchestrator state.
 *
 * @description Handles the `agents kill` CLI command. Updates the agent's status
 * to "failed" in the orchestrator state, effectively marking it as terminated.
 * Note: This does not actually kill any processes, just updates state.
 *
 * @param {string} agentId - The agent ID to mark as killed
 *
 * @returns {Promise<void>} Outputs kill result to stdout (JSON if --json flag provided)
 *
 * @example
 * ```bash
 * # Mark agent as killed
 * npx tsx ORCHESTRATION/cli/orch.ts agents kill agent-uuid-here
 *
 * # Kill with JSON output
 * npx tsx ORCHESTRATION/cli/orch.ts agents kill agent-uuid-here --json
 * ```
 *
 * @throws Exits with code 1 if no active session
 * @throws Exits with code 1 if agent ID not provided
 * @throws Exits with code 1 if orchestrator state not found
 * @throws Exits with code 1 if agent not found
 * @throws Exits with code 1 if state update fails
 */

export async function agentsKill(agentId: string): Promise<void> {
  const sessionId = getSessionId();
  if (!sessionId) {
    printError("No active session. Run 'session new' first or set ORCH_SESSION");
    process.exit(1);
  }

  if (!agentId) {
    printError("Agent ID required");
    process.exit(1);
  }

  const hub = createContextHub(sessionId);
  const stateResult = hub.readOrchestratorState();

  if (!stateResult.success || !stateResult.data) {
    printError(`Failed to read state: ${stateResult.error ?? "No state found"}`);
    process.exit(1);
  }

  const state = stateResult.data;

  // Find and mark agent as failed (killed) - per AgentInstanceSchema status enum
  let found = false;
  if (state.agents && Array.isArray(state.agents)) {
    for (const agent of state.agents) {
      if (agent.id === agentId) {
        agent.status = "failed"; // "killed" is not in the enum, use "failed"
        found = true;
        break;
      }
    }
  }

  if (!found) {
    printError(`Agent not found: ${agentId}`);
    process.exit(1);
  }

  // Write updated state
  const writeResult = hub.writeOrchestratorState(state);

  if (isJsonOutput()) {
    printJson({
      success: writeResult.success,
      data: { agentId, status: "failed" },
      error: writeResult.error
    });
  } else {
    if (writeResult.success) {
      printSuccess(`Agent marked as killed: ${agentId}`);
    } else {
      printError(`Failed to update state: ${writeResult.error}`);
      process.exit(1);
    }
  }
}

// =============================================================================
// ROUTERS
// =============================================================================

/**
 * Handler for the execute phase CLI command.
 *
 * @description Handles the `execute <phaseId>` CLI command entry point. Parses
 * command line arguments and delegates to executePhase with appropriate options.
 *
 * @returns {Promise<void>} Delegates to executePhase with parsed options
 *
 * @example
 * ```bash
 * # Execute phase with default options
 * npx tsx ORCHESTRATION/cli/orch.ts execute phase-1
 *
 * # Execute with parallel mode
 * npx tsx ORCHESTRATION/cli/orch.ts execute phase-1 --parallel
 *
 * # Execute with max agents limit
 * npx tsx ORCHESTRATION/cli/orch.ts execute phase-1 --max-agents 3 --json
 * ```
 *
 * @throws Exits with code 1 if phase ID not provided
 */

export async function handleExecute(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const phaseId = args[1];

  if (!phaseId) {
    printError("Phase ID required");
    process.exit(1);
  }

  await executePhase(phaseId, {
    parallel: process.argv.includes("--parallel"),
    maxAgents: getNumericFlag("--max-agents") ?? 5,
    json: isJsonOutput()
  });
}

/**
 * Handler for the execute-plan CLI command.
 *
 * @description Handles the `execute-plan` CLI command entry point. Parses
 * command line arguments and delegates to executePlan with appropriate options.
 *
 * @returns {Promise<void>} Delegates to executePlan with parsed options
 *
 * @example
 * ```bash
 * # Execute entire plan
 * npx tsx ORCHESTRATION/cli/orch.ts execute-plan
 *
 * # Resume from specific phase
 * npx tsx ORCHESTRATION/cli/orch.ts execute-plan --resume-from phase-2
 *
 * # Output as JSON
 * npx tsx ORCHESTRATION/cli/orch.ts execute-plan --json
 * ```
 *
 * @throws Never throws directly - delegates to executePlan
 */

export async function handleExecutePlan(): Promise<void> {
  await executePlan({
    resumeFrom: getStringFlag("--resume-from"),
    json: isJsonOutput()
  });
}

/**
 * Main router for agents CLI subcommands.
 *
 * @description Handles the `agents` CLI command and routes to appropriate subcommand handlers:
 * - `list`: List all active agents in the session
 * - `kill`: Mark an agent as killed/failed
 *
 * @returns {Promise<void>} Routes to appropriate subcommand handler
 *
 * @example
 * ```bash
 * # List active agents
 * npx tsx ORCHESTRATION/cli/orch.ts agents list
 *
 * # Kill specific agent
 * npx tsx ORCHESTRATION/cli/orch.ts agents kill agent-uuid-here
 * ```
 *
 * @throws Exits with code 1 if agent ID not provided for kill command
 * @throws Prints usage if unknown subcommand provided
 */

export async function handleAgents(): Promise<void> {
  const args = filterFlags(process.argv.slice(2));
  const subcommand = args[1];
  const arg3 = args[2];

  switch (subcommand) {
    case "list":
      await agentsList(isJsonOutput());
      break;
    case "kill":
      if (!arg3) {
        printError("Agent ID required");
        process.exit(1);
      }
      await agentsKill(arg3);
      break;
    default:
      printUsage();
  }
}
