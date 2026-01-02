/**
 * Session caching utility for orchestration operations.
 * Provides TTL-based caching with pattern-based invalidation.
 */

/** Internal cache entry structure */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/** Default TTL in milliseconds (30 seconds) */
const DEFAULT_TTL = 30000;

/**
 * Session cache with TTL-based expiration and pattern invalidation.
 */
export class SessionCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  /**
   * Get cached data by key. Returns null if expired or missing.
   * Auto-deletes expired entries on access.
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set cached data with optional TTL (default: 30000ms).
   */
  set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Check if a valid (non-expired) entry exists for key.
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Invalidate cache entries. If pattern provided, clears matching keys.
   * Without pattern, clears all entries.
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache.
   */
  clear(): void {
    this.cache.clear();
  }
}

/** Singleton session cache instance */
export const sessionCache = new SessionCache();
