/**
 * Standardized CLI Response Schema
 *
 * Provides consistent JSON output format across all Convex CLI scripts
 */

export interface CLIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    executionTime: number;
    timestamp: string;
    command: string;
  };
}

/**
 * Create a successful response
 */
export function successResponse<T>(
  data: T,
  command: string,
  startTime: number
): CLIResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      command,
    },
  };
}

/**
 * Create an error response
 */
export function errorResponse(
  error: Error | string,
  command: string,
  startTime: number,
  code: string = 'EXECUTION_ERROR'
): CLIResponse<never> {
  const message = error instanceof Error ? error.message : error;
  const details = error instanceof Error ? error : undefined;

  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      executionTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      command,
    },
  };
}

/**
 * Output response to console (JSON or pretty)
 */
export function outputResponse<T>(
  response: CLIResponse<T>,
  jsonMode: boolean
): void {
  if (jsonMode) {
    console.log(JSON.stringify(response, null, 2));
  }
}
