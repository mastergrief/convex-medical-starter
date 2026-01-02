#!/usr/bin/env tsx
/**
 * Convex Status Script
 *
 * Get Convex deployment status including URLs, team, and project info
 *
 * Usage:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts [--json]
 *
 * Options:
 *   --json    Output as JSON
 *
 * Examples:
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts
 *   npx tsx CONVEX-CLI/SCRIPTS/convex-status.ts --json
 */

import * as fs from 'fs';
import * as path from 'path';
import { successResponse, errorResponse, outputResponse } from '../LIB/response';

interface ConvexDeployment {
  kind: string;
  deploymentSelector: string;
  url: string;
  dashboardUrl: string;
  team?: string;
  project?: string;
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

async function main() {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const startTime = Date.now();

  try {
    if (!jsonMode) {
      console.log('📡 Fetching Convex deployment status...\n');
    }

    const deployments = getDeployments();

    if (deployments.length === 0) {
      if (jsonMode) {
        const response = errorResponse(
          'No deployments found',
          'status',
          startTime,
          'NO_DEPLOYMENTS'
        );
        outputResponse(response, jsonMode);
        process.exit(1);
      } else {
        console.log('⚠️  No deployments found');
        console.log('\n💡 Run `npx convex dev` to initialize a deployment');
        process.exit(1);
      }
    }

    if (jsonMode) {
      const response = successResponse(
        {
          deployments,
          active: true,
        },
        'status',
        startTime
      );
      outputResponse(response, jsonMode);
      process.exit(0);
    }

    // Pretty output (existing)
    console.log(`Found ${deployments.length} deployment(s):\n`);

    deployments.forEach((deployment, idx) => {
      console.log(`[${idx}] ${deployment.kind}`);
      if (deployment.team) {
        console.log(`    Team: ${deployment.team}`);
      }
      if (deployment.project) {
        console.log(`    Project: ${deployment.project}`);
      }
      console.log(`    URL: ${deployment.url}`);
      console.log(`    Dashboard: ${deployment.dashboardUrl}`);
      console.log(`    Selector: ${deployment.deploymentSelector.substring(0, 50)}...`);
      console.log('');
    });

    console.log('✅ Deployment active');
    console.log('\n💡 Use the URL to connect your client or run functions');
  } catch (error) {
    if (jsonMode) {
      const response = errorResponse(error as Error, 'status', startTime);
      outputResponse(response, jsonMode);
      process.exit(1);
    } else {
      console.error('❌ Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }
}

main();
