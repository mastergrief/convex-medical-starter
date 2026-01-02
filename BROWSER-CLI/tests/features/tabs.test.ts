/**
 * TabsFeature Unit Tests
 * Tests tab management: list, new, switch, close
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockPage, MockPage, createMockBrowserContext } from '../setup';
import { TabsFeature } from '../../SCRIPTS/features/tabs';
import { Page } from 'playwright';

describe('TabsFeature', () => {
  let mockPage: MockPage;
  let mockContext: ReturnType<typeof createMockBrowserContext>;
  let feature: TabsFeature;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPage = createMockPage();
    mockContext = createMockBrowserContext();
    // Wire up context to page
    (mockPage as any).context = vi.fn().mockReturnValue(mockContext);
    feature = new TabsFeature(mockPage as unknown as Page);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCommandHandlers', () => {
    it('returns Map with tabs command handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(1);
    });

    it('registers tabs handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('tabs')).toBe(true);
      expect(typeof handlers.get('tabs')).toBe('function');
    });
  });

  describe('tabs list', () => {
    it('lists all open tabs with URLs', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'list' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('tabs');
      expect(result.data).toHaveProperty('count');
      expect((result.data as any).count).toBe(1);
    });

    it('indicates current tab with index', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'list' });

      expect(result.status).toBe('ok');
      const tabs = (result.data as any).tabs;
      expect(tabs[0]).toHaveProperty('index', 0);
      expect(tabs[0]).toHaveProperty('url');
      expect(tabs[0]).toHaveProperty('title');
    });

    it('defaults to list action when no action provided', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('tabs');
    });
  });

  describe('tabs new', () => {
    it('opens new blank tab', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'new' });

      expect(result.status).toBe('ok');
      expect(mockContext.newPage).toHaveBeenCalled();
      expect((result.data as any)).toHaveProperty('index');
    });

    it('opens new tab with URL', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      // Configure the new page mock to have goto
      const newPageMock = createMockPage();
      mockContext.newPage.mockResolvedValue(newPageMock);

      const result = await tabsHandler({ action: 'new', url: 'http://example.com' });

      expect(result.status).toBe('ok');
      expect(mockContext.newPage).toHaveBeenCalled();
      expect(newPageMock.goto).toHaveBeenCalledWith('http://example.com', { waitUntil: 'networkidle' });
    });

    it('returns new tab info with index', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'new' });

      expect(result.status).toBe('ok');
      expect((result.data as any)).toHaveProperty('url');
      expect((result.data as any)).toHaveProperty('title');
      expect((result.data as any)).toHaveProperty('index');
    });
  });

  describe('tabs switch', () => {
    beforeEach(() => {
      // Setup context with multiple pages
      const page1 = createMockPage();
      const page2 = createMockPage();
      (page2 as any).bringToFront = vi.fn().mockResolvedValue(undefined);
      (page1 as any).bringToFront = vi.fn().mockResolvedValue(undefined);

      const mockPages = [page1, page2];
      mockContext.pages.mockReturnValue(mockPages);
    });

    it('switches to tab by valid index', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'switch', index: 1 });

      expect(result.status).toBe('ok');
      expect((result.data as any).index).toBe(1);
      const pages = mockContext.pages();
      expect(pages[1].bringToFront).toHaveBeenCalled();
    });

    it('returns error for missing index', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'switch' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('index required');
    });

    it('returns error for negative index', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'switch', index: -1 });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid tab index');
    });

    it('returns error for out-of-bounds index', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'switch', index: 99 });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid tab index');
      expect(result.message).toContain('Valid range');
    });
  });

  describe('tabs close', () => {
    beforeEach(() => {
      // Setup context with multiple pages
      const page1 = createMockPage();
      const page2 = createMockPage();

      const mockPages = [page1, page2];
      mockContext.pages.mockReturnValue(mockPages);
    });

    it('closes tab by index', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'close', index: 1 });

      expect(result.status).toBe('ok');
      expect((result.data as any).closedIndex).toBe(1);
      const pages = mockContext.pages();
      expect(pages[1].close).toHaveBeenCalled();
    });

    it('returns error for missing index', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'close' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('index required');
    });

    it('returns error when closing last tab', async () => {
      // Setup with only one page
      const singlePage = createMockPage();
      mockContext.pages.mockReturnValue([singlePage]);

      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'close', index: 0 });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Cannot close the last remaining tab');
    });

    it('returns error for invalid index', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'close', index: 99 });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid tab index');
    });

    it('returns closed tab info on success', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'close', index: 0 });

      expect(result.status).toBe('ok');
      expect((result.data as any)).toHaveProperty('closedIndex');
      expect((result.data as any)).toHaveProperty('closedUrl');
      expect((result.data as any)).toHaveProperty('remainingTabs');
    });
  });

  describe('unknown action', () => {
    it('returns error for unknown action', async () => {
      const handlers = feature.getCommandHandlers();
      const tabsHandler = handlers.get('tabs')!;

      const result = await tabsHandler({ action: 'unknown' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Unknown action');
      expect(result.message).toContain('unknown');
    });
  });
});
