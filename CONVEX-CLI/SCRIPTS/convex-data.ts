#!/usr/bin/env tsx
/**
 * Convex Data Script
 *
 * Query data from a Convex table
 *
 * Usage:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts <tableName> [options]
 *
 * Options:
 *   --limit=N    Limit number of results (default: 100)
 *   --json       Output as standardized JSON response
 *
 * Examples:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users --limit=10
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts workouts --json
 */

import { execSync } from 'child_process';
import { successResponse, errorResponse, outputResponse } from '../LIB/response.js';

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
  const startTime = Date.now();
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('❌ Error: Table name required\n');
    console.error('Usage: npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts <tableName> [options]\n');
    console.error('Examples:');
    console.error('  npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users');
    console.error('  npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts users --limit=10');
    process.exit(1);
  }

  const tableName = args[0];
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  const jsonMode = args.includes('--json');

  // FIX-009: Validate limit parameter
  if (limit !== undefined) {
    // Check for invalid parsing (NaN)
    if (isNaN(limit)) {
      const errorMsg = `❌ Error: --limit must be a valid number`;
      if (jsonMode) {
        const response = errorResponse(
          new Error(errorMsg),
          'data',
          startTime
        );
        outputResponse(response, true);
      } else {
        console.error(errorMsg);
      }
      process.exit(1);
    }

    // Reject negative limits
    if (limit < 0) {
      const errorMsg = `❌ Error: --limit must be >= 0 (got ${limit})`;
      if (jsonMode) {
        const response = errorResponse(
          new Error(errorMsg),
          'data',
          startTime
        );
        outputResponse(response, true);
      } else {
        console.error(errorMsg);
        console.error('💡 Tip: Use --limit=10 for the first 10 results\n');
      }
      process.exit(1);
    }

    // Warn on zero limit (valid but unusual)
    if (limit === 0 && !jsonMode) {
      console.warn('⚠️  Warning: --limit=0 will return no results');
      console.warn('💡 Tip: Remove --limit or use --limit=10 for results\n');
    }
  }

  try {
    if (!jsonMode) {
      console.log(`📖 Reading data from table: ${tableName}\n`);
    }

    const cmdArgs = ['data', tableName];
    if (limit !== undefined) {
      cmdArgs.push('--limit', limit.toString());
    }
    // Always use jsonLines format for parsing
    cmdArgs.push('--format', 'jsonLines');

    const output = executeConvexCLI(cmdArgs);
    const lines = output.split('\n').filter(l => l.trim());

    // Parse documents
    const documents = lines
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(doc => doc !== null);

    if (jsonMode) {
      // Standardized JSON response
      const response = successResponse(
        {
          documents,
          count: documents.length,
          table: tableName
        },
        'data',
        startTime
      );
      outputResponse(response, true);
    } else {
      // Pretty output for human consumption
      if (documents.length === 0) {
        console.log('⚠️  No documents found');
        return;
      }

      console.log(`Retrieved ${documents.length} document(s):\n`);
      documents.forEach((doc, idx) => {
        console.log(`[${idx}]`, JSON.stringify(doc, null, 2));
        console.log('');
      });
      console.log('✅ Data retrieved successfully');
    }
  } catch (error) {
    if (jsonMode) {
      const response = errorResponse(error as Error, 'data', startTime);
      outputResponse(response, true);
      process.exit(1);
    } else {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

main();
