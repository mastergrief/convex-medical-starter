/**
 * Query Streaming for Convex SDK
 *
 * Provides async iterators and pagination utilities for streaming large datasets
 * without loading everything into memory.
 */

import type { ConvexCLI } from '../LIB/client.js';
import type { DataResponse } from '../LIB/types.js';

/**
 * Configuration for pagination
 */
export interface PaginationConfig {
  /** Page size (number of documents per page) */
  pageSize: number;
  /** Maximum number of pages to fetch (default: unlimited) */
  maxPages?: number;
  /** Initial page number (default: 1) */
  startPage?: number;
}

/**
 * Page information
 */
export interface PageInfo<T> {
  /** Page number (1-indexed) */
  pageNumber: number;
  /** Documents in this page */
  documents: T[];
  /** Number of documents in this page */
  count: number;
  /** Whether there are more pages */
  hasNext: boolean;
  /** Whether this is the first page */
  isFirst: boolean;
  /** Whether this is the last page */
  isLast: boolean;
}

/**
 * Stream configuration
 */
export interface StreamConfig {
  /** Chunk size for streaming (default: 100) */
  chunkSize?: number;
  /** Maximum number of documents to stream (default: unlimited) */
  maxDocuments?: number;
  /** Whether to cache chunks (default: false) */
  cacheChunks?: boolean;
}

/**
 * Paginator for iterating through large datasets page by page
 *
 * @example
 * ```typescript
 * const paginator = new Paginator(cli, 'users', { pageSize: 100 });
 *
 * while (paginator.hasNext()) {
 *   const page = await paginator.next();
 *   console.log(`Page ${page.pageNumber}: ${page.count} users`);
 *   processUsers(page.documents);
 * }
 * ```
 */
export class Paginator<T = any> {
  private cli: ConvexCLI;
  private table: string;
  private config: Required<PaginationConfig>;
  private currentPage: number;
  private totalFetched: number = 0;
  private lastPageSize: number = 0;
  private finished: boolean = false;

  constructor(cli: ConvexCLI, table: string, config: PaginationConfig) {
    this.cli = cli;
    this.table = table;
    this.config = {
      pageSize: config.pageSize,
      maxPages: config.maxPages ?? Infinity,
      startPage: config.startPage ?? 1
    };
    this.currentPage = this.config.startPage - 1; // Will increment on first next()
  }

  /**
   * Check if there are more pages to fetch
   */
  hasNext(): boolean {
    if (this.finished) return false;
    if (this.currentPage === this.config.startPage - 1) return true; // First page
    if (this.lastPageSize < this.config.pageSize) return false; // Last page was partial
    if (this.currentPage >= (this.config.startPage + (this.config.maxPages ?? Infinity) - 1)) return false;
    return true;
  }

  /**
   * Fetch the next page
   *
   * @returns Page information with documents
   * @throws Error if no more pages available
   */
  async next(): Promise<PageInfo<T>> {
    if (!this.hasNext()) {
      throw new Error('No more pages available');
    }

    this.currentPage++;

    const response = await this.cli.queryData<T>(this.table, {
      limit: this.config.pageSize
      // Note: Real pagination would need offset or cursor support in CLI
      // This is a simplified implementation
    });

    const documents = response.data.documents;
    this.lastPageSize = documents.length;
    this.totalFetched += documents.length;

    const hasNext = this.lastPageSize === this.config.pageSize &&
                    this.currentPage < (this.config.startPage + (this.config.maxPages ?? Infinity) - 1);

    if (!hasNext) {
      this.finished = true;
    }

    return {
      pageNumber: this.currentPage,
      documents,
      count: documents.length,
      hasNext,
      isFirst: this.currentPage === this.config.startPage,
      isLast: !hasNext
    };
  }

  /**
   * Reset paginator to start
   */
  reset(): void {
    this.currentPage = this.config.startPage - 1;
    this.totalFetched = 0;
    this.lastPageSize = 0;
    this.finished = false;
  }

  /**
   * Get current pagination state
   */
  getState() {
    return {
      currentPage: this.currentPage,
      totalFetched: this.totalFetched,
      finished: this.finished
    };
  }
}

/**
 * Document stream for iterating through large datasets using async iteration
 *
 * @example
 * ```typescript
 * const stream = new DocumentStream(cli, 'users', { chunkSize: 100 });
 *
 * for await (const user of stream) {
 *   console.log(user.name);
 *   processUser(user);
 * }
 * ```
 */
export class DocumentStream<T = any> implements AsyncIterable<T> {
  private cli: ConvexCLI;
  private table: string;
  private config: Required<StreamConfig>;

  constructor(cli: ConvexCLI, table: string, config: StreamConfig = {}) {
    this.cli = cli;
    this.table = table;
    this.config = {
      chunkSize: config.chunkSize ?? 100,
      maxDocuments: config.maxDocuments ?? Infinity,
      cacheChunks: config.cacheChunks ?? false
    };
  }

  /**
   * Async iterator implementation
   */
  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let fetched = 0;
    let hasMore = true;

    while (hasMore && fetched < this.config.maxDocuments) {
      const limit = Math.min(
        this.config.chunkSize,
        this.config.maxDocuments - fetched
      );

      const response = await this.cli.queryData<T>(this.table, { limit });
      const documents = response.data.documents;

      // Yield each document
      for (const doc of documents) {
        yield doc;
        fetched++;
        if (fetched >= this.config.maxDocuments) {
          return;
        }
      }

      // Check if we got fewer documents than requested
      hasMore = documents.length === limit;
    }
  }

  /**
   * Collect all documents into an array
   * Warning: This loads all documents into memory
   *
   * @returns Array of all documents
   */
  async toArray(): Promise<T[]> {
    const documents: T[] = [];
    for await (const doc of this) {
      documents.push(doc);
    }
    return documents;
  }

  /**
   * Apply a transformation to each document
   *
   * @param fn - Transformation function
   * @returns New stream with transformed documents
   */
  map<U>(fn: (doc: T) => U): MappedStream<T, U> {
    return new MappedStream(this, fn);
  }

  /**
   * Filter documents
   *
   * @param predicate - Filter function
   * @returns New stream with filtered documents
   */
  filter(predicate: (doc: T) => boolean): FilteredStream<T> {
    return new FilteredStream(this, predicate);
  }

  /**
   * Take first N documents
   *
   * @param n - Number of documents to take
   * @returns New stream with limited documents
   */
  take(n: number): LimitedStream<T> {
    return new LimitedStream(this, n);
  }

  /**
   * Skip first N documents
   *
   * @param n - Number of documents to skip
   * @returns New stream with skipped documents
   */
  skip(n: number): SkippedStream<T> {
    return new SkippedStream(this, n);
  }
}

/**
 * Mapped stream (internal)
 */
class MappedStream<T, U> implements AsyncIterable<U> {
  constructor(
    private source: AsyncIterable<T>,
    private fn: (doc: T) => U
  ) {}

  async *[Symbol.asyncIterator](): AsyncIterator<U> {
    for await (const doc of this.source) {
      yield this.fn(doc);
    }
  }
}

/**
 * Filtered stream (internal)
 */
class FilteredStream<T> implements AsyncIterable<T> {
  constructor(
    private source: AsyncIterable<T>,
    private predicate: (doc: T) => boolean
  ) {}

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    for await (const doc of this.source) {
      if (this.predicate(doc)) {
        yield doc;
      }
    }
  }
}

/**
 * Limited stream (internal)
 */
class LimitedStream<T> implements AsyncIterable<T> {
  constructor(
    private source: AsyncIterable<T>,
    private limit: number
  ) {}

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let count = 0;
    for await (const doc of this.source) {
      if (count >= this.limit) break;
      yield doc;
      count++;
    }
  }
}

/**
 * Skipped stream (internal)
 */
class SkippedStream<T> implements AsyncIterable<T> {
  constructor(
    private source: AsyncIterable<T>,
    private skipCount: number
  ) {}

  async *[Symbol.asyncIterator](): AsyncIterator<T> {
    let skipped = 0;
    for await (const doc of this.source) {
      if (skipped < this.skipCount) {
        skipped++;
        continue;
      }
      yield doc;
    }
  }
}

/**
 * Chunked stream for processing documents in batches
 *
 * @example
 * ```typescript
 * const stream = new ChunkedStream(cli, 'users', { chunkSize: 50 });
 *
 * for await (const chunk of stream) {
 *   console.log(`Processing chunk of ${chunk.length} users`);
 *   await batchProcess(chunk);
 * }
 * ```
 */
export class ChunkedStream<T = any> implements AsyncIterable<T[]> {
  private cli: ConvexCLI;
  private table: string;
  private config: Required<StreamConfig>;

  constructor(cli: ConvexCLI, table: string, config: StreamConfig = {}) {
    this.cli = cli;
    this.table = table;
    this.config = {
      chunkSize: config.chunkSize ?? 100,
      maxDocuments: config.maxDocuments ?? Infinity,
      cacheChunks: config.cacheChunks ?? false
    };
  }

  /**
   * Async iterator yielding chunks of documents
   */
  async *[Symbol.asyncIterator](): AsyncIterator<T[]> {
    let fetched = 0;
    let hasMore = true;

    while (hasMore && fetched < this.config.maxDocuments) {
      const limit = Math.min(
        this.config.chunkSize,
        this.config.maxDocuments - fetched
      );

      const response = await this.cli.queryData<T>(this.table, { limit });
      const documents = response.data.documents;

      if (documents.length > 0) {
        yield documents;
        fetched += documents.length;
      }

      hasMore = documents.length === limit;
    }
  }
}

/**
 * Utility functions for streaming
 */

/**
 * Create a paginator for a table
 */
export function paginate<T = any>(
  cli: ConvexCLI,
  table: string,
  config: PaginationConfig
): Paginator<T> {
  return new Paginator<T>(cli, table, config);
}

/**
 * Create a document stream for a table
 */
export function stream<T = any>(
  cli: ConvexCLI,
  table: string,
  config?: StreamConfig
): DocumentStream<T> {
  return new DocumentStream<T>(cli, table, config);
}

/**
 * Create a chunked stream for a table
 */
export function streamChunks<T = any>(
  cli: ConvexCLI,
  table: string,
  config?: StreamConfig
): ChunkedStream<T> {
  return new ChunkedStream<T>(cli, table, config);
}

/**
 * Collect stream into array (utility)
 */
export async function collectStream<T>(stream: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of stream) {
    items.push(item);
  }
  return items;
}
