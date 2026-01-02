#!/usr/bin/env tsx
/**
 * Convex Logs Script
 *
 * View Convex function execution logs
 *
 * Usage:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts [options]
 *
 * Options:
 *   --history=N    Number of log entries to retrieve (default: 30)
 *   --follow       Follow logs in real-time
 *   --success      Only show successful executions
 *   --error        Only show errors
 *   --timeout=N    Timeout in milliseconds (default: 30000)
 *   --json         Output as JSON (incompatible with --follow)
 *
 * Examples:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=50 --json
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --follow
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --error --history=100 --json
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-logs.ts --history=10 --timeout=15000
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { successResponse, errorResponse, outputResponse } from '../LIB/response';

const execAsync = promisify(exec);

async function executeConvexCLI(args: string[], timeoutMs: number): Promise<string> {
  try {
    const { stdout, stderr } = await execAsync(`npx convex ${args.join(' ')}`, {
      encoding: 'utf-8',
      cwd: process.cwd(),
      timeout: timeoutMs,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    if (stderr && stderr.trim()) {
      console.warn('⚠️ Warning:', stderr.trim());
    }

    return stdout.trim();
  } catch (error: any) {
    if (error.killed || error.signal === 'SIGTERM') {
      throw new Error(`Logs request timed out after ${timeoutMs}ms. Try: 1) Use smaller --history value, 2) Increase --timeout value, 3) Ensure --follow is not active`);
    }
    const stderr = error.stderr?.toString() || error.message;
    throw new Error(`Convex CLI failed: ${stderr}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const followMode = args.includes('--follow');
  const startTime = Date.now();

  // Parse timeout parameter (default 30 seconds)
  let timeoutMs = 30000;
  const timeoutArg = args.find(arg => arg.startsWith('--timeout='));
  if (timeoutArg) {
    const timeoutValue = parseInt(timeoutArg.split('=')[1], 10);
    if (!isNaN(timeoutValue) && timeoutValue > 0) {
      timeoutMs = timeoutValue;
    }
  }

  // JSON mode incompatible with follow mode
  if (jsonMode && followMode) {
    const errorMsg = '--json and --follow are incompatible';
    if (jsonMode) {
      const response = errorResponse(
        errorMsg,
        'logs',
        startTime,
        'INCOMPATIBLE_FLAGS'
      );
      outputResponse(response, jsonMode);
    } else {
      console.error('❌ Error:', errorMsg);
    }
    process.exit(1);
  }

  try {
    if (!jsonMode) {
      console.log('📜 Fetching logs...\n');
    }

    const cmdArgs = ['logs'];

    // Parse options (excluding --json and --timeout)
    for (const arg of args) {
      if (arg.startsWith('--history=')) {
        const value = arg.split('=')[1];
        cmdArgs.push('--history', value);
      } else if (arg === '--follow') {
        cmdArgs.push('--follow');
      } else if (arg === '--success') {
        cmdArgs.push('--success');
      } else if (arg === '--error') {
        cmdArgs.push('--error');
      }
    }

    const output = await executeConvexCLI(cmdArgs, timeoutMs);

    if (jsonMode) {
      // Parse logs from output
      const lines = output.split('\n').filter(l => l.trim());
      const logs: Array<{ timestamp: string; level: string; message: string }> = [];

      for (const line of lines) {
        // Try to parse structured log lines
        // Format may vary, so we'll do basic parsing
        const timestampMatch = line.match(/^\[(.*?)\]/);
        const timestamp = timestampMatch ? timestampMatch[1] : new Date().toISOString();

        let level = 'info';
        if (line.toLowerCase().includes('error')) level = 'error';
        else if (line.toLowerCase().includes('warn')) level = 'warn';

        logs.push({
          timestamp,
          level,
          message: line,
        });
      }

      const response = successResponse(
        {
          logs,
          count: logs.length,
        },
        'logs',
        startTime
      );
      outputResponse(response, jsonMode);
      process.exit(0);
    }

    // Pretty output (existing)
    console.log(output);
    console.log('\n✅ Logs retrieved successfully');
  } catch (error) {
    if (jsonMode) {
      const response = errorResponse(error as Error, 'logs', startTime);
      outputResponse(response, jsonMode);
      process.exit(1);
    } else {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

main();
