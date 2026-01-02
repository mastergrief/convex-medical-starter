/**
 * Advanced Caching for Convex SDK
 *
 * Provides dependency tracking, automatic invalidation patterns,
 * and cache warming strategies.
 */

import { Cache, type CacheConfig } from './cache.js';

/**
 * Cache dependency configuration
 */
export interface DependencyConfig {
  /** Enable automatic dependency tracking */
  enabled: boolean;
  /** Patterns for dependency detection */
  patterns?: DependencyPattern[];
}

/**
 * Dependency pattern for invalidation
 */
export interface DependencyPattern {
  /** Pattern to match keys (supports wildcards) */
  pattern: string;
  /** Keys that should be invalidated when this pattern matches */
  invalidates: string[];
}

/**
 * Cache warming configuration
 */
export interface WarmingConfig {
  /** Enable cache warming on initialization */
  enabled: boolean;
  /** Operations to warm on startup */
  warmup?: Array<{
    key: string;
    fetcher: () => Promise<any>;
    ttl?: number;
  }>;
  /** Warming strategy */
  strategy?: 'eager' | 'lazy' | 'scheduled';
  /** Interval for scheduled warming (milliseconds) */
  interval?: number;
}

/**
 * Advanced cache configuration
 */
export interface AdvancedCacheConfig extends CacheConfig {
  /** Dependency tracking configuration */
  dependencies?: DependencyConfig;
  /** Cache warming configuration */
  warming?: WarmingConfig;
  /** Enable invalidation patterns */
  invalidationPatterns?: boolean;
}

/**
 * Cache dependency info
 */
interface CacheDependency {
  /** Key that was set */
  key: string;
  /** Keys this entry depends on */
  dependsOn: string[];
  /** Keys that depend on this entry */
  dependents: string[];
  /** Timestamp when dependency was created */
  createdAt: number;
}

/**
 * Advanced cache with dependency tracking and warming
 */
export class AdvancedCache extends Cache {
  private dependencies: Map<string, CacheDependency> = new Map();
  private patterns: DependencyPattern[] = [];
  private warmingConfig: WarmingConfig;
  private warmingInterval?: NodeJS.Timeout;

  constructor(config: AdvancedCacheConfig = {}) {
    super(config);

    // Initialize dependency tracking
    if (config.dependencies?.enabled) {
      this.patterns = config.dependencies.patterns || [];
    }

    // Initialize cache warming
    this.warmingConfig = {
      enabled: config.warming?.enabled ?? false,
      warmup: config.warming?.warmup ?? [],
      strategy: config.warming?.strategy ?? 'lazy',
      interval: config.warming?.interval ?? 300000 // 5 minutes
    };

    if (this.warmingConfig.enabled) {
      this.initializeWarming();
    }
  }

  /**
   * Set value with dependency tracking
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options with dependencies
   */
  override set(
    key: string,
    value: any,
    options?: { ttl?: number; dependsOn?: string[] }
  ): void {
    // Call parent set
    super.set(key, value, options);

    // Track dependencies
    if (options?.dependsOn) {
      this.trackDependency(key, options.dependsOn);
    }

    // Check for automatic invalidation patterns
    this.checkInvalidationPatterns(key);
  }

  /**
   * Delete key and all dependents
   *
   * @param key - Cache key to delete
   * @returns True if deleted (including dependents)
   */
  override delete(key: string): boolean {
    // Get dependents before deletion
    const dependency = this.dependencies.get(key);
    const dependents = dependency?.dependents || [];

    // Delete main key
    const deleted = super.delete(key);

    // Delete all dependents recursively
    for (const dependent of dependents) {
      this.delete(dependent);
    }

    // Clean up dependency tracking
    this.dependencies.delete(key);

    return deleted;
  }

  /**
   * Invalidate cache by pattern (supports wildcards)
   *
   * @example
   * ```typescript
   * cache.invalidatePattern('users:*'); // Invalidates all user keys
   * cache.invalidatePattern('*:list'); // Invalidates all list keys
   * ```
   *
   * @param pattern - Pattern to match (supports * wildcard)
   * @returns Number of keys invalidated
   */
  invalidatePattern(pattern: string): number {
    const regex = this.patternToRegex(pattern);
    let count = 0;

    // Get all valid keys from parent class
    const allKeys = this.keys();

    for (const key of allKeys) {
      if (regex.test(key)) {
        this.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * Track dependency between cache keys
   *
   * @param key - Dependent key
   * @param dependencies - Keys this entry depends on
   */
  trackDependency(key: string, dependencies: string[]): void {
    // Create or update dependency for this key
    const existing = this.dependencies.get(key);
    const dependency: CacheDependency = {
      key,
      dependsOn: dependencies,
      dependents: existing?.dependents || [],
      createdAt: Date.now()
    };
    this.dependencies.set(key, dependency);

    // Update dependents for each dependency
    for (const depKey of dependencies) {
      const depInfo = this.dependencies.get(depKey);
      if (depInfo) {
        if (!depInfo.dependents.includes(key)) {
          depInfo.dependents.push(key);
        }
      } else {
        // Create new dependency info
        this.dependencies.set(depKey, {
          key: depKey,
          dependsOn: [],
          dependents: [key],
          createdAt: Date.now()
        });
      }
    }
  }

  /**
   * Get dependency info for a key
   *
   * @param key - Cache key
   * @returns Dependency information
   */
  getDependencyInfo(key: string): CacheDependency | undefined {
    return this.dependencies.get(key);
  }

  /**
   * Get all dependencies (for debugging)
   */
  getAllDependencies(): Map<string, CacheDependency> {
    return new Map(this.dependencies);
  }

  /**
   * Check and apply invalidation patterns
   */
  private checkInvalidationPatterns(key: string): void {
    for (const pattern of this.patterns) {
      const regex = this.patternToRegex(pattern.pattern);
      if (regex.test(key)) {
        // Invalidate all keys in the pattern
        for (const invalidateKey of pattern.invalidates) {
          this.invalidatePattern(invalidateKey);
        }
      }
    }
  }

  /**
   * Convert pattern to regex
   */
  private patternToRegex(pattern: string): RegExp {
    // Escape special regex characters except *
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }

  /**
   * Initialize cache warming
   */
  private async initializeWarming(): Promise<void> {
    if (this.warmingConfig.strategy === 'eager') {
      // Warm cache immediately
      await this.warmCache();
    } else if (this.warmingConfig.strategy === 'scheduled' && this.warmingConfig.interval) {
      // Schedule periodic warming
      this.warmingInterval = setInterval(
        () => this.warmCache(),
        this.warmingConfig.interval
      );
    }
    // 'lazy' strategy warms on first access (handled by get operations)
  }

  /**
   * Warm cache with configured operations
   */
  private async warmCache(): Promise<void> {
    if (!this.warmingConfig.warmup) return;

    const warmupPromises = this.warmingConfig.warmup.map(async (config) => {
      try {
        const value = await config.fetcher();
        this.set(config.key, value, { ttl: config.ttl });
      } catch (error) {
        console.error(`Failed to warm cache for key ${config.key}:`, error);
      }
    });

    await Promise.allSettled(warmupPromises);
  }

  /**
   * Manually trigger cache warming
   */
  async warm(): Promise<void> {
    await this.warmCache();
  }

  /**
   * Stop cache warming interval
   */
  override destroy(): void {
    if (this.warmingInterval) {
      clearInterval(this.warmingInterval);
    }
    super.destroy();
  }
}

/**
 * Predefined invalidation patterns for common scenarios
 */
export const CommonPatterns = {
  /**
   * When environment changes, invalidate status and config
   */
  environment: {
    pattern: 'env:set:*',
    invalidates: ['env:list', 'env:get:*', 'deployment:status']
  },

  /**
   * When data is mutated, invalidate related queries
   */
  dataMutation: (table: string) => ({
    pattern: `data:${table}:mutation`,
    invalidates: [`data:${table}:*`, `${table}:count`]
  }),

  /**
   * When function is deployed, invalidate function list
   */
  functionDeployment: {
    pattern: 'functions:deploy',
    invalidates: ['functions:list']
  },

  /**
   * When schema changes, invalidate everything
   */
  schemaChange: {
    pattern: 'schema:*',
    invalidates: ['*']
  }
};

/**
 * Create advanced cache with common patterns
 */
export function createAdvancedCache(
  config?: Partial<AdvancedCacheConfig>
): AdvancedCache {
  return new AdvancedCache({
    ...config,
    dependencies: {
      enabled: true,
      patterns: [
        CommonPatterns.environment,
        CommonPatterns.functionDeployment,
        ...(config?.dependencies?.patterns || [])
      ]
    }
  });
}

/**
 * Cache invalidation utilities
 */
export class CacheInvalidator {
  constructor(private cache: AdvancedCache) {}

  /**
   * Invalidate all caches related to a table
   */
  invalidateTable(table: string): void {
    this.cache.invalidatePattern(`data:${table}:*`);
    this.cache.invalidatePattern(`${table}:*`);
  }

  /**
   * Invalidate all data caches
   */
  invalidateAllData(): void {
    this.cache.invalidatePattern('data:*');
  }

  /**
   * Invalidate environment caches
   */
  invalidateEnvironment(): void {
    this.cache.invalidatePattern('env:*');
    this.cache.delete('deployment:status');
  }

  /**
   * Invalidate function caches
   */
  invalidateFunctions(): void {
    this.cache.invalidatePattern('functions:*');
  }

  /**
   * Invalidate everything
   */
  invalidateAll(): void {
    this.cache.clear();
  }
}

/**
 * Cache statistics with dependency info
 */
export interface AdvancedCacheStats {
  /** Base cache statistics */
  cache: ReturnType<Cache['getStats']>;
  /** Number of tracked dependencies */
  dependencyCount: number;
  /** Average dependencies per key */
  avgDependenciesPerKey: number;
  /** Total dependents across all keys */
  totalDependents: number;
}

/**
 * Get advanced cache statistics
 */
export function getAdvancedStats(cache: AdvancedCache): AdvancedCacheStats {
  const dependencies = cache.getAllDependencies();
  const totalDependsOn = Array.from(dependencies.values())
    .reduce((sum, dep) => sum + dep.dependsOn.length, 0);
  const totalDependents = Array.from(dependencies.values())
    .reduce((sum, dep) => sum + dep.dependents.length, 0);

  return {
    cache: cache.getStats(),
    dependencyCount: dependencies.size,
    avgDependenciesPerKey: dependencies.size > 0 ? totalDependsOn / dependencies.size : 0,
    totalDependents
  };
}
