/**
 * Execution Tracing Utility
 *
 * Provides timing instrumentation for Browser-CLI commands.
 * Usage: Enable with --trace flag to see execution timeline.
 */

export interface TraceEvent {
  timestamp: number; // Unix timestamp
  elapsed: number; // ms since trace start
  phase: 'start' | 'mark' | 'end';
  name: string;
  data?: unknown;
}

export interface TraceResult {
  events: TraceEvent[];
  totalDuration: number;
}

export class Tracer {
  private startTime: number = 0;
  private events: TraceEvent[] = [];

  /**
   * Start a new trace session
   */
  start(name: string): void {
    this.startTime = Date.now();
    this.events = [];
    this.events.push({
      timestamp: this.startTime,
      elapsed: 0,
      phase: 'start',
      name,
    });
  }

  /**
   * Add a timing mark within the trace
   */
  mark(name: string, data?: unknown): void {
    const now = Date.now();
    this.events.push({
      timestamp: now,
      elapsed: now - this.startTime,
      phase: 'mark',
      name,
      data,
    });
  }

  /**
   * End the trace session and return all events
   */
  end(name: string): TraceEvent[] {
    const now = Date.now();
    this.events.push({
      timestamp: now,
      elapsed: now - this.startTime,
      phase: 'end',
      name,
    });
    return this.events;
  }

  /**
   * Format trace output as human-readable text
   */
  formatText(): string {
    if (this.events.length === 0) return '';

    const lines = this.events.map((e) => {
      const dataStr = e.data ? ': ' + JSON.stringify(e.data) : '';
      return `[TRACE ${e.elapsed}ms] ${e.name}${dataStr}`;
    });

    const totalDuration = this.events[this.events.length - 1]?.elapsed || 0;
    lines.push(`[TRACE ${totalDuration}ms] Total duration: ${totalDuration}ms`);

    return lines.join('\n');
  }

  /**
   * Format trace output as JSON
   */
  formatJSON(): string {
    const totalDuration = this.events[this.events.length - 1]?.elapsed || 0;
    return JSON.stringify({ events: this.events, totalDuration });
  }

  /**
   * Get a copy of all trace events
   */
  getEvents(): TraceEvent[] {
    return [...this.events];
  }

  /**
   * Get the total duration of the trace
   */
  getTotalDuration(): number {
    return this.events[this.events.length - 1]?.elapsed || 0;
  }

  /**
   * Clear all trace data
   */
  clear(): void {
    this.startTime = 0;
    this.events = [];
  }
}

// Singleton for global tracing
let globalTracer: Tracer | null = null;

/**
 * Get the global tracer instance (creates if needed)
 */
export function getTracer(): Tracer {
  if (!globalTracer) globalTracer = new Tracer();
  return globalTracer;
}

/**
 * Reset the global tracer (for testing or new sessions)
 */
export function resetTracer(): void {
  globalTracer = null;
}
