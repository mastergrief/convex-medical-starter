/**
 * Data Query Builder for Convex SDK
 *
 * Provides fluent API for building and executing data queries
 */

import type { DataResponse } from '../../LIB/types.js';
import type { Cache } from '../cache.js';

export interface DataQueryOptions {
  limit?: number;
  order?: 'asc' | 'desc';
}

export interface QueryExecutor {
  execute(script: string, args: string[]): Promise<string>;
}

/**
 * Fluent query builder for data operations
 *
 * @example
 * ```typescript
 * const users = await sdk.data('users')
 *   .limit(10)
 *   .order('desc')
 *   .execute();
 * ```
 */
export class DataQueryBuilder<T = any> {
  private table: string;
  private executor: QueryExecutor;
  private cache?: Cache;
  private options: DataQueryOptions = {};
  private skipCache: boolean = false;

  constructor(executor: QueryExecutor, table: string, cache?: Cache) {
    this.executor = executor;
    this.table = table;
    this.cache = cache;
  }

  /**
   * Limit number of results
   */
  limit(n: number): this {
    if (n <= 0) {
      throw new Error('Limit must be greater than 0');
    }
    this.options.limit = n;
    return this;
  }

  /**
   * Set result ordering
   * Note: This is a placeholder for future Convex API support
   */
  order(direction: 'asc' | 'desc'): this {
    this.options.order = direction;
    return this;
  }

  /**
   * Skip cache for this query
   */
  noCache(): this {
    this.skipCache = true;
    return this;
  }

  /**
   * Execute query and return documents
   */
  /**
   * Execute query and return full response with metadata
   */
  async execute(): Promise<DataResponse<T>> {
    const cacheKey = this.getCacheKey();

    // Check cache
    if (this.cache && !this.skipCache) {
      const cached = this.cache.get<DataResponse<T>>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    // Execute query
    const args = this.buildArgs();
    const result = await this.executor.execute('convex-data.ts', [this.table, ...args]);
    const parsed: DataResponse<T> = JSON.parse(result);

    if (!parsed.success) {
      throw new Error(parsed.error?.message || 'Query failed');
    }

    if (!parsed.data) {
      throw new Error('Response missing data property');
    }

    // Cache result (full response, not just documents)
    if (this.cache && !this.skipCache) {
      this.cache.set(cacheKey, parsed, { ttl: 30 }); // 30s TTL for data queries
    }

    return parsed;
  }

  /**
   * Get count of documents (uses limit=1 for efficiency)
   */
  /**
   * Get count of documents (uses limit=1 for efficiency)
   */
  /**
   * Get count of documents
   */
  async count(): Promise<CLIResponse<{ count: number }>> {
    const response = await this.execute();
    
    return {
      success: response.success,
      data: {
        count: response.data.count
      },
      metadata: response.metadata
    };
  }

  /**
   * Get first document or undefined
   */
  /**
   * Get first document or undefined
   */
  /**
   * Get first document or undefined
   */
  async first(): Promise<CLIResponse<{ document: T | undefined }>> {
    const response = await this.limit(1).execute();
    
    return {
      success: response.success,
      data: {
        document: response.data.documents[0]
      },
      metadata: response.metadata
    };
  }

  /**
   * Check if any documents match query
   */
  /**
   * Check if any documents match query
   */
  async exists(): Promise<CLIResponse<{ exists: boolean }>> {
    const response = await this.count();
    
    return {
      success: response.success,
      data: {
        exists: response.data.count > 0
      },
      metadata: response.metadata
    };
  }

  /**
   * Build CLI arguments from options
   */
  private buildArgs(): string[] {
    const args: string[] = ['--json'];

    if (this.options.limit !== undefined) {
      args.push(`--limit=${this.options.limit}`);
    }

    // Note: order is stored but not passed to CLI (not yet supported by convex-data.ts)
    // This is prepared for future enhancement

    return args;
  }

  /**
   * Generate cache key from query parameters
   */
  private getCacheKey(): string {
    return `data:${this.table}:${JSON.stringify(this.options)}`;
  }

  /**
   * Get current query configuration (for debugging)
   */
  getConfig(): { table: string; options: DataQueryOptions } {
    return {
      table: this.table,
      options: { ...this.options }
    };
  }
}
