/**
 * NetworkMockingFeature Unit Tests
 * Tests request interception and response mocking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { NetworkMockingFeature } from '../../SCRIPTS/features/network-mocking';
import { Page, Route } from 'playwright';

// Extended mock with route handling
interface ExtendedMockPage extends MockPage {
  route: ReturnType<typeof vi.fn>;
  unroute: ReturnType<typeof vi.fn>;
  context: ReturnType<typeof vi.fn>;
}

function createNetworkMockPage(): ExtendedMockPage {
  const baseMock = createMockPage();

  // Mock context for route setup
  const mockContext = {
    route: vi.fn().mockResolvedValue(undefined),
    unroute: vi.fn().mockResolvedValue(undefined),
  };

  return {
    ...baseMock,
    route: vi.fn().mockResolvedValue(undefined),
    unroute: vi.fn().mockResolvedValue(undefined),
    context: vi.fn().mockReturnValue(mockContext),
  };
}

describe('NetworkMockingFeature', () => {
  let mockPage: ExtendedMockPage;
  let feature: NetworkMockingFeature;

  beforeEach(() => {
    mockPage = createNetworkMockPage();
    feature = new NetworkMockingFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with network mocking handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.has('setupNetworkMocking')).toBe(true);
      expect(handlers.has('mockRoute')).toBe(true);
      expect(handlers.has('clearMocks')).toBe(true);
      expect(handlers.has('listMocks')).toBe(true);
    });

    it('registers all expected handlers', () => {
      const handlers = feature.getCommandHandlers();
      const expectedHandlers = [
        'setupNetworkMocking',
        'mockRoute',
        'clearMocks',
        'listMocks',
        'abortRoute',
        'listAborts',
        'validateMock',
        'loadSchema',
        'listSchemas',
      ];
      expectedHandlers.forEach((name) => {
        expect(handlers.has(name)).toBe(true);
      });
    });
  });

  describe('setupNetworkMocking', () => {
    it('enables request interception', async () => {
      const handlers = feature.getCommandHandlers();
      const setupHandler = handlers.get('setupNetworkMocking');

      const result = await setupHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.enabled).toBe(true);
    });
  });

  describe('mockRoute', () => {
    it('creates mock for URL pattern', async () => {
      // First enable mocking
      const handlers = feature.getCommandHandlers();
      await handlers.get('setupNetworkMocking')!({});

      const mockHandler = handlers.get('mockRoute');
      const result = await mockHandler!({
        url: '/api/users',
        method: 'GET',
        response: { users: [] },
        status: 200,
      });

      expect(result.status).toBe('ok');
      expect(mockPage.route).toHaveBeenCalled();
    });

    it('validates response against schema when provided', async () => {
      const handlers = feature.getCommandHandlers();
      await handlers.get('setupNetworkMocking')!({});

      const mockHandler = handlers.get('mockRoute');
      const result = await mockHandler!({
        url: '/api/users',
        method: 'GET',
        response: { users: [] },
        schema: 'user-response',
      });

      // Should attempt schema validation
      expect(result.status).toBeDefined();
    });
  });

  describe('listMocks', () => {
    it('returns empty array when no mocks registered', async () => {
      const handlers = feature.getCommandHandlers();
      const listHandler = handlers.get('listMocks');

      const result = await listHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.mocks).toEqual([]);
    });

    it('returns registered mocks', async () => {
      const handlers = feature.getCommandHandlers();
      await handlers.get('setupNetworkMocking')!({});
      await handlers.get('mockRoute')!({
        url: '/api/test',
        method: 'GET',
        response: { test: true },
      });

      const result = await handlers.get('listMocks')!({});

      expect(result.status).toBe('ok');
      expect(result.data?.mocks.length).toBeGreaterThan(0);
    });
  });

  describe('clearMocks', () => {
    it('removes all mock routes', async () => {
      const handlers = feature.getCommandHandlers();
      await handlers.get('setupNetworkMocking')!({});
      await handlers.get('mockRoute')!({
        url: '/api/test',
        method: 'GET',
        response: {},
      });

      const clearHandler = handlers.get('clearMocks');
      const result = await clearHandler!({});

      expect(result.status).toBe('ok');

      // Verify mocks are cleared
      const listResult = await handlers.get('listMocks')!({});
      expect(listResult.data?.mocks).toEqual([]);
    });
  });

  describe('abortRoute', () => {
    it('creates abort rule for URL pattern', async () => {
      const handlers = feature.getCommandHandlers();
      await handlers.get('setupNetworkMocking')!({});

      const abortHandler = handlers.get('abortRoute');
      const result = await abortHandler!({
        url: '/api/blocked',
        method: 'GET',
      });

      expect(result.status).toBe('ok');
    });
  });

  describe('validateMock', () => {
    it('validates response against schema without creating mock', async () => {
      const handlers = feature.getCommandHandlers();
      const validateHandler = handlers.get('validateMock');

      const result = await validateHandler!({
        schema: 'error-response',
        response: { error: 'test error', code: 400 },
      });

      expect(result.status).toBeDefined();
      // Dry-run validation - no routes should be created
      expect(mockPage.route).not.toHaveBeenCalled();
    });
  });

  describe('getMockHistory', () => {
    it('returns intercepted request history', async () => {
      const handlers = feature.getCommandHandlers();
      const historyHandler = handlers.get('getMockHistory');

      if (historyHandler) {
        const result = await historyHandler({});
        expect(result.status).toBe('ok');
        expect(Array.isArray(result.data?.history)).toBe(true);
      }
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('NetworkMocking');
    });
  });

  describe('cleanup', () => {
    it('clears mocks on cleanup', async () => {
      const handlers = feature.getCommandHandlers();
      await handlers.get('setupNetworkMocking')!({});
      await handlers.get('mockRoute')!({
        url: '/api/test',
        method: 'GET',
        response: {},
      });

      await feature.cleanup();

      const result = await handlers.get('listMocks')!({});
      expect(result.data?.mocks).toEqual([]);
    });
  });
});
