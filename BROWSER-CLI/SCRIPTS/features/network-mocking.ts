/**
 * Phase 3: Network Request Mocking Feature
 *
 * Intercepts and mocks network requests for testing purposes.
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';
import { getDefaultValidator, SchemaValidationError } from '../utils/schema-validator';

/**
 * Network Request Mocking Feature
 *
 * Provides network request interception and mocking capabilities to:
 * - Test error states and edge cases
 * - Test offline scenarios
 * - Mock slow API responses
 * - Test with different API response data
 *
 * Commands:
 * - setupNetworkMocking: Enable network request interception
 * - mockRoute: Define a mock response for a specific route
 * - clearMocks: Remove all mock definitions
 * - listMocks: List all active mocks
 */
import { MOCK_HISTORY_MAX } from '../core/constants';

/** Type for mock history entries */
type MockHistoryEntry = {
  action: 'create' | 'overwrite' | 'clear' | 'enable' | 'disable';
  timestamp: number;
  key?: string;
  mock?: { method: string; response: any; status?: number; schema?: string; enabled: boolean; createdAt: number };
  previousMock?: { method: string; response: any; status?: number; schema?: string; enabled: boolean; createdAt: number };
  clearedCount?: number;
};

export class NetworkMockingFeature extends BaseFeature {
  public readonly name = 'NetworkMocking';

  private mockRoutes: Map<string, { method: string; response: any; status?: number; schema?: string; enabled: boolean; createdAt: number }> = new Map();
  private mockingEnabled: boolean = false;

  private activeAborts: Map<string, string> = new Map(); // pattern -> errorCode
  private headerModifications: Map<string, { request?: Record<string, string>; response?: Record<string, string> }> = new Map();

  // Mock history for tracking mock operations
  private mockHistory: MockHistoryEntry[] = [];

  /** Adds an entry to mock history, capping at MOCK_HISTORY_MAX entries */
  private addToHistory(entry: MockHistoryEntry): void {
    this.mockHistory.push(entry);
    if (this.mockHistory.length > MOCK_HISTORY_MAX) {
      this.mockHistory = this.mockHistory.slice(-MOCK_HISTORY_MAX);
    }
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['setupNetworkMocking', this.setupMocking.bind(this)],
      ['mockRoute', this.addMockRoute.bind(this)],
      ['clearMocks', this.clearAllMocks.bind(this)],
      ['listMocks', this.listAllMocks.bind(this)],
      ['listSchemas', this.listSchemas.bind(this)],
      ['validateMock', this.validateMockResponse.bind(this)],
      ['loadSchema', this.loadSchemaFile.bind(this)],
      ['abortRoute', this.handleAbortRoute.bind(this)],
      ['modifyRequestHeaders', this.handleModifyRequestHeaders.bind(this)],
      ['modifyResponseHeaders', this.handleModifyResponseHeaders.bind(this)],
      ['blockByPattern', this.handleBlockByPattern.bind(this)],
      ['listAborts', this.handleListAborts.bind(this)],
      ['getMockHistory', this.handleGetMockHistory.bind(this)],
      ['disableMock', this.handleDisableMock.bind(this)],
      ['enableMock', this.handleEnableMock.bind(this)]
    ]);
  }

  /**
   * Setup lifecycle: Enable network mocking on page
   */
  async setup(): Promise<void> {
    // Network mocking will be enabled when setupNetworkMocking is called
  }

  /**
   * Enable network request interception and mocking
   */
  private async setupMocking(): Promise<CommandResponse> {
    if (this.mockingEnabled) {
      return { status: 'ok', data: { enabled: true, message: 'Already enabled' } };
    }

    await this.page.route('**/*', async (route) => {
      const url = route.request().url();
      const method = route.request().method();
      const key = `${method}:${url}`;

      const mock = this.mockRoutes.get(key);
      if (mock && mock.enabled) {
        await route.fulfill({
          status: mock.status || 200,
          body: JSON.stringify(mock.response),
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        await route.continue();
      }
    });

    this.mockingEnabled = true;
    this.log('Network mocking enabled');
    return { status: 'ok', data: { enabled: true } };
  }

  /**
   * Mock a specific network route
   */
  private async addMockRoute(args: {
    url: string;
    method: string;
    response: any;
    status?: number;
    schema?: string;
    skipValidation?: boolean;
  }): Promise<CommandResponse> {
    const key = `${args.method.toUpperCase()}:${args.url}`;
    let warning: string | undefined;

    // Check for conflict with existing mock
    const existingMock = this.mockRoutes.get(key);
    if (existingMock) {
      warning = `Mock conflict: Overwriting existing mock for ${args.method.toUpperCase()} ${args.url}`;
      this.addToHistory({
        action: 'overwrite',
        timestamp: Date.now(),
        key,
        previousMock: { ...existingMock }
      });
      this.log(`Warning: ${warning}`);
    }

    // Validate response against schema if provided
    if (args.schema && !args.skipValidation) {
      const validator = getDefaultValidator();

      if (!validator.hasSchema(args.schema)) {
        return {
          status: 'error',
          message: `Schema not found: ${args.schema}. Available schemas: ${validator.getSchemaNames().join(', ')}`
        };
      }

      const validation = validator.validate(args.schema, args.response);

      if (!validation.valid) {
        const errorDetails = validation.errors
          .map(e => `  - ${e.field}: ${e.message}`)
          .join('\n');

        return {
          status: 'error',
          message: `Mock response validation failed:\n${errorDetails}`
        };
      }
    }

    const newMock = {
      method: args.method.toUpperCase(),
      response: args.response,
      status: args.status,
      schema: args.schema,
      enabled: true,
      createdAt: Date.now()
    };

    this.mockRoutes.set(key, newMock);

    // Record creation in history
    this.addToHistory({
      action: 'create',
      timestamp: Date.now(),
      key,
      mock: { ...newMock }
    });

    this.log(`Mocked route: ${key}${args.schema ? ` (schema: ${args.schema})` : ''}`);
    return {
      status: 'ok',
      data: {
        url: args.url,
        method: args.method,
        schema: args.schema,
        validated: !!args.schema,
        warning
      }
    };
  }

  /**
   * Clear all network mocks
   */
  private async clearAllMocks(): Promise<CommandResponse> {
    const clearedCount = this.mockRoutes.size;
    
    // Record clear action in history
    if (clearedCount > 0) {
      this.addToHistory({
        action: 'clear',
        timestamp: Date.now(),
        clearedCount
      });
    }
    
    this.mockRoutes.clear();
    this.log('Cleared all network mocks');
    return { status: 'ok', data: { cleared: true, count: clearedCount } };
  }

  /**
   * List all active network mocks
   */
  private async listAllMocks(): Promise<CommandResponse> {
    const mocks = Array.from(this.mockRoutes.entries()).map(([key, mock]) => {
      const [method, ...urlParts] = key.split(':');
      return {
        url: urlParts.join(':'),
        method: mock.method,
        status: mock.status || 200,
        enabled: mock.enabled,
        createdAt: mock.createdAt
      };
    });

    return { status: 'ok', data: { mocks } };
  }

  /**
   * List available schemas
   */
  private async listSchemas(): Promise<CommandResponse> {
    const validator = getDefaultValidator();
    const schemas = validator.getSchemaNames();

    return {
      status: 'ok',
      data: { schemas }
    };
  }

  /**
   * Validate mock response against schema (without creating mock)
   */
  private async validateMockResponse(args: {
    schema: string;
    response: any;
  }): Promise<CommandResponse> {
    const validator = getDefaultValidator();

    if (!validator.hasSchema(args.schema)) {
      return {
        status: 'error',
        message: `Schema not found: ${args.schema}`
      };
    }

    const validation = validator.validate(args.schema, args.response);

    if (!validation.valid) {
      return {
        status: 'error',
        message: 'Validation failed',
        data: { errors: validation.errors }
      };
    }

    return {
      status: 'ok',
      data: { valid: true, schema: args.schema }
    };
  }

  /**
   * Load schema from file
   */
  private async loadSchemaFile(args: {
    name: string;
    path: string;
  }): Promise<CommandResponse> {
    try {
      const validator = getDefaultValidator();
      validator.loadSchemaFromFile(args.name, args.path);

      return {
        status: 'ok',
        data: { name: args.name, loaded: true }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to load schema: ${error}`
      };
    }
  }


  /**
   * Abort/block requests matching URL pattern
   */
  async abortRoute(urlPattern: string, errorCode: string = 'blockedbyclient'): Promise<{ pattern: string; errorCode: string; code: string }> {
    this.log(`Aborting route: ${urlPattern} with error: ${errorCode}`);
    await this.page.route(urlPattern, route => route.abort(errorCode));
    this.activeAborts.set(urlPattern, errorCode);
    return {
      pattern: urlPattern,
      errorCode,
      code: `await page.route('${urlPattern}', route => route.abort('${errorCode}'));`
    };
  }

  /**
   * Modify request headers for matching pattern
   */
  async modifyRequestHeaders(urlPattern: string, headers: Record<string, string>): Promise<{ pattern: string; headers: string[]; code: string }> {
    this.log(`Modifying request headers for: ${urlPattern}`);
    await this.page.route(urlPattern, async route => {
      const existingHeaders = route.request().headers();
      await route.continue({ headers: { ...existingHeaders, ...headers } });
    });
    const mod = this.headerModifications.get(urlPattern) || {};
    mod.request = { ...mod.request, ...headers };
    this.headerModifications.set(urlPattern, mod);
    return {
      pattern: urlPattern,
      headers: Object.keys(headers),
      code: `await page.route('${urlPattern}', async route => {\n  const h = route.request().headers();\n  await route.continue({ headers: { ...h, ${JSON.stringify(headers)} } });\n});`
    };
  }

  /**
   * Modify response headers for matching pattern
   */
  async modifyResponseHeaders(urlPattern: string, headers: Record<string, string>): Promise<{ pattern: string; headers: string[]; code: string }> {
    this.log(`Modifying response headers for: ${urlPattern}`);
    await this.page.route(urlPattern, async route => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), ...headers }
      });
    });
    const mod = this.headerModifications.get(urlPattern) || {};
    mod.response = { ...mod.response, ...headers };
    this.headerModifications.set(urlPattern, mod);
    return {
      pattern: urlPattern,
      headers: Object.keys(headers),
      code: `await page.route('${urlPattern}', async route => {\n  const r = await route.fetch();\n  await route.fulfill({ response: r, headers: { ...r.headers(), ${JSON.stringify(headers)} } });\n});`
    };
  }

  /**
   * Block multiple URL patterns at once
   */
  async blockByPattern(patterns: string[], errorCode: string = 'blockedbyclient'): Promise<{ blocked: number; patterns: string[]; code: string }> {
    this.log(`Blocking ${patterns.length} patterns`);
    for (const pattern of patterns) {
      await this.abortRoute(pattern, errorCode);
    }
    return {
      blocked: patterns.length,
      patterns,
      code: `// Blocked ${patterns.length} patterns\n${patterns.map(p => `await page.route('${p}', route => route.abort('${errorCode}'));`).join('\n')}`
    };
  }

  /**
   * List active aborts
   */
  listAborts(): { aborts: Array<{ pattern: string; errorCode: string }> } {
    const aborts = Array.from(this.activeAborts.entries()).map(([pattern, errorCode]) => ({ pattern, errorCode }));
    return { aborts };
  }

  private async handleAbortRoute(args: { urlPattern: string; errorCode?: string }): Promise<CommandResponse> {
    try {
      const result = await this.abortRoute(args.urlPattern, args.errorCode);
      return { status: 'ok', data: result, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleModifyRequestHeaders(args: { urlPattern: string; headers: Record<string, string> }): Promise<CommandResponse> {
    try {
      const result = await this.modifyRequestHeaders(args.urlPattern, args.headers);
      return { status: 'ok', data: result, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleModifyResponseHeaders(args: { urlPattern: string; headers: Record<string, string> }): Promise<CommandResponse> {
    try {
      const result = await this.modifyResponseHeaders(args.urlPattern, args.headers);
      return { status: 'ok', data: result, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleBlockByPattern(args: { patterns: string[]; errorCode?: string }): Promise<CommandResponse> {
    try {
      const result = await this.blockByPattern(args.patterns, args.errorCode);
      return { status: 'ok', data: result, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private handleListAborts(): CommandResponse {
    const result = this.listAborts();
    return { status: 'ok', data: result };
  }


  /**
   * Get mock operation history
   */
  private handleGetMockHistory(): CommandResponse {
    return {
      status: 'ok',
      data: {
        history: this.mockHistory,
        count: this.mockHistory.length
      }
    };
  }


  private handleDisableMock(args: { key: string }): CommandResponse {
    const mock = this.mockRoutes.get(args.key);
    if (!mock) {
      return {
        status: 'error',
        message: `Mock not found: ${args.key}. Use listMocks to see available mocks.`
      };
    }

    if (!mock.enabled) {
      return {
        status: 'ok',
        data: { key: args.key, enabled: false, message: 'Mock already disabled' }
      };
    }

    mock.enabled = false;
    this.addToHistory({
      action: 'disable',
      timestamp: Date.now(),
      key: args.key,
      mock: { ...mock }
    });

    this.log(`Disabled mock: ${args.key}`);
    return {
      status: 'ok',
      data: { key: args.key, enabled: false }
    };
  }

  private handleEnableMock(args: { key: string }): CommandResponse {
    const mock = this.mockRoutes.get(args.key);
    if (!mock) {
      return {
        status: 'error',
        message: `Mock not found: ${args.key}. Use listMocks to see available mocks.`
      };
    }

    if (mock.enabled) {
      return {
        status: 'ok',
        data: { key: args.key, enabled: true, message: 'Mock already enabled' }
      };
    }

    mock.enabled = true;
    this.addToHistory({
      action: 'enable',
      timestamp: Date.now(),
      key: args.key,
      mock: { ...mock }
    });

    this.log(`Enabled mock: ${args.key}`);
    return {
      status: 'ok',
      data: { key: args.key, enabled: true }
    };
  }

  /**
   * Cleanup: Disable network mocking when browser closes
   */
  async cleanup(): Promise<void> {
    if (this.mockingEnabled) {
      // Playwright will automatically clean up routes when page closes
      this.mockRoutes.clear();
      this.mockHistory = [];
      this.mockingEnabled = false;
      this.log('Network mocking disabled');
    }
  }
}
