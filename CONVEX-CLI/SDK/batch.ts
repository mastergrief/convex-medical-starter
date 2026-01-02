/**
 * Batch Operations for Convex SDK
 *
 * Provides utilities for executing multiple operations in parallel or sequentially
 * with error handling strategies.
 */

/**
 * Configuration for batch operations
 */
export interface BatchConfig {
  /** Maximum number of concurrent operations (default: 5) */
  concurrency?: number;
  /** Stop on first error in sequential mode (default: true) */
  stopOnError?: boolean;
  /** Timeout for each operation in milliseconds (default: 30000) */
  operationTimeout?: number;
}

/**
 * Result of a single batch operation
 */
export interface BatchResult<T> {
  /** Index of the operation in the batch */
  index: number;
  /** Success status */
  success: boolean;
  /** Result data if successful */
  data?: T;
  /** Error if failed */
  error?: Error;
  /** Execution time in milliseconds */
  executionTime: number;
  /** Optional operation name for better debugging (FIX-010) */
  operationName?: string;
}

/**
 * Summary of batch execution
 */
export interface BatchSummary<T> {
  /** All operation results */
  results: BatchResult<T>[];
  /** Total number of operations */
  total: number;
  /** Number of successful operations */
  succeeded: number;
  /** Number of failed operations */
  failed: number;
  /** Total execution time in milliseconds */
  totalTime: number;
  /** Success rate (0-1) */
  successRate: number;
  /** Detailed error information for failed operations (FIX-010) */
  errors?: Array<{
    operation?: string;
    index: number;
    error?: string;
  }>;
}

/**
 * Batch executor for running multiple operations efficiently
 */
export class BatchExecutor {
  private config: Required<BatchConfig>;

  constructor(config: BatchConfig = {}) {
    this.config = {
      concurrency: config.concurrency ?? 5,
      stopOnError: config.stopOnError ?? true,
      operationTimeout: config.operationTimeout ?? 30000
    };
  }

  /**
   * Execute multiple operations in parallel
   *
   * @example
   * ```typescript
   * const batch = new BatchExecutor({ concurrency: 3 });
   * const results = await batch.parallel([
   *   () => sdk.data('users').limit(10).execute(),
   *   () => sdk.data('workouts').limit(20).execute(),
   *   () => sdk.functions.run('stats:summary', {})
   * ]);
   * ```
   *
   * @param operations - Array of async functions to execute
   * @returns Batch execution summary
   */
  async parallel<T>(
    operations: Array<() => Promise<T>>,
    options?: { names?: string[] }
  ): Promise<BatchSummary<T>> {
    const startTime = Date.now();
    const results: BatchResult<T>[] = [];
    const names = options?.names ?? operations.map((_, i) => `Operation ${i + 1}`);

    // Execute with concurrency limit
    const chunks = this.chunkArray(operations, this.config.concurrency);
    let globalIndex = 0;

    for (const chunk of chunks) {
      const chunkStartIndex = globalIndex;
      const chunkResults = await Promise.allSettled(
        chunk.map((op, index) => this.executeWithTimeout(op, chunkStartIndex + index))
      );

      results.push(...chunkResults.map((result, chunkIndex) => {
        const opIndex = chunkStartIndex + chunkIndex;
        const mappedResult = this.mapSettledResult(result, opIndex);
        // Add operation name to result (FIX-010)
        return {
          ...mappedResult,
          operationName: names[opIndex]
        };
      }));

      globalIndex += chunk.length;
    }

    const totalTime = Date.now() - startTime;
    return this.createSummary(results, totalTime);
  }

  /**
   * Execute multiple operations sequentially
   *
   * @example
   * ```typescript
   * const batch = new BatchExecutor({ stopOnError: true });
   * const results = await batch.sequential([
   *   () => sdk.env.set('VAR1', 'value1'),
   *   () => sdk.env.set('VAR2', 'value2'),
   *   () => sdk.status()
   * ]);
   * ```
   *
   * @param operations - Array of async functions to execute
   * @returns Batch execution summary
   */
  async sequential<T>(
    operations: Array<() => Promise<T>>
  ): Promise<BatchSummary<T>> {
    const startTime = Date.now();
    const results: BatchResult<T>[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const opStartTime = Date.now();

      try {
        const data = await this.executeWithTimeout(op, i);
        results.push({
          index: i,
          success: true,
          data,
          executionTime: Date.now() - opStartTime
        });
      } catch (error) {
        results.push({
          index: i,
          success: false,
          error: error instanceof Error ? error : new Error(String(error)),
          executionTime: Date.now() - opStartTime
        });

        // Stop if configured to do so
        if (this.config.stopOnError) {
          break;
        }
      }
    }

    const totalTime = Date.now() - startTime;
    return this.createSummary(results, totalTime);
  }

  /**
   * Execute multiple operations with racing semantics
   * Returns as soon as the first operation succeeds
   *
   * @example
   * ```typescript
   * const batch = new BatchExecutor();
   * const result = await batch.race([
   *   () => sdk.data('users').limit(1).first(),
   *   () => fetchUserFromCache(),
   *   () => fetchUserFromBackup()
   * ]);
   * ```
   *
   * @param operations - Array of async functions to execute
   * @returns First successful result or error if all fail
   */
  async race<T>(operations: Array<() => Promise<T>>): Promise<T> {
    return Promise.race(
      operations.map(op => this.executeWithTimeout(op, 0))
    );
  }

  /**
   * Execute multiple operations and return first successful result
   * Continues trying until one succeeds or all fail
   *
   * @example
   * ```typescript
   * const batch = new BatchExecutor();
   * const result = await batch.any([
   *   () => fetchFromPrimary(),
   *   () => fetchFromSecondary(),
   *   () => fetchFromTertiary()
   * ]);
   * ```
   *
   * @param operations - Array of async functions to execute
   * @returns First successful result
   * @throws Error if all operations fail
   */
  async any<T>(operations: Array<() => Promise<T>>): Promise<T> {
    return Promise.any(
      operations.map(op => this.executeWithTimeout(op, 0))
    );
  }

  /**
   * Execute operation with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    index: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Operation ${index} timed out after ${this.config.operationTimeout}ms`)),
          this.config.operationTimeout
        )
      )
    ]);
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Map Promise.allSettled result to BatchResult
   */
  private mapSettledResult<T>(
    result: PromiseSettledResult<T>,
    index: number
  ): BatchResult<T> {
    if (result.status === 'fulfilled') {
      return {
        index,
        success: true,
        data: result.value,
        executionTime: 0 // Tracked separately
      };
    } else {
      return {
        index,
        success: false,
        error: result.reason instanceof Error ? result.reason : new Error(String(result.reason)),
        executionTime: 0 // Tracked separately
      };
    }
  }

  /**
   * Create batch execution summary
   */
  private createSummary<T>(
    results: BatchResult<T>[],
    totalTime: number
  ): BatchSummary<T> {
    const succeeded = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    // Build errors array for failed operations (FIX-010)
    const errors = results
      .filter(r => !r.success)
      .map(r => ({
        operation: r.operationName,
        index: r.index,
        error: r.error?.message
      }));

    return {
      results,
      total: results.length,
      succeeded,
      failed,
      totalTime,
      successRate: results.length > 0 ? succeeded / results.length : 0,
      ...(errors.length > 0 && { errors })
    };
  }
}

/**
 * Utility functions for common batch patterns
 */

/**
 * Execute operations in parallel with default config
 */
export async function parallel<T>(
  operations: Array<() => Promise<T>>,
  config?: BatchConfig
): Promise<BatchSummary<T>> {
  const executor = new BatchExecutor(config);
  return executor.parallel(operations);
}

/**
 * Execute operations sequentially with default config
 */
export async function sequential<T>(
  operations: Array<() => Promise<T>>,
  config?: BatchConfig
): Promise<BatchSummary<T>> {
  const executor = new BatchExecutor(config);
  return executor.sequential(operations);
}

/**
 * Execute operations and return first successful result
 */
export async function race<T>(
  operations: Array<() => Promise<T>>,
  config?: BatchConfig
): Promise<T> {
  const executor = new BatchExecutor(config);
  return executor.race(operations);
}

/**
 * Execute operations until one succeeds
 */
export async function any<T>(
  operations: Array<() => Promise<T>>,
  config?: BatchConfig
): Promise<T> {
  const executor = new BatchExecutor(config);
  return executor.any(operations);
}
