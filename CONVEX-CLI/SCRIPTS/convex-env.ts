#!/usr/bin/env tsx
/**
 * Convex Environment Variables Script
 *
 * Manage Convex environment variables
 *
 * Usage:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list [--json] [--masked]
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts get <name> [--json] [--masked]
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts set <name> <value> [--json]
 *
 * Options:
 *   --json    Output as JSON
 *   --masked  Mask sensitive values (API keys, secrets, tokens)
 *
 * Examples:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts list --masked
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts get OPENAI_API_KEY --json --masked
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts set MY_VAR "my value"
 */

import { execSync } from 'child_process';
import { successResponse, errorResponse, outputResponse } from '../LIB/response';

/**
 * Sensitive key patterns to always mask
 */
const SENSITIVE_PATTERNS = [
  /key/i,
  /secret/i,
  /token/i,
  /password/i,
  /jwks/i,
  /jwt/i,
  /api[_-]?key/i,
  /private/i,
  /auth/i,
  /credential/i,
];

/**
 * Check if variable name matches sensitive patterns
 */
function shouldMaskVariable(name: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(name));
}

/**
 * Mask sensitive value (show first 4 and last 4 characters)
 */
function maskValue(value: string, name: string): string {
  if (value.length <= 8) {
    return '***'; // Very short values fully masked
  }

  // Show first 4 and last 4 characters
  const start = value.slice(0, 4);
  const end = value.slice(-4);
  const masked = '*'.repeat(Math.min(value.length - 8, 20));

  return `${start}${masked}${end}`;
}

/**
 * Mask variable if it matches sensitive patterns
 */
function applyMasking(name: string, value: string, shouldMask: boolean): { value: string; masked: boolean } {
  if (shouldMask && shouldMaskVariable(name)) {
    return {
      value: maskValue(value, name),
      masked: true
    };
  }
  return {
    value,
    masked: false
  };
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

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const maskedMode = args.includes('--masked');
  const filteredArgs = args.filter(a => a !== '--json' && a !== '--masked');
  const startTime = Date.now();

  if (filteredArgs.length === 0) {
    const errorMsg = 'Command required';
    if (jsonMode) {
      const response = errorResponse(
        errorMsg,
        'env',
        startTime,
        'MISSING_COMMAND'
      );
      outputResponse(response, jsonMode);
    } else {
      console.error('❌ Error: Command required\n');
      console.error('Usage: npx tsx CONVEX-CLI/SCRIPTS/convex-env.ts <command> [args...]\n');
      console.error('Commands:');
      console.error('  list           - List all environment variables');
      console.error('  get <name>     - Get specific environment variable');
      console.error('  set <name> <value> - Set environment variable');
    }
    process.exit(1);
  }

  const command = filteredArgs[0];

  try {
    switch (command) {
      case 'list':
        if (!jsonMode) {
          console.log('🔐 Fetching environment variables...\n');
        }
        const listOutput = executeConvexCLI(['env', 'list']);

        // Parse env vars from output
        const lines = listOutput.split('\n').filter(l => l.trim());
        const variables: Array<{ name: string; value: string; masked?: boolean }> = [];

        for (const line of lines) {
          const match = line.match(/^(.+?)\s*=\s*(.*)$/);
          if (match) {
            const name = match[1].trim();
            const rawValue = match[2].trim();
            const { value, masked } = applyMasking(name, rawValue, maskedMode);

            variables.push({
              name,
              value,
              ...(masked && { masked: true })
            });
          }
        }

        if (jsonMode) {
          const response = successResponse(
            {
              variables,
              count: variables.length,
              masked: maskedMode
            },
            'env-list',
            startTime
          );
          outputResponse(response, jsonMode);
          process.exit(0);
        }

        // Console output with warning
        if (!maskedMode) {
          console.log('⚠️  WARNING: Displaying unmasked sensitive environment variables');
          console.log('   Use --masked flag to hide sensitive values\n');
        }

        // Display variables
        for (const variable of variables) {
          const maskedTag = variable.masked ? ' (MASKED)' : '';
          console.log(`${variable.name}: ${variable.value}${maskedTag}`);
        }

        console.log('\n✅ Environment variables listed');
        break;

      case 'get':
        if (!filteredArgs[1]) {
          throw new Error('Variable name required for get command');
        }
        const varName = filteredArgs[1];
        if (!jsonMode) {
          console.log(`🔐 Getting environment variable: ${varName}\n`);
        }
        const getOutput = executeConvexCLI(['env', 'get', varName]);
        const rawValue = getOutput.trim();

        // FIX-007: Validate that variable exists
        if (!rawValue || rawValue === '') {
          // Get list of available variables
          const listOutput = executeConvexCLI(['env', 'list']);
          const availableVars = listOutput
            .split('\n')
            .filter(l => l.trim())
            .map(line => {
              const match = line.match(/^(.+?)\s*=\s*(.*)$/);
              return match ? match[1].trim() : null;
            })
            .filter(name => name !== null);

          const errorMsg = `Environment variable '${varName}' not found`;
          const detailedMsg = availableVars.length > 0
            ? `${errorMsg}. Available variables: ${availableVars.join(', ')}`
            : `${errorMsg}. No environment variables are currently set.`;

          if (jsonMode) {
            const response = errorResponse(
              detailedMsg,
              'env-get',
              startTime,
              'VAR_NOT_FOUND'
            );
            outputResponse(response, jsonMode);
          } else {
            console.error(`❌ Error: ${errorMsg}\n`);
            if (availableVars.length > 0) {
              console.error('💡 Available variables:');
              availableVars.forEach(name => console.error(`   - ${name}`));
              console.error('');
            }
          }
          process.exit(1);
        }

        // Apply masking
        const { value: displayValue, masked } = applyMasking(varName, rawValue, maskedMode);

        if (jsonMode) {
          const response = successResponse(
            {
              name: varName,
              value: displayValue,
              ...(masked && { masked: true })
            },
            'env-get',
            startTime
          );
          outputResponse(response, jsonMode);
          process.exit(0);
        }

        // Console output with warning
        if (!maskedMode && shouldMaskVariable(varName)) {
          console.log('⚠️  WARNING: Displaying unmasked sensitive environment variable');
          console.log('   Use --masked flag to hide sensitive values\n');
        }

        const maskedTag = masked ? ' (MASKED)' : '';
        console.log(`${displayValue}${maskedTag}`);
        break;

      case 'set':
        if (!filteredArgs[1] || !filteredArgs[2]) {
          throw new Error('Variable name and value required for set command');
        }
        if (!jsonMode) {
          console.log(`🔐 Setting environment variable: ${filteredArgs[1]}\n`);
        }
        executeConvexCLI(['env', 'set', filteredArgs[1], filteredArgs[2]]);

        if (jsonMode) {
          const response = successResponse(
            {
              name: filteredArgs[1],
              value: filteredArgs[2],
              success: true,
            },
            'env-set',
            startTime
          );
          outputResponse(response, jsonMode);
          process.exit(0);
        }

        console.log(`✅ ${filteredArgs[1]} set successfully`);
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    if (jsonMode) {
      const response = errorResponse(error as Error, `env-${command}`, startTime);
      outputResponse(response, jsonMode);
      process.exit(1);
    } else {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

main();
