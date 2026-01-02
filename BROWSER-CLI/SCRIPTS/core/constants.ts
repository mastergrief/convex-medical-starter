/**
 * Shared constants for Browser CLI
 *
 * Supports multi-instance operation via environment variables:
 * - BROWSER_INSTANCE: Instance identifier (default: 'default')
 * - BROWSER_PORT: TCP port for daemon (default: 3456)
 */

import * as path from 'path';

/**
 * Instance identifier for multi-instance support
 * Each instance gets its own state directory and port
 */
export const INSTANCE_ID = process.env.BROWSER_INSTANCE || 'default';

/**
 * Default TCP port for browser manager daemon
 * Can be overridden via BROWSER_PORT env var
 */
export const DEFAULT_PORT = parseInt(process.env.BROWSER_PORT || '3456', 10);

/**
 * Base directory for browser CLI files
 */
export const BASE_DIR = path.join('BROWSER-CLI');

/**
 * State directory for this instance
 * Default instance uses BASE_DIR directly for backward compatibility
 * Named instances use BASE_DIR/instances/{id}/
 */
export const STATE_DIR = INSTANCE_ID === 'default'
  ? BASE_DIR
  : path.join(BASE_DIR, 'instances', INSTANCE_ID);

/**
 * Path to PID file for daemon process
 */
export const PID_FILE = path.join(STATE_DIR, 'manager.pid');

/**
 * Path to port file for daemon process
 */
export const PORT_FILE = path.join(STATE_DIR, 'manager.port');

/**
 * Path to persistent browser storage state (cookies, localStorage, etc.)
 */
export const STORAGE_STATE_FILE = path.join(STATE_DIR, 'browser-state.json');

/**
 * Path to session token file for TCP authentication
 * Token is regenerated on each manager startup
 */
export const TOKEN_FILE = path.join(STATE_DIR, 'session.token');


// Buffer capacity defaults
export const CONSOLE_BUFFER_DEFAULT = 100;
export const CONSOLE_BUFFER_MIN = 10;
export const CONSOLE_BUFFER_MAX = 1000;

export const NETWORK_BUFFER_DEFAULT = 1000;
export const NETWORK_BUFFER_MIN = 10;
export const NETWORK_BUFFER_MAX = 10000;

export const EVENT_BUFFER_DEFAULT = 100;
export const EVENT_BUFFER_MIN = 10;
export const EVENT_BUFFER_MAX = 1000;

export const MOCK_HISTORY_MAX = 1000;

export const LCP_CAPTURE_TIMEOUT = 1000;  // Increased from 100ms for slow pages
