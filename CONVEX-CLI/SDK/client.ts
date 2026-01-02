/**
 * Convex SDK - Enhanced CLI client with advanced features
 *
 * Features:
 * - Builder pattern for queries
 * - Event emitters for streaming
 * - Intelligent caching with TTL
 * - Telemetry & metrics collection
 * - Type-safe operations
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import * as path from 'path';
import { EventEmitter } from 'events';
import type {
  StatusResponse,
  TablesResponse,
  DataResponse,
  FunctionsResponse,
  FunctionRunResponse,
  EnvListResponse,
  EnvGetResponse,
  EnvSetResponse,
  LogsResponse
} from '../LIB/types.js';
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
  validateData
} from '../LIB/schemas.js';
import { Cache, type CacheConfig } from './cache.js';
import { Telemetry, type TelemetryConfig } from './telemetry.js';
import { DataQueryBuilder } from './builders/data.js';
import { BatchExecutor, type BatchConfig } from './batch.js';
import { Paginator, DocumentStream, ChunkedStream, type PaginationConfig, type StreamConfig } from './streaming.js';
import { MonitoringExporter, type MonitoringConfig } from './monitoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ConvexSDKConfig {
  /**
   * Working directory (default: process.cwd())
   */
  cwd?: string;

  /**
   * Command timeout in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Cache configuration
   */
  cache?: {
    enabled: boolean;
  } & CacheConfig;

  /**
   * Telemetry configuration
   */
  telemetry?: {
    enabled: boolean;
  } & TelemetryConfig;

  /**
   * Batch operations configuration
   */
  batch?: BatchConfig;

  /**
   * Monitoring/export configuration
   */
  monitoring?: MonitoringConfig;
}

/**
 * Enhanced Convex SDK with caching, telemetry, and builder pattern
 *
 * @example
 * ```typescript
 * const sdk = new ConvexSDK({
 *   cache: { enabled: true, ttl: 60 },
 *   telemetry: { enabled: true }
 * });
 *
 * // Builder pattern for queries
 * const users = await sdk.data('users').limit(10).execute();
 *
 * // Streaming logs
 * const logs = sdk.logs({ follow: true });
 * logs.on('log', log => console.log(log));
 *
 * // Get metrics
 * const metrics = sdk.getMetrics();
 * ```
 */
export class ConvexSDK {
  private cwd: string;
  private timeout: number;
  private scriptsDir: string;
  private cache?: Cache;
  private telemetry: Telemetry;
  private batchExecutor: BatchExecutor;
  private monitoring?: MonitoringExporter;

  constructor(config: ConvexSDKConfig = {}) {
    this.cwd = config.cwd || process.cwd();
    this.timeout = config.timeout || 30000;
    this.scriptsDir = path.join(__dirname, '../SCRIPTS');

    // Initialize cache if enabled
    if (config.cache?.enabled) {
      this.cache = new Cache({
        ttl: config.cache.ttl,
        maxSize: config.cache.maxSize,
        cleanupInterval: config.cache.cleanupInterval
      });
    }

    // Initialize telemetry
    this.telemetry = new Telemetry({
      enabled: config.telemetry?.enabled ?? true,
      metrics: config.telemetry?.metrics
    });

    // Initialize batch executor
    this.batchExecutor = new BatchExecutor(config.batch);

    // Initialize monitoring if enabled
    if (config.monitoring?.enabled) {
      this.monitoring = new MonitoringExporter(config.monitoring);
    }
  }

  // ========================================================================
  // Status Operations
  // ========================================================================

  /**
   * Get deployment status
   * Cached for 60 seconds by default
   */
  async getDeploymentStatus(): Promise<StatusResponse> {
    const cacheKey = 'deployment:status';
    const endTimer = this.telemetry.startOperation('status');

    try {
      // Check cache
      if (this.cache) {
        const cached = this.cache.get<StatusResponse>(cacheKey);
        if (cached) {
          this.telemetry.recordCacheHit();
          endTimer();
          return cached;
        }
        this.telemetry.recordCacheMiss();
      }

      // Execute
      const result = await this.execute('convex-status.ts', ['--json']);
      const parsed = JSON.parse(result);
      const validated = validateData(StatusResponseSchema, parsed, 'status response');

      // Cache result
      if (this.cache) {
        this.cache.set(cacheKey, validated, { ttl: 60 }); // 60s TTL
      }

      this.telemetry.recordOperation('status');
      endTimer();
      return validated;
    } catch (error) {
      this.telemetry.recordError('status', error as Error);
      endTimer();
      throw error;
    }
  }

  /**
   * Alias for getDeploymentStatus
   */
  async status(): Promise<StatusResponse> {
    return this.getDeploymentStatus();
  }

  // ========================================================================
  // Data Operations (Builder Pattern)
  // ========================================================================

  /**
   * Create a data query builder for the specified table
   *
   * @example
   * ```typescript
   * const users = await sdk.data('users')
   *   .limit(10)
   *   .order('desc')
   *   .execute();
   * ```
   */
  data<T = any>(table: string): DataQueryBuilder<T> {
    return new DataQueryBuilder<T>(
      {
        execute: (script: string, args: string[]) => this.execute(script, args)
      },
      table,
      this.cache
    );
  }

  // ========================================================================
  // Table Operations
  // ========================================================================

  /**
   * List all tables
   * Cached for 300 seconds (schema changes are infrequent)
   */
  async tables(): Promise<TablesResponse> {
    const cacheKey = 'tables:list';
    const endTimer = this.telemetry.startOperation('tables');

    try {
      // Check cache
      if (this.cache) {
        const cached = this.cache.get<TablesResponse>(cacheKey);
        if (cached) {
          this.telemetry.recordCacheHit();
          endTimer();
          return cached;
        }
        this.telemetry.recordCacheMiss();
      }

      // Execute
      const result = await this.execute('convex-tables.ts', ['--json']);
      const parsed = JSON.parse(result);
      const validated = validateData(TablesResponseSchema, parsed, 'tables response');

      // Cache result
      if (this.cache) {
        this.cache.set(cacheKey, validated, { ttl: 300 }); // 5min TTL
      }

      this.telemetry.recordOperation('tables');
      endTimer();
      return validated;
    } catch (error) {
      this.telemetry.recordError('tables', error as Error);
      endTimer();
      throw error;
    }
  }

  // ========================================================================
  // Function Operations
  // ========================================================================

  /**
   * List all functions
   * Cached for 300 seconds
   */
  async functions(): Promise<FunctionsResponse> {
    const cacheKey = 'functions:list';
    const endTimer = this.telemetry.startOperation('functions');

    try {
      // Check cache
      if (this.cache) {
        const cached = this.cache.get<FunctionsResponse>(cacheKey);
        if (cached) {
          this.telemetry.recordCacheHit();
          endTimer();
          return cached;
        }
        this.telemetry.recordCacheMiss();
      }

      // Execute
      const result = await this.execute('convex-functions.ts', ['--json']);
      const parsed = JSON.parse(result);
      const validated = validateData(FunctionsResponseSchema, parsed, 'functions response');

      // Cache result
      if (this.cache) {
        this.cache.set(cacheKey, validated, { ttl: 300 }); // 5min TTL
      }

      this.telemetry.recordOperation('functions');
      endTimer();
      return validated;
    } catch (error) {
      this.telemetry.recordError('functions', error as Error);
      endTimer();
      throw error;
    }
  }

  /**
   * Run a Convex function
   * Not cached (mutations should always execute fresh)
   */
  async runFunction<T = any>(functionName: string, args: any): Promise<FunctionRunResponse<T>> {
    const endTimer = this.telemetry.startOperation('runFunction');

    try {
      const result = await this.execute('convex-run.ts', [
        functionName,
        JSON.stringify(args),
        '--json'
      ]);
      const parsed = JSON.parse(result);
      const validated = validateData(FunctionRunResponseSchema, parsed, 'function run response') as FunctionRunResponse<T>;

      this.telemetry.recordOperation('runFunction');
      endTimer();
      return validated;
    } catch (error) {
      this.telemetry.recordError('runFunction', error as Error);
      endTimer();
      throw error;
    }
  }

  // ========================================================================
  // Environment Variable Operations
  // ========================================================================

  /**
   * Environment variable operations
   */
  env = {
    /**
     * List all environment variables
     * Cached for 60 seconds
     * @param masked - If true, masks sensitive values (default: true for security)
     */
    list: async (masked: boolean = true): Promise<EnvListResponse> => {
      const cacheKey = `env:list:${masked ? 'masked' : 'unmasked'}`;
      const endTimer = this.telemetry.startOperation('env.list');

      try {
        // Check cache
        if (this.cache) {
          const cached = this.cache.get<EnvListResponse>(cacheKey);
          if (cached) {
            this.telemetry.recordCacheHit();
            endTimer();
            return cached;
          }
          this.telemetry.recordCacheMiss();
        }

        // Execute
        const args = ['list', '--json'];
        if (masked) args.push('--masked');
        const result = await this.execute('convex-env.ts', args);
        const parsed = JSON.parse(result);
        const validated = validateData(EnvListResponseSchema, parsed, 'env list response');

        // Cache result
        if (this.cache) {
          this.cache.set(cacheKey, validated, { ttl: 60 });
        }

        this.telemetry.recordOperation('env.list');
        endTimer();
        return validated;
      } catch (error) {
        this.telemetry.recordError('env.list', error as Error);
        endTimer();
        throw error;
      }
    },

    /**
     * Get specific environment variable
     * Cached for 60 seconds
     * @param name - Name of the environment variable
     * @param masked - If true, masks sensitive value (default: true for security)
     */
    get: async (name: string, masked: boolean = true): Promise<EnvGetResponse> => {
      const cacheKey = `env:get:${name}:${masked ? 'masked' : 'unmasked'}`;
      const endTimer = this.telemetry.startOperation('env.get');

      try {
        // Check cache
        if (this.cache) {
          const cached = this.cache.get<EnvGetResponse>(cacheKey);
          if (cached) {
            this.telemetry.recordCacheHit();
            endTimer();
            return cached;
          }
          this.telemetry.recordCacheMiss();
        }

        // Execute
        const args = ['get', name, '--json'];
        if (masked) args.push('--masked');
        const result = await this.execute('convex-env.ts', args);
        const parsed = JSON.parse(result);
        const validated = validateData(EnvGetResponseSchema, parsed, 'env get response');

        // Cache result
        if (this.cache) {
          this.cache.set(cacheKey, validated, { ttl: 60 });
        }

        this.telemetry.recordOperation('env.get');
        endTimer();
        return validated;
      } catch (error) {
        this.telemetry.recordError('env.get', error as Error);
        endTimer();
        throw error;
      }
    },

    /**
     * Set environment variable
     * Invalidates env cache
     */
    set: async (name: string, value: string): Promise<EnvSetResponse> => {
      const endTimer = this.telemetry.startOperation('env.set');

      try {
        const result = await this.execute('convex-env.ts', ['set', name, value, '--json']);
        const parsed = JSON.parse(result);
        const validated = validateData(EnvSetResponseSchema, parsed, 'env set response');

        // Invalidate related cache entries (both masked and unmasked)
        if (this.cache) {
          this.cache.delete('env:list:masked');
          this.cache.delete('env:list:unmasked');
          this.cache.delete(`env:get:${name}:masked`);
          this.cache.delete(`env:get:${name}:unmasked`);
          this.cache.delete('deployment:status'); // Deployment config may have changed
        }

        this.telemetry.recordOperation('env.set');
        endTimer();
        return validated;
      } catch (error) {
        this.telemetry.recordError('env.set', error as Error);
        endTimer();
        throw error;
      }
    }
  };

  // ========================================================================
  // Logs Operations (Streaming Support)
  // ========================================================================

  /**
   * Get logs with optional streaming support
   *
   * For non-streaming (history only):
   * ```typescript
   * const logs = await sdk.logs({ history: 20 });
   * ```
   *
   * For streaming:
   * ```typescript
   * const stream = sdk.logsStream({ follow: true });
   * stream.on('log', log => console.log(log));
   * stream.on('error', err => console.error(err));
   * stream.on('end', () => console.log('done'));
   * ```
   */
  async logs(options?: {
    history?: number;
    success?: boolean;
    error?: boolean;
    timeout?: number;
  }): Promise<LogsResponse> {
    const endTimer = this.telemetry.startOperation('logs');

    try {
      const args = ['--json'];
      if (options?.history) args.push(`--history=${options.history}`);
      if (options?.success) args.push('--success');
      if (options?.error) args.push('--error');
      if (options?.timeout) args.push(`--timeout=${options.timeout}`);

      const result = await this.execute('convex-logs.ts', args);
      const parsed = JSON.parse(result);
      const validated = validateData(LogsResponseSchema, parsed, 'logs response');

      this.telemetry.recordOperation('logs');
      endTimer();
      return validated;
    } catch (error) {
      this.telemetry.recordError('logs', error as Error);
      endTimer();
      throw error;
    }
  }

  /**
   * Stream logs with EventEmitter
   *
   * @example
   * ```typescript
   * const stream = sdk.logsStream({ follow: true });
   * stream.on('log', log => console.log(log.message));
   * stream.on('error', err => console.error(err));
   * stream.on('end', () => console.log('Stream ended'));
   * ```
   */
  logsStream(options?: {
    follow?: boolean;
    success?: boolean;
    error?: boolean;
  }): EventEmitter {
    const emitter = new EventEmitter();
    const args: string[] = [];

    if (options?.follow) args.push('--follow');
    if (options?.success) args.push('--success');
    if (options?.error) args.push('--error');

    // Spawn process for streaming
    const scriptPath = path.join(this.scriptsDir, 'convex-logs.ts');
    const child = spawn('npx', ['tsx', scriptPath, ...args], {
      cwd: this.cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    child.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          // Try to parse as JSON (structured log)
          const log = JSON.parse(line);
          emitter.emit('log', log);
        } catch {
          // Emit raw line if not JSON
          emitter.emit('log', { message: line, timestamp: new Date().toISOString() });
        }
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      emitter.emit('error', new Error(data.toString()));
    });

    child.on('close', (code: number) => {
      if (code === 0) {
        emitter.emit('end');
      } else {
        emitter.emit('error', new Error(`Process exited with code ${code}`));
      }
    });

    child.on('error', (err: Error) => {
      emitter.emit('error', err);
    });

    // Add stop method to emitter
    (emitter as any).stop = () => {
      child.kill();
    };

    return emitter;
  }

  // ========================================================================
  // Batch Operations (Phase 5)
  // ========================================================================

  /**
   * Execute multiple operations in parallel
   *
   * @example
   * ```typescript
   * const results = await sdk.batch.parallel([
   *   () => sdk.data('users').limit(10).execute(),
   *   () => sdk.data('workouts').limit(20).execute(),
   *   () => sdk.runFunction('stats:summary', {})
   * ]);
   * ```
   */
  get batch() {
    return {
      /**
       * Execute operations in parallel
       */
      parallel: <T>(operations: Array<() => Promise<T>>, config?: BatchConfig) =>
        this.batchExecutor.parallel(operations),

      /**
       * Execute operations sequentially
       */
      sequential: <T>(operations: Array<() => Promise<T>>, config?: BatchConfig) =>
        this.batchExecutor.sequential(operations),

      /**
       * Execute operations and return first successful result
       */
      race: <T>(operations: Array<() => Promise<T>>) =>
        this.batchExecutor.race(operations),

      /**
       * Execute operations until one succeeds
       */
      any: <T>(operations: Array<() => Promise<T>>) =>
        this.batchExecutor.any(operations)
    };
  }

  // ========================================================================
  // Streaming Operations (Phase 5)
  // ========================================================================

  /**
   * Create a paginator for iterating through large datasets page by page
   *
   * @example
   * ```typescript
   * const paginator = sdk.paginate('users', { pageSize: 100 });
   *
   * while (paginator.hasNext()) {
   *   const page = await paginator.next();
   *   console.log(`Page ${page.pageNumber}: ${page.count} users`);
   *   processUsers(page.documents);
   * }
   * ```
   */
  paginate<T = any>(table: string, config: PaginationConfig): Paginator<T> {
    // Create a ConvexCLI-like interface for the paginator
    const cli = {
      queryData: async <U>(t: string, options?: { limit?: number }) => {
        const result = await this.execute('convex-data.ts', [
          t,
          ...(options?.limit ? [`--limit=${options.limit}`] : []),
          '--json'
        ]);
        const parsed = JSON.parse(result);
        return validateData(DataResponseSchema, parsed, 'data response') as DataResponse<U>;
      }
    };

    return new Paginator<T>(cli as any, table, config);
  }

  /**
   * Create a document stream for iterating through large datasets using async iteration
   *
   * @example
   * ```typescript
   * const stream = sdk.stream('users', { chunkSize: 100 });
   *
   * for await (const user of stream) {
   *   console.log(user.name);
   *   processUser(user);
   * }
   * ```
   */
  stream<T = any>(table: string, config?: StreamConfig): DocumentStream<T> {
    const cli = {
      queryData: async <U>(t: string, options?: { limit?: number }) => {
        const result = await this.execute('convex-data.ts', [
          t,
          ...(options?.limit ? [`--limit=${options.limit}`] : []),
          '--json'
        ]);
        const parsed = JSON.parse(result);
        return validateData(DataResponseSchema, parsed, 'data response') as DataResponse<U>;
      }
    };

    return new DocumentStream<T>(cli as any, table, config);
  }

  /**
   * Create a chunked stream for processing documents in batches
   *
   * @example
   * ```typescript
   * const stream = sdk.streamChunks('users', { chunkSize: 50 });
   *
   * for await (const chunk of stream) {
   *   console.log(`Processing chunk of ${chunk.length} users`);
   *   await batchProcess(chunk);
   * }
   * ```
   */
  streamChunks<T = any>(table: string, config?: StreamConfig): ChunkedStream<T> {
    const cli = {
      queryData: async <U>(t: string, options?: { limit?: number }) => {
        const result = await this.execute('convex-data.ts', [
          t,
          ...(options?.limit ? [`--limit=${options.limit}`] : []),
          '--json'
        ]);
        const parsed = JSON.parse(result);
        return validateData(DataResponseSchema, parsed, 'data response') as DataResponse<U>;
      }
    };

    return new ChunkedStream<T>(cli as any, table, config);
  }

  // ========================================================================
  // Metrics & Telemetry
  // ========================================================================

  /**
   * Get comprehensive metrics summary
   */
  getMetrics(): ReturnType<Telemetry['getSummary']> {
    return this.telemetry.getSummary();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    if (!this.cache) {
      return { enabled: false };
    }

    return {
      enabled: true,
      ...this.cache.getStats(),
      hitRate: this.cache.getHitRate()
    };
  }

  /**
   * Reset all telemetry metrics
   */
  resetMetrics(): void {
    this.telemetry.reset();
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return this.telemetry.export();
  }

  /**
   * Export monitoring metrics (Prometheus, JSON, etc.)
   * Phase 5 feature for external monitoring systems
   *
   * @example
   * ```typescript
   * // Export as Prometheus format
   * const prometheusMetrics = await sdk.exportMonitoring();
   *
   * // Export as JSON
   * const sdk = new ConvexSDK({ monitoring: { enabled: true, format: 'json' } });
   * const jsonMetrics = await sdk.exportMonitoring();
   * ```
   */
  async exportMonitoring(): Promise<string> {
    if (!this.monitoring) {
      throw new Error('Monitoring not enabled. Set monitoring.enabled in config.');
    }

    return this.monitoring.export(this.telemetry, this.cache);
  }

  /**
   * Get monitoring exporter instance
   * Useful for advanced monitoring configuration
   */
  getMonitoring(): MonitoringExporter | undefined {
    return this.monitoring;
  }

  // ========================================================================
  // Cleanup
  // ========================================================================

  /**
   * Cleanup resources (cache timers, etc.)
   */
  destroy(): void {
    if (this.cache) {
      this.cache.destroy();
    }
  }

  // ========================================================================
  // Private Helpers
  // ========================================================================

  /**
   * Execute a CLI script and return output
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

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Script failed: ${stderr || stdout}`));
        }
      });

      child.on('error', (err: Error) => {
        reject(err);
      });
    });
  }
}
