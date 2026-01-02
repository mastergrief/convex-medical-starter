/**
 * Plugin Loader - Browser-CLI P3.1
 *
 * Manages loading, unloading, and command registration for plugins.
 */

import * as fs from 'fs';
import { watch, type FSWatcher } from 'fs';
import * as path from 'path';
import {
  BrowserCLIPlugin,
  LoadedPlugin,
  PluginContext,
  PluginCommandEntry,
  PluginLoadResult,
  PluginUnloadResult,
} from './plugin-interface';
import {
  validatePlugin,
  checkCommandConflict,
  getBuiltInCommands,
} from './plugin-validator';

/**
 * Allowed directories for plugin loading (security).
 * Plugins must be within these directories to prevent path traversal attacks.
 */
const ALLOWED_PLUGIN_DIRS = [
  path.resolve(process.cwd(), 'BROWSER-CLI/plugins'),
  path.resolve(process.cwd(), 'BROWSER-CLI'),
  process.cwd(),
];

// Allow additional dirs via env var (colon-separated)
const extraDirs = process.env.BROWSER_CLI_PLUGIN_DIRS?.split(':') || [];
ALLOWED_PLUGIN_DIRS.push(...extraDirs.filter(Boolean).map(d => path.resolve(d)));

interface PathValidationResult {
  valid: boolean;
  error?: string;
  resolvedPath?: string;
}

/**
 * Validates a plugin path for security (path traversal, allowed directories, extension).
 */
function validatePluginPath(pluginPath: string): PathValidationResult {
  // Resolve to absolute path
  const absolutePath = path.isAbsolute(pluginPath)
    ? pluginPath
    : path.resolve(process.cwd(), pluginPath);

  // Use realpath to resolve symlinks (if file exists)
  let realPath: string;
  try {
    realPath = fs.realpathSync(absolutePath);
  } catch {
    // File doesn't exist yet or can't be resolved - use absolute path
    realPath = absolutePath;
  }

  // Check for path traversal attempts
  if (pluginPath.includes('..')) {
    return {
      valid: false,
      error: `Path traversal detected: "${pluginPath}" contains ".." segments`,
    };
  }

  // Check if path is within allowed directories
  const isAllowed = ALLOWED_PLUGIN_DIRS.some(allowedDir => {
    const normalizedReal = path.normalize(realPath);
    const normalizedAllowed = path.normalize(allowedDir);
    return (
      normalizedReal.startsWith(normalizedAllowed + path.sep) ||
      normalizedReal === normalizedAllowed
    );
  });

  if (!isAllowed) {
    return {
      valid: false,
      error: `Plugin path "${pluginPath}" is outside allowed directories. Allowed: ${ALLOWED_PLUGIN_DIRS.join(', ')}`,
    };
  }

  // Require .ts or .js extension
  const ext = path.extname(realPath).toLowerCase();
  if (ext !== '.ts' && ext !== '.js') {
    return {
      valid: false,
      error: `Invalid plugin extension "${ext}". Must be .ts or .js`,
    };
  }

  return { valid: true, resolvedPath: realPath };
}

// Export for testing
export { validatePluginPath, ALLOWED_PLUGIN_DIRS, PathValidationResult };

/**
 * Manages plugin lifecycle and command registration.
 */
export class PluginLoader {
  /** Map of plugin name to loaded plugin info */
  private loadedPlugins: Map<string, LoadedPlugin> = new Map();

  /** Map of command name to plugin command entry */
  private commandRegistry: Map<string, PluginCommandEntry> = new Map();

  /** Set of all registered command names (built-in + plugin) */
  private allCommands: Set<string>;

  /** Map of plugin path to file watcher (for hot reload) */
  private watchers: Map<string, FSWatcher> = new Map();

  constructor() {
    // Initialize with built-in commands
    this.allCommands = getBuiltInCommands();
  }

  /**
   * Load a plugin from a file path.
   *
   * @param pluginPath - Path to the plugin file (absolute or relative)
   * @param ctx - Plugin context for lifecycle hooks
   * @returns Result indicating success or failure
   */
  async loadPlugin(
    pluginPath: string,
    ctx: PluginContext
  ): Promise<PluginLoadResult> {
    try {
      // Validate path before loading (security: path traversal, allowed dirs, extension)
      const pathValidation = validatePluginPath(pluginPath);
      if (!pathValidation.valid) {
        return {
          success: false,
          error: pathValidation.error!,
        };
      }

      // Use validated absolute path
      const absolutePath = pathValidation.resolvedPath!;

      // Dynamic import with cache busting for ESM
      const timestamp = Date.now();
      const moduleUrl = `file://${absolutePath}?t=${timestamp}`;

      // Use dynamic import (works for both ESM and transpiled TS)
      const pluginModule = await import(moduleUrl);

      // Handle both default export and module.exports
      const plugin: BrowserCLIPlugin =
        pluginModule.default || pluginModule;

      // Validate plugin structure
      const validation = validatePlugin(plugin);
      if (!validation.valid) {
        return {
          success: false,
          error: `Plugin validation failed: ${validation.errors.join('; ')}`,
        };
      }

      // Log warnings if any
      if (validation.warnings.length > 0) {
        ctx.log(`Plugin warnings: ${validation.warnings.join('; ')}`);
      }

      // Check if plugin with same name is already loaded
      if (this.loadedPlugins.has(plugin.name)) {
        return {
          success: false,
          error: `Plugin '${plugin.name}' is already loaded. Unload it first.`,
        };
      }

      // Check for command conflicts
      for (const cmd of plugin.commands) {
        const conflict = checkCommandConflict(cmd.name, this.allCommands);
        if (conflict) {
          return {
            success: false,
            error: conflict,
          };
        }
      }

      // Register commands
      for (const cmd of plugin.commands) {
        this.commandRegistry.set(cmd.name, {
          pluginName: plugin.name,
          handler: cmd.handler,
          command: cmd,
        });
        this.allCommands.add(cmd.name);
      }

      // Call onLoad lifecycle hook if present
      if (plugin.onLoad) {
        try {
          await plugin.onLoad(ctx);
        } catch (err) {
          // Rollback command registration
          for (const cmd of plugin.commands) {
            this.commandRegistry.delete(cmd.name);
            this.allCommands.delete(cmd.name);
          }
          return {
            success: false,
            error: `Plugin onLoad failed: ${err instanceof Error ? err.message : String(err)}`,
          };
        }
      }

      // Store loaded plugin
      const loadedPlugin: LoadedPlugin = {
        plugin,
        path: absolutePath,
        loadedAt: new Date(),
      };
      this.loadedPlugins.set(plugin.name, loadedPlugin);

      ctx.log(
        `Loaded plugin '${plugin.name}' v${plugin.version} with ${plugin.commands.length} command(s)`
      );

      // Enable hot reload if env flag is set
      if (process.env.BROWSER_CLI_HOT_RELOAD === 'true') {
        this.watchPlugin(absolutePath, ctx, plugin.name);
      }

      return {
        success: true,
        plugin: loadedPlugin,
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to load plugin: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Unload a plugin by name.
   *
   * @param name - Name of the plugin to unload
   * @param ctx - Plugin context for lifecycle hooks
   * @returns Result indicating success or failure
   */
  async unloadPlugin(
    name: string,
    ctx: PluginContext
  ): Promise<PluginUnloadResult> {
    const loadedPlugin = this.loadedPlugins.get(name);
    if (!loadedPlugin) {
      return {
        success: false,
        error: `Plugin '${name}' is not loaded`,
      };
    }

    const { plugin } = loadedPlugin;

    // Stop watching if hot reload was enabled
    this.unwatchPlugin(loadedPlugin.path);

    // Call onUnload lifecycle hook if present
    if (plugin.onUnload) {
      try {
        await plugin.onUnload(ctx);
      } catch (err) {
        ctx.log(
          `Warning: onUnload failed for plugin '${name}': ${err instanceof Error ? err.message : String(err)}`
        );
        // Continue with unload even if onUnload fails
      }
    }

    // Unregister commands
    for (const cmd of plugin.commands) {
      this.commandRegistry.delete(cmd.name);
      this.allCommands.delete(cmd.name);
    }

    // Remove from loaded plugins
    this.loadedPlugins.delete(name);

    ctx.log(`Unloaded plugin '${name}'`);

    return { success: true };
  }

  /**
   * List all loaded plugins.
   */
  listPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Get a command handler by name.
   *
   * @param name - Command name
   * @returns The plugin command entry if found
   */
  getCommand(name: string): PluginCommandEntry | undefined {
    return this.commandRegistry.get(name);
  }

  /**
   * Check if a command is registered with a plugin.
   *
   * @param name - Command name to check
   * @returns True if command is registered
   */
  hasCommand(name: string): boolean {
    return this.commandRegistry.has(name);
  }

  /**
   * Get all plugin command names.
   */
  getPluginCommandNames(): string[] {
    return Array.from(this.commandRegistry.keys());
  }

  /**
   * Get plugin info by name.
   */
  getPlugin(name: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  /**
   * Check if a plugin is loaded.
   */
  isPluginLoaded(name: string): boolean {
    return this.loadedPlugins.has(name);
  }

  /**
   * Get count of loaded plugins.
   */
  getPluginCount(): number {
    return this.loadedPlugins.size;
  }

  /**
   * Get count of registered plugin commands.
   */
  getCommandCount(): number {
    return this.commandRegistry.size;
  }

  /**
   * Watch plugin file for changes and auto-reload.
   * Only active when BROWSER_CLI_HOT_RELOAD=true
   */
  private watchPlugin(pluginPath: string, ctx: PluginContext, pluginName: string): void {
    // Don't double-watch
    if (this.watchers.has(pluginPath)) {
      return;
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const watcher = watch(pluginPath, async (eventType) => {
      if (eventType === 'change') {
        // Debounce to avoid multiple reloads on save
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(async () => {
          ctx.log(`[HotReload] Detected change in ${pluginName}, reloading...`);

          try {
            // Unload first
            await this.unloadPlugin(pluginName, ctx);

            // Small delay to ensure file is fully written
            await new Promise(resolve => setTimeout(resolve, 100));

            // Reload
            const result = await this.loadPlugin(pluginPath, ctx);

            if (result.success) {
              ctx.log(`[HotReload] Successfully reloaded ${pluginName}`);
            } else {
              ctx.log(`[HotReload] Failed to reload ${pluginName}: ${result.error}`);
            }
          } catch (err) {
            ctx.log(`[HotReload] Error reloading ${pluginName}: ${err}`);
          }
        }, 200);
      }
    });

    this.watchers.set(pluginPath, watcher);
  }

  /**
   * Stop watching a plugin file.
   */
  private unwatchPlugin(pluginPath: string): void {
    const watcher = this.watchers.get(pluginPath);
    if (watcher) {
      watcher.close();
      this.watchers.delete(pluginPath);
    }
  }
}
