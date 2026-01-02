/**
 * PluginsFeature Unit Tests
 * Tests plugin loading, unloading, command execution, and security validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { PluginsFeature } from '../../SCRIPTS/features/plugins-feature';
import { Page, BrowserContext } from 'playwright';

// Mock the plugin-loader module
vi.mock('../../SCRIPTS/plugins/plugin-loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../SCRIPTS/plugins/plugin-loader')>();

  // Create a mock PluginLoader class
  class MockPluginLoader {
    private loadedPlugins: Map<string, any> = new Map();
    private commandRegistry: Map<string, any> = new Map();

    async loadPlugin(pluginPath: string, ctx: any) {
      // Simulate path validation (the real validatePluginPath runs before this)
      if (pluginPath.includes('..')) {
        return {
          success: false,
          error: `Path traversal detected: "${pluginPath}" contains ".." segments`,
        };
      }

      if (!pluginPath.endsWith('.ts') && !pluginPath.endsWith('.js')) {
        return {
          success: false,
          error: `Invalid plugin extension. Must be .ts or .js`,
        };
      }

      // Check for invalid plugin structure simulation
      if (pluginPath.includes('invalid-structure')) {
        return {
          success: false,
          error: 'Plugin validation failed: missing required field "commands"',
        };
      }

      // Check for outside allowed directories
      if (pluginPath.includes('/etc/') || pluginPath.includes('system32')) {
        return {
          success: false,
          error: 'Plugin path is outside allowed directories',
        };
      }

      // Simulate successful load
      const pluginName = pluginPath.includes('test-plugin') ? 'TestPlugin' : 'MockPlugin';
      const loadedPlugin = {
        plugin: {
          name: pluginName,
          version: '1.0.0',
          description: 'A test plugin',
          commands: [
            {
              name: 'testCmd',
              description: 'A test command',
              usage: 'testCmd [args]',
              handler: vi.fn().mockResolvedValue({ status: 'ok', data: 'executed' }),
            },
          ],
        },
        path: pluginPath,
        loadedAt: new Date(),
      };

      this.loadedPlugins.set(pluginName, loadedPlugin);
      this.commandRegistry.set('testCmd', {
        pluginName,
        handler: loadedPlugin.plugin.commands[0].handler,
        command: loadedPlugin.plugin.commands[0],
      });

      return { success: true, plugin: loadedPlugin };
    }

    async unloadPlugin(name: string, ctx: any) {
      if (!this.loadedPlugins.has(name)) {
        return {
          success: false,
          error: `Plugin '${name}' is not loaded`,
        };
      }

      const plugin = this.loadedPlugins.get(name);
      // Simulate onUnload hook call
      if (plugin?.plugin?.onUnload) {
        await plugin.plugin.onUnload(ctx);
      }

      // Remove commands
      for (const cmd of plugin.plugin.commands) {
        this.commandRegistry.delete(cmd.name);
      }

      this.loadedPlugins.delete(name);
      return { success: true };
    }

    listPlugins() {
      return Array.from(this.loadedPlugins.values());
    }

    hasCommand(name: string) {
      return this.commandRegistry.has(name);
    }

    getCommand(name: string) {
      return this.commandRegistry.get(name);
    }

    getPluginCommandNames() {
      return Array.from(this.commandRegistry.keys());
    }

    getPluginCount() {
      return this.loadedPlugins.size;
    }

    getCommandCount() {
      return this.commandRegistry.size;
    }
  }

  return {
    ...actual,
    PluginLoader: MockPluginLoader,
  };
});

// Create mock BrowserContext
function createMockBrowserContext(): BrowserContext {
  return {
    pages: vi.fn().mockReturnValue([]),
    newPage: vi.fn(),
    close: vi.fn(),
    cookies: vi.fn().mockResolvedValue([]),
    storageState: vi.fn(),
    addCookies: vi.fn(),
    clearCookies: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    setDefaultTimeout: vi.fn(),
    setGeolocation: vi.fn(),
    grantPermissions: vi.fn(),
    clearPermissions: vi.fn(),
  } as unknown as BrowserContext;
}

describe('PluginsFeature', () => {
  let mockPage: MockPage;
  let feature: PluginsFeature;
  let mockContext: BrowserContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPage = createMockPage();
    feature = new PluginsFeature(mockPage as unknown as Page);
    mockContext = createMockBrowserContext();
    feature.setBrowserContext(mockContext);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCommandHandlers', () => {
    it('returns Map with plugin handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.has('loadPlugin')).toBe(true);
      expect(handlers.has('unloadPlugin')).toBe(true);
      expect(handlers.has('listPlugins')).toBe(true);
      expect(handlers.has('pluginCommand')).toBe(true);
    });

    it('has exactly 4 command handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.size).toBe(4);
    });
  });

  describe('loadPlugin', () => {
    it('returns error for missing path argument', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      const result = await loadHandler({ path: '' });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Plugin path is required');
    });

    it('returns error for path traversal attempt', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      const result = await loadHandler({
        path: '../../../etc/passwd.ts',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Path traversal detected');
    });

    it('returns error for invalid plugin extension', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      const result = await loadHandler({
        path: '/home/user/plugins/malicious.exe',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid plugin extension');
    });

    it('returns error for path outside allowed directories', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      const result = await loadHandler({
        path: '/etc/malicious-plugin.ts',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('outside allowed directories');
    });

    it('returns error for invalid plugin structure', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      const result = await loadHandler({
        path: '/home/user/plugins/invalid-structure.ts',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('validation failed');
    });

    it('loads valid plugin and registers commands', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      const result = await loadHandler({
        path: '/home/user/plugins/test-plugin.ts',
      });

      expect(result.status).toBe('ok');
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('TestPlugin');
      expect(result.data?.version).toBe('1.0.0');
      expect(result.data?.commands).toHaveLength(1);
      expect(result.data?.commands[0].name).toBe('testCmd');
      expect(result.code).toContain('Plugin loaded from');
    });

    it('returns error when browser context not set', async () => {
      // Create new feature without context
      const newFeature = new PluginsFeature(mockPage as unknown as Page);
      const handlers = newFeature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      const result = await loadHandler({
        path: '/home/user/plugins/test-plugin.ts',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Browser context not available');
    });
  });

  describe('unloadPlugin', () => {
    it('returns error for missing name argument', async () => {
      const handlers = feature.getCommandHandlers();
      const unloadHandler = handlers.get('unloadPlugin')!;

      const result = await unloadHandler({ name: '' });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Plugin name is required');
    });

    it('returns error for unknown plugin name', async () => {
      const handlers = feature.getCommandHandlers();
      const unloadHandler = handlers.get('unloadPlugin')!;

      const result = await unloadHandler({ name: 'NonExistentPlugin' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('is not loaded');
    });

    it('unloads loaded plugin by name', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;
      const unloadHandler = handlers.get('unloadPlugin')!;

      // First load a plugin
      await loadHandler({ path: '/home/user/plugins/test-plugin.ts' });

      // Then unload it
      const result = await unloadHandler({ name: 'TestPlugin' });

      expect(result.status).toBe('ok');
      expect(result.data?.unloaded).toBe('TestPlugin');
      expect(result.code).toContain('Unloaded plugin');
    });
  });

  describe('listPlugins', () => {
    it('returns empty array when no plugins loaded', async () => {
      const handlers = feature.getCommandHandlers();
      const listHandler = handlers.get('listPlugins')!;

      const result = await listHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.count).toBe(0);
      expect(result.data?.plugins).toEqual([]);
      expect(result.code).toContain('0 plugin(s) loaded');
    });

    it('returns plugin metadata with command count', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;
      const listHandler = handlers.get('listPlugins')!;

      // Load a plugin first
      await loadHandler({ path: '/home/user/plugins/test-plugin.ts' });

      const result = await listHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.count).toBe(1);
      expect(result.data?.plugins).toHaveLength(1);
      expect(result.data?.plugins[0].name).toBe('TestPlugin');
      expect(result.data?.plugins[0].version).toBe('1.0.0');
      expect(result.data?.plugins[0].commands).toContain('testCmd');
      expect(result.code).toContain('1 plugin(s) loaded');
    });
  });

  describe('pluginCommand', () => {
    it('returns error for unknown command', async () => {
      const handlers = feature.getCommandHandlers();
      const pluginCmdHandler = handlers.get('pluginCommand')!;

      const result = await pluginCmdHandler({
        pluginCommandName: 'unknownCmd',
        rawArgs: [],
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Unknown command');
    });

    it('returns error when command name not provided', async () => {
      const handlers = feature.getCommandHandlers();
      const pluginCmdHandler = handlers.get('pluginCommand')!;

      const result = await pluginCmdHandler({
        pluginCommandName: '',
        rawArgs: [],
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('command name not provided');
    });

    it('executes registered plugin command', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      // Load plugin to register command
      await loadHandler({ path: '/home/user/plugins/test-plugin.ts' });

      // Check if command is registered
      expect(feature.isPluginCommand('testCmd')).toBe(true);

      // Execute the command directly through executePluginCommand
      const result = await feature.executePluginCommand('testCmd', ['arg1', 'arg2']);

      expect(result.status).toBe('ok');
      expect(result.data).toBe('executed');
    });
  });

  describe('isPluginCommand', () => {
    it('returns false for non-plugin commands', () => {
      expect(feature.isPluginCommand('click')).toBe(false);
      expect(feature.isPluginCommand('navigate')).toBe(false);
    });

    it('returns true for loaded plugin commands', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      await loadHandler({ path: '/home/user/plugins/test-plugin.ts' });

      expect(feature.isPluginCommand('testCmd')).toBe(true);
    });
  });

  describe('getPluginCommandNames', () => {
    it('returns empty array when no plugins loaded', () => {
      expect(feature.getPluginCommandNames()).toEqual([]);
    });

    it('returns command names after loading plugin', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      await loadHandler({ path: '/home/user/plugins/test-plugin.ts' });

      const commands = feature.getPluginCommandNames();
      expect(commands).toContain('testCmd');
    });
  });

  describe('getPluginCount', () => {
    it('returns 0 when no plugins loaded', () => {
      expect(feature.getPluginCount()).toBe(0);
    });

    it('returns correct count after loading plugins', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      await loadHandler({ path: '/home/user/plugins/test-plugin.ts' });

      expect(feature.getPluginCount()).toBe(1);
    });
  });

  describe('getPluginCommandCount', () => {
    it('returns 0 when no plugins loaded', () => {
      expect(feature.getPluginCommandCount()).toBe(0);
    });

    it('returns correct command count after loading plugins', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;

      await loadHandler({ path: '/home/user/plugins/test-plugin.ts' });

      expect(feature.getPluginCommandCount()).toBe(1);
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('Plugins');
    });
  });

  describe('setBrowserContext', () => {
    it('accepts browser context via setter', () => {
      const newFeature = new PluginsFeature(mockPage as unknown as Page);
      expect(() => newFeature.setBrowserContext(mockContext)).not.toThrow();
    });
  });

  describe('cleanup', () => {
    it('unloads all plugins on cleanup', async () => {
      const handlers = feature.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;
      const listHandler = handlers.get('listPlugins')!;

      // Load a plugin
      await loadHandler({ path: '/home/user/plugins/test-plugin.ts' });

      // Verify plugin is loaded
      let result = await listHandler({});
      expect(result.data?.count).toBe(1);

      // Cleanup
      await feature.cleanup();

      // Verify plugins are unloaded
      result = await listHandler({});
      expect(result.data?.count).toBe(0);
    });
  });
});
