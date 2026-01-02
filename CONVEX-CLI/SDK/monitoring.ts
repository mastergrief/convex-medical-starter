/**
 * Monitoring & Export for Convex SDK
 *
 * Provides metrics export for external monitoring systems like Prometheus,
 * custom metric collectors, and dashboard integration.
 */

import type { Telemetry, MetricsSummary } from './telemetry.js';
import type { Cache } from './cache.js';

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  /** Enable monitoring */
  enabled: boolean;
  /** Export format */
  format?: 'prometheus' | 'json' | 'custom';
  /** Metric prefix for namespacing */
  prefix?: string;
  /** Labels to add to all metrics */
  labels?: Record<string, string>;
  /** Custom metric collectors */
  collectors?: MetricCollector[];
}

/**
 * Metric types supported
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Individual metric definition
 */
export interface Metric {
  /** Metric name */
  name: string;
  /** Metric type */
  type: MetricType;
  /** Help text */
  help: string;
  /** Current value */
  value: number | number[];
  /** Labels for this metric */
  labels?: Record<string, string>;
  /** Timestamp (milliseconds) */
  timestamp: number;
}

/**
 * Metric collector interface
 */
export interface MetricCollector {
  /** Collector name */
  name: string;
  /** Collect metrics */
  collect(): Promise<Metric[]> | Metric[];
}

/**
 * Prometheus metric format
 */
interface PrometheusMetric {
  name: string;
  type: string;
  help: string;
  metrics: Array<{
    labels: Record<string, string>;
    value: number | number[];
    timestamp?: number;
  }>;
}

/**
 * Monitoring exporter for metrics
 */
export class MonitoringExporter {
  private config: Required<MonitoringConfig>;
  private customMetrics: Map<string, Metric> = new Map();
  private collectors: MetricCollector[] = [];

  constructor(config: MonitoringConfig = { enabled: true }) {
    this.config = {
      enabled: config.enabled,
      format: config.format ?? 'json',
      prefix: config.prefix ?? 'convex_sdk',
      labels: config.labels ?? {},
      collectors: config.collectors ?? []
    };

    this.collectors = this.config.collectors;
  }

  /**
   * Export metrics from telemetry and cache
   *
   * @param telemetry - Telemetry instance
   * @param cache - Cache instance (optional)
   * @returns Formatted metrics string
   */
  async export(
    telemetry?: Telemetry,
    cache?: Cache
  ): Promise<string> {
    const metrics: Metric[] = [];

    // Collect from telemetry
    if (telemetry) {
      metrics.push(...this.collectTelemetryMetrics(telemetry));
    }

    // Collect from cache
    if (cache) {
      metrics.push(...this.collectCacheMetrics(cache));
    }

    // Collect custom metrics
    metrics.push(...Array.from(this.customMetrics.values()));

    // Collect from custom collectors
    for (const collector of this.collectors) {
      const collected = await collector.collect();
      metrics.push(...collected);
    }

    // Format based on configured format
    switch (this.config.format) {
      case 'prometheus':
        return this.formatPrometheus(metrics);
      case 'json':
        return this.formatJSON(metrics);
      case 'custom':
        return JSON.stringify(metrics, null, 2);
      default:
        return this.formatJSON(metrics);
    }
  }

  /**
   * Collect metrics from telemetry
   */
  private collectTelemetryMetrics(telemetry: Telemetry): Metric[] {
    const summary = telemetry.getSummary();
    const metrics: Metric[] = [];
    const timestamp = Date.now();

    // Operations metrics
    metrics.push({
      name: `${this.config.prefix}_operations_total`,
      type: 'counter',
      help: 'Total number of operations',
      value: summary.operations.total,
      labels: this.config.labels,
      timestamp
    });

    // Operations by type
    for (const [type, count] of Object.entries(summary.operations.byType)) {
      metrics.push({
        name: `${this.config.prefix}_operations_by_type`,
        type: 'counter',
        help: 'Operations by type',
        value: count,
        labels: { ...this.config.labels, operation: type },
        timestamp
      });
    }

    // Latency metrics
    if (summary.latency) {
      metrics.push(
        {
          name: `${this.config.prefix}_latency_avg_ms`,
          type: 'gauge',
          help: 'Average latency in milliseconds',
          value: summary.latency.avg,
          labels: this.config.labels,
          timestamp
        },
        {
          name: `${this.config.prefix}_latency_p50_ms`,
          type: 'gauge',
          help: 'P50 latency in milliseconds',
          value: summary.latency.p50,
          labels: this.config.labels,
          timestamp
        },
        {
          name: `${this.config.prefix}_latency_p95_ms`,
          type: 'gauge',
          help: 'P95 latency in milliseconds',
          value: summary.latency.p95,
          labels: this.config.labels,
          timestamp
        },
        {
          name: `${this.config.prefix}_latency_p99_ms`,
          type: 'gauge',
          help: 'P99 latency in milliseconds',
          value: summary.latency.p99,
          labels: this.config.labels,
          timestamp
        },
        {
          name: `${this.config.prefix}_latency_max_ms`,
          type: 'gauge',
          help: 'Maximum latency in milliseconds',
          value: summary.latency.max,
          labels: this.config.labels,
          timestamp
        }
      );
    }

    // Cache metrics
    if (summary.cache) {
      metrics.push(
        {
          name: `${this.config.prefix}_cache_hits_total`,
          type: 'counter',
          help: 'Total cache hits',
          value: summary.cache.hits,
          labels: this.config.labels,
          timestamp
        },
        {
          name: `${this.config.prefix}_cache_misses_total`,
          type: 'counter',
          help: 'Total cache misses',
          value: summary.cache.misses,
          labels: this.config.labels,
          timestamp
        },
        {
          name: `${this.config.prefix}_cache_hit_rate`,
          type: 'gauge',
          help: 'Cache hit rate (0-1)',
          value: summary.cache.hitRate,
          labels: this.config.labels,
          timestamp
        }
      );
    }

    // Error metrics
    if (summary.errors) {
      metrics.push({
        name: `${this.config.prefix}_errors_total`,
        type: 'counter',
        help: 'Total errors',
        value: summary.errors.total,
        labels: this.config.labels,
        timestamp
      });

      // Errors by type
      for (const [type, count] of Object.entries(summary.errors.byType)) {
        metrics.push({
          name: `${this.config.prefix}_errors_by_type`,
          type: 'counter',
          help: 'Errors by type',
          value: count,
          labels: { ...this.config.labels, error_type: type },
          timestamp
        });
      }
    }

    return metrics;
  }

  /**
   * Collect metrics from cache
   */
  private collectCacheMetrics(cache: Cache): Metric[] {
    const stats = cache.getStats();
    const metrics: Metric[] = [];
    const timestamp = Date.now();

    metrics.push(
      {
        name: `${this.config.prefix}_cache_size`,
        type: 'gauge',
        help: 'Current cache size',
        value: stats.size,
        labels: this.config.labels,
        timestamp
      },
      {
        name: `${this.config.prefix}_cache_max_size`,
        type: 'gauge',
        help: 'Maximum cache size',
        value: stats.maxSize,
        labels: this.config.labels,
        timestamp
      },
      {
        name: `${this.config.prefix}_cache_evictions_total`,
        type: 'counter',
        help: 'Total cache evictions',
        value: stats.evictions,
        labels: this.config.labels,
        timestamp
      },
      {
        name: `${this.config.prefix}_cache_expirations_total`,
        type: 'counter',
        help: 'Total cache expirations',
        value: stats.expirations,
        labels: this.config.labels,
        timestamp
      }
    );

    return metrics;
  }

  /**
   * Format metrics as Prometheus exposition format
   */
  private formatPrometheus(metrics: Metric[]): string {
    const grouped = this.groupMetricsByName(metrics);
    const lines: string[] = [];

    for (const [name, metricGroup] of grouped.entries()) {
      const firstMetric = metricGroup[0];

      // TYPE line
      lines.push(`# TYPE ${name} ${firstMetric.type}`);

      // HELP line
      lines.push(`# HELP ${name} ${firstMetric.help}`);

      // Metric lines
      for (const metric of metricGroup) {
        const labelStr = this.formatPrometheusLabels(metric.labels || {});
        const value = Array.isArray(metric.value) ? metric.value[0] : metric.value;

        if (labelStr) {
          lines.push(`${name}{${labelStr}} ${value} ${metric.timestamp}`);
        } else {
          lines.push(`${name} ${value} ${metric.timestamp}`);
        }
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  /**
   * Format labels for Prometheus
   */
  private formatPrometheusLabels(labels: Record<string, string>): string {
    return Object.entries(labels)
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
  }

  /**
   * Group metrics by name
   */
  private groupMetricsByName(metrics: Metric[]): Map<string, Metric[]> {
    const grouped = new Map<string, Metric[]>();

    for (const metric of metrics) {
      const existing = grouped.get(metric.name);
      if (existing) {
        existing.push(metric);
      } else {
        grouped.set(metric.name, [metric]);
      }
    }

    return grouped;
  }

  /**
   * Format metrics as JSON
   */
  private formatJSON(metrics: Metric[]): string {
    return JSON.stringify({
      timestamp: Date.now(),
      prefix: this.config.prefix,
      labels: this.config.labels,
      metrics
    }, null, 2);
  }

  /**
   * Add custom metric
   */
  addMetric(metric: Metric): void {
    this.customMetrics.set(metric.name, metric);
  }

  /**
   * Remove custom metric
   */
  removeMetric(name: string): void {
    this.customMetrics.delete(name);
  }

  /**
   * Add custom collector
   */
  addCollector(collector: MetricCollector): void {
    this.collectors.push(collector);
  }

  /**
   * Get configuration
   */
  getConfig(): Required<MonitoringConfig> {
    return { ...this.config };
  }
}

/**
 * Create Prometheus exporter endpoint handler
 *
 * @example
 * ```typescript
 * import express from 'express';
 * const app = express();
 *
 * const exporter = new MonitoringExporter({ format: 'prometheus' });
 * app.get('/metrics', createMetricsHandler(exporter, telemetry, cache));
 * ```
 */
export function createMetricsHandler(
  exporter: MonitoringExporter,
  telemetry?: Telemetry,
  cache?: Cache
) {
  return async (req: any, res: any) => {
    try {
      const metrics = await exporter.export(telemetry, cache);
      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      res.send(metrics);
    } catch (error) {
      res.status(500).send('Error generating metrics');
    }
  };
}

/**
 * Simple HTTP server for metrics endpoint
 */
export class MetricsServer {
  private server?: any;
  private exporter: MonitoringExporter;
  private telemetry?: Telemetry;
  private cache?: Cache;

  constructor(
    exporter: MonitoringExporter,
    telemetry?: Telemetry,
    cache?: Cache
  ) {
    this.exporter = exporter;
    this.telemetry = telemetry;
    this.cache = cache;
  }

  /**
   * Start metrics server
   *
   * @param port - Port to listen on (default: 9090)
   * @param path - Path for metrics endpoint (default: /metrics)
   */
  async start(port: number = 9090, path: string = '/metrics'): Promise<void> {
    const http = await import('http');

    this.server = http.createServer(async (req, res) => {
      if (req.url === path) {
        try {
          const metrics = await this.exporter.export(this.telemetry, this.cache);
          res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
          res.end(metrics);
        } catch (error) {
          res.writeHead(500);
          res.end('Error generating metrics');
        }
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    return new Promise((resolve) => {
      this.server.listen(port, () => {
        console.log(`Metrics server listening on http://localhost:${port}${path}`);
        resolve();
      });
    });
  }

  /**
   * Stop metrics server
   */
  async stop(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('Metrics server stopped');
          resolve();
        });
      });
    }
  }
}

/**
 * Custom metric collector examples
 */
export const ExampleCollectors = {
  /**
   * System metrics collector (memory, CPU)
   */
  system: (): MetricCollector => ({
    name: 'system',
    collect: () => {
      const memUsage = process.memoryUsage();
      return [
        {
          name: 'convex_sdk_memory_heap_used_bytes',
          type: 'gauge',
          help: 'Heap memory used',
          value: memUsage.heapUsed,
          timestamp: Date.now()
        },
        {
          name: 'convex_sdk_memory_heap_total_bytes',
          type: 'gauge',
          help: 'Total heap memory',
          value: memUsage.heapTotal,
          timestamp: Date.now()
        },
        {
          name: 'convex_sdk_memory_external_bytes',
          type: 'gauge',
          help: 'External memory',
          value: memUsage.external,
          timestamp: Date.now()
        }
      ];
    }
  }),

  /**
   * Uptime collector
   */
  uptime: (): MetricCollector => ({
    name: 'uptime',
    collect: () => {
      return [{
        name: 'convex_sdk_uptime_seconds',
        type: 'counter',
        help: 'SDK uptime in seconds',
        value: process.uptime(),
        timestamp: Date.now()
      }];
    }
  })
};
