/**
 * MEMORY MODULE
 * Memory linking operations for Serena integration
 */

import * as fs from "fs";
import * as path from "path";
import { createTimestamp } from "../../schemas/index.js";
import type { ContextHubConfig, WriteResult, ReadResult, LinkedMemoryInfo, MemoryTraceability } from "./types.js";

// =============================================================================
// MEMORY TYPES
// =============================================================================

import { logWarn } from "../utils/logger.js";

/**
 * Options for linking a Serena memory file to an orchestration session.
 *
 * @description Configuration object passed to {@link linkMemory} that controls
 * how the memory is linked and what metadata is attached. Serena memories are
 * markdown files stored in `.serena/memories/` that contain analysis results,
 * architectural insights, and session continuations from previous Claude Code
 * conversations.
 *
 * @example
 * ```typescript
 * // Link with automatic traceability extraction
 * const options: LinkMemoryOptions = {
 *   summary: "Authentication flow analysis from analyst agent",
 *   forAgents: ["developer", "browser"],
 *   extractTraceability: true
 * };
 *
 * // Link with explicit traceability data
 * const optionsWithData: LinkMemoryOptions = {
 *   summary: "Component refactoring analysis",
 *   traceabilityData: {
 *     analyzed_symbols: ["src/auth/login.tsx:LoginForm"],
 *     entry_points: ["LoginForm/handleSubmit", "AuthContext/login"],
 *     data_flow_map: { ui_to_api: "LoginForm -> api.auth.login" }
 *   }
 * };
 * ```
 */
export interface LinkMemoryOptions {
  /**
   * Human-readable summary of the memory's purpose and content.
   * Defaults to "Memory {name} linked to session" if not provided.
   */
  summary?: string;

  /**
   * List of agent types that should receive this memory in their context.
   * Common values: "developer", "browser", "analyst", "orchestrator".
   * Defaults to ["developer", "browser"] if not provided.
   */
  forAgents?: string[];

  /**
   * Explicit traceability data to attach to the linked memory.
   * Used by the orchestration evidence chain to track code analysis provenance.
   *
   * @property analyzed_symbols - Code symbols that were analyzed (e.g., "src/auth/login.tsx:LoginForm")
   * @property entry_points - Method/function entry points in Serena name path format (e.g., "Component/method")
   * @property data_flow_map - Mapping of data flow relationships (e.g., { ui_to_api: "Form -> API" })
   */
  traceabilityData?: {
    analyzed_symbols?: string[];
    entry_points?: string[];
    data_flow_map?: Record<string, string>;
  };

  /**
   * When true, automatically parse the Serena memory file content to extract
   * traceability data using {@link extractTraceabilityFromMemory}. This extracts
   * symbols, entry points, and data flow patterns from the memory's markdown content.
   * Takes precedence over explicit traceabilityData if extraction succeeds.
   */
  extractTraceability?: boolean;
}

/**
 * Data structure representing a Serena memory linked to an orchestration session.
 *
 * @description Stored as JSON in the session's `memories/` directory, this structure
 * maintains the connection between a Serena memory file (`.serena/memories/*.md`) and
 * the orchestration session. It includes metadata about when the memory was linked,
 * which agents should use it, and any extracted traceability data for the evidence chain.
 *
 * @example
 * ```typescript
 * // Example linked memory data structure
 * const linkedMemory: LinkedMemoryData = {
 *   memoryName: "ANALYSIS_AUTH_FLOW_20251225",
 *   linkedAt: "2025-12-25T10:30:00.000Z",
 *   serenaPath: ".serena/memories/ANALYSIS_AUTH_FLOW_20251225.md",
 *   summary: "Authentication flow analysis for login feature",
 *   forAgents: ["developer", "browser"],
 *   traceabilityData: {
 *     analyzed_symbols: ["src/auth/login.tsx:LoginForm", "src/api/auth.ts:login"],
 *     entry_points: ["LoginForm/handleSubmit", "AuthAPI/login"],
 *     data_flow_map: { ui_to_api: "LoginForm.handleSubmit -> AuthAPI.login" }
 *   }
 * };
 * ```
 *
 * @see {@link linkMemory} - Creates linked memory records
 * @see {@link getLinkedMemory} - Retrieves linked memory data
 */
export interface LinkedMemoryData {
  /**
   * Name of the Serena memory file (without .md extension).
   * Follows convention: PREFIX_DESCRIPTION_TIMESTAMP (e.g., "ANALYSIS_AUTH_20251225")
   */
  memoryName: string;

  /**
   * ISO 8601 timestamp when the memory was linked to the session.
   * Used for sorting memories chronologically in {@link listLinkedMemories}.
   */
  linkedAt: string;

  /**
   * Relative path to the Serena memory file from project root.
   * Format: `.serena/memories/{memoryName}.md`
   */
  serenaPath: string;

  /**
   * Human-readable summary describing the memory's purpose.
   * Displayed in memory listings and used for agent context injection.
   */
  summary?: string;

  /**
   * List of agent types that should receive this memory.
   * Used by orchestrator to filter relevant memories when spawning agents.
   */
  forAgents?: string[];

  /**
   * Traceability data extracted from or provided for the memory.
   * Links the memory to specific code symbols and data flows for evidence chain tracking.
   *
   * @property analyzed_symbols - Source file references with symbol names
   * @property entry_points - Serena name paths to key methods/functions
   * @property data_flow_map - Mapping of architectural data flows
   */
  traceabilityData?: {
    analyzed_symbols: string[];
    entry_points: string[];
    data_flow_map: Record<string, string>;
  };
}

// =============================================================================
// MEMORY OPERATIONS
// =============================================================================

/**
 * Parses a Serena memory file's markdown content to extract traceability data.
 *
 * @description This helper function analyzes the raw text content of a Serena memory
 * file (`.serena/memories/*.md`) and extracts structured traceability information using
 * a combination of regex pattern matching and JSON block parsing. The extracted data
 * enables the orchestration evidence chain to track which code symbols were analyzed,
 * what entry points are relevant, and how data flows through the system.
 *
 * **Extraction Methods (in order of precedence):**
 * 1. **JSON blocks**: If the memory contains a ```json code block, that structured data
 *    is parsed and used directly (highest fidelity).
 * 2. **Symbol patterns**: Regex matches patterns like `src/path/file.tsx:SymbolName:line`
 *    to identify analyzed code symbols.
 * 3. **Entry point patterns**: Regex matches patterns like `Component/method` or
 *    `ClassName.methodName` to identify code entry points.
 * 4. **Data flow patterns**: Regex matches labeled flow patterns like `ui_to_api: description`
 *    to build the data flow map.
 *
 * **Relationship to Evidence Chain:**
 * The extracted traceability data is stored in {@link LinkedMemoryData.traceabilityData}
 * and used by the orchestration system to:
 * - Pass relevant entry points to developer agents for targeted modifications
 * - Inform browser agents which symbols/actions to test
 * - Build audit trails showing analysis-to-implementation provenance
 *
 * @param content - Raw markdown content of the Serena memory file
 * @returns Extracted traceability data object, or null if no traceability patterns found
 *
 * @example
 * ```typescript
 * // Memory file content with embedded traceability
 * const memoryContent = `
 * # Authentication Analysis
 *
 * ## Analyzed Symbols
 * - src/auth/login.tsx:LoginForm:15
 * - src/api/auth.ts:loginUser:42
 *
 * ## Entry Points
 * - LoginForm/handleSubmit - Main form submission handler
 * - AuthContext/login - Context provider method
 *
 * ## Data Flow
 * ui_to_api: LoginForm.handleSubmit -> api.auth.loginUser
 * api_to_db: loginUser -> users collection
 * `;
 *
 * const traceability = extractTraceabilityFromMemory(memoryContent);
 * // Returns:
 * // {
 * //   analyzed_symbols: ["src/auth/login.tsx:LoginForm:15", "src/api/auth.ts:loginUser:42"],
 * //   entry_points: ["LoginForm/handleSubmit", "AuthContext/login"],
 * //   data_flow_map: {
 * //     ui_to_api: "LoginForm.handleSubmit -> api.auth.loginUser",
 * //     api_to_db: "loginUser -> users collection"
 * //   }
 * // }
 * ```
 *
 * @example
 * ```typescript
 * // Memory with JSON block (takes precedence)
 * const memoryWithJson = `
 * # Analysis Results
 *
 * \`\`\`json
 * {
 *   "analyzed_symbols": ["src/components/Form.tsx:Form"],
 *   "entry_points": ["Form/onSubmit"],
 *   "data_flow_map": { "ui_to_api": "Form -> API" }
 * }
 * \`\`\`
 * `;
 *
 * const result = extractTraceabilityFromMemory(memoryWithJson);
 * // Returns the parsed JSON directly
 * ```
 *
 * @throws Does not throw - returns null on parsing errors after logging a warning
 *
 * @see {@link linkMemory} - Uses this function when extractTraceability option is true
 * @see {@link MemoryTraceability} - Return type interface
 */
export function extractTraceabilityFromMemory(content: string): MemoryTraceability | null {
  try {
    const result: {
      analyzed_symbols: string[];
      entry_points: string[];
      data_flow_map: Record<string, string>;
    } = {
      analyzed_symbols: [],
      entry_points: [],
      data_flow_map: {}
    };

    // Extract analyzed symbols (patterns like "file:symbol:line" or "file.tsx:SymbolName")
    const symbolMatches = content.match(/(?:src\/[^\s:]+:\w+(?::\d+)?)/g);
    if (symbolMatches) {
      result.analyzed_symbols = [...new Set(symbolMatches)];
    }

    // Extract entry points (patterns like "Component/method" or "ClassName.methodName")
    const entryPointMatches = content.match(/(?:\w+\/\w+|\w+\.\w+)(?=\s*[-–:]|\s*\()/g);
    if (entryPointMatches) {
      result.entry_points = [...new Set(entryPointMatches)].slice(0, 20);
    }

    // Extract data flow patterns
    const uiToApiMatch = content.match(/ui[_\s]?to[_\s]?api[:\s]+([^\n]+)/i);
    const apiToDbMatch = content.match(/api[_\s]?to[_\s]?db[:\s]+([^\n]+)/i);
    const dbToUiMatch = content.match(/db[_\s]?to[_\s]?ui[:\s]+([^\n]+)/i);

    if (uiToApiMatch) result.data_flow_map.ui_to_api = uiToApiMatch[1].trim();
    if (apiToDbMatch) result.data_flow_map.api_to_db = apiToDbMatch[1].trim();
    if (dbToUiMatch) result.data_flow_map.db_to_ui = dbToUiMatch[1].trim();

    // Also try to extract from JSON blocks in the memory
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        const jsonData = JSON.parse(jsonMatch[1]);
        if (jsonData.analyzed_symbols) result.analyzed_symbols = jsonData.analyzed_symbols;
        if (jsonData.entry_points) result.entry_points = jsonData.entry_points;
        if (jsonData.data_flow_map) result.data_flow_map = jsonData.data_flow_map;
      } catch (error) {
        logWarn("memory:extractTraceability:json", error);
        // JSON parse failed, use regex results
      }
    }

    // Return null if nothing was extracted
    if (result.analyzed_symbols.length === 0 &&
        result.entry_points.length === 0 &&
        Object.keys(result.data_flow_map).length === 0) {
      return null;
    }

    return result;
  } catch (error) {
    logWarn("memory:extractTraceability", error);
    return null;
  }
}

/**
 * Links a Serena memory file to an orchestration session for agent context sharing.
 *
 * @description This function creates a link between a Serena memory file (stored in
 * `.serena/memories/`) and the current orchestration session. The link is stored as
 * a JSON file in the session's `memories/` directory, enabling agents spawned during
 * orchestration to access relevant analysis context, architectural insights, and
 * traceability data from previous work.
 *
 * **Memory File Expectations:**
 * - Location: `.serena/memories/{memoryName}.md` (relative to project root)
 * - Format: Markdown with optional embedded JSON blocks for structured data
 * - Naming: Convention is PREFIX_DESCRIPTION_TIMESTAMP (e.g., "ANALYSIS_AUTH_20251225")
 *
 * **Traceability Extraction:**
 * When `options.extractTraceability` is true and the memory file exists, the function
 * reads the file and uses {@link extractTraceabilityFromMemory} to parse symbols,
 * entry points, and data flow patterns. This extracted data becomes part of the
 * evidence chain for audit and agent coordination.
 *
 * **Agent Context Injection:**
 * The `forAgents` option controls which agent types receive this memory in their
 * spawned context. For example, analyst memories are typically shared with developers,
 * while test results might go to browser agents.
 *
 * @param config - Context hub configuration containing session paths
 * @param memoryName - Name of the Serena memory (without .md extension)
 * @param options - Optional configuration for linking behavior
 * @param options.summary - Human-readable description of the memory's purpose
 * @param options.forAgents - Agent types to share this memory with (default: ["developer", "browser"])
 * @param options.traceabilityData - Explicit traceability data to attach
 * @param options.extractTraceability - If true, parse memory file for traceability patterns
 * @param appendHistory - Callback to record the link operation in session history
 *
 * @returns WriteResult with success status and path to the created link file
 *
 * @example
 * ```typescript
 * import { linkMemory } from "./memory.js";
 *
 * // Link an analyst's memory with automatic traceability extraction
 * const result = linkMemory(
 *   config,
 *   "ANALYSIS_AUTH_FLOW_20251225",
 *   {
 *     summary: "Authentication flow analysis for login feature refactor",
 *     forAgents: ["developer"],
 *     extractTraceability: true
 *   },
 *   (type, id) => console.log(`Recorded: ${type} - ${id}`)
 * );
 *
 * if (result.success) {
 *   console.log(`Memory linked at: ${result.path}`);
 *   // Output: Memory linked at: /path/to/session/memories/ANALYSIS_AUTH_FLOW_20251225.json
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Link with explicit traceability data (no file parsing needed)
 * const result = linkMemory(
 *   config,
 *   "SESSION_DEVELOPER_HANDOFF",
 *   {
 *     summary: "Developer agent handoff with implementation details",
 *     forAgents: ["browser"],
 *     traceabilityData: {
 *       analyzed_symbols: ["src/components/Login.tsx:LoginForm"],
 *       entry_points: ["LoginForm/handleSubmit"],
 *       data_flow_map: { ui_to_api: "LoginForm -> auth.login" }
 *     }
 *   },
 *   appendToHistory
 * );
 * ```
 *
 * @throws Does not throw - returns { success: false, error: string } on failure
 *
 * @see {@link LinkMemoryOptions} - Options interface documentation
 * @see {@link getLinkedMemory} - Retrieve linked memory data
 * @see {@link listLinkedMemories} - List all linked memories in session
 */
export function linkMemory(
  config: ContextHubConfig,
  memoryName: string,
  options: LinkMemoryOptions | undefined,
  appendHistory: (type: string, id: string) => void
): WriteResult {
  try {
    const memoriesDir = path.join(config.sessionPath, "memories");
    if (!fs.existsSync(memoriesDir)) {
      fs.mkdirSync(memoriesDir, { recursive: true });
    }

    const serenaPath = `.serena/memories/${memoryName}.md`;
    const absoluteSerenaPath = path.join(process.cwd(), serenaPath);

    // Extract traceability from memory file if requested
    let traceabilityData = options?.traceabilityData;
    if (options?.extractTraceability && fs.existsSync(absoluteSerenaPath)) {
      const memoryContent = fs.readFileSync(absoluteSerenaPath, "utf-8");
      const extracted = extractTraceabilityFromMemory(memoryContent);
      if (extracted) {
        traceabilityData = extracted as LinkMemoryOptions["traceabilityData"];
      }
    }

    const linkFile = path.join(memoriesDir, `${memoryName}.json`);
    const linkData = {
      memoryName,
      linkedAt: createTimestamp(),
      serenaPath,
      summary: options?.summary || `Memory ${memoryName} linked to session`,
      forAgents: options?.forAgents || ["developer", "browser"],
      traceabilityData: traceabilityData || null
    };

    fs.writeFileSync(linkFile, JSON.stringify(linkData, null, 2));
    appendHistory("memory_link", memoryName);

    return { success: true, path: linkFile };
  } catch (error) {
    return {
      success: false,
      path: "",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Lists all Serena memories linked to the current orchestration session.
 *
 * @description Scans the session's `memories/` directory for linked memory JSON files
 * and returns summary information about each. The results are sorted in reverse
 * chronological order (most recently linked first), making it easy to identify
 * the latest analysis context available for agent spawning.
 *
 * **Use Cases:**
 * - Orchestrator checking what context is available before spawning agents
 * - Dashboard displaying linked memories for session overview
 * - CLI commands listing available memory context
 *
 * **Return Data:**
 * Each item includes summary metadata but NOT the full traceability data.
 * The `hasTraceability` boolean indicates whether traceability data exists.
 * Use {@link getLinkedMemory} to retrieve full data including traceability.
 *
 * @param config - Context hub configuration containing session paths
 *
 * @returns Array of LinkedMemoryInfo objects sorted by linkedAt (newest first).
 *          Returns empty array if memories directory doesn't exist.
 *
 * @example
 * ```typescript
 * import { listLinkedMemories } from "./memory.js";
 *
 * const memories = listLinkedMemories(config);
 *
 * // Filter memories for a specific agent type
 * const developerMemories = memories.filter(
 *   m => m.forAgents?.includes("developer")
 * );
 *
 * // Check for memories with traceability for evidence chain
 * const withTraceability = memories.filter(m => m.hasTraceability);
 *
 * // Display in CLI
 * for (const mem of memories) {
 *   console.log(`${mem.name} (${mem.linkedAt})`);
 *   console.log(`  Path: ${mem.serenaPath}`);
 *   console.log(`  Summary: ${mem.summary}`);
 *   console.log(`  Agents: ${mem.forAgents?.join(", ")}`);
 *   console.log(`  Has Traceability: ${mem.hasTraceability}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Typical orchestrator usage - gather context for developer agent
 * const memories = listLinkedMemories(config);
 * const contextForDeveloper = memories
 *   .filter(m => m.forAgents?.includes("developer"))
 *   .map(m => m.name);
 *
 * // Pass to agent spawn command
 * spawnAgent("developer", { memories: contextForDeveloper });
 * ```
 *
 * @see {@link linkMemory} - Create memory links
 * @see {@link getLinkedMemory} - Get full memory data with traceability
 * @see {@link LinkedMemoryInfo} - Return type interface
 */
export function listLinkedMemories(config: ContextHubConfig): LinkedMemoryInfo[] {
  const memoriesDir = path.join(config.sessionPath, "memories");
  if (!fs.existsSync(memoriesDir)) return [];

  const files = fs.readdirSync(memoriesDir).filter((f) => f.endsWith(".json"));
  const memories: LinkedMemoryInfo[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(memoriesDir, file), "utf-8");
      const data = JSON.parse(content);
      memories.push({
        name: data.memoryName,
        linkedAt: data.linkedAt,
        serenaPath: data.serenaPath,
        summary: data.summary,
        forAgents: data.forAgents,
        hasTraceability: !!data.traceabilityData
      });
    } catch (error) {
      logWarn("memory:listLinkedMemories", error);
      // Skip invalid files
    }
  }

  return memories.sort((a, b) => b.linkedAt.localeCompare(a.linkedAt));
}

/**
 * Retrieves a specific linked memory with full data including traceability information.
 *
 * @description Fetches the complete linked memory record for a given memory name,
 * including the full traceability data that is omitted from {@link listLinkedMemories}.
 * This function is typically used when an agent needs the complete context from a
 * linked Serena memory, including entry points and data flow maps for targeted work.
 *
 * **Traceability Data Usage:**
 * The returned traceability data enables precise agent coordination:
 * - `analyzed_symbols`: Developer agents know which files/symbols were analyzed
 * - `entry_points`: Serena name paths for targeted code modifications
 * - `data_flow_map`: Understanding of how data moves through the system
 *
 * **File Not Found Handling:**
 * If the linked memory doesn't exist (never linked or was deleted), returns
 * `{ success: false, error: "Linked memory not found: {name}" }`. This is distinct
 * from JSON parse errors which indicate file corruption.
 *
 * @param config - Context hub configuration containing session paths
 * @param memoryName - Name of the Serena memory to retrieve (without .md extension)
 *
 * @returns ReadResult containing LinkedMemoryData on success, or error message on failure
 *
 * @example
 * ```typescript
 * import { getLinkedMemory } from "./memory.js";
 *
 * // Retrieve memory for agent context injection
 * const result = getLinkedMemory(config, "ANALYSIS_AUTH_FLOW_20251225");
 *
 * if (result.success && result.data) {
 *   const { traceabilityData, summary, serenaPath } = result.data;
 *
 *   // Use entry points for targeted development
 *   if (traceabilityData?.entry_points) {
 *     console.log("Entry points to modify:");
 *     for (const ep of traceabilityData.entry_points) {
 *       console.log(`  - ${ep}`);
 *     }
 *   }
 *
 *   // Instruct developer agent to read the original Serena memory
 *   console.log(`Read full analysis: mcp__serena__read_memory("${result.data.memoryName}")`);
 * } else {
 *   console.error(`Failed to get memory: ${result.error}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Build evidence chain link from memory
 * const memResult = getLinkedMemory(config, analystMemoryName);
 *
 * if (memResult.success && memResult.data?.traceabilityData) {
 *   const evidenceLink = {
 *     upstream: {
 *       analysisTaskId: analystTaskId,
 *       analysisMemory: memResult.data.memoryName,
 *       entryPoints: memResult.data.traceabilityData.entry_points
 *     }
 *   };
 * }
 * ```
 *
 * @throws Does not throw - returns { success: false, error: string } on failure
 *         Error messages include:
 *         - "Linked memory not found: {name}" - Memory was never linked
 *         - JSON parsing error messages - Link file is corrupted
 *         - File system error messages - Permission or I/O issues
 *
 * @see {@link linkMemory} - Create memory links
 * @see {@link listLinkedMemories} - List all linked memories (without full data)
 * @see {@link LinkedMemoryData} - Return data structure
 */
export function getLinkedMemory(config: ContextHubConfig, memoryName: string): ReadResult<LinkedMemoryData> {
  try {
    const memoriesDir = path.join(config.sessionPath, "memories");
    const linkFile = path.join(memoriesDir, `${memoryName}.json`);

    if (!fs.existsSync(linkFile)) {
      return { success: false, error: `Linked memory not found: ${memoryName}` };
    }

    const content = fs.readFileSync(linkFile, "utf-8");
    const data = JSON.parse(content);

    return {
      success: true,
      data: {
        memoryName: data.memoryName,
        linkedAt: data.linkedAt,
        serenaPath: data.serenaPath,
        summary: data.summary,
        forAgents: data.forAgents,
        traceabilityData: data.traceabilityData || undefined
      },
      path: linkFile
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
