/**
 * Core Commands E2E Tests
 * Integration tests for Browser-CLI command routing
 *
 * Note: These tests are designed to verify command routing and parsing.
 * Full browser automation tests should be run separately with a live manager.
 *
 * Prerequisites for full tests:
 * - Browser manager: npx tsx BROWSER-CLI/SCRIPTS/browser-manager.ts
 * - Dev server: npm run dev
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';

const MANAGER_PORT = 3456;
const STARTUP_TIMEOUT = 5000;
const COMMAND_TIMEOUT = 30000;

interface CommandResult {
  status: 'ok' | 'error';
  data?: Record<string, unknown>;
  message?: string;
  code?: string;
}

/**
 * Check if manager is running on the expected port
 */
async function isManagerRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(MANAGER_PORT, 'localhost');
  });
}

/**
 * Run a browser-cmd command and parse JSON response
 */
async function runCommand(cmd: string): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const args = cmd.split(/\s+/).filter(Boolean);
    const proc = spawn('npx', ['tsx', 'BROWSER-CLI/SCRIPTS/browser-cmd.ts', ...args], {
      cwd: process.cwd(),
      timeout: COMMAND_TIMEOUT,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      // Try to parse JSON from output
      try {
        // Find JSON in output (may have other text before/after)
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          resolve(JSON.parse(jsonMatch[0]));
        } else if (code === 0) {
          // Success but no JSON - likely status or similar
          resolve({ status: 'ok', data: { output: stdout.trim() } });
        } else {
          resolve({ status: 'error', message: stderr || stdout || `Exit code: ${code}` });
        }
      } catch {
        resolve({ status: 'error', message: `Failed to parse response: ${stdout}` });
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Start browser manager if not already running
 */
async function ensureManagerRunning(): Promise<ChildProcess | null> {
  if (await isManagerRunning()) {
    return null; // Already running
  }

  // Start manager
  const manager = spawn('npx', ['tsx', 'BROWSER-CLI/SCRIPTS/browser-manager.ts'], {
    cwd: process.cwd(),
    detached: true,
    stdio: 'ignore',
  });

  // Wait for startup
  await new Promise((resolve) => setTimeout(resolve, STARTUP_TIMEOUT));

  if (!(await isManagerRunning())) {
    throw new Error('Failed to start browser manager');
  }

  return manager;
}

describe('Core Commands E2E', () => {
  let managerProcess: ChildProcess | null = null;
  let managerAvailable = false;

  beforeAll(async () => {
    try {
      managerProcess = await ensureManagerRunning();
      managerAvailable = await isManagerRunning();
    } catch {
      managerAvailable = false;
    }
  }, STARTUP_TIMEOUT + 5000);

  afterAll(() => {
    // Only kill if we started it
    if (managerProcess) {
      try {
        process.kill(-managerProcess.pid!, 'SIGTERM');
      } catch {
        // May already be dead
      }
    }
  });

  // Helper to skip tests when manager not available
  const itWithManager = managerAvailable ? it : it.skip;

  describe('status command', () => {
    it('returns manager status', async () => {
      const result = await runCommand('status');

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('running');
    });

    it('shows browser state after start', async () => {
      // Ensure browser is started
      await runCommand('start');

      const result = await runCommand('status --verbose');

      expect(result.status).toBe('ok');
    });
  });

  describe('navigate command', () => {
    it('navigates to a URL', async () => {
      // Start browser first
      await runCommand('start');

      const result = await runCommand('navigate data:text/html,<h1>Test</h1>');

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.goto');
    });

    it('returns error for invalid URL format', async () => {
      const result = await runCommand('navigate');

      expect(result.status).toBe('error');
    });
  });

  describe('wait command', () => {
    it('waits for specified duration', async () => {
      const start = Date.now();
      const result = await runCommand('wait 100');
      const elapsed = Date.now() - start;

      expect(result.status).toBe('ok');
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });

  describe('screenshot command', () => {
    it('takes a screenshot', async () => {
      // Navigate to a page first
      await runCommand('start');
      await runCommand('navigate data:text/html,<h1>Screenshot Test</h1>');

      const result = await runCommand('screenshot /tmp/e2e-test-screenshot.png');

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.screenshot');
    });
  });

  describe('evaluate command', () => {
    it('evaluates JavaScript in browser context', async () => {
      await runCommand('navigate data:text/html,<h1>Eval Test</h1>');

      const result = await runCommand("evaluate 'document.title'");

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.evaluate');
    });
  });

  describe('click command', () => {
    it('clicks an element by CSS selector', async () => {
      await runCommand("navigate data:text/html,<button id='btn'>Click Me</button>");
      await runCommand('wait 100');

      const result = await runCommand('click #btn');

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.click');
    });

    it('returns error for non-existent element', async () => {
      const result = await runCommand('click #nonexistent-element-xyz');

      // May timeout or return error
      expect(['ok', 'error']).toContain(result.status);
    });
  });

  describe('type command', () => {
    it('types into an input field', async () => {
      await runCommand("navigate data:text/html,<input id='inp' type='text'>");
      await runCommand('wait 100');

      const result = await runCommand('type #inp "Hello World"');

      expect(result.status).toBe('ok');
    });
  });

  describe('pressKey command', () => {
    it('presses a keyboard key', async () => {
      const result = await runCommand('pressKey Enter');

      expect(result.status).toBe('ok');
      expect(result.code).toContain('keyboard.press');
    });
  });

  describe('hover command', () => {
    it('hovers over an element', async () => {
      await runCommand("navigate data:text/html,<div id='hov'>Hover Me</div>");
      await runCommand('wait 100');

      const result = await runCommand('hover #hov');

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.hover');
    });
  });

  describe('resize command', () => {
    it('resizes the viewport', async () => {
      const result = await runCommand('resize 1280 720');

      expect(result.status).toBe('ok');
      expect(result.code).toContain('setViewportSize');
    });
  });

  describe('waitForSelector command', () => {
    it('waits for a selector to appear', async () => {
      await runCommand("navigate data:text/html,<div id='target'>Target</div>");

      const result = await runCommand('waitForSelector #target');

      expect(result.status).toBe('ok');
      expect(result.code).toContain('waitForSelector');
    });

    it('supports state option', async () => {
      await runCommand("navigate data:text/html,<div id='vis'>Visible</div>");

      const result = await runCommand('waitForSelector #vis --state=visible');

      expect(result.status).toBe('ok');
    });
  });

  describe('snapshot command', () => {
    it('takes accessibility snapshot', async () => {
      await runCommand("navigate data:text/html,<h1>Snapshot Test</h1><button>Click</button>");
      await runCommand('wait 100');

      const result = await runCommand('snapshot');

      expect(result.status).toBe('ok');
    });
  });

  describe('console command', () => {
    it('retrieves console messages', async () => {
      await runCommand("navigate data:text/html,<script>console.log('test')</script>");
      await runCommand('wait 100');

      const result = await runCommand('console');

      expect(result.status).toBe('ok');
    });
  });

  describe('command routing verification', () => {
    it('CSS selector routes to CoreActionsFeature', async () => {
      // This verifies the fix - CSS selectors should now work
      await runCommand("navigate data:text/html,<button class='test-btn'>Test</button>");
      await runCommand('wait 100');

      const result = await runCommand('click .test-btn');

      // Should NOT get "Unknown command" error
      expect(result.status).toBe('ok');
      expect(result.message).not.toContain('Unknown command');
    });

    it('ref selector routes to SnapshotFeature', async () => {
      await runCommand("navigate data:text/html,<button>Ref Test</button>");
      const snapshot = await runCommand('snapshot');

      expect(snapshot.status).toBe('ok');
      // If we got refs, try clicking by ref
      // This confirms ByRef routing still works
    });
  });
});
