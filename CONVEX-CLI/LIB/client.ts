import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type {
  ConvexCLIConfig,
  StatusResponse,
  TablesResponse,
  DataResponse,
  DataQueryOptions,
  FunctionsResponse,
  FunctionRunResponse,
  EnvListResponse,
  EnvGetResponse,
  EnvSetResponse,
  LogsResponse,
  LogOptions,
  DataDocument
} from './types.js';
import {
  StatusResponseSchema,
  TablesResponseSchema,
  DataResponseSchema,
  FunctionsResponseSchema,
  FunctionRunResponseSchema,
  EnvListResponseSchema,
  EnvGetResponseSchema,
  EnvSetResponseSchema,
  LogsResponseSchema,
  validateData,
  ValidationError
} from './schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ConvexCLI - TypeScript API for Convex CLI operations
 *
 * Provides programmatic access to all Convex CLI scripts with type safety
 * and JSON-based responses.
 *
 * @example
 * ```typescript
 * const cli = new ConvexCLI();
 * const status = await cli.status();
 * const users = await cli.queryData('users', { limit: 10 });
 * ```
 */
export class ConvexCLI {
  private cwd: string;
  private timeout: number;
  private scriptsDir: string;

  constructor(config?: ConvexCLIConfig) {
    this.cwd = config?.cwd || process.cwd();
    this.timeout = config?.timeout || 30000;
    this.scriptsDir = path.join(__dirname, '../SCRIPTS');
  }

  /**
   * Get deployment status including URLs, team, and project information
   *
   * @returns Deployment status with active deployment information
   * @throws {ValidationError} If the response format is invalid
   *
   * @example
   * ```typescript
   * const status = await cli.status();
   * console.log(`Deployment URL: ${status.data.deployments[0].url}`);
   * ```
   */
  async status(): Promise<StatusResponse> {
    const result = await this.execute('convex-status.ts', ['--json']);
    const parsed = JSON.parse(result);
    return validateData(StatusResponseSchema, parsed, 'status response');
  }

  /**
   * List all database tables
   *
   * @returns Array of table names with count
   * @throws {ValidationError} If the response format is invalid
   *
   * @example
   * ```typescript
   * const tables = await cli.tables();
   * console.log(`Found ${tables.data.count} tables`);
   * ```
   */
  async tables(): Promise<TablesResponse> {
    const result = await this.execute('convex-tables.ts', ['--json']);
    const parsed = JSON.parse(result);
    return validateData(TablesResponseSchema, parsed, 'tables response');
  }

  /**
   * Query data from a specific table
   *
   * @param table - Name of the table to query
   * @param options - Query options (limit, etc.)
   * @returns Query results with documents array
   * @throws {ValidationError} If the response format is invalid
   *
   * @example
   * ```typescript
   * const users = await cli.queryData('users', { limit: 10 });
   * users.data.documents.forEach(user => console.log(user.email));
   * ```
   */
  async queryData<T = DataDocument>(
    table: string,
    options?: DataQueryOptions
  ): Promise<DataResponse<T>> {
    const args = ['--json'];
    if (options?.limit) args.push(`--limit=${options.limit}`);

    const result = await this.execute('convex-data.ts', [table, ...args]);
    const parsed = JSON.parse(result);
    return validateData(DataResponseSchema, parsed, `data query for table '${table}'`) as DataResponse<T>;
  }

  /**
   * List all available Convex functions
   *
   * @returns Array of function metadata
   * @throws {ValidationError} If the response format is invalid
   *
   * @example
   * ```typescript
   * const functions = await cli.functions();
   * console.log(`Found ${functions.data.count} functions`);
   * ```
   */
  async functions(): Promise<FunctionsResponse> {
    const result = await this.execute('convex-functions.ts', ['--json']);
    const parsed = JSON.parse(result);
    return validateData(FunctionsResponseSchema, parsed, 'functions response');
  }

  /**
   * Run a Convex function with arguments
   *
   * @param functionName - Name of function to run (e.g., 'users:list')
   * @param args - Function arguments as object
   * @returns Function execution result
   * @throws {ValidationError} If the response format is invalid
   *
   * @example
   * ```typescript
   * const result = await cli.runFunction('exercises:getCategories', {});
   * console.log('Categories:', result.data.result);
   * ```
   */
  async runFunction<T = any>(
    functionName: string,
    args: any
  ): Promise<FunctionRunResponse<T>> {
    const result = await this.execute('convex-run.ts', [
      functionName,
      JSON.stringify(args),
      '--json'
    ]);
    const parsed = JSON.parse(result);
    return validateData(FunctionRunResponseSchema, parsed, `function run '${functionName}'`) as FunctionRunResponse<T>;
  }

  /**
   * Environment variable operations
   *
   * @example
   * ```typescript
   * // List all environment variables
   * const envVars = await cli.env.list();
   *
   * // Get specific variable
   * const apiKey = await cli.env.get('OPENAI_API_KEY');
   *
   * // Set variable
   * await cli.env.set('NEW_VAR', 'value');
   * ```
   */
  get env() {
    return {
      /**
       * List all environment variables
       * @param options - Optional configuration
       * @param options.masked - If true, masks sensitive values (default: false)
       * @throws {ValidationError} If the response format is invalid
       */
      list: async (options?: { masked?: boolean }): Promise<EnvListResponse> => {
        const args = ['list', '--json'];
        if (options?.masked) args.push('--masked');
        const result = await this.execute('convex-env.ts', args);
        const parsed = JSON.parse(result);
        return validateData(EnvListResponseSchema, parsed, 'env list response');
      },

      /**
       * Get value of a specific environment variable
       * @param name - Name of the environment variable
       * @param options - Optional configuration
       * @param options.masked - If true, masks sensitive value (default: false)
       * @throws {ValidationError} If the response format is invalid
       */
      get: async (name: string, options?: { masked?: boolean }): Promise<EnvGetResponse> => {
        const args = ['get', name, '--json'];
        if (options?.masked) args.push('--masked');
        const result = await this.execute('convex-env.ts', args);
        const parsed = JSON.parse(result);
        return validateData(EnvGetResponseSchema, parsed, `env get '${name}'`);
      },

      /**
       * Set an environment variable
       * @throws {ValidationError} If the response format is invalid
       */
      set: async (name: string, value: string): Promise<EnvSetResponse> => {
        const result = await this.execute('convex-env.ts', [
          'set',
          name,
          value,
          '--json'
        ]);
        const parsed = JSON.parse(result);
        return validateData(EnvSetResponseSchema, parsed, `env set '${name}'`);
      }
    };
  }

  /**
   * Get logs with optional filtering
   *
   * @param options - Log filtering options
   * @returns Array of log entries
   * @throws {ValidationError} If the response format is invalid
   *
   * @example
   * ```typescript
   * const logs = await cli.logs({ history: 20, error: true });
   * logs.data.logs.forEach(log => console.log(log.message));
   * ```
   */
  async logs(options?: LogOptions): Promise<LogsResponse> {
    const args: string[] = ['--json'];
    if (options?.history) args.push(`--history=${options.history}`);
    if (options?.success) args.push('--success');
    if (options?.error) args.push('--error');
    if (options?.timeout) args.push(`--timeout=${options.timeout}`);

    const result = await this.execute('convex-logs.ts', args);
    const parsed = JSON.parse(result);
    return validateData(LogsResponseSchema, parsed, 'logs response');
  }

  /**
   * Execute a CLI script and return JSON output
   * @private
   */
  private async execute(script: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.scriptsDir, script);
      const child = spawn('npx', ['tsx', scriptPath, ...args], {
        cwd: this.cwd,
        timeout: this.timeout,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', data => (stdout += data.toString()));
      child.stderr.on('data', data => (stderr += data.toString()));

      child.on('close', code => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(
            new Error(
              `Script ${script} failed with code ${code}: ${stderr || stdout}`
            )
          );
        }
      });

      child.on('error', err => reject(err));
    });
  }
}
