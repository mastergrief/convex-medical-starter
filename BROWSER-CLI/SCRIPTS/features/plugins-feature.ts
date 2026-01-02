/**
 * Plugins Feature - Browser-CLI P3.1
 *
 * Feature that manages plugin loading, unloading, and command execution.
 */

import { Page, BrowserContext } from 'playwright';
import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';
import { PluginLoader } from '../plugins/plugin-loader';
import { PluginContext, LoadedPlugin } from '../plugins/plugin-interface';

/**
 * Feature for managing browser-cli plugins.
 */
export class PluginsFeature extends BaseFeature {
  public readonly name = 'Plugins';

  private pluginLoader = new PluginLoader();
  private browserContext: BrowserContext | null = null;

  constructor(page: Page) {
    super(page);
  }

  /**
   * Set the browser context for plugin use.
   * Called by BrowserManager after feature initialization.
   */
  setBrowserContext(context: BrowserContext): void {
    this.browserContext = context;
  }

  /**
   * Create a plugin context for plugin operations.
   */
  private createPluginContext(): PluginContext {
    if (!this.browserContext) {
      throw new Error('Browser context not available');
    }
    return {
      page: this.page,
      context: this.browserContext,
      log: (message: string) => this.log(message),
    };
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['loadPlugin', this.handleLoadPlugin.bind(this)],
      ['unloadPlugin', this.handleUnloadPlugin.bind(this)],
      ['listPlugins', this.handleListPlugins.bind(this)],
      ['pluginCommand', this.handlePluginCommand.bind(this)],
    ]);
  }

  /**
   * Handle dynamic plugin commands.
   * Args: { pluginCommandName: string, rawArgs: string[] }
   */
  private async handlePluginCommand(args: {
    pluginCommandName: string;
    rawArgs: string[];
  }): Promise<CommandResponse> {
    const { pluginCommandName, rawArgs } = args;

    if (!pluginCommandName) {
      return {
        status: 'error',
        message: 'Plugin command routing error: command name not provided',
      };
    }

    if (!this.isPluginCommand(pluginCommandName)) {
      return {
        status: 'error',
        message: `Unknown command: ${pluginCommandName}`,
      };
    }

    return this.executePluginCommand(pluginCommandName, rawArgs || []);
  }

  /**
   * Handle loadPlugin command.
   * Args: { path: string }
   */
  private async handleLoadPlugin(args: {
    path: string;
  }): Promise<CommandResponse> {
    if (!args.path) {
      return {
        status: 'error',
        message: 'Plugin path is required',
      };
    }

    try {
      const ctx = this.createPluginContext();
      const result = await this.pluginLoader.loadPlugin(args.path, ctx);

      if (result.success && result.plugin) {
        return {
          status: 'ok',
          data: {
            name: result.plugin.plugin.name,
            version: result.plugin.plugin.version,
            description: result.plugin.plugin.description,
            commands: result.plugin.plugin.commands.map((cmd) => ({
              name: cmd.name,
              description: cmd.description,
              usage: cmd.usage,
            })),
            path: result.plugin.path,
            loadedAt: result.plugin.loadedAt.toISOString(),
          },
          code: `// Plugin loaded from: ${args.path}
const plugin = await import("${args.path}");
// Registered ${result.plugin.plugin.commands.length} command(s)`,
        };
      } else {
        return {
          status: 'error',
          message: result.error || 'Failed to load plugin',
        };
      }
    } catch (err) {
      return {
        status: 'error',
        message: `Failed to load plugin: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Handle unloadPlugin command.
   * Args: { name: string }
   */
  private async handleUnloadPlugin(args: {
    name: string;
  }): Promise<CommandResponse> {
    if (!args.name) {
      return {
        status: 'error',
        message: 'Plugin name is required',
      };
    }

    try {
      const ctx = this.createPluginContext();
      const result = await this.pluginLoader.unloadPlugin(args.name, ctx);

      if (result.success) {
        return {
          status: 'ok',
          data: {
            unloaded: args.name,
          },
          code: `// Unloaded plugin: ${args.name}`,
        };
      } else {
        return {
          status: 'error',
          message: result.error || 'Failed to unload plugin',
        };
      }
    } catch (err) {
      return {
        status: 'error',
        message: `Failed to unload plugin: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Handle listPlugins command.
   */
  private async handleListPlugins(): Promise<CommandResponse> {
    const plugins = this.pluginLoader.listPlugins();

    const pluginList = plugins.map((lp: LoadedPlugin) => ({
      name: lp.plugin.name,
      version: lp.plugin.version,
      description: lp.plugin.description,
      commands: lp.plugin.commands.map((cmd) => cmd.name),
      path: lp.path,
      loadedAt: lp.loadedAt.toISOString(),
    }));

    return {
      status: 'ok',
      data: {
        count: plugins.length,
        plugins: pluginList,
      },
      code: `// ${plugins.length} plugin(s) loaded`,
    };
  }

  /**
   * Check if a command is a plugin command.
   */
  isPluginCommand(command: string): boolean {
    return this.pluginLoader.hasCommand(command);
  }

  /**
   * Execute a plugin command.
   *
   * @param command - Command name
   * @param args - Raw command arguments (string array)
   */
  async executePluginCommand(
    command: string,
    args: string[]
  ): Promise<CommandResponse> {
    const entry = this.pluginLoader.getCommand(command);
    if (!entry) {
      return {
        status: 'error',
        message: `Plugin command '${command}' not found`,
      };
    }

    try {
      const ctx = this.createPluginContext();

      // Plugin timeout wrapper (30 seconds)
      const PLUGIN_TIMEOUT = 30000;
      const timeoutPromise = new Promise<CommandResponse>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                `Plugin command '${command}' timed out after ${PLUGIN_TIMEOUT}ms`
              )
            ),
          PLUGIN_TIMEOUT
        )
      );

      return await Promise.race([entry.handler(ctx, args), timeoutPromise]);
    } catch (err) {
      return {
        status: 'error',
        message: `Plugin command failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Get all plugin command names for autocomplete.
   */
  getPluginCommandNames(): string[] {
    return this.pluginLoader.getPluginCommandNames();
  }

  /**
   * Get plugin count.
   */
  getPluginCount(): number {
    return this.pluginLoader.getPluginCount();
  }

  /**
   * Get total plugin command count.
   */
  getPluginCommandCount(): number {
    return this.pluginLoader.getCommandCount();
  }

  /**
   * Cleanup on browser close.
   */
  async cleanup(): Promise<void> {
    // Unload all plugins gracefully
    if (this.browserContext) {
      const ctx = this.createPluginContext();
      const plugins = this.pluginLoader.listPlugins();

      for (const lp of plugins) {
        try {
          await this.pluginLoader.unloadPlugin(lp.plugin.name, ctx);
        } catch {
          // Ignore errors during cleanup
        }
      }
    }
  }

  /**
   * Trigger beforeCommand hooks for all loaded plugins.
   * Returns { skip: true, reason } if any plugin requests skipping.
   */
  async triggerBeforeCommand(cmd: string, args: unknown): Promise<{ skip: boolean; reason?: string } | void> {
    const plugins = this.pluginLoader.listPlugins();

    for (const lp of plugins) {
      if (lp.plugin.hooks?.beforeCommand) {
        try {
          const result = await lp.plugin.hooks.beforeCommand(cmd, args);
          if (result?.skip) {
            return result;
          }
        } catch (err) {
          // Log warning but continue - one plugin shouldn't block others
          console.warn(`[Plugins] beforeCommand hook failed for ${lp.plugin.name}: ${err}`);
        }
      }
    }
  }

  /**
   * Trigger afterCommand hooks for all loaded plugins.
   */
  async triggerAfterCommand(cmd: string, args: unknown, result: CommandResponse): Promise<void> {
    const plugins = this.pluginLoader.listPlugins();

    for (const lp of plugins) {
      if (lp.plugin.hooks?.afterCommand) {
        try {
          await lp.plugin.hooks.afterCommand(cmd, args, result);
        } catch (err) {
          console.warn(`[Plugins] afterCommand hook failed for ${lp.plugin.name}: ${err}`);
        }
      }
    }
  }

  /**
   * Trigger onError hooks for all loaded plugins.
   */
  async triggerOnError(cmd: string, error: Error): Promise<void> {
    const plugins = this.pluginLoader.listPlugins();

    for (const lp of plugins) {
      if (lp.plugin.hooks?.onError) {
        try {
          await lp.plugin.hooks.onError(cmd, error);
        } catch (err) {
          console.warn(`[Plugins] onError hook failed for ${lp.plugin.name}: ${err}`);
        }
      }
    }
  }

  /**
   * Trigger onNavigate hooks for all loaded plugins.
   */
  async triggerOnNavigate(url: string): Promise<void> {
    const plugins = this.pluginLoader.listPlugins();

    for (const lp of plugins) {
      if (lp.plugin.hooks?.onNavigate) {
        try {
          await lp.plugin.hooks.onNavigate(url);
        } catch (err) {
          console.warn(`[Plugins] onNavigate hook failed for ${lp.plugin.name}: ${err}`);
        }
      }
    }
  }

  /**
   * Trigger onSnapshot hooks for all loaded plugins.
   */
  async triggerOnSnapshot(snapshot: string): Promise<void> {
    const plugins = this.pluginLoader.listPlugins();

    for (const lp of plugins) {
      if (lp.plugin.hooks?.onSnapshot) {
        try {
          await lp.plugin.hooks.onSnapshot(snapshot);
        } catch (err) {
          console.warn(`[Plugins] onSnapshot hook failed for ${lp.plugin.name}: ${err}`);
        }
      }
    }
  }
}
