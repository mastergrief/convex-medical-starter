/**
 * @vitest-environment node
 */
/**
 * gatesModules Unit Tests
 *
 * Tests for the modular gates subsystem:
 * - parsing.ts: Gate condition parsing
 * - checking.ts: Gate validation and checking
 * - io.ts: Gate result I/O operations
 * - advancement.ts: Phase advancement logic
 * - evidence.ts: Evidence checking operations
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fs from "fs";
import { execSync } from "child_process";
import type { GateResult, Plan, OrchestratorState, GateValidation } from "../../schemas/index.js";
import type { ReadResult, WriteResult, ContextHubConfig, LinkedMemoryInfo } from "../../lib/contextHubModules/types.js";
import type { LinkedMemoryData } from "../../lib/contextHubModules/memory.js";

// Mock fs before importing modules
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Create mock references using vi.hoisted() to ensure they're available when vi.mock() factory runs
const { mockExecSync, mockExec } = vi.hoisted(() => ({
  mockExecSync: vi.fn(() => Buffer.from("")),
  mockExec: vi.fn(
    (
      _cmd: string,
      _opts: unknown,
      callback?: (err: Error | null, stdout: string, stderr: string) => void
    ) => {
      if (callback) callback(null, "", "");
      return { stdout: "", stderr: "" };
    }
  ),
}));

// Mock child_process for typecheck/tests
vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  return {
    ...actual,
    execSync: mockExecSync,
    exec: mockExec,
  };
});

// Import after mocking
import {
  parseGateCondition,
  checkGate,
  writeGateResult,
  readGateResult,
  listGateResults,
  advancePhase,
  checkEvidenceCoverage,
  checkEvidenceExists,
} from "../../lib/contextHubModules/gatesModules/index.js";

// =============================================================================
// MOCK HELPERS
// =============================================================================

function createMockConfig(sessionPath: string = "/tmp/test-session"): ContextHubConfig {
  return {
    basePath: "/tmp/test-base",
    sessionId: "test-session-001",
    sessionPath,
    maxHistoryItems: 100,
  };
}

function createMockGateResult(
  phaseId: string = "phase-1",
  passed: boolean = true,
  overrides: Partial<GateResult> = {}
): GateResult {
  return {
    phaseId,
    passed,
    checkedAt: "2025-12-26T10:00:00.000Z",
    results: passed ? [{ check: "test", passed: true }] : [{ check: "test", passed: false, message: "Failed" }],
    blockers: passed ? [] : ["Test blocker"],
    ...overrides,
  };
}

function createMockPlan(phases: Array<{ id: string; name: string; gateCondition?: string }>): Plan {
  return {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    type: "plan",
    metadata: {
      promptId: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      sessionId: "20251226_10-00_test-session-id",
      timestamp: "2025-12-26T10:00:00.000Z",
      version: "1.0.0",
    },
    summary: "Test plan for unit tests",
    phases: phases.map((p) => ({
      id: p.id,
      name: p.name,
      description: "Test phase description",
      subtasks: [],
      parallelizable: false,
      gateCondition: p.gateCondition,
    })),
  };
}

function createMockOrchestratorState(currentPhaseId: string = "phase-1"): OrchestratorState {
  return {
    id: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    type: "orchestrator_state",
    metadata: {
      sessionId: "20251226_10-00_test-session-id",
      planId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      timestamp: "2025-12-26T10:00:00.000Z",
      version: "1.0.0",
    },
    status: "running",
    currentPhase: { id: currentPhaseId, name: "Test Phase", progress: 50 },
    agents: [],
    taskQueue: [],
    handoffHistory: [],
  };
}

// =============================================================================
// GATE CONDITION PARSING TESTS (6 tests)
// =============================================================================

describe("parseGateCondition", () => {
  it("should parse simple typecheck condition", () => {
    const result = parseGateCondition("typecheck");

    expect(result.requiredTypecheck).toBe(true);
    expect(result.requiredTests).toBeUndefined();
    expect(result.requiredMemories).toBeUndefined();
  });

  it("should parse simple tests condition", () => {
    const result = parseGateCondition("tests");

    expect(result.requiredTests).toBe(true);
    expect(result.requiredTypecheck).toBeUndefined();
  });

  it("should parse AND conditions (comma/space separated)", () => {
    const result = parseGateCondition("typecheck, tests");

    expect(result.requiredTypecheck).toBe(true);
    expect(result.requiredTests).toBe(true);
  });

  it("should parse memory pattern conditions", () => {
    const result = parseGateCondition("memory:ANALYSIS_*");

    expect(result.requiredMemories).toEqual(["ANALYSIS_*"]);
    expect(result.requiredTypecheck).toBeUndefined();
  });

  it("should parse complex conditions with multiple patterns", () => {
    const result = parseGateCondition("typecheck memory:ANALYSIS_* memory:IMPL_* traceability:analyzed_symbols");

    expect(result.requiredTypecheck).toBe(true);
    expect(result.requiredMemories).toEqual(["ANALYSIS_*", "IMPL_*"]);
    expect(result.requiredTraceability).toEqual(["analyzed_symbols"]);
  });

  it("should handle malformed conditions gracefully", () => {
    const result = parseGateCondition("   unknown:something   ");

    // Unknown patterns should be ignored
    expect(result.requiredTypecheck).toBeUndefined();
    expect(result.requiredTests).toBeUndefined();
    expect(result.requiredMemories).toBeUndefined();
  });
});

// =============================================================================
// GATE I/O TESTS (5 tests)
// =============================================================================

describe("Gate I/O Operations", () => {
  const mockedFs = vi.mocked(fs);
  const config = createMockConfig();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("writeGateResult", () => {
    it("should write gate result to file with timestamp", () => {
      mockedFs.existsSync.mockReturnValue(true);
      const appendHistory = vi.fn();
      const gateResult = createMockGateResult("phase-1", true);

      const result = writeGateResult(config, gateResult, appendHistory);

      expect(result.success).toBe(true);
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2); // timestamped + latest
      expect(appendHistory).toHaveBeenCalledWith("gate_check", "phase-1");
    });

    it("should create gates directory if it does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);
      const appendHistory = vi.fn();
      const gateResult = createMockGateResult("phase-1", true);

      writeGateResult(config, gateResult, appendHistory);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining("gates"), { recursive: true });
    });
  });

  describe("readGateResult", () => {
    it("should read existing gate result", () => {
      const gateResult = createMockGateResult("phase-1", true);
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(gateResult));

      const result = readGateResult(config, "phase-1");

      expect(result.success).toBe(true);
      expect(result.data).toEqual(gateResult);
    });

    it("should return failure for missing phase result", () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = readGateResult(config, "missing-phase");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No gate result found");
    });

    it("should handle JSON parse errors gracefully", () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue("invalid json {");

      const result = readGateResult(config, "phase-1");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("listGateResults", () => {
    it("should list all gate results sorted by date", () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        "gate-phase-1-2025-12-26T09-00-00-000Z.json",
        "gate-phase-1-2025-12-26T10-00-00-000Z.json",
        "gate-phase-1-latest.json", // should be excluded
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      mockedFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const pathStr = String(filePath);
        if (pathStr.includes("09-00-00")) {
          return JSON.stringify(createMockGateResult("phase-1", true, { checkedAt: "2025-12-26T09:00:00.000Z" }));
        }
        return JSON.stringify(createMockGateResult("phase-1", false, { checkedAt: "2025-12-26T10:00:00.000Z" }));
      });

      const results = listGateResults(config);

      expect(results).toHaveLength(2);
      // Should be sorted descending by date
      expect(results[0].checkedAt).toBe("2025-12-26T10:00:00.000Z");
      expect(results[1].checkedAt).toBe("2025-12-26T09:00:00.000Z");
    });

    it("should filter by phaseId when provided", () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        "gate-phase-1-2025-12-26T09-00-00-000Z.json",
        "gate-phase-2-2025-12-26T10-00-00-000Z.json",
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      mockedFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const pathStr = String(filePath);
        if (pathStr.includes("phase-1")) {
          return JSON.stringify(createMockGateResult("phase-1", true));
        }
        return JSON.stringify(createMockGateResult("phase-2", false));
      });

      const results = listGateResults(config, "phase-1");

      expect(results).toHaveLength(1);
      expect(results[0].phaseId).toBe("phase-1");
    });

    it("should return empty array when gates directory does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);

      const results = listGateResults(config);

      expect(results).toEqual([]);
    });
  });
});

// =============================================================================
// GATE CHECKING TESTS (8 tests)
// =============================================================================

describe("checkGate", () => {
  const mockedFs = vi.mocked(fs);
  const mockedExecSync = vi.mocked(execSync);
  const config = createMockConfig();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: gates directory exists
    mockedFs.existsSync.mockReturnValue(true);
    // Default: execSync succeeds (empty output = success)
    mockedExecSync.mockReturnValue(Buffer.from(""));
  });

  // Helper functions for checkGate
  const createMockReadPlan = (plan: Plan | null): (() => ReadResult<Plan>) => {
    return () =>
      plan ? { success: true, data: plan } : { success: false, error: "No plan" };
  };

  const createMockListLinkedMemories = (memories: LinkedMemoryInfo[] = []): (() => LinkedMemoryInfo[]) => {
    return () => memories;
  };

  const createMockGetLinkedMemory = (): ((name: string) => ReadResult<LinkedMemoryData>) => {
    return (_name: string): ReadResult<LinkedMemoryData> => ({ success: false, error: "Not found" });
  };

  const createMockWriteGateResult = (): ((result: GateResult) => WriteResult) => {
    return () => ({ success: true, path: "/tmp/gate.json" });
  };

  it("should pass when no gate conditions are defined", () => {
    const result = checkGate(
      config,
      "phase-1",
      undefined,
      createMockReadPlan(createMockPlan([{ id: "phase-1", name: "Phase 1" }])),
      createMockListLinkedMemories(),
      createMockGetLinkedMemory(),
      createMockWriteGateResult()
    );

    expect(result.passed).toBe(true);
    expect(result.results[0].check).toBe("default");
    expect(result.blockers).toHaveLength(0);
  });

  it("should include check results array in output", () => {
    const validation: GateValidation = { requiredTypecheck: true };
    mockedExecSync.mockReturnValue(Buffer.from(""));

    const result = checkGate(
      config,
      "phase-1",
      validation,
      createMockReadPlan(null),
      createMockListLinkedMemories(),
      createMockGetLinkedMemory(),
      createMockWriteGateResult()
    );

    expect(Array.isArray(result.results)).toBe(true);
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty("check");
    expect(result.results[0]).toHaveProperty("passed");
  });

  it("should pass typecheck when npm run typecheck succeeds", () => {
    const validation: GateValidation = { requiredTypecheck: true };
    mockedExecSync.mockReturnValue(Buffer.from(""));

    const result = checkGate(
      config,
      "phase-1",
      validation,
      createMockReadPlan(null),
      createMockListLinkedMemories(),
      createMockGetLinkedMemory(),
      createMockWriteGateResult()
    );

    expect(result.passed).toBe(true);
    expect(result.results.find((r) => r.check === "typecheck")?.passed).toBe(true);
  });

  it("should fail typecheck when npm run typecheck fails", () => {
    const validation: GateValidation = { requiredTypecheck: true };
    const error = new Error("Typecheck failed");
    (error as NodeJS.ErrnoException & { stderr: Buffer }).stderr = Buffer.from("Found 5 errors");
    mockedExecSync.mockImplementation(() => {
      throw error;
    });

    const result = checkGate(
      config,
      "phase-1",
      validation,
      createMockReadPlan(null),
      createMockListLinkedMemories(),
      createMockGetLinkedMemory(),
      createMockWriteGateResult()
    );

    expect(result.passed).toBe(false);
    expect(result.results.find((r) => r.check === "typecheck")?.passed).toBe(false);
    expect(result.blockers).toContain("Typecheck failed: 5 errors");
  });

  it("should pass tests check when npm test succeeds", () => {
    const validation: GateValidation = { requiredTests: true };
    mockedExecSync.mockReturnValue(Buffer.from(""));

    const result = checkGate(
      config,
      "phase-1",
      validation,
      createMockReadPlan(null),
      createMockListLinkedMemories(),
      createMockGetLinkedMemory(),
      createMockWriteGateResult()
    );

    expect(result.passed).toBe(true);
    expect(result.results.find((r) => r.check === "tests")?.passed).toBe(true);
  });

  it("should fail tests check when npm test fails", () => {
    const validation: GateValidation = { requiredTests: true };
    mockedExecSync.mockImplementation(() => {
      throw new Error("Tests failed");
    });

    const result = checkGate(
      config,
      "phase-1",
      validation,
      createMockReadPlan(null),
      createMockListLinkedMemories(),
      createMockGetLinkedMemory(),
      createMockWriteGateResult()
    );

    expect(result.passed).toBe(false);
    expect(result.results.find((r) => r.check === "tests")?.passed).toBe(false);
    expect(result.blockers).toContain("Tests failed");
  });

  it("should pass memory existence check when memory file exists", () => {
    const validation: GateValidation = { requiredMemories: ["ANALYSIS_*"] };
    mockedFs.readdirSync.mockReturnValue([
      "ANALYSIS_FEATURE_20251226.md",
      "OTHER_FILE.md",
    ] as unknown as ReturnType<typeof fs.readdirSync>);

    const result = checkGate(
      config,
      "phase-1",
      validation,
      createMockReadPlan(null),
      createMockListLinkedMemories(),
      createMockGetLinkedMemory(),
      createMockWriteGateResult()
    );

    expect(result.passed).toBe(true);
    expect(result.results.find((r) => r.check === "memory:ANALYSIS_*")?.passed).toBe(true);
  });

  it("should fail memory existence check when no matching memory found", () => {
    const validation: GateValidation = { requiredMemories: ["ANALYSIS_*"] };
    mockedFs.readdirSync.mockReturnValue([
      "IMPL_FEATURE.md",
      "OTHER_FILE.md",
    ] as unknown as ReturnType<typeof fs.readdirSync>);

    const result = checkGate(
      config,
      "phase-1",
      validation,
      createMockReadPlan(null),
      createMockListLinkedMemories(),
      createMockGetLinkedMemory(),
      createMockWriteGateResult()
    );

    expect(result.passed).toBe(false);
    expect(result.results.find((r) => r.check === "memory:ANALYSIS_*")?.passed).toBe(false);
    expect(result.blockers).toContain("Missing memory: ANALYSIS_*");
  });
});

// =============================================================================
// PHASE ADVANCEMENT TESTS (5 tests)
// =============================================================================

describe("advancePhase", () => {
  const config = createMockConfig();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Helper for creating mock functions
  const createMockCheckGateFn = (result: GateResult): ((phaseId: string, validation?: GateValidation) => GateResult) => {
    return () => result;
  };

  const createMockReadPlan = (plan: Plan | null): (() => ReadResult<Plan>) => {
    return () =>
      plan ? { success: true, data: plan } : { success: false, error: "No plan" };
  };

  const createMockReadOrchestratorState = (state: OrchestratorState | null): (() => ReadResult<OrchestratorState>) => {
    return () =>
      state ? { success: true, data: state } : { success: false, error: "No state" };
  };

  const createMockWriteOrchestratorState = (): ((state: OrchestratorState) => WriteResult) => {
    return vi.fn(() => ({ success: true, path: "/tmp/state.json" }));
  };

  it("should advance to next phase on gate success", () => {
    const plan = createMockPlan([
      { id: "phase-1", name: "Phase 1" },
      { id: "phase-2", name: "Phase 2" },
    ]);
    const gateResult = createMockGateResult("phase-1", true);
    const state = createMockOrchestratorState("phase-1");
    const appendHistory = vi.fn();
    const writeState = createMockWriteOrchestratorState();

    const result = advancePhase(
      config,
      "phase-1",
      undefined,
      createMockCheckGateFn(gateResult),
      createMockReadPlan(plan),
      createMockReadOrchestratorState(state),
      writeState,
      appendHistory
    );

    expect(result.success).toBe(true);
    expect(result.nextPhase).toBe("phase-2");
    expect(result.gateResult.passed).toBe(true);
    expect(appendHistory).toHaveBeenCalledWith("phase_advance", "phase-2");
  });

  it("should return completed when advancing from last phase", () => {
    const plan = createMockPlan([{ id: "phase-1", name: "Phase 1" }]);
    const gateResult = createMockGateResult("phase-1", true);
    const state = createMockOrchestratorState("phase-1");
    const appendHistory = vi.fn();

    const result = advancePhase(
      config,
      "phase-1",
      undefined,
      createMockCheckGateFn(gateResult),
      createMockReadPlan(plan),
      createMockReadOrchestratorState(state),
      createMockWriteOrchestratorState(),
      appendHistory
    );

    expect(result.success).toBe(true);
    expect(result.nextPhase).toBeUndefined();
    expect(appendHistory).toHaveBeenCalledWith("phase_advance", "complete");
  });

  it("should fail if gate check fails", () => {
    const plan = createMockPlan([
      { id: "phase-1", name: "Phase 1" },
      { id: "phase-2", name: "Phase 2" },
    ]);
    const gateResult = createMockGateResult("phase-1", false);
    const state = createMockOrchestratorState("phase-1");
    const appendHistory = vi.fn();

    const result = advancePhase(
      config,
      "phase-1",
      undefined,
      createMockCheckGateFn(gateResult),
      createMockReadPlan(plan),
      createMockReadOrchestratorState(state),
      createMockWriteOrchestratorState(),
      appendHistory
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Gate check failed");
    expect(result.gateResult.passed).toBe(false);
    expect(appendHistory).not.toHaveBeenCalled();
  });

  it("should update orchestrator state with next phase", () => {
    const plan = createMockPlan([
      { id: "phase-1", name: "Phase 1" },
      { id: "phase-2", name: "Phase 2" },
    ]);
    const gateResult = createMockGateResult("phase-1", true);
    const state = createMockOrchestratorState("phase-1");
    const writeState = vi.fn(() => ({ success: true, path: "/tmp/state.json" }));
    const appendHistory = vi.fn();

    advancePhase(
      config,
      "phase-1",
      undefined,
      createMockCheckGateFn(gateResult),
      createMockReadPlan(plan),
      createMockReadOrchestratorState(state),
      writeState,
      appendHistory
    );

    expect(writeState).toHaveBeenCalledWith(
      expect.objectContaining({
        currentPhase: expect.objectContaining({
          id: "phase-2",
          name: "Phase 2",
        }),
      })
    );
  });

  it("should fail if plan is not found", () => {
    const gateResult = createMockGateResult("phase-1", true);
    const state = createMockOrchestratorState("phase-1");
    const appendHistory = vi.fn();

    const result = advancePhase(
      config,
      "phase-1",
      undefined,
      createMockCheckGateFn(gateResult),
      createMockReadPlan(null),
      createMockReadOrchestratorState(state),
      createMockWriteOrchestratorState(),
      appendHistory
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("No plan found");
  });
});

// =============================================================================
// EVIDENCE CHECKING TESTS (4 tests)
// =============================================================================

describe("Evidence Checking", () => {
  const mockedFs = vi.mocked(fs);
  const config = createMockConfig();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkEvidenceExists", () => {
    it("should return passed when evidence chain exists", async () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = await checkEvidenceExists(config, "chain-001");

      expect(result.passed).toBe(true);
      expect(result.message).toContain("found");
    });

    it("should return failed when evidence chain does not exist", async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await checkEvidenceExists(config, "chain-001");

      expect(result.passed).toBe(false);
      expect(result.message).toContain("not found");
    });
  });

  describe("checkEvidenceCoverage", () => {
    it("should pass when average coverage meets minimum", async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        "chain-1.json",
        "chain-2.json",
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      mockedFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
        const pathStr = String(filePath);
        if (pathStr.includes("chain-1")) {
          return JSON.stringify({ chainStatus: { coveragePercent: 80 } });
        }
        return JSON.stringify({ chainStatus: { coveragePercent: 60 } });
      });

      const result = await checkEvidenceCoverage(config, 50);

      expect(result.passed).toBe(true);
      expect(result.message).toContain("70.0%"); // average of 80 and 60
    });

    it("should fail when average coverage is below minimum", async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        "chain-1.json",
      ] as unknown as ReturnType<typeof fs.readdirSync>);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ chainStatus: { coveragePercent: 30 } }));

      const result = await checkEvidenceCoverage(config, 50);

      expect(result.passed).toBe(false);
      expect(result.message).toContain("30.0%");
      expect(result.message).toContain("required: 50%");
    });

    it("should return failed when no evidence directory exists", async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await checkEvidenceCoverage(config, 50);

      expect(result.passed).toBe(false);
      expect(result.message).toContain("No evidence directory");
    });

    it("should return failed when no evidence chains found", async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([] as unknown as ReturnType<typeof fs.readdirSync>);

      const result = await checkEvidenceCoverage(config, 50);

      expect(result.passed).toBe(false);
      expect(result.message).toContain("No evidence chains");
    });
  });
});

// =============================================================================
// ADDITIONAL EDGE CASE TESTS (3 tests)
// =============================================================================

describe("Edge Cases", () => {
  const mockedFs = vi.mocked(fs);
  const mockedExecSync = vi.mocked(execSync);
  const config = createMockConfig();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedFs.existsSync.mockReturnValue(true);
  });

  it("should handle phase not found in plan", () => {
    const plan = createMockPlan([{ id: "phase-1", name: "Phase 1" }]);
    const gateResult = createMockGateResult("phase-unknown", true);
    const state = createMockOrchestratorState("phase-unknown");
    const appendHistory = vi.fn();

    const result = advancePhase(
      config,
      "phase-unknown",
      undefined,
      () => gateResult,
      () => ({ success: true, data: plan }),
      () => ({ success: true, data: state }),
      () => ({ success: true, path: "" }),
      appendHistory
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("not found in plan");
  });

  it("should handle multiple memory patterns with mixed results", () => {
    const validation: GateValidation = {
      requiredMemories: ["ANALYSIS_*", "IMPL_*"],
    };
    mockedFs.readdirSync.mockReturnValue([
      "ANALYSIS_FEATURE.md",
    ] as unknown as ReturnType<typeof fs.readdirSync>);
    mockedExecSync.mockReturnValue(Buffer.from(""));

    const createMockGetLinkedMemory = (): ((name: string) => ReadResult<LinkedMemoryData>) => {
      return (_name: string): ReadResult<LinkedMemoryData> => ({ success: false, error: "Not found" });
    };

    const result = checkGate(
      config,
      "phase-1",
      validation,
      () => ({ success: false, error: "No plan" }),
      () => [],
      createMockGetLinkedMemory(),
      () => ({ success: true, path: "" })
    );

    // ANALYSIS_* passes, IMPL_* fails
    expect(result.passed).toBe(false);
    expect(result.results.find((r) => r.check === "memory:ANALYSIS_*")?.passed).toBe(true);
    expect(result.results.find((r) => r.check === "memory:IMPL_*")?.passed).toBe(false);
  });

  it("should skip invalid evidence files gracefully", async () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.readdirSync.mockReturnValue([
      "valid.json",
      "invalid.json",
    ] as unknown as ReturnType<typeof fs.readdirSync>);
    mockedFs.readFileSync.mockImplementation((filePath: fs.PathOrFileDescriptor) => {
      const pathStr = String(filePath);
      if (pathStr.includes("valid")) {
        return JSON.stringify({ chainStatus: { coveragePercent: 80 } });
      }
      return "invalid json {{{";
    });

    const result = await checkEvidenceCoverage(config, 50);

    // Should only count the valid file
    expect(result.passed).toBe(true);
    expect(result.message).toContain("80.0%");
  });
});
