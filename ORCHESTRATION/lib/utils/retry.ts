/**
 * Retry Utility with Exponential Backoff for Orchestration
 * Handles transient errors in agent spawning, task execution, and IPC
 */

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/**
 * Metrics collected during retry operations
 */
export interface RetryMetrics {
  taskId?: string;
  attempts: number;
  errors: Array<{ message: string; timestamp: number }>;
  totalDuration: number;
  finalOutcome: 'success' | 'failure';
}

/**
 * Default retry delays: 500ms -> 1000ms -> 2000ms
 */
export const RETRY_DELAYS = [500, 1000, 2000] as const;

/**
 * Orchestration-specific transient error patterns
 */
const ORCHESTRATION_TRANSIENT_ERRORS = [
  'timeout',
  'ECONNREFUSED',
  'spawn failed',
  'agent crashed',
  'connection reset',
  'ETIMEDOUT',
  'process exited',
  'ENOTFOUND',
  'EPIPE',
] as const;

/**
 * Default retry configuration for orchestration
 */
const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 500,
  maxDelay: 5000,
  backoffMultiplier: 2,
  retryableErrors: [...ORCHESTRATION_TRANSIENT_ERRORS],
};

/**
 * Determine if an error is transient and should be retried
 */
export function isTransientError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return ORCHESTRATION_TRANSIENT_ERRORS.some((pattern) =>
    message.includes(pattern.toLowerCase())
  );
}

/**
 * Execute function with exponential backoff retry
 * Delay pattern: 500ms -> 1000ms -> 2000ms (max 3 attempts)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const {
    maxAttempts,
    initialDelay,
    maxDelay,
    backoffMultiplier,
    retryableErrors,
    onRetry,
  } = { ...DEFAULT_CONFIG, ...config };

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message.toLowerCase();

      // Check if error is retryable
      const isRetryable = retryableErrors.some((pattern) =>
        errorMessage.includes(pattern.toLowerCase())
      );

      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxAttempts || !isRetryable) {
        throw lastError;
      }

      // Execute retry callback with delay info
      if (onRetry) {
        onRetry(attempt, lastError, delay);
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Execute function with retry and collect detailed metrics
 * Enhanced version that returns both result and execution metrics
 */
export async function withRetryMetrics<T>(
  fn: () => Promise<T>,
  taskId?: string,
  config?: Partial<RetryConfig>
): Promise<{ result: T; metrics: RetryMetrics }> {
  const startTime = Date.now();
  const metrics: RetryMetrics = {
    taskId,
    attempts: 0,
    errors: [],
    totalDuration: 0,
    finalOutcome: 'failure',
  };

  const {
    maxAttempts,
    initialDelay,
    maxDelay,
    backoffMultiplier,
    retryableErrors,
    onRetry,
  } = { ...DEFAULT_CONFIG, ...config };

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    metrics.attempts = attempt;
    try {
      const result = await fn();
      metrics.finalOutcome = 'success';
      metrics.totalDuration = Date.now() - startTime;
      return { result, metrics };
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message;
      const lowerMessage = errorMessage.toLowerCase();

      // Record error with timestamp
      metrics.errors.push({
        message: errorMessage,
        timestamp: Date.now() - startTime,
      });

      // Check if error is retryable
      const isRetryable = retryableErrors.some((pattern) =>
        lowerMessage.includes(pattern.toLowerCase())
      );

      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxAttempts || !isRetryable) {
        metrics.totalDuration = Date.now() - startTime;
        throw lastError;
      }

      // Execute retry callback with delay info
      if (onRetry) {
        onRetry(attempt, lastError, delay);
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  // Satisfy TypeScript - should never reach here
  metrics.totalDuration = Date.now() - startTime;
  throw lastError!;
}
