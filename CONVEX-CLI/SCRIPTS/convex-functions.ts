#!/usr/bin/env tsx
/**
 * Convex Functions Script
 *
 * List all Convex functions in the project
 *
 * Usage:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-functions.ts [options]
 *
 * Options:
 *   --detailed     Show file paths and details
 *   --json         Output as JSON
 *
 * Examples:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-functions.ts
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-functions.ts --detailed
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-functions.ts --json
 */

import * as fs from 'fs';
import * as path from 'path';
import { successResponse, errorResponse, outputResponse } from '../LIB/response';

async function main() {
  const args = process.argv.slice(2);
  const detailed = args.includes('--detailed');
  const jsonMode = args.includes('--json');
  const startTime = Date.now();

  try {
    if (!jsonMode) {
      console.log('⚡ Listing Convex functions...\n');
    }

    const convexDir = path.join(process.cwd(), 'convex');
    if (!fs.existsSync(convexDir)) {
      if (jsonMode) {
        const response = errorResponse(
          'No convex directory found',
          'functions',
          startTime,
          'NO_CONVEX_DIR'
        );
        outputResponse(response, jsonMode);
        process.exit(1);
      } else {
        console.log('⚠️  No convex directory found');
        console.log('\n💡 Create a convex/ directory and add function files');
        process.exit(1);
      }
    }

    const files = fs.readdirSync(convexDir)
      .filter(f => f.endsWith('.ts') || f.endsWith('.js'))
      .filter(f => !f.startsWith('_'))
      .sort();

    if (files.length === 0) {
      if (jsonMode) {
        const response = successResponse(
          {
            functions: [],
            count: 0,
          },
          'functions',
          startTime
        );
        outputResponse(response, jsonMode);
        process.exit(0);
      } else {
        console.log('⚠️  No function files found');
        return;
      }
    }

    // Build function info array
    const functions = files.map(file => {
      const fullPath = path.join(convexDir, file);
      const stats = fs.statSync(fullPath);
      const sizeKB = (stats.size / 1024).toFixed(2);

      return {
        name: file,
        path: `convex/${file}`,
        size: parseFloat(sizeKB),
        modified: stats.mtime.toISOString(),
      };
    });

    if (jsonMode) {
      const response = successResponse(
        {
          functions,
          count: functions.length,
        },
        'functions',
        startTime
      );
      outputResponse(response, jsonMode);
      process.exit(0);
    }

    // Pretty output (existing)
    console.log(`Found ${files.length} function file(s):\n`);

    if (detailed) {
      functions.forEach(func => {
        console.log(`📄 ${func.name}`);
        console.log(`   Path: ${func.path}`);
        console.log(`   Size: ${func.size} KB`);
        console.log(`   Modified: ${func.modified}`);
        console.log('');
      });
    } else {
      functions.forEach(func => {
        console.log(`📄 ${func.name}`);
      });
    }

    console.log(`\n✅ Total: ${functions.length} file(s)`);
    console.log('\n💡 Use convex-run.ts to execute functions');
  } catch (error) {
    if (jsonMode) {
      const response = errorResponse(error as Error, 'functions', startTime);
      outputResponse(response, jsonMode);
      process.exit(1);
    } else {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

main();
