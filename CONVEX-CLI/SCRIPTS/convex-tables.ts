#!/usr/bin/env tsx
/**
 * Convex Tables Script
 *
 * List all tables in the Convex deployment
 *
 * Usage:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts [--json]
 *
 * Options:
 *   --json    Output as JSON
 *
 * Examples:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-tables.ts --json
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
  const startTime = Date.now();

  try {
    if (!jsonMode) {
      console.log('📊 Fetching database tables...\n');
    }

    const output = executeConvexCLI(['data']);

    // Parse tables from output (format: "Available tables:\n  tableName1\n  tableName2...")
    const lines = output.split('\n').filter(l => l.trim());
    const tables: string[] = [];
    let inTablesList = false;

    for (const line of lines) {
      if (line.includes('Available tables:')) {
        inTablesList = true;
        continue;
      }
      if (inTablesList && line.trim().startsWith('-')) {
        // Skip separator lines
        continue;
      }
      if (inTablesList && line.trim()) {
        const tableName = line.trim();
        if (tableName && !tableName.startsWith('Usage:') && !tableName.startsWith('npx')) {
          tables.push(tableName);
        }
      }
    }

    if (jsonMode) {
      const response = successResponse(
        {
          tables,
          count: tables.length,
        },
        'tables',
        startTime
      );
      outputResponse(response, jsonMode);
      process.exit(0);
    }

    // Pretty output (existing)
    console.log(output);
    console.log('\n✅ Tables listed successfully');
  } catch (error) {
    if (jsonMode) {
      const response = errorResponse(error as Error, 'tables', startTime);
      outputResponse(response, jsonMode);
      process.exit(1);
    } else {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      console.error('\n💡 Make sure Convex dev server is running: npx convex dev');
      process.exit(1);
    }
  }
}

main();
