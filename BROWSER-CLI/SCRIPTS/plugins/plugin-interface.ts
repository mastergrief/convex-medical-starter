/**
 * Plugin System Interface - Browser-CLI P3.1
 *
 * Defines the contract for browser-cli plugins that extend functionality
 * with custom commands.
 */

import { Page, BrowserContext } from 'playwright';
import { CommandResponse } from '../core/types';

/**
 * Context provided to plugin command handlers.
 * Gives plugins access to browser state and utilities.
 */
export interface PluginContext {
  /** The current Playwright page instance */
  page: Page;
  /** The current browser context */
  context: BrowserContext;
  /** Logging function with plugin prefix */
  log: (message: string) => void;
}

/**
 * Defines a single command provided by a plugin.
 */
export interface PluginCommand {
  /** Command name (used as CLI command) */
  name: string;
  /** Human-readable description shown in help */
  description: string;
  /** Optional usage syntax (e.g., "<name> [--flag]") */
  usage?: string;
  /** Command handler function */
  handler: (ctx: PluginContext, args: string[]) => Promise<CommandResponse>;
}

/**
 * Event hooks for plugin lifecycle integration.
 * All hooks are optional and called asynchronously.
 */
export interface PluginEventHooks {
  /**
   * Called before any command executes.
   * Return { skip: true } to prevent command execution.
   */
  beforeCommand?: (cmd: string, args: unknown) => Promise<void | { skip: boolean; reason?: string }>;

  /**
   * Called after any command completes successfully.
   */
  afterCommand?: (cmd: string, args: unknown, result: CommandResponse) => Promise<void>;

  /**
   * Called when any command fails with an error.
   */
  onError?: (cmd: string, error: Error) => Promise<void>;

  /**
   * Called after navigation completes.
   */
  onNavigate?: (url: string) => Promise<void>;

  /**
   * Called after snapshot capture completes.
   */
  onSnapshot?: (snapshot: string) => Promise<void>;
}

/**
 * Main plugin interface - all plugins must conform to this shape.
 */
export interface BrowserCLIPlugin {
  /** Unique plugin name (used for identification and unloading) */
  name: string;
  /** Semantic version (e.g., "1.0.0") */
  version: string;
  /** Optional description shown in listPlugins */
  description?: string;
  /** Array of commands this plugin provides */
  commands: PluginCommand[];

  /**
   * Optional lifecycle hook - called when plugin is loaded.
   * Use for initialization, registering listeners, etc.
   */
  onLoad?: (ctx: PluginContext) => Promise<void>;

  /**
   * Optional lifecycle hook - called when plugin is unloaded.
   * Use for cleanup, removing listeners, etc.
   */
  onUnload?: (ctx: PluginContext) => Promise<void>;

  /** Event hooks for command lifecycle integration */
  hooks?: PluginEventHooks;
}

/**
 * Metadata for a loaded plugin (internal use).
 */
export interface LoadedPlugin {
  /** The plugin instance */
  plugin: BrowserCLIPlugin;
  /** Absolute path from which plugin was loaded */
  path: string;
  /** Timestamp when plugin was loaded */
  loadedAt: Date;
}

/**
 * Result of loading a plugin.
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: LoadedPlugin;
  error?: string;
}

/**
 * Result of unloading a plugin.
 */
export interface PluginUnloadResult {
  success: boolean;
  error?: string;
}

/**
 * Plugin command registration entry.
 */
export interface PluginCommandEntry {
  /** Name of the plugin providing this command */
  pluginName: string;
  /** The command handler function */
  handler: (ctx: PluginContext, args: string[]) => Promise<CommandResponse>;
  /** The command definition */
  command: PluginCommand;
}
