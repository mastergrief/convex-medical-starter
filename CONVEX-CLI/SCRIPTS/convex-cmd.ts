#!/usr/bin/env tsx
/**
 * Convex Command Client
 *
 * CLI wrapper for Convex operations providing easy access to deployment management,
 * database operations, and function execution.
 *
 * Usage:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts status [--json]
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts tables [--json]
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts data <tableName> [--limit=N] [--json]
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts functions [--json]
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts run <functionName> <args> [--json]
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts env-list [--json]
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts env-get <name> [--json]
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts env-set <name> <value> [--json]
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts logs [--history=N] [--json]
 *
 * Options:
 *   --json    Output as JSON
 *
 * Examples:
 *   # Get deployment status
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts status
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts status --json
 *
 *   # List all tables
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts tables --json
 *
 *   # Query table data
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts data users --limit=10 --json
 *
 *   # List all functions
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts functions --json
 *
 *   # Run a function
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts run users:create '{"email":"test@example.com"}' --json
 *
 *   # View logs
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts logs --history=50 --json
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ConvexConfig {
  team?: string;
  project?: string;
  prodUrl?: string;
}

/**
 * Execute an individual Convex CLI script
 */
function executeScript(scriptName: string, args: string[]): string {
  try {
    const scriptPath = path.join(__dirname, scriptName);
    const result = execSync(`npx tsx ${scriptPath} ${args.join(' ')}`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (error: any) {
    const stderr = error.stderr?.toString() || error.stdout?.toString() || error.message;
    throw new Error(stderr);
  }
}

interface ConvexDeployment {
  kind: string;
  deploymentSelector: string;
  url: string;
  dashboardUrl: string;
  team?: string;
  project?: string;
}

function readConvexConfig(): ConvexConfig {
  const configPath = path.join(process.cwd(), 'convex.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  return {};
}

function parseEnvFile(filePath: string): Record<string, string> {
  const env: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return env;

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove comments from value
      const commentIndex = value.indexOf('#');
      if (commentIndex > 0) {
        value = value.substring(0, commentIndex).trim();
      }

      // Remove quotes
      value = value.replace(/^["'](.*)["']$/, '$1');

      env[key] = value;
    }
  }

  return env;
}

function getDeployments(): ConvexDeployment[] {
  const deployments: ConvexDeployment[] = [];
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) return deployments;

  const content = fs.readFileSync(envPath, 'utf-8');
  const lines = content.split('\n');

  let convexDeployment = '';
  let convexUrl = '';
  let team = '';
  let project = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('CONVEX_DEPLOYMENT=')) {
      // Extract value and comment
      const match = trimmed.match(/CONVEX_DEPLOYMENT=([^\s#]+)(?:\s*#\s*(.*))?/);
      if (match) {
        convexDeployment = match[1];
        const comment = match[2];
        if (comment) {
          const teamMatch = comment.match(/team:\s*([^,]+)/);
          const projectMatch = comment.match(/project:\s*([^\s]+)/);
          if (teamMatch) team = teamMatch[1].trim();
          if (projectMatch) project = projectMatch[1].trim();
        }
      }
    } else if (trimmed.startsWith('VITE_CONVEX_URL=')) {
      const match = trimmed.match(/VITE_CONVEX_URL=([^\s#]+)/);
      if (match) convexUrl = match[1];
    }
  }

  if (convexDeployment && convexUrl) {
    const [kind, deploymentName] = convexDeployment.split(':');

    const deployment: ConvexDeployment = {
      kind: kind === 'dev' ? 'ownDev' : kind,
      deploymentSelector: `${kind}:${Buffer.from(JSON.stringify({
        projectDir: process.cwd(),
        deployment: { kind: kind === 'dev' ? 'ownDev' : kind }
      })).toString('base64')}`,
      url: convexUrl,
      dashboardUrl: `https://dashboard.convex.dev/d/${deploymentName}`,
    };

    if (team) deployment.team = team;
    if (project) deployment.project = project;

    deployments.push(deployment);
  }

  return deployments;
}

function executeConvexCLI(args: string[]): string {
  try {
    const result = execSync(`npx convex ${args.join(' ')}`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return result.trim();
  } catch (error: any) {
    const stderr = error.stderr?.toString() || error.message;
    throw new Error(`Convex CLI failed: ${stderr}`);
  }
}

async function handleStatus(jsonMode: boolean): Promise<void> {
  const args = jsonMode ? ['--json'] : [];
  const output = executeScript('convex-status.ts', args);
  console.log(output);
}

async function handleTables(jsonMode: boolean): Promise<void> {
  const args = jsonMode ? ['--json'] : [];
  const output = executeScript('convex-tables.ts', args);
  console.log(output);
}

async function handleData(tableName: string, limit: number | undefined, jsonMode: boolean): Promise<void> {
  const args = [tableName];
  if (limit) args.push(`--limit=${limit}`);
  if (jsonMode) args.push('--json');
  const output = executeScript('convex-data.ts', args);
  console.log(output);
}

async function handleFunctions(jsonMode: boolean): Promise<void> {
  const args = jsonMode ? ['--json'] : [];
  const output = executeScript('convex-functions.ts', args);
  console.log(output);
}

async function handleRun(functionName: string, argsJson: string, jsonMode: boolean): Promise<void> {
  const args = [functionName, argsJson];
  if (jsonMode) args.push('--json');
  const output = executeScript('convex-run.ts', args);
  console.log(output);
}

async function handleEnvList(jsonMode: boolean): Promise<void> {
  const args = ['list'];
  if (jsonMode) args.push('--json');
  const output = executeScript('convex-env.ts', args);
  console.log(output);
}

async function handleEnvGet(name: string, jsonMode: boolean): Promise<void> {
  const args = ['get', name];
  if (jsonMode) args.push('--json');
  const output = executeScript('convex-env.ts', args);
  console.log(output);
}

async function handleEnvSet(name: string, value: string, jsonMode: boolean): Promise<void> {
  const args = ['set', name, value];
  if (jsonMode) args.push('--json');
  const output = executeScript('convex-env.ts', args);
  console.log(output);
}

async function handleLogs(history: number | undefined, jsonMode: boolean): Promise<void> {
  const args = [];
  if (history) args.push(`--history=${history}`);
  if (jsonMode) args.push('--json');
  const output = executeScript('convex-logs.ts', args);
  console.log(output);
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const filteredArgs = args.filter(a => a !== '--json');

  if (filteredArgs.length === 0) {
    console.error('❌ Error: Command required\n');
    console.error('Usage: npx tsx CONVEX-CLI/SCRIPTS/convex-cmd.ts <command> [args...] [--json]\n');
    console.error('Commands:');
    console.error('  status                        - Get deployment status');
    console.error('  tables                        - List tables');
    console.error('  data <table> [--limit=N]      - Query table data');
    console.error('  functions                     - List function files');
    console.error('  run <function> <args>         - Run function');
    console.error('  env-list                      - List env variables');
    console.error('  env-get <name>                - Get env variable');
    console.error('  env-set <name> <value>        - Set env variable');
    console.error('  logs [--history=N]            - View logs');
    console.error('\nOptions:');
    console.error('  --json                        - Output as JSON');
    process.exit(1);
  }

  const command = filteredArgs[0];

  try {
    switch (command) {
      case 'status':
        await handleStatus(jsonMode);
        break;

      case 'tables':
        await handleTables(jsonMode);
        break;

      case 'data':
        if (!filteredArgs[1]) {
          throw new Error('Usage: data <tableName> [--limit=N] [--json]');
        }
        const limit = filteredArgs.find(a => a.startsWith('--limit='))?.split('=')[1];
        await handleData(filteredArgs[1], limit ? parseInt(limit, 10) : undefined, jsonMode);
        break;

      case 'functions':
        await handleFunctions(jsonMode);
        break;

      case 'run':
        if (!filteredArgs[1] || !filteredArgs[2]) {
          throw new Error('Usage: run <functionName> <argsJson> [--json]');
        }
        await handleRun(filteredArgs[1], filteredArgs[2], jsonMode);
        break;

      case 'env-list':
        await handleEnvList(jsonMode);
        break;

      case 'env-get':
        if (!filteredArgs[1]) {
          throw new Error('Usage: env-get <name> [--json]');
        }
        await handleEnvGet(filteredArgs[1], jsonMode);
        break;

      case 'env-set':
        if (!filteredArgs[1] || !filteredArgs[2]) {
          throw new Error('Usage: env-set <name> <value> [--json]');
        }
        await handleEnvSet(filteredArgs[1], filteredArgs[2], jsonMode);
        break;

      case 'logs':
        const history = filteredArgs.find(a => a.startsWith('--history='))?.split('=')[1];
        await handleLogs(history ? parseInt(history, 10) : undefined, jsonMode);
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
