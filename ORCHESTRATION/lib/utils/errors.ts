/**
 * Error categorization utilities for orchestration error handling.
 */

import { ZodError } from "zod";

/**
 * Categories for classifying errors by type and recoverability.
 */
export enum ErrorCategory {
  VALIDATION = "VALIDATION",
  TIMEOUT = "TIMEOUT",
  NOT_FOUND = "NOT_FOUND",
  PERMISSION = "PERMISSION",
  SUBPROCESS = "SUBPROCESS",
  IO = "IO",
  UNKNOWN = "UNKNOWN",
}

/**
 * A categorized error with recovery hints.
 */
export interface CategorizedError {
  category: ErrorCategory;
  message: string;
  recoverable: boolean;
  details?: unknown;
}

/**
 * Categorizes an unknown error into a structured CategorizedError.
 * Detection priority:
 * 1. ZodError -> VALIDATION (not recoverable)
 * 2. ENOENT -> NOT_FOUND (not recoverable)
 * 3. timeout/ETIMEDOUT -> TIMEOUT (recoverable)
 * 4. EACCES/EPERM -> PERMISSION (not recoverable)
 * 5. spawn/subprocess errors -> SUBPROCESS (recoverable)
 * 6. Default -> UNKNOWN (not recoverable)
 */
export function categorizeError(error: unknown): CategorizedError {
  // Handle ZodError (validation)
  if (error instanceof ZodError) {
    return {
      category: ErrorCategory.VALIDATION,
      message: error.issues.map((issue) => issue.message).join("; "),
      recoverable: false,
      details: error.issues,
    };
  }

  // Extract error message for pattern matching
  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : String(error);

  const errorCode =
    error instanceof Error && "code" in error
      ? (error as Error & { code?: string }).code
      : undefined;

  // Check for NOT_FOUND (ENOENT)
  if (errorCode === "ENOENT" || errorMessage.includes("ENOENT")) {
    return {
      category: ErrorCategory.NOT_FOUND,
      message: errorMessage,
      recoverable: false,
      details: error,
    };
  }

  // Check for TIMEOUT
  if (
    errorCode === "ETIMEDOUT" ||
    errorMessage.toLowerCase().includes("timeout") ||
    errorMessage.includes("ETIMEDOUT")
  ) {
    return {
      category: ErrorCategory.TIMEOUT,
      message: errorMessage,
      recoverable: true,
      details: error,
    };
  }

  // Check for PERMISSION (EACCES, EPERM)
  if (
    errorCode === "EACCES" ||
    errorCode === "EPERM" ||
    errorMessage.includes("EACCES") ||
    errorMessage.includes("EPERM")
  ) {
    return {
      category: ErrorCategory.PERMISSION,
      message: errorMessage,
      recoverable: false,
      details: error,
    };
  }

  // Check for SUBPROCESS errors
  if (
    errorMessage.toLowerCase().includes("spawn") ||
    errorMessage.includes("process exited") ||
    errorMessage.includes("EPIPE") ||
    errorCode === "EPIPE"
  ) {
    return {
      category: ErrorCategory.SUBPROCESS,
      message: errorMessage,
      recoverable: true,
      details: error,
    };
  }

  // Default to UNKNOWN
  return {
    category: ErrorCategory.UNKNOWN,
    message: errorMessage,
    recoverable: false,
    details: error,
  };
}
