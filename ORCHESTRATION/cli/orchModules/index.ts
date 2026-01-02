/**
 * orchModules barrel exports
 * Re-exports all CLI module functionality
 */

// Output utilities
export {
  printHeader,
  printSuccess,
  printError,
  printInfo,
  printJson,
  isJsonOutput,
  printUsage
} from "./output.js";

// Flag parsing utilities
export {
  filterFlags,
  getPositionalArg,
  getNumericFlag,
  getStringFlag,
  getSessionId,
  parseVariables
} from "./flags.js";

// Session commands
export {
  sessionNew,
  sessionList,
  sessionInfo,
  sessionPurge,
  handleSessionNewFromTemplate,
  handleSession
} from "./session.js";

// Template commands
export {
  handleTemplateList,
  handleTemplateShow,
  handleTemplateValidate,
  handleTemplate
} from "./template.js";

// Artifact commands (prompt, plan, handoff)
export {
  promptWrite,
  promptRead,
  planWrite,
  planRead,
  handoffWrite,
  handoffRead,
  handoffList,
  handlePrompt,
  handlePlan,
  handleHandoff
} from "./artifacts.js";

// State commands (state, memory)
export {
  stateRead,
  stateWrite,
  memoryLink,
  memoryList,
  memoryGet,
  handleState,
  handleMemory
} from "./state.js";

// Gate commands
export {
  gateCheck,
  gateAdvance,
  gateList,
  gateRead,
  handleGate
} from "./gates.js";

// Trace commands
export {
  traceCreate,
  traceRead,
  traceList,
  traceValidate,
  handleTrace
} from "./trace.js";

// Execute commands
export {
  executePhase,
  executePlan,
  agentsList,
  agentsKill,
  handleExecute,
  handleExecutePlan,
  handleAgents
} from "./execute.js";
export type { ExecuteOptions, ExecutePlanOptions } from "./execute.js";

// Status commands
export {
  showStatus,
  handleDashboard,
  validateFile
} from "./status.js";
