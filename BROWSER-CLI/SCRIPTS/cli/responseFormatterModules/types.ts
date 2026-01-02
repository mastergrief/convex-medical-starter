/**
 * Type definitions for response formatter modules
 */

/**
 * Standard command response structure
 */
export interface CommandResponse {
  status: 'ok' | 'error';
  data?: any;
  message?: string;
}

/**
 * Send command function type for snapshot comparison
 */
export type SendCommandFn = (cmd: string, args: Record<string, any>) => Promise<any>;
