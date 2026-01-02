/**
 * LRU Cache with TTL support for Convex SDK
 *
 * Features:
 * - Least Recently Used (LRU) eviction policy
 * - Time-To-Live (TTL) expiration
 * - Configurable max size
 * - Automatic cleanup of expired entries
 */

export interface CacheConfig {
  /**
   * Time-to-live in seconds (default: 60)
   */
  ttl?: number;

  /**
   * Maximum number of entries (default: 100)
   */
  maxSize?: number;

  /**
   * Enable automatic cleanup interval in ms (default: 60000 = 1 minute)
   */
  cleanupInterval?: number;
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  evictions: number;
  expirations: number;
}

export class Cache {
  private store: Map<string, CacheEntry<any>>;
  private config: Required<CacheConfig>;
  private stats: CacheStats;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: CacheConfig = {}) {
    this.store = new Map();
    this.config = {
      ttl: config.ttl ?? 60,
      maxSize: config.maxSize ?? 100,
      cleanupInterval: config.cleanupInterval ?? 60000
    };
    this.stats = {
      size: 0,
      maxSize: this.config.maxSize,
      hits: 0,
      misses: 0,
      evictions: 0,
      expirations: 0
    };

    // Start automatic cleanup
    if (this.config.cleanupInterval > 0) {
      this.startCleanup();
    }
  }

  /**
   * Get value from cache
   * Returns undefined if not found or expired
   */
  get<T = any>(key: string): T | undefined {
    const entry = this.store.get(key);

    // Cache miss
    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.size--;
      this.stats.expirations++;
      this.stats.misses++;
      return undefined;
    }

    // Cache hit - update access metadata
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;

    return entry.value as T;
  }

  /**
   * Set value in cache with optional custom TTL
   */
  set<T = any>(key: string, value: T, options?: { ttl?: number }): void {
    const ttl = options?.ttl ?? this.config.ttl;
    const expiresAt = Date.now() + (ttl * 1000);

    // Evict if at max size and key doesn't exist
    if (this.store.size >= this.config.maxSize && !this.store.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    const isUpdate = this.store.has(key);
    this.store.set(key, entry);

    if (!isUpdate) {
      this.stats.size++;
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.size--;
      this.stats.expirations++;
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    const existed = this.store.delete(key);
    if (existed) {
      this.stats.size--;
    }
    return existed;
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.store.clear();
    this.stats.size = 0;
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
    this.stats.expirations = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get cache hit rate (0-1)
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    return total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get all keys (excluding expired)
   */
  keys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (now <= entry.expiresAt) {
        validKeys.push(key);
      }
    }

    return validKeys;
  }

  /**
   * Stop automatic cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.clear();
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.store.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
      this.stats.size--;
      this.stats.evictions++;
    }
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.config.cleanupInterval);

    // Don't keep process alive for cleanup
    this.cleanupTimer.unref();
  }

  /**
   * Remove all expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.store.delete(key);
      this.stats.size--;
      this.stats.expirations++;
    }
  }
}
