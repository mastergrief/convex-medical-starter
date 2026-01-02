// ============================================================================
// Configuration Types
// ============================================================================

export interface ConvexCLIConfig {
  cwd?: string;
  timeout?: number;
}

// ============================================================================
// Response Base Types
// ============================================================================

export interface CLIResponse<T> {
  success: boolean;
  data?: T;
  error?: CLIError;
  metadata: ResponseMetadata;
}

export interface CLIError {
  code: string;
  message: string;
  details?: any;
}

export interface ResponseMetadata {
  executionTime: number;
  timestamp: string;
  command: string;
}

// ============================================================================
// Deployment & Status Types
// ============================================================================

export interface ConvexDeployment {
  kind: 'ownDev' | 'prod' | 'preview';
  deploymentSelector: string;
  url: string;
  dashboardUrl: string;
  team?: string;
  project?: string;
}

export interface StatusData {
  deployments: ConvexDeployment[];
  active: boolean;
}

export type StatusResponse = CLIResponse<StatusData>;

// ============================================================================
// Tables Types
// ============================================================================

export interface TablesData {
  tables: string[];
  count: number;
}

export type TablesResponse = CLIResponse<TablesData>;

// ============================================================================
// Data Query Types
// ============================================================================

export interface DataQueryOptions {
  limit?: number;
}

export interface DataDocument {
  _id: string;
  _creationTime: number;
  [key: string]: any;
}

export interface DataData<T = DataDocument> {
  documents: T[];
  count: number;
  table: string;
}

export type DataResponse<T = DataDocument> = CLIResponse<DataData<T>>;

// ============================================================================
// Function Types
// ============================================================================

export interface FunctionInfo {
  name: string;
  path: string;
  size?: number;
  modified?: string;
}

export interface FunctionsData {
  functions: FunctionInfo[];
  count: number;
}

export type FunctionsResponse = CLIResponse<FunctionsData>;

export interface FunctionRunData<T = any> {
  result: T;
  functionName: string;
}

export type FunctionRunResponse<T = any> = CLIResponse<FunctionRunData<T>>;

// ============================================================================
// Environment Variable Types
// ============================================================================

export interface EnvVariable {
  name: string;
  value: string;
  masked?: boolean;
}

export interface EnvListData {
  variables: EnvVariable[];
  count: number;
}

export type EnvListResponse = CLIResponse<EnvListData>;

export interface EnvGetData {
  name: string;
  value: string;
  masked?: boolean;
}

export type EnvGetResponse = CLIResponse<EnvGetData>;

export interface EnvSetData {
  name: string;
  value: string;
  message: string;
}

export type EnvSetResponse = CLIResponse<EnvSetData>;

// ============================================================================
// Logs Types
// ============================================================================

export interface LogOptions {
  history?: number;
  success?: boolean;
  error?: boolean;
  timeout?: number;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface LogsData {
  logs: LogEntry[];
  count: number;
}

export type LogsResponse = CLIResponse<LogsData>;
