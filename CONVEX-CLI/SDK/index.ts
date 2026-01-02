/**
 * Convex SDK - Unified SDK with Builder Pattern, Caching & Telemetry
 *
 * Phases 4-5 of Convex CLI MCP Parity Roadmap
 *
 * Features:
 * - Builder pattern for fluent query API
 * - LRU cache with TTL for performance
 * - Comprehensive telemetry & metrics
 * - Event emitters for streaming logs
 * - Type-safe operations with runtime validation
 * - Batch operations (parallel/sequential/race/any)
 * - Async streaming with iterators & pagination
 * - Advanced caching with dependency tracking
 * - Monitoring export (Prometheus, JSON)
 *
 * @example
 * ```typescript
 * import { ConvexSDK } from './CONVEX-CLI/SDK';
 *
 * // Initialize with configuration
 * const sdk = new ConvexSDK({
 *   cache: { enabled: true, ttl: 60, maxSize: 100 },
 *   telemetry: { enabled: true }
 * });
 *
 * // Builder pattern for queries
 * const users = await sdk.data('users')
 *   .limit(10)
 *   .order('desc')
 *   .execute();
 *
 * // First document
 * const firstUser = await sdk.data('users').first();
 *
 * // Check existence
 * const hasUsers = await sdk.data('users').exists();
 *
 * // Streaming logs
 * const logs = sdk.logsStream({ follow: true });
 * logs.on('log', log => console.log(log.message));
 * logs.on('error', err => console.error(err));
 * logs.on('end', () => console.log('Stream ended'));
 *
 * // Get metrics
 * const metrics = sdk.getMetrics();
 * console.log('Cache hit rate:', metrics.cache.hitRate);
 * console.log('Avg latency:', metrics.latency.avg);
 *
 * // Cache management
 * const cacheStats = sdk.getCacheStats();
 * console.log('Cache hits:', cacheStats.hits);
 * sdk.clearCache(); // Clear cache
 *
 * // Cleanup on exit
 * sdk.destroy();
 * ```
 *
 * @example Advanced Usage
 * ```typescript
 * // Bypass cache for fresh data
 * const freshUsers = await sdk.data('users')
 *   .limit(10)
 *   .noCache()
 *   .execute();
 *
 * // Count without loading data
 * const userCount = await sdk.data('users').count();
 *
 * // Run functions
 * const result = await sdk.runFunction('exercises:getCategories', {});
 *
 * // Environment variables
 * const envVars = await sdk.env.list();
 * await sdk.env.set('NEW_VAR', 'value');
 *
 * // Get deployment status
 * const status = await sdk.status();
 * console.log('Deployment URL:', status.data.deployments[0].url);
 *
 * // Export metrics
 * const metricsJson = sdk.exportMetrics();
 * console.log(metricsJson);
 * ```
 */

// Main SDK class
export { ConvexSDK, type ConvexSDKConfig } from './client.js';

// Builder classes
export { DataQueryBuilder, type DataQueryOptions } from './builders/data.js';

// Cache utilities
export { Cache, type CacheConfig, type CacheEntry, type CacheStats } from './cache.js';

// Telemetry utilities
export {
  Telemetry,
  type TelemetryConfig,
  type MetricType,
  type LatencyMetric,
  type ErrorMetric,
  type MetricsSummary
} from './telemetry.js';

// Re-export all types from LIB
export * from '../LIB/types.js';

// Re-export schemas for custom validation
export * from '../LIB/schemas.js';

// ==================================================================
// Phase 5 Exports - Advanced Features
// ==================================================================

// Batch operations
export {
  BatchExecutor,
  parallel,
  sequential,
  race,
  any,
  type BatchConfig,
  type BatchResult,
  type BatchSummary
} from './batch.js';

// Streaming utilities
export {
  Paginator,
  DocumentStream,
  ChunkedStream,
  paginate,
  stream,
  streamChunks,
  collectStream,
  type PaginationConfig,
  type PageInfo,
  type StreamConfig
} from './streaming.js';

// Advanced caching
export {
  AdvancedCache,
  CacheInvalidator,
  CommonPatterns,
  createAdvancedCache,
  getAdvancedStats,
  type DependencyConfig,
  type DependencyPattern,
  type WarmingConfig,
  type AdvancedCacheConfig,
  type AdvancedCacheStats
} from './cache-advanced.js';

// Monitoring & export
export {
  MonitoringExporter,
  MetricsServer,
  createMetricsHandler,
  ExampleCollectors,
  type MonitoringConfig,
  type MetricType,
  type Metric,
  type MetricCollector
} from './monitoring.js';
