/**
 * Retry Utility with Exponential Backoff
 */

export interface RetryOptions {
  maxAttempts?: number;        // Default: 3
  initialDelay?: number;       // Default: 500ms
  maxDelay?: number;           // Default: 5000ms
  backoffMultiplier?: number;  // Default: 2
  retryableErrors?: string[];  // Error messages to retry
  onRetry?: (attempt: number, error: Error) => void;
}

export class RetryableError extends Error {
  constructor(message: string, public readonly originalError: Error) {
    super(message);
    this.name = 'RetryableError';
  }
}

/**
 * Execute function with exponential backoff retry
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 500,
    maxDelay = 5000,
    backoffMultiplier = 2,
    retryableErrors = [
      'timeout',
      'not visible',
      'not enabled',
      'target closed',
      'navigation timeout',
      'waiting for selector',
      'element is not attached',
      'element is not visible',
      'detached from frame'
    ],
    onRetry
  } = options;

  let lastError: Error;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message.toLowerCase();

      // Check if error is retryable
      const isRetryable = retryableErrors.some(pattern =>
        errorMessage.includes(pattern.toLowerCase())
      );

      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxAttempts || !isRetryable) {
        throw lastError;
      }

      // Execute retry callback
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError!;
}

/**
 * Determine if error is retryable based on error type
 */
export function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    'timeout',
    'not visible',
    'not enabled',
    'target closed',
    'navigation',
    'waiting for',
    'element is not attached',
    'detached from frame'
  ];

  const message = error.message.toLowerCase();
  return retryablePatterns.some(pattern => message.includes(pattern));
}


/**
 * Metrics collected during retry operations
 */
export interface RetryMetrics {
  commandName: string;
  attempts: number;
  errors: Array<{ message: string; timestamp: number }>;
  totalDuration: number;
  finalOutcome: 'success' | 'failure';
}

/**
 * Adaptive delay configuration based on error type
 */
export interface AdaptiveDelayConfig {
  pattern: string;
  delayMultiplier: number;
  maxAttempts: number;
  recoverySuggestion: string;
}

/**
 * Adaptive retry patterns with error-specific configurations
 */
const RETRY_PATTERNS: AdaptiveDelayConfig[] = [
  { pattern: 'timeout', delayMultiplier: 2.5, maxAttempts: 3,
    recoverySuggestion: 'Consider increasing wait time or check element exists' },
  { pattern: 'not visible', delayMultiplier: 2.0, maxAttempts: 4,
    recoverySuggestion: 'Element may be behind overlay or scrolled out of view' },
  { pattern: 'not enabled', delayMultiplier: 1.5, maxAttempts: 3,
    recoverySuggestion: 'Element is disabled; wait for form validation to complete' },
  { pattern: 'target closed', delayMultiplier: 1.5, maxAttempts: 2,
    recoverySuggestion: 'Browser/page was closed unexpectedly' },
  { pattern: 'detached from frame', delayMultiplier: 2.0, maxAttempts: 2,
    recoverySuggestion: 'Element was removed from DOM; take fresh snapshot' },
];

/**
 * Get adaptive configuration for an error message
 */
function getAdaptiveConfig(errorMessage: string): AdaptiveDelayConfig | null {
  const lowerError = errorMessage.toLowerCase();
  return RETRY_PATTERNS.find(p => lowerError.includes(p.pattern)) || null;
}

/**
 * Execute function with retry and collect metrics
 * Enhanced version of withRetry that provides detailed execution metrics
 */
export async function withRetryMetrics<T>(
  fn: () => Promise<T>,
  commandName: string,
  options?: RetryOptions
): Promise<{ result: T; metrics: RetryMetrics }> {
  const startTime = Date.now();
  const metrics: RetryMetrics = {
    commandName,
    attempts: 0,
    errors: [],
    totalDuration: 0,
    finalOutcome: 'failure',
  };

  const {
    initialDelay = 500,
    maxDelay = 5000,
    retryableErrors = [
      'timeout',
      'not visible',
      'not enabled',
      'target closed',
      'navigation timeout',
      'waiting for selector',
      'element is not attached',
      'element is not visible',
      'detached from frame'
    ],
    onRetry
  } = options || {};

  // Use adaptive delays based on first error encountered
  let adaptiveConfig: AdaptiveDelayConfig | null = null;
  let delay = initialDelay;
  let lastError: Error | undefined;

  // Determine max attempts (may be adjusted by adaptive config)
  let maxAttempts = options?.maxAttempts ?? 3;

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
        timestamp: Date.now() - startTime
      });

      // Get adaptive config on first error
      if (!adaptiveConfig) {
        adaptiveConfig = getAdaptiveConfig(errorMessage);
        if (adaptiveConfig) {
          // Adjust max attempts based on error type
          maxAttempts = Math.min(adaptiveConfig.maxAttempts, options?.maxAttempts ?? adaptiveConfig.maxAttempts);
        }
      }

      // Check if error is retryable
      const isRetryable = retryableErrors.some(pattern =>
        lowerMessage.includes(pattern.toLowerCase())
      );

      // Don't retry on last attempt or non-retryable errors
      if (attempt === maxAttempts || !isRetryable) {
        metrics.totalDuration = Date.now() - startTime;
        // Include recovery suggestion in error message
        const suggestion = adaptiveConfig?.recoverySuggestion || '';
        const enhancedMessage = suggestion
          ? `${lastError.message}. Recovery suggestion: ${suggestion}`
          : lastError.message;
        throw new Error(enhancedMessage);
      }

      // Execute retry callback
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retry with adaptive or exponential backoff
      const multiplier = adaptiveConfig?.delayMultiplier ?? (options?.backoffMultiplier ?? 2);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * multiplier, maxDelay);
    }
  }

  // Should never reach here, but satisfy TypeScript
  metrics.totalDuration = Date.now() - startTime;
  throw lastError!;
}
