#!/usr/bin/env npx tsx
/**
 * ORCHESTRATION CLI - Facade
 *
 * Command-line interface for orchestration system.
 * This facade routes commands to focused modules in ./orchModules/
 *
 * Usage: npx tsx ORCHESTRATION/cli/orch.ts <command> [options]
 */

import { printError, printUsage, filterFlags, isJsonOutput } from "./orchModules/index.js";

async function main(): Promise<void> {
  const positionalArgs = filterFlags(process.argv.slice(2));
  const command = positionalArgs[0];
  const subcommand = positionalArgs[1];

  try {
    switch (command) {
      case "session":
        return (await import("./orchModules/session.js")).handleSession();

      case "template":
        return (await import("./orchModules/template.js")).handleTemplate();

      case "prompt":
        return (await import("./orchModules/artifacts.js")).handlePrompt();

      case "plan":
        return (await import("./orchModules/artifacts.js")).handlePlan();

      case "handoff":
        return (await import("./orchModules/artifacts.js")).handleHandoff();

      case "state":
        return (await import("./orchModules/state.js")).handleState();

      case "memory":
        return (await import("./orchModules/state.js")).handleMemory();

      case "history":
        return (await import("./orchModules/history.js")).handleHistory();

      case "gate":
        return (await import("./orchModules/gates.js")).handleGate();

      case "trace":
        return (await import("./orchModules/trace.js")).handleTrace();

      case "execute":
        return (await import("./orchModules/execute.js")).handleExecute();

      case "execute-plan":
        return (await import("./orchModules/execute.js")).handleExecutePlan();

      case "agents":
        return (await import("./orchModules/execute.js")).handleAgents();

      case "validate":
        if (!subcommand) {
          printError("File path required");
          process.exit(1);
        }
        return (await import("./orchModules/status.js")).validateFile(subcommand);

      case "status":
        return (await import("./orchModules/status.js")).showStatus();

      case "dashboard": {
        const { handleDashboard } = await import("./orchModules/status.js");
        return handleDashboard({
          once: process.argv.includes("--once"),
          interval: parseInt(
            process.argv.find(a => a.startsWith("--interval="))?.split("=")[1] ?? "1000"
          ),
          json: isJsonOutput()
        });
      }

      case "help":
      case "--help":
      case "-h":
      case undefined:
        return printUsage();

      default:
        printError(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    printError(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
