/**
 * Plugin Hooks Wiring Tests
 * Tests that navigate and snapshot properly trigger plugin hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { CoreActionsFeature } from '../../SCRIPTS/features/core-actions';
import { SnapshotFeature } from '../../SCRIPTS/features/snapshot';
import { PluginsFeature } from '../../SCRIPTS/features/plugins-feature';
import { Page, BrowserContext } from 'playwright';

// Extended mock page with methods needed for navigation and snapshot
interface ExtendedMockPage extends MockPage {
  context: ReturnType<typeof vi.fn>;
}

function createExtendedMockPage(overrides?: Partial<ExtendedMockPage>): ExtendedMockPage {
  const baseMock = createMockPage();

  const mockLocator = {
    click: vi.fn().mockResolvedValue(undefined),
    first: vi.fn().mockReturnThis(),
    ariaSnapshot: vi.fn().mockResolvedValue('- document'),
    waitFor: vi.fn().mockResolvedValue(undefined),
    isVisible: vi.fn().mockResolvedValue(true),
    isEnabled: vi.fn().mockResolvedValue(true),
    textContent: vi.fn().mockResolvedValue('mock text'),
    getAttribute: vi.fn().mockResolvedValue(null),
    boundingBox: vi.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 50 }),
    all: vi.fn().mockResolvedValue([]),
    evaluate: vi.fn().mockResolvedValue(undefined),
    evaluateAll: vi.fn().mockResolvedValue([]),
  };

  return {
    ...baseMock,
    goto: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('http://localhost:5173/test'),
    locator: vi.fn().mockReturnValue(mockLocator),
    context: vi.fn().mockReturnValue({
      cookies: vi.fn().mockResolvedValue([]),
    }),
    ...overrides,
  };
}

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

// Mock PluginLoader to track hook calls
vi.mock('../../SCRIPTS/plugins/plugin-loader', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../SCRIPTS/plugins/plugin-loader')>();

  class MockPluginLoader {
    private loadedPlugins: Map<string, any> = new Map();
    public onNavigateCalls: string[] = [];
    public onSnapshotCalls: string[] = [];

    async loadPlugin(pluginPath: string, ctx: any) {
      if (!pluginPath.endsWith('.ts') && !pluginPath.endsWith('.js')) {
        return { success: false, error: 'Invalid plugin extension' };
      }

      const hookCallTracker = this;
      const pluginName = 'TestHookPlugin';
      const loadedPlugin = {
        plugin: {
          name: pluginName,
          version: '1.0.0',
          description: 'A plugin for testing hooks',
          commands: [],
          hooks: {
            onNavigate: async (url: string) => {
              hookCallTracker.onNavigateCalls.push(url);
            },
            onSnapshot: async (snapshot: string) => {
              hookCallTracker.onSnapshotCalls.push(snapshot);
            },
          },
        },
        path: pluginPath,
        loadedAt: new Date(),
      };

      this.loadedPlugins.set(pluginName, loadedPlugin);
      return { success: true, plugin: loadedPlugin };
    }

    async unloadPlugin(name: string) {
      if (!this.loadedPlugins.has(name)) {
        return { success: false, error: `Plugin '${name}' is not loaded` };
      }
      this.loadedPlugins.delete(name);
      return { success: true };
    }

    listPlugins() {
      return Array.from(this.loadedPlugins.values());
    }

    hasCommand(name: string) {
      return false;
    }

    getCommand(name: string) {
      return undefined;
    }

    getPluginCommandNames() {
      return [];
    }

    getPluginCount() {
      return this.loadedPlugins.size;
    }

    getCommandCount() {
      return 0;
    }
  }

  return {
    ...actual,
    PluginLoader: MockPluginLoader,
  };
});

describe('Plugin Hooks Wiring', () => {
  let mockPage: ExtendedMockPage;
  let coreActions: CoreActionsFeature;
  let snapshot: SnapshotFeature;
  let plugins: PluginsFeature;
  let mockContext: BrowserContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPage = createExtendedMockPage();
    coreActions = new CoreActionsFeature(mockPage as unknown as Page);
    snapshot = new SnapshotFeature(mockPage as unknown as Page);
    plugins = new PluginsFeature(mockPage as unknown as Page);
    mockContext = createMockBrowserContext();

    // Set browser context for plugins
    plugins.setBrowserContext(mockContext);

    // Wire plugins to features (as done in feature-registry.ts)
    coreActions.setPluginsFeature(plugins);
    snapshot.setPluginsFeature(plugins);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('onNavigate hook', () => {
    it('triggers onNavigate hook after successful navigation', async () => {
      // Load a plugin with hooks
      const handlers = plugins.getCommandHandlers();
      const loadHandler = handlers.get('loadPlugin')!;
      await loadHandler({ path: '/home/user/plugins/test-hook-plugin.ts' });

      // Navigate using coreActions
      const navHandlers = coreActions.getCommandHandlers();
      const navigateHandler = navHandlers.get('navigate')!;
      const result = await navigateHandler({ url: 'http://example.com/test' });

      expect(result.status).toBe('ok');

      // Access the mock loader to verify hook was called
      const loadedPlugins = plugins['pluginLoader'].listPlugins();
      expect(loadedPlugins).toHaveLength(1);

      // Check that onNavigate was triggered
      const mockLoader = plugins['pluginLoader'] as any;
      expect(mockLoader.onNavigateCalls).toContain('http://example.com/test');
    });

    it('does not throw if no plugins are loaded', async () => {
      const handlers = coreActions.getCommandHandlers();
      const navigateHandler = handlers.get('navigate')!;

      // Should not throw even without any plugins
      const result = await navigateHandler({ url: 'http://example.com' });
      expect(result.status).toBe('ok');
    });

    it('does not trigger hook if navigation fails', async () => {
      // Make goto fail
      mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'));

      // Load a plugin with hooks
      const loadHandler = plugins.getCommandHandlers().get('loadPlugin')!;
      await loadHandler({ path: '/home/user/plugins/test-hook-plugin.ts' });

      const handlers = coreActions.getCommandHandlers();
      const navigateHandler = handlers.get('navigate')!;
      const result = await navigateHandler({ url: 'http://example.com/test' });

      expect(result.status).toBe('error');

      // Hook should NOT have been called since navigation failed
      const mockLoader = plugins['pluginLoader'] as any;
      expect(mockLoader.onNavigateCalls).toHaveLength(0);
    });
  });

  describe('onSnapshot hook', () => {
    it('triggers onSnapshot hook after snapshot capture', async () => {
      // Load a plugin with hooks
      const loadHandler = plugins.getCommandHandlers().get('loadPlugin')!;
      await loadHandler({ path: '/home/user/plugins/test-hook-plugin.ts' });

      // Take a snapshot
      const handlers = snapshot.getCommandHandlers();
      const snapshotHandler = handlers.get('snapshot')!;
      const result = await snapshotHandler({});

      expect(result.status).toBe('ok');

      // Check that onSnapshot was triggered
      const mockLoader = plugins['pluginLoader'] as any;
      expect(mockLoader.onSnapshotCalls.length).toBeGreaterThan(0);
    });

    it('does not throw if no plugins are loaded', async () => {
      const handlers = snapshot.getCommandHandlers();
      const snapshotHandler = handlers.get('snapshot')!;

      // Should not throw even without any plugins
      const result = await snapshotHandler({});
      expect(result.status).toBe('ok');
    });

    it('passes snapshot string to hook', async () => {
      // Mock ariaSnapshot to return a specific value
      const mockLocator = mockPage.locator();
      mockLocator.ariaSnapshot.mockResolvedValueOnce('- button "Submit" [ref=e1]');

      // Load a plugin with hooks
      const loadHandler = plugins.getCommandHandlers().get('loadPlugin')!;
      await loadHandler({ path: '/home/user/plugins/test-hook-plugin.ts' });

      // Take a snapshot
      const handlers = snapshot.getCommandHandlers();
      const snapshotHandler = handlers.get('snapshot')!;
      await snapshotHandler({});

      // Check that onSnapshot received the snapshot content
      const mockLoader = plugins['pluginLoader'] as any;
      expect(mockLoader.onSnapshotCalls.length).toBeGreaterThan(0);
      // The snapshot should contain refs added by addRefsToSnapshot
      expect(mockLoader.onSnapshotCalls[0]).toContain('[ref=');
    });
  });

  describe('setPluginsFeature', () => {
    it('CoreActionsFeature accepts plugins feature via setter', () => {
      const newCoreActions = new CoreActionsFeature(mockPage as unknown as Page);
      expect(() => newCoreActions.setPluginsFeature(plugins)).not.toThrow();
    });

    it('SnapshotFeature accepts plugins feature via setter', () => {
      const newSnapshot = new SnapshotFeature(mockPage as unknown as Page);
      expect(() => newSnapshot.setPluginsFeature(plugins)).not.toThrow();
    });
  });
});
