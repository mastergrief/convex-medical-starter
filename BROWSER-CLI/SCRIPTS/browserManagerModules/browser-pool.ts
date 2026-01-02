/**
 * Browser Pool Module
 *
 * Pre-launches browser contexts for faster command execution.
 * Implements a warm pool pattern to reduce cold-start latency.
 */

import { Browser, BrowserContext, Page } from 'playwright';
import { Logger } from '../utils/logger';
import { BrowserConfig } from './types';

/**
 * Represents a pooled browser context with its associated page
 */
interface PooledContext {
  context: BrowserContext;
  page: Page;
  inUse: boolean;
  createdAt: number;
}

/**
 * Pool statistics for monitoring
 */
export interface PoolStats {
  total: number;
  available: number;
  inUse: number;
  poolSize: number;
}

/**
 * Manages a pool of pre-warmed browser contexts
 */
export class BrowserPool {
  private browser: Browser | null = null;
  private contexts: PooledContext[] = [];
  private poolSize: number;
  private config: BrowserConfig;
  private logger: Logger;

  constructor(poolSize: number, config: BrowserConfig, logger?: Logger) {
    this.poolSize = Math.max(1, poolSize);
    this.config = config;
    this.logger = logger || new Logger('BrowserPool');
  }

  /**
   * Initialize the pool with pre-warmed contexts
   */
  async initialize(browser: Browser): Promise<void> {
    this.browser = browser;
    this.logger.log(`Warming up pool with ${this.poolSize} contexts...`);

    for (let i = 0; i < this.poolSize; i++) {
      const pooled = await this.createPooledContext();
      this.contexts.push(pooled);
    }

    this.logger.log(`Pool initialized with ${this.contexts.length} contexts`);
  }

  /**
   * Create a new pooled context
   */
  private async createPooledContext(): Promise<PooledContext> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const context = await this.browser.newContext({
      viewport: { width: this.config.width, height: this.config.height },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    });
    const page = await context.newPage();

    return {
      context,
      page,
      inUse: false,
      createdAt: Date.now(),
    };
  }

  /**
   * Acquire a context from the pool
   * If all contexts are in use, creates a new one (over pool limit)
   */
  async acquire(): Promise<{ context: BrowserContext; page: Page }> {
    // Find available context
    const available = this.contexts.find((c) => !c.inUse);

    if (available) {
      available.inUse = true;
      this.logger.log(
        `Acquired pooled context (${this.getAvailableCount()}/${this.poolSize} available)`
      );
      return { context: available.context, page: available.page };
    }

    // All in use - create new (over pool limit)
    this.logger.log('Pool exhausted, creating new context...');
    const newPooled = await this.createPooledContext();
    newPooled.inUse = true;
    this.contexts.push(newPooled);
    return { context: newPooled.context, page: newPooled.page };
  }

  /**
   * Release a context back to the pool
   */
  async release(context: BrowserContext): Promise<void> {
    const pooled = this.contexts.find((c) => c.context === context);
    if (pooled) {
      // Reset state before returning to pool
      await this.resetContext(pooled);
      pooled.inUse = false;
      this.logger.log(
        `Released context to pool (${this.getAvailableCount()}/${this.contexts.length} available)`
      );
    }
  }

  /**
   * Reset a context to clean state
   */
  private async resetContext(pooled: PooledContext): Promise<void> {
    try {
      await pooled.context.clearCookies();
      await pooled.page.goto('about:blank');
    } catch {
      // Context may be closed, that's ok
    }
  }

  /**
   * Get count of available (not in use) contexts
   */
  getAvailableCount(): number {
    return this.contexts.filter((c) => !c.inUse).length;
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    const inUse = this.contexts.filter((c) => c.inUse).length;
    return {
      total: this.contexts.length,
      available: this.contexts.length - inUse,
      inUse,
      poolSize: this.poolSize,
    };
  }

  /**
   * Check if pool is initialized
   */
  isInitialized(): boolean {
    return this.browser !== null && this.contexts.length > 0;
  }

  /**
   * Close all pooled contexts
   */
  async close(): Promise<void> {
    this.logger.log('Closing all pooled contexts...');
    for (const pooled of this.contexts) {
      try {
        await pooled.context.close();
      } catch {
        // Ignore errors on close
      }
    }
    this.contexts = [];
    this.browser = null;
  }
}
