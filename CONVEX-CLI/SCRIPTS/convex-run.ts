#!/usr/bin/env tsx
/**
 * Convex Run Script
 *
 * Execute a Convex function (query, mutation, or action)
 *
 * Usage:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts <functionName> <args> [--json]
 *
 * Options:
 *   --json    Output as JSON
 *
 * Examples:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:list '{}'
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:create '{"email":"test@example.com"}'
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts analytics:getMetrics '{"userId":"123"}' --json
 */

import { execSync } from 'child_process';
import { successResponse, errorResponse, outputResponse } from '../LIB/response';

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

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const filteredArgs = args.filter(a => a !== '--json');
  const startTime = Date.now();

  if (filteredArgs.length < 2) {
    const errorMsg = 'Function name and arguments required';
    if (jsonMode) {
      const response = errorResponse(
        errorMsg,
        'run',
        startTime,
        'MISSING_ARGUMENTS'
      );
      outputResponse(response, jsonMode);
    } else {
      console.error('❌ Error: Function name and arguments required\n');
      console.error('Usage: npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts <functionName> <args>\n');
      console.error('Examples:');
      console.error('  npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:list \'{}\'');
      console.error('  npx tsx CONVEX-CLI/SCRIPTS/convex-run.ts users:create \'{"email":"test@example.com"}\'');
    }
    process.exit(1);
  }

  const functionName = filteredArgs[0];
  const argsJson = filteredArgs[1];

  try {
    // Validate JSON
    JSON.parse(argsJson);

    if (!jsonMode) {
      console.log(`🚀 Running function: ${functionName}\n`);
    }

    const output = executeConvexCLI(['run', functionName, argsJson]);

    // Try to parse result as JSON
    let result: any;
    try {
      result = JSON.parse(output);
    } catch {
      result = output;
    }

    if (jsonMode) {
      const response = successResponse(
        {
          result,
          functionName,
        },
        'run',
        startTime
      );
      outputResponse(response, jsonMode);
      process.exit(0);
    }

    // Pretty output (existing)
    console.log('✅ Result:');
    console.log(output);
  } catch (error) {
    if (jsonMode) {
      const response = errorResponse(error as Error, 'run', startTime);
      outputResponse(response, jsonMode);
      process.exit(1);
    } else {
      if (error instanceof SyntaxError) {
        console.error('❌ Error: Invalid JSON arguments');
        console.error('Args must be valid JSON, e.g., \'{}\' or \'{"key":"value"}\'');
      } else {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      }
      process.exit(1);
    }
  }
}

main();
