/**
 * Logger Utility Module
 * Centralized logging with levels and customizable prefixes
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Output format for log messages
 */
export type LogFormat = 'text' | 'json' | 'silent';

/**
 * Structured log entry for JSON output
 */
export interface LogEntry {
  ts: string;
  level: LogLevel;
  prefix: string;
  message: string;
  data?: unknown;
}

export class Logger {
  private prefix: string;
  private level: LogLevel;
  private format: LogFormat;

  constructor(prefix: string = '', level: LogLevel = 'info', format: LogFormat = 'text') {
    this.prefix = prefix;
    this.level = level;
    this.format = format;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Set the output format (text, json, or silent)
   */
  setFormat(format: LogFormat): void {
    this.format = format;
  }

  /**
   * Get current format
   */
  getFormat(): LogFormat {
    return this.format;
  }

  /**
   * Check if a log level should be displayed
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.level);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Format message with prefix (for text format)
   */
  private formatMessage(message: string): string {
    if (this.prefix) {
      return `[${this.prefix}] ${message}`;
    }
    return message;
  }

  /**
   * Create structured log entry (for JSON format)
   */
  private createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
    return {
      ts: new Date().toISOString(),
      level,
      prefix: this.prefix,
      message,
      ...(data !== undefined && { data }),
    };
  }

  /**
   * Output a log message according to format
   */
  private output(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog(level)) return;
    if (this.format === 'silent') return;

    if (this.format === 'json') {
      const entry = this.createLogEntry(level, message, data);
      const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      consoleMethod(JSON.stringify(entry));
    } else {
      // text format
      const formattedMsg = this.formatMessage(message);
      if (level === 'error') {
        console.error(formattedMsg);
      } else if (level === 'warn') {
        console.warn(formattedMsg);
      } else {
        console.log(formattedMsg);
      }
    }
  }

  /**
   * Log debug message
   */
  debug(message: string, data?: unknown): void {
    this.output('debug', message, data);
  }

  /**
   * Log info message (default level)
   */
  info(message: string, data?: unknown): void {
    this.output('info', message, data);
  }

  /**
   * Log warning message
   */
  warn(message: string, data?: unknown): void {
    this.output('warn', message, data);
  }

  /**
   * Log error message
   */
  error(message: string, data?: unknown): void {
    this.output('error', message, data);
  }

  /**
   * Simple log (alias for info, for backward compatibility)
   */
  log(message: string, data?: unknown): void {
    this.info(message, data);
  }
}

/**
 * Create a logger with a specific prefix
 */
export function createLogger(prefix: string, level: LogLevel = 'info', format: LogFormat = 'text'): Logger {
  return new Logger(prefix, level, format);
}
