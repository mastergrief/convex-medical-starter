/**
 * ORCHESTRATION Test Setup
 * Provides mock utilities for unit testing orchestration modules
 * Note: No jsdom - this is Node-only testing
 */

import { vi } from 'vitest';
import type { GateContext, CheckResult } from '../lib/gateParserModules/types.js';
import type {
  TemplateVariable,
  SessionTemplate,
} from '../lib/templateProcessorModules/schemas.js';
import type { GateResult } from '../schemas/schemaModules/execution.js';

// =============================================================================
// Mock File System
// =============================================================================

export interface MockFileEntry {
  content: string;
  isDirectory?: boolean;
}

export interface MockFileSystem {
  files: Map<string, MockFileEntry>;
  existsSync: ReturnType<typeof vi.fn>;
  readFileSync: ReturnType<typeof vi.fn>;
  writeFileSync: ReturnType<typeof vi.fn>;
  readdirSync: ReturnType<typeof vi.fn>;
  mkdirSync: ReturnType<typeof vi.fn>;
  statSync: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock file system with virtual file storage
 */
export function createMockFileSystem(
  initialFiles: Record<string, string> = {}
): MockFileSystem {
  const files = new Map<string, MockFileEntry>();

  // Populate initial files
  for (const [path, content] of Object.entries(initialFiles)) {
    files.set(path, { content, isDirectory: false });
  }

  const existsSync = vi.fn((path: string) => files.has(path));

  const readFileSync = vi.fn((path: string, _encoding?: string) => {
    const entry = files.get(path);
    if (!entry) throw new Error(`ENOENT: no such file or directory, open '${path}'`);
    if (entry.isDirectory) throw new Error(`EISDIR: illegal operation on a directory, read '${path}'`);
    return entry.content;
  });

  const writeFileSync = vi.fn((path: string, content: string) => {
    files.set(path, { content, isDirectory: false });
  });

  const readdirSync = vi.fn((dirPath: string) => {
    const entries: string[] = [];
    const normalizedDir = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;

    for (const filePath of files.keys()) {
      if (filePath.startsWith(normalizedDir)) {
        const relativePath = filePath.slice(normalizedDir.length);
        const firstSegment = relativePath.split('/')[0];
        if (firstSegment && !entries.includes(firstSegment)) {
          entries.push(firstSegment);
        }
      }
    }
    return entries;
  });

  const mkdirSync = vi.fn((path: string, _options?: { recursive?: boolean }) => {
    files.set(path, { content: '', isDirectory: true });
  });

  const statSync = vi.fn((path: string) => {
    const entry = files.get(path);
    if (!entry) throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    return {
      isFile: () => !entry.isDirectory,
      isDirectory: () => !!entry.isDirectory,
      size: entry.content.length,
      mtime: new Date(),
    };
  });

  return {
    files,
    existsSync,
    readFileSync,
    writeFileSync,
    readdirSync,
    mkdirSync,
    statSync,
  };
}

// =============================================================================
// Mock Command Runner
// =============================================================================

export interface CommandResponse {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface MockCommandRunner {
  runCommand: ReturnType<typeof vi.fn>;
  responses: Map<string, CommandResponse>;
}

/**
 * Create a mock command runner for testing shell command execution
 * @param responses Map of command patterns to responses
 */
export function createMockCommandRunner(
  responses: Record<string, Partial<CommandResponse>> = {}
): MockCommandRunner {
  const responseMap = new Map<string, CommandResponse>();

  // Populate responses with defaults
  for (const [pattern, response] of Object.entries(responses)) {
    responseMap.set(pattern, {
      stdout: response.stdout ?? '',
      stderr: response.stderr ?? '',
      exitCode: response.exitCode ?? 0,
    });
  }

  const runCommand = vi.fn(async (cmd: string, _timeout?: number): Promise<CommandResponse> => {
    // Check for exact match first
    if (responseMap.has(cmd)) {
      return responseMap.get(cmd)!;
    }

    // Check for pattern match
    for (const [pattern, response] of responseMap.entries()) {
      if (cmd.includes(pattern)) {
        return response;
      }
    }

    // Default response
    return { stdout: '', stderr: '', exitCode: 0 };
  });

  return { runCommand, responses: responseMap };
}

// =============================================================================
// Mock Gate Context
// =============================================================================

/**
 * Create a mock GateContext for testing gate condition evaluation
 */
export function createMockGateContext(
  overrides: Partial<GateContext> = {}
): GateContext {
  const defaultCommandRunner = createMockCommandRunner();

  return {
    sessionPath: '/tmp/test-session',
    memoriesPath: '/tmp/test-memories',
    runCommand: defaultCommandRunner.runCommand,
    ...overrides,
  };
}

// =============================================================================
// Schema Fixtures - Phase
// =============================================================================

export interface MockPhase {
  id: string;
  name: string;
  description?: string;
  subtasks: MockSubtask[];
  parallelizable: boolean;
  gateCondition?: string;
}

/**
 * Create a mock phase for testing
 */
export function createMockPhase(overrides: Partial<MockPhase> = {}): MockPhase {
  return {
    id: 'phase-1',
    name: 'Test Phase',
    description: 'A test phase for unit testing',
    subtasks: [],
    parallelizable: false,
    gateCondition: undefined,
    ...overrides,
  };
}

// =============================================================================
// Schema Fixtures - Subtask
// =============================================================================

export interface MockSubtask {
  id: string;
  description: string;
  agentType: 'analyst' | 'developer' | 'browser' | 'orchestrator';
  priority: 'high' | 'medium' | 'low';
  dependencies: string[];
  estimatedTokens?: number;
}

/**
 * Create a mock subtask for testing
 */
export function createMockSubtask(overrides: Partial<MockSubtask> = {}): MockSubtask {
  return {
    id: 'task-1.1',
    description: 'Test task description',
    agentType: 'developer',
    priority: 'medium',
    dependencies: [],
    estimatedTokens: undefined,
    ...overrides,
  };
}

// =============================================================================
// Schema Fixtures - Plan
// =============================================================================

export interface MockPlan {
  id: string;
  name: string;
  description?: string;
  phases: MockPhase[];
  createdAt: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

/**
 * Create a mock plan for testing
 */
export function createMockPlan(overrides: Partial<MockPlan> = {}): MockPlan {
  return {
    id: 'plan-test-001',
    name: 'Test Plan',
    description: 'A test plan for unit testing',
    phases: [],
    createdAt: new Date().toISOString(),
    status: 'pending',
    ...overrides,
  };
}

// =============================================================================
// Schema Fixtures - Evidence Chain
// =============================================================================

export interface MockEvidenceChain {
  id: string;
  sessionId: string;
  requirement?: {
    taskId: string;
    description: string;
  };
  analysis?: {
    taskId: string;
    agentId: string;
    memoryName?: string;
  };
  implementation?: {
    taskId: string;
    agentId: string;
    filesModified: string[];
    typecheckPassed: boolean;
  };
  validation?: {
    taskId: string;
    agentId: string;
    testsPassed: number;
    testsFailed: number;
  };
  coveragePercent: number;
  valid: boolean;
}

/**
 * Create a mock evidence chain for testing
 * @param coverage Coverage percentage (0-100)
 */
export function createMockEvidenceChain(
  coverage: number = 0,
  overrides: Partial<MockEvidenceChain> = {}
): MockEvidenceChain {
  const base: MockEvidenceChain = {
    id: `evidence-${Date.now()}`,
    sessionId: 'test-session-001',
    coveragePercent: coverage,
    valid: coverage >= 50,
    ...overrides,
  };

  // Add stages based on coverage
  if (coverage >= 25) {
    base.requirement = base.requirement ?? {
      taskId: 'task-req',
      description: 'Test requirement',
    };
  }

  if (coverage >= 50) {
    base.analysis = base.analysis ?? {
      taskId: 'task-analysis',
      agentId: 'analyst-001',
      memoryName: 'ANALYSIS_TEST',
    };
  }

  if (coverage >= 75) {
    base.implementation = base.implementation ?? {
      taskId: 'task-impl',
      agentId: 'developer-001',
      filesModified: ['src/test.ts'],
      typecheckPassed: true,
    };
  }

  if (coverage >= 100) {
    base.validation = base.validation ?? {
      taskId: 'task-validation',
      agentId: 'browser-001',
      testsPassed: 5,
      testsFailed: 0,
    };
  }

  return base;
}

// =============================================================================
// Check Result Factory
// =============================================================================

/**
 * Create a mock CheckResult for testing gate evaluation
 */
export function createMockCheckResult(
  check: string,
  passed: boolean,
  message?: string
): CheckResult {
  return { check, passed, message };
}

/**
 * Create a passing CheckResult
 */
export function createPassingCheck(check: string, message?: string): CheckResult {
  return createMockCheckResult(check, true, message ?? `${check} passed`);
}

/**
 * Create a failing CheckResult
 */
export function createFailingCheck(check: string, message?: string): CheckResult {
  return createMockCheckResult(check, false, message ?? `${check} failed`);
}

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Wait for a specified number of milliseconds (for async test timing)
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a temporary test session path
 */
export function createTestSessionPath(sessionId: string = 'test-session'): string {
  return `/tmp/orchestration-tests/${sessionId}`;
}

/**
 * Create a temporary test memories path
 */
export function createTestMemoriesPath(): string {
  return '/tmp/orchestration-tests/memories';
}

/**
 * Reset all mocks in a MockFileSystem instance
 */
export function resetMockFileSystem(fs: MockFileSystem): void {
  fs.files.clear();
  fs.existsSync.mockReset();
  fs.readFileSync.mockReset();
  fs.writeFileSync.mockReset();
  fs.readdirSync.mockReset();
  fs.mkdirSync.mockReset();
  fs.statSync.mockReset();
}

/**
 * Reset mock command runner
 */
export function resetMockCommandRunner(runner: MockCommandRunner): void {
  runner.responses.clear();
  runner.runCommand.mockReset();
}


// =============================================================================
// Schema Fixtures - Template Variable
// =============================================================================

/**
 * Create a mock template variable for testing
 */
export function createMockTemplateVariable(
  overrides: Partial<TemplateVariable> = {}
): TemplateVariable {
  return {
    name: 'testVariable',
    description: 'A test variable',
    required: true,
    default: undefined,
    ...overrides,
  };
}

// =============================================================================
// Schema Fixtures - Session Template
// =============================================================================

/**
 * Create a mock session template for testing
 */
export function createMockSessionTemplate(
  overrides: Partial<SessionTemplate> = {}
): SessionTemplate {
  return {
    id: 'template-test-001',
    name: 'Test Template',
    description: 'A test workflow template',
    variables: [],
    phases: [],
    tags: ['test'],
    estimatedTokens: 10000,
    ...overrides,
  };
}

// =============================================================================
// Schema Fixtures - Gate Result
// =============================================================================

/**
 * Create a mock gate result for testing
 * @param passed Whether the gate check passed
 */
export function createMockGateResult(
  passed: boolean = true,
  overrides: Partial<GateResult> = {}
): GateResult {
  return {
    phaseId: 'phase-1',
    checkedAt: new Date().toISOString(),
    passed,
    results: [],
    blockers: passed ? [] : ['Test blocker'],
    ...overrides,
  };
}

// =============================================================================
// Schema Fixtures - Task Result With Output
// =============================================================================

/**
 * Task result with output for evidenceAutoPopulator testing
 */
export interface TaskResultWithOutput {
  taskId: string;
  status: string;
  summary: string;
  output?: Record<string, unknown>;
  evidence?: string[];
  blockers?: string[];
}

/**
 * Create a mock task result for testing
 * @param status Task completion status
 */
export function createMockTaskResult(
  status: 'completed' | 'failed' | 'blocked' = 'completed',
  overrides: Partial<TaskResultWithOutput> = {}
): TaskResultWithOutput {
  return {
    taskId: 'task-001',
    status,
    summary: `Task ${status}`,
    output: status === 'completed' ? { result: 'Task completed successfully' } : undefined,
    evidence: [],
    blockers: status === 'blocked' ? ['Blocked by dependency'] : [],
    ...overrides,
  };
}
