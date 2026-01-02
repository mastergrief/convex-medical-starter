/**
 * Telemetry and metrics tracking for Convex SDK
 *
 * Tracks:
 * - Operation latencies
 * - Cache hit/miss rates
 * - Error counts
 * - Function execution counts
 */

export interface TelemetryConfig {
  /**
   * Enable telemetry (default: true)
   */
  enabled?: boolean;

  /**
   * Metrics to track (default: all)
   */
  metrics?: MetricType[];
}

export type MetricType = 'latency' | 'cache' | 'errors' | 'operations';

export interface LatencyMetric {
  operation: string;
  duration: number;
  timestamp: number;
}

export interface ErrorMetric {
  operation: string;
  error: string;
  timestamp: number;
}

export interface MetricsSummary {
  operations: {
    total: number;
    byType: Record<string, number>;
  };
  latency: {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
}

export class Telemetry {
  private enabled: boolean;
  private trackedMetrics: Set<MetricType>;

  // Metric storage
  private operationCounts: Map<string, number>;
  private latencies: LatencyMetric[];
  private errors: ErrorMetric[];
  private cacheHits: number;
  private cacheMisses: number;

  // Configuration
  private maxLatencyHistory: number;
  private maxErrorHistory: number;

  constructor(config: TelemetryConfig = {}) {
    this.enabled = config.enabled ?? true;
    this.trackedMetrics = new Set(config.metrics ?? ['latency', 'cache', 'errors', 'operations']);

    this.operationCounts = new Map();
    this.latencies = [];
    this.errors = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;

    this.maxLatencyHistory = 1000;
    this.maxErrorHistory = 100;
  }

  /**
   * Record operation start time
   * Returns a function to call when operation completes
   */
  startOperation(operation: string): () => void {
    if (!this.enabled || !this.trackedMetrics.has('latency')) {
      return () => {};
    }

    const startTime = Date.now();

    return () => {
      this.recordLatency(operation, Date.now() - startTime);
    };
  }

  /**
   * Record operation execution
   */
  recordOperation(operation: string): void {
    if (!this.enabled || !this.trackedMetrics.has('operations')) {
      return;
    }

    const current = this.operationCounts.get(operation) || 0;
    this.operationCounts.set(operation, current + 1);
  }

  /**
   * Record latency metric
   */
  recordLatency(operation: string, duration: number): void {
    if (!this.enabled || !this.trackedMetrics.has('latency')) {
      return;
    }

    this.latencies.push({
      operation,
      duration,
      timestamp: Date.now()
    });

    // Trim history if too large
    if (this.latencies.length > this.maxLatencyHistory) {
      this.latencies = this.latencies.slice(-this.maxLatencyHistory);
    }
  }

  /**
   * Record error
   */
  recordError(operation: string, error: Error | string): void {
    if (!this.enabled || !this.trackedMetrics.has('errors')) {
      return;
    }

    this.errors.push({
      operation,
      error: typeof error === 'string' ? error : error.message,
      timestamp: Date.now()
    });

    // Trim history if too large
    if (this.errors.length > this.maxErrorHistory) {
      this.errors = this.errors.slice(-this.maxErrorHistory);
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    if (!this.enabled || !this.trackedMetrics.has('cache')) {
      return;
    }

    this.cacheHits++;
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(): void {
    if (!this.enabled || !this.trackedMetrics.has('cache')) {
      return;
    }

    this.cacheMisses++;
  }

  /**
   * Get comprehensive metrics summary
   */
  getSummary(): MetricsSummary {
    return {
      operations: this.getOperationStats(),
      latency: this.getLatencyStats(),
      cache: this.getCacheStats(),
      errors: this.getErrorStats()
    };
  }

  /**
   * Get operation statistics
   */
  getOperationStats(): { total: number; byType: Record<string, number> } {
    let total = 0;
    const byType: Record<string, number> = {};

    for (const [operation, count] of this.operationCounts.entries()) {
      total += count;
      byType[operation] = count;
    }

    return { total, byType };
  }

  /**
   * Get latency statistics
   */
  getLatencyStats(): {
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    if (this.latencies.length === 0) {
      return { avg: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const durations = this.latencies.map(m => m.duration).sort((a, b) => a - b);
    const sum = durations.reduce((acc, d) => acc + d, 0);

    return {
      avg: sum / durations.length,
      min: durations[0],
      max: durations[durations.length - 1],
      p50: this.percentile(durations, 0.5),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99)
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? this.cacheHits / total : 0;

    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate
    };
  }

  /**
   * Get error statistics
   */
  getErrorStats(): { total: number; byType: Record<string, number> } {
    const byType: Record<string, number> = {};

    for (const error of this.errors) {
      const type = error.error.split(':')[0]; // Extract error type
      byType[type] = (byType[type] || 0) + 1;
    }

    return {
      total: this.errors.length,
      byType
    };
  }

  /**
   * Get recent latencies for specific operation
   */
  getRecentLatencies(operation: string, limit: number = 10): LatencyMetric[] {
    return this.latencies
      .filter(m => m.operation === operation)
      .slice(-limit);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit: number = 10): ErrorMetric[] {
    return this.errors.slice(-limit);
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.operationCounts.clear();
    this.latencies = [];
    this.errors = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedArray: number[], p: number): number {
    if (sortedArray.length === 0) return 0;

    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  /**
   * Export metrics in JSON format
   */
  export(): string {
    return JSON.stringify(this.getSummary(), null, 2);
  }
}
