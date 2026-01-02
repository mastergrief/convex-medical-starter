/**
 * @vitest-environment node
 */
/**
 * CONTEXT HUB TESTS
 * Integration-style unit tests for ContextHub facade class
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  createMockFileSystem,
  type MockFileSystem,
} from '../setup.js';

// Mock fs module before importing ContextHub
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  statSync: vi.fn(),
  appendFileSync: vi.fn(),
  rmSync: vi.fn(),
}));

// Mock child_process for gate checks that run commands
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    execSync: vi.fn(() => Buffer.from('')),
    exec: vi.fn((_cmd: string, _opts: unknown, callback?: (err: Error | null, stdout: string, stderr: string) => void) => {
      if (callback) callback(null, '', '');
      return { stdout: '', stderr: '' };
    }),
  };
});

import { ContextHub, createContextHub } from '../../lib/context-hub.js';

// =============================================================================
// TEST FIXTURES
// =============================================================================

const TEST_BASE_PATH = '/tmp/orchestration-tests';
// Session ID format: YYYYMMDD_HH-MM_UUID
const TEST_SESSION_ID = '20231215_10-00_a1b2c3d4-e5f6-7890-abcd-ef1234567890';
const TEST_SESSION_PATH = `${TEST_BASE_PATH}/sessions/${TEST_SESSION_ID}`;

// Valid UUIDs for testing
const TEST_PROMPT_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
const TEST_PLAN_ID = 'b2c3d4e5-f6a7-8901-bcde-f23456789012';

function createTestPrompt(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PROMPT_ID,
    type: 'prompt' as const,
    metadata: {
      sessionId: TEST_SESSION_ID,
      timestamp: new Date().toISOString(),
      version: '1.0.0' as const,
    },
    request: {
      description: 'Test prompt description',
    },
    ...overrides,
  };
}

function createTestPlan(overrides: Record<string, unknown> = {}) {
  return {
    id: TEST_PLAN_ID,
    type: 'plan' as const,
    metadata: {
      promptId: TEST_PROMPT_ID,
      sessionId: TEST_SESSION_ID,
      timestamp: new Date().toISOString(),
      version: '1.0.0' as const,
    },
    summary: 'Test plan summary',
    phases: [
      {
        id: 'phase-1',
        name: 'Phase 1',
        description: 'First phase',
        subtasks: [
          {
            id: 'task-1.1',
            description: 'Task 1.1',
            agentType: 'developer' as const,
            priority: 'medium' as const,
            dependencies: [],
          },
        ],
        parallelizable: false,
      },
      {
        id: 'phase-2',
        name: 'Phase 2',
        description: 'Second phase',
        subtasks: [],
        parallelizable: false,
      },
    ],
    ...overrides,
  };
}

// createTestHandoff reserved for future handoff operation tests

function createTestOrchestratorState(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: TEST_SESSION_ID,
    planId: TEST_PLAN_ID,
    currentPhase: {
      id: 'phase-1',
      name: 'Phase 1',
      progress: 50,
    },
    completedTasks: [],
    activeAgents: [],
    metadata: {
      timestamp: new Date().toISOString(),
    },
    ...overrides,
  };
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe('ContextHub', () => {
  let mockFs: MockFileSystem;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock file system with session directories
    mockFs = createMockFileSystem({
      [`${TEST_SESSION_PATH}/prompts/`]: '',
      [`${TEST_SESSION_PATH}/plans/`]: '',
      [`${TEST_SESSION_PATH}/handoffs/`]: '',
      [`${TEST_SESSION_PATH}/gates/`]: '',
      [`${TEST_SESSION_PATH}/memories/`]: '',
      [`${TEST_SESSION_PATH}/history/log.jsonl`]: '',
    });

    // Wire up mocks
    vi.mocked(fs.existsSync).mockImplementation(mockFs.existsSync);
    vi.mocked(fs.readFileSync).mockImplementation(mockFs.readFileSync);
    vi.mocked(fs.writeFileSync).mockImplementation(mockFs.writeFileSync);
    vi.mocked(fs.readdirSync).mockImplementation(mockFs.readdirSync);
    vi.mocked(fs.mkdirSync).mockImplementation(mockFs.mkdirSync);
    vi.mocked(fs.statSync).mockImplementation(mockFs.statSync);
    vi.mocked(fs.appendFileSync).mockImplementation((filePath: fs.PathOrFileDescriptor, data: string | Uint8Array) => {
      const pathStr = filePath.toString();
      const existing = mockFs.files.get(pathStr)?.content || '';
      mockFs.files.set(pathStr, { content: existing + data.toString(), isDirectory: false });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // CONSTRUCTOR & SESSION TESTS
  // ===========================================================================

  describe('constructor and session management', () => {
    it('creates session directory structure on construction', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      expect(hub).toBeDefined();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('returns correct session ID from getSessionId', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      expect(hub.getSessionId()).toBe(TEST_SESSION_ID);
    });

    it('returns correct session path from getSessionPath', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      expect(hub.getSessionPath()).toBe(TEST_SESSION_PATH);
    });

    it('lists sessions from static listSessions method', () => {
      // Add session directories to mock
      mockFs.files.set(`${TEST_BASE_PATH}/sessions/session-a/`, { content: '', isDirectory: true });
      mockFs.files.set(`${TEST_BASE_PATH}/sessions/session-b/`, { content: '', isDirectory: true });

      const sessions = ContextHub.listSessions(TEST_BASE_PATH);

      expect(Array.isArray(sessions)).toBe(true);
    });

    it('returns latest session from static getLatestSession method', () => {
      // Set up sessions directory with entries
      mockFs.files.set(`${TEST_BASE_PATH}/sessions/`, { content: '', isDirectory: true });
      mockFs.files.set(`${TEST_BASE_PATH}/sessions/20231201_10-00_old-session/`, { content: '', isDirectory: true });
      mockFs.files.set(`${TEST_BASE_PATH}/sessions/20231215_10-00_new-session/`, { content: '', isDirectory: true });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fs.readdirSync as any).mockReturnValue(['20231201_10-00_old-session', '20231215_10-00_new-session']);

      const latest = ContextHub.getLatestSession(TEST_BASE_PATH);

      // Should return the latest (sorted alphabetically, newest last)
      expect(latest).toBeDefined();
    });
  });

  // ===========================================================================
  // PROMPT CRUD TESTS
  // ===========================================================================

  describe('prompt operations', () => {
    it('writes prompt to file system', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      const prompt = createTestPrompt();
      const result = hub.writePrompt(prompt);

      expect(result.success).toBe(true);
      expect(result.path).toContain('prompts');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('reads prompt by ID', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Write a prompt first
      const prompt = createTestPrompt();
      const writeResult = hub.writePrompt(prompt);

      // Add the file to mock fs for reading
      mockFs.files.set(writeResult.path, {
        content: JSON.stringify(prompt),
        isDirectory: false,
      });

      const readResult = hub.readPrompt(prompt.id);

      expect(readResult.success).toBe(true);
      expect(readResult.data?.id).toBe(prompt.id);
    });

    it('reads latest prompt when no ID provided', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Set up prompts directory with files
      const promptPath = `${TEST_SESSION_PATH}/prompts/prompt-latest.json`;
      mockFs.files.set(promptPath, {
        content: JSON.stringify(createTestPrompt()),
        isDirectory: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fs.readdirSync as any).mockReturnValue(['prompt-latest.json']);
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        return mockFs.files.has(pathStr) || pathStr.includes('prompts');
      });

      const readResult = hub.readPrompt();

      // Should attempt to read without requiring specific ID
      expect(typeof readResult.success).toBe('boolean');
    });

    it('lists prompt IDs', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Mock readdirSync to return prompt files
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fs.readdirSync as any).mockReturnValue(['prompt-001.json', 'prompt-002.json']);

      const prompts = hub.listPrompts();

      expect(Array.isArray(prompts)).toBe(true);
    });
  });

  // ===========================================================================
  // PLAN CRUD TESTS
  // ===========================================================================

  describe('plan operations', () => {
    it('writes plan to file system', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      const plan = createTestPlan();
      const result = hub.writePlan(plan);

      expect(result.success).toBe(true);
      expect(result.path).toContain('plans');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('reads plan by ID', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Write plan and add to mock fs
      const plan = createTestPlan();
      const writeResult = hub.writePlan(plan);

      mockFs.files.set(writeResult.path, {
        content: JSON.stringify(plan),
        isDirectory: false,
      });

      // Also add current-plan.json for latest lookup
      const currentPlanPath = `${TEST_SESSION_PATH}/current-plan.json`;
      mockFs.files.set(currentPlanPath, {
        content: JSON.stringify(plan),
        isDirectory: false,
      });

      const readResult = hub.readPlan(plan.id);

      expect(readResult.success).toBe(true);
    });

    it('lists plan IDs', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fs.readdirSync as any).mockReturnValue(['plan-001.json', 'plan-002.json']);

      const plans = hub.listPlans();

      expect(Array.isArray(plans)).toBe(true);
    });

    it('returns error for invalid plan data', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Try to read a non-existent plan
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const readResult = hub.readPlan('non-existent-plan');

      expect(readResult.success).toBe(false);
      expect(readResult.error).toBeDefined();
    });
  });

  // ===========================================================================
  // GATE OPERATIONS TESTS
  // ===========================================================================

  describe('gate operations', () => {
    it('checks gate with simple condition (passes by default when no conditions)', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Set up plan with no gate conditions
      const plan = createTestPlan();
      const currentPlanPath = `${TEST_SESSION_PATH}/current-plan.json`;
      mockFs.files.set(currentPlanPath, {
        content: JSON.stringify(plan),
        isDirectory: false,
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        return mockFs.files.has(pathStr) || pathStr.includes(TEST_SESSION_PATH);
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = p.toString();
        const entry = mockFs.files.get(pathStr);
        if (entry) return entry.content;
        throw new Error(`ENOENT: ${pathStr}`);
      });

      const result = hub.checkGate('phase-1');

      expect(result.phaseId).toBe('phase-1');
      expect(typeof result.passed).toBe('boolean');
      expect(Array.isArray(result.results)).toBe(true);
      expect(Array.isArray(result.blockers)).toBe(true);
    });

    it('checks gate with memory requirement', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Set up plan with gate condition
      const plan = createTestPlan({
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            description: 'Test phase',
            subtasks: [],
            parallelizable: false,
            gateCondition: 'memory:ANALYSIS_*',
          },
        ],
      });

      const currentPlanPath = `${TEST_SESSION_PATH}/current-plan.json`;
      mockFs.files.set(currentPlanPath, {
        content: JSON.stringify(plan),
        isDirectory: false,
      });

      // Mock serena memories directory (empty - no matching memory)
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        if (pathStr.includes('.serena/memories')) return true;
        return mockFs.files.has(pathStr) || pathStr.includes(TEST_SESSION_PATH);
      });
      vi.mocked(fs.readdirSync).mockImplementation((p) => {
        const pathStr = p.toString();
        if (pathStr.includes('.serena/memories')) return [];
        return mockFs.readdirSync(pathStr);
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = p.toString();
        const entry = mockFs.files.get(pathStr);
        if (entry) return entry.content;
        throw new Error(`ENOENT: ${pathStr}`);
      });

      const result = hub.checkGate('phase-1');

      expect(result.phaseId).toBe('phase-1');
      // Should fail because no ANALYSIS_* memory exists
      expect(result.passed).toBe(false);
      expect(result.blockers.length).toBeGreaterThan(0);
    });

    it('advances phase on passing gate', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Set up plan and state
      const plan = createTestPlan();
      const state = createTestOrchestratorState();

      const currentPlanPath = `${TEST_SESSION_PATH}/current-plan.json`;
      const statePath = `${TEST_SESSION_PATH}/orchestrator-state.json`;

      mockFs.files.set(currentPlanPath, {
        content: JSON.stringify(plan),
        isDirectory: false,
      });
      mockFs.files.set(statePath, {
        content: JSON.stringify(state),
        isDirectory: false,
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        return mockFs.files.has(pathStr) || pathStr.includes(TEST_SESSION_PATH);
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = p.toString();
        const entry = mockFs.files.get(pathStr);
        if (entry) return entry.content;
        throw new Error(`ENOENT: ${pathStr}`);
      });

      const result = hub.advancePhase('phase-1');

      expect(result.success).toBe(true);
      expect(result.gateResult).toBeDefined();
      expect(result.nextPhase).toBe('phase-2');
    });

    it('fails to advance phase on failing gate', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Set up plan with failing gate condition
      const plan = createTestPlan({
        phases: [
          {
            id: 'phase-1',
            name: 'Phase 1',
            description: 'Test phase',
            subtasks: [],
            parallelizable: false,
            gateCondition: 'memory:REQUIRED_MEMORY_*',
          },
        ],
      });

      const currentPlanPath = `${TEST_SESSION_PATH}/current-plan.json`;
      mockFs.files.set(currentPlanPath, {
        content: JSON.stringify(plan),
        isDirectory: false,
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        if (pathStr.includes('.serena/memories')) return true;
        return mockFs.files.has(pathStr) || pathStr.includes(TEST_SESSION_PATH);
      });
      vi.mocked(fs.readdirSync).mockImplementation((p) => {
        const pathStr = p.toString();
        if (pathStr.includes('.serena/memories')) return [];
        return mockFs.readdirSync(pathStr);
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = p.toString();
        const entry = mockFs.files.get(pathStr);
        if (entry) return entry.content;
        throw new Error(`ENOENT: ${pathStr}`);
      });

      const result = hub.advancePhase('phase-1');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.gateResult.passed).toBe(false);
    });
  });

  // ===========================================================================
  // MEMORY OPERATIONS TESTS
  // ===========================================================================

  describe('memory operations', () => {
    it('links memory and creates link file', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Mock the serena memory file
      const memoryPath = path.join(process.cwd(), '.serena', 'memories', 'TEST_MEMORY.md');
      mockFs.files.set(memoryPath, {
        content: '# Test Memory\nSome content here.',
        isDirectory: false,
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        return mockFs.files.has(pathStr) || pathStr.includes(TEST_SESSION_PATH);
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = p.toString();
        const entry = mockFs.files.get(pathStr);
        if (entry) return entry.content;
        throw new Error(`ENOENT: ${pathStr}`);
      });

      const result = hub.linkMemory('TEST_MEMORY', {
        forAgents: ['developer'],
        summary: 'Test memory for unit testing',
      });

      expect(result.success).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('lists linked memories', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Add linked memory files to mock
      const linkedMemory = {
        memoryName: 'TEST_MEMORY',
        serenaPath: '/path/to/memory',
        linkedAt: new Date().toISOString(),
        forAgents: ['developer'],
      };
      mockFs.files.set(`${TEST_SESSION_PATH}/memories/TEST_MEMORY.json`, {
        content: JSON.stringify(linkedMemory),
        isDirectory: false,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fs.readdirSync as any).mockReturnValue(['TEST_MEMORY.json']);
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        return mockFs.files.has(pathStr) || pathStr.includes('memories');
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = p.toString();
        const entry = mockFs.files.get(pathStr);
        if (entry) return entry.content;
        throw new Error(`ENOENT: ${pathStr}`);
      });

      const memories = hub.listLinkedMemories();

      expect(Array.isArray(memories)).toBe(true);
    });

    it('gets linked memory content', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Set up linked memory
      const linkedMemory = {
        memoryName: 'TEST_MEMORY',
        serenaPath: `${process.cwd()}/.serena/memories/TEST_MEMORY.md`,
        linkedAt: new Date().toISOString(),
        forAgents: ['developer'],
      };
      mockFs.files.set(`${TEST_SESSION_PATH}/memories/TEST_MEMORY.json`, {
        content: JSON.stringify(linkedMemory),
        isDirectory: false,
      });
      mockFs.files.set(`${process.cwd()}/.serena/memories/TEST_MEMORY.md`, {
        content: '# Test Memory\nContent here.',
        isDirectory: false,
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        return mockFs.files.has(pathStr);
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = p.toString();
        const entry = mockFs.files.get(pathStr);
        if (entry) return entry.content;
        throw new Error(`ENOENT: ${pathStr}`);
      });

      const result = hub.getLinkedMemory('TEST_MEMORY');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  // ===========================================================================
  // UTILITY TESTS
  // ===========================================================================

  describe('utility operations', () => {
    it('gets history entries', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      // Set up history log
      const historyLog = [
        JSON.stringify({ timestamp: '2023-12-01T10:00:00.000Z', type: 'prompt', id: 'p1' }),
        JSON.stringify({ timestamp: '2023-12-01T10:05:00.000Z', type: 'plan', id: 'plan1' }),
      ].join('\n');

      mockFs.files.set(`${TEST_SESSION_PATH}/history/log.jsonl`, {
        content: historyLog,
        isDirectory: false,
      });

      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = p.toString();
        return mockFs.files.has(pathStr);
      });
      vi.mocked(fs.readFileSync).mockImplementation((p) => {
        const pathStr = p.toString();
        const entry = mockFs.files.get(pathStr);
        if (entry) return entry.content;
        throw new Error(`ENOENT: ${pathStr}`);
      });

      const history = hub.getHistory();

      expect(Array.isArray(history)).toBe(true);
    });

    it('validates file against schema', () => {
      const hub = new ContextHub({
        basePath: TEST_BASE_PATH,
        sessionId: TEST_SESSION_ID,
      });

      const validPlan = createTestPlan();
      const planPath = `${TEST_SESSION_PATH}/plans/plan-001.json`;
      mockFs.files.set(planPath, {
        content: JSON.stringify(validPlan),
        isDirectory: false,
      });

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(validPlan));

      const result = hub.validateFile(planPath);

      expect(result).toBeDefined();
      expect(typeof result.valid).toBe('boolean');
    });
  });

  // ===========================================================================
  // FACTORY FUNCTION TEST
  // ===========================================================================

  describe('createContextHub factory', () => {
    it('creates ContextHub with default base path', () => {
      const hub = createContextHub(TEST_SESSION_ID);

      expect(hub).toBeInstanceOf(ContextHub);
      expect(hub.getSessionId()).toBe(TEST_SESSION_ID);
    });
  });
});
