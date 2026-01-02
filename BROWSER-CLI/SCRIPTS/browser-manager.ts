#!/usr/bin/env tsx
/**
 * Browser Manager Daemon - Entry Point
 *
 * Long-running process that maintains a single browser instance
 * and provides commands via TCP socket for other scripts to use.
 *
 * Usage:
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-manager.ts [--port=3456]
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import { DEFAULT_PORT, STATE_DIR, INSTANCE_ID, TOKEN_FILE } from './core/constants';
import { BrowserManager } from './browserManagerModules';
import { ConfigLoader } from './core/config';

function parsePort(): number {
  const portArg = process.argv.find((arg) => arg.startsWith('--port='));
  if (portArg) {
    return parseInt(portArg.split('=')[1], 10);
  }
  return DEFAULT_PORT;
}

function parseSessionId(): string | undefined {
  const sessionArg = process.argv.find((arg) => arg.startsWith('--session-id='));
  if (sessionArg) {
    return sessionArg.split('=')[1];
  }
  return undefined;
}

// Main execution
const port = parsePort();
const sessionId = parseSessionId();

// Ensure state directory exists for non-default instances
if (INSTANCE_ID !== 'default' && !fs.existsSync(STATE_DIR)) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  console.log(`Created instance state directory: ${STATE_DIR}`);
}

// Generate session token for TCP authentication
const sessionToken = crypto.randomBytes(32).toString('hex');
fs.writeFileSync(TOKEN_FILE, sessionToken, { mode: 0o600 });
console.log(`Session token generated: ${TOKEN_FILE}`);

const manager = new BrowserManager(port);

// Set session ID if provided (enables session-scoped auto-close)
if (sessionId) {
  manager.setSessionId(sessionId);
  console.log(`Session-scoped mode: ${sessionId}`);
}

// Load config from YAML file and apply to manager
const config = ConfigLoader.load();
manager.setConfig({
  width: config.viewport.width,
  height: config.viewport.height,
  headless: config.headless,
});

if (INSTANCE_ID !== 'default') {
  console.log(`Running as instance: ${INSTANCE_ID}`);
}

process.on('SIGINT', async () => {
  await manager.close();
  manager.stopServer();
});

process.on('SIGTERM', async () => {
  await manager.close();
  manager.stopServer();
});

manager.startServer().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
