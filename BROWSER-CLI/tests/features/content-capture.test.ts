/**
 * ContentCaptureFeature Unit Tests
 * Tests content extraction capabilities (HTML and text)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { ContentCaptureFeature } from '../../SCRIPTS/features/content-capture';
import { Page } from 'playwright';

// Extended mock with content-specific methods
interface ExtendedMockPage extends MockPage {
  innerText: ReturnType<typeof vi.fn>;
}

function createContentMockPage(): ExtendedMockPage {
  const baseMock = createMockPage();

  // Mock locator with content extraction methods
  const mockLocator = {
    evaluate: vi.fn().mockResolvedValue('<div class="test">Hello World</div>'),
    innerText: vi.fn().mockResolvedValue('Hello World'),
  };

  return {
    ...baseMock,
    innerText: vi.fn().mockResolvedValue('Page body text content'),
    content: vi.fn().mockResolvedValue('<!DOCTYPE html><html><head></head><body>Test Page</body></html>'),
    locator: vi.fn().mockReturnValue(mockLocator),
  };
}

describe('ContentCaptureFeature', () => {
  let mockPage: ExtendedMockPage;
  let feature: ContentCaptureFeature;

  beforeEach(() => {
    mockPage = createContentMockPage();
    feature = new ContentCaptureFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 4 handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(4);
      expect(handlers.has('getPageHTML')).toBe(true);
      expect(handlers.has('getPageText')).toBe(true);
      expect(handlers.has('getElementHTML')).toBe(true);
      expect(handlers.has('getElementText')).toBe(true);
    });
  });

  describe('getPageHTML', () => {
    it('returns full page HTML', async () => {
      const handlers = feature.getCommandHandlers();
      const handler = handlers.get('getPageHTML');

      const result = await handler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.length).toBeGreaterThan(0);
      expect(result.data?.preview).toContain('<!DOCTYPE html>');
      expect(result.code).toContain('page.content()');
      expect(mockPage.content).toHaveBeenCalled();
    });

    it('returns error on failure', async () => {
      mockPage.content = vi.fn().mockRejectedValue(new Error('Page not loaded'));

      // Recreate feature with updated mock
      feature = new ContentCaptureFeature(mockPage as unknown as Page);

      const handlers = feature.getCommandHandlers();
      const handler = handlers.get('getPageHTML');

      const result = await handler!({});

      expect(result.status).toBe('error');
      expect(result.message).toBe('Page not loaded');
    });
  });

  describe('getPageText', () => {
    it('returns page text content', async () => {
      const handlers = feature.getCommandHandlers();
      const handler = handlers.get('getPageText');

      const result = await handler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.length).toBeGreaterThan(0);
      expect(result.data?.preview).toContain('Page body text content');
      expect(result.code).toContain("page.innerText('body')");
      expect(mockPage.innerText).toHaveBeenCalledWith('body');
    });

    it('strips HTML tags (returns text only)', async () => {
      // Verify the mock returns plain text without HTML tags
      const handlers = feature.getCommandHandlers();
      const handler = handlers.get('getPageText');

      const result = await handler!({});

      expect(result.status).toBe('ok');
      // The preview should not contain HTML tags
      expect(result.data?.preview).not.toContain('<');
      expect(result.data?.preview).not.toContain('>');
    });

    it('returns error on failure', async () => {
      mockPage.innerText = vi.fn().mockRejectedValue(new Error('Body not found'));

      // Recreate feature with updated mock
      feature = new ContentCaptureFeature(mockPage as unknown as Page);

      const handlers = feature.getCommandHandlers();
      const handler = handlers.get('getPageText');

      const result = await handler!({});

      expect(result.status).toBe('error');
      expect(result.message).toBe('Body not found');
    });
  });

  describe('getElementHTML', () => {
    it('returns element HTML by selector', async () => {
      const handlers = feature.getCommandHandlers();
      const handler = handlers.get('getElementHTML');

      const result = await handler!({ selector: '.test' });

      expect(result.status).toBe('ok');
      expect(result.data?.html).toBe('<div class="test">Hello World</div>');
      expect(result.data?.length).toBe('<div class="test">Hello World</div>'.length);
      expect(result.code).toContain("page.locator('.test')");
      expect(result.code).toContain('el.outerHTML');
      expect(mockPage.locator).toHaveBeenCalledWith('.test');
    });

    it('returns error for missing element', async () => {
      const mockLocator = {
        evaluate: vi.fn().mockRejectedValue(new Error('Element not found')),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      // Recreate feature with updated mock
      feature = new ContentCaptureFeature(mockPage as unknown as Page);

      const handlers = feature.getCommandHandlers();
      const handler = handlers.get('getElementHTML');

      const result = await handler!({ selector: '.nonexistent' });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Element not found');
    });
  });

  describe('getElementText', () => {
    it('returns element text by selector', async () => {
      const handlers = feature.getCommandHandlers();
      const handler = handlers.get('getElementText');

      const result = await handler!({ selector: '.test' });

      expect(result.status).toBe('ok');
      expect(result.data?.text).toBe('Hello World');
      expect(result.data?.length).toBe('Hello World'.length);
      expect(result.code).toContain("page.locator('.test')");
      expect(result.code).toContain('.innerText()');
      expect(mockPage.locator).toHaveBeenCalledWith('.test');
    });

    it('returns error for missing element', async () => {
      const mockLocator = {
        innerText: vi.fn().mockRejectedValue(new Error('Element not found')),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      // Recreate feature with updated mock
      feature = new ContentCaptureFeature(mockPage as unknown as Page);

      const handlers = feature.getCommandHandlers();
      const handler = handlers.get('getElementText');

      const result = await handler!({ selector: '.nonexistent' });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Element not found');
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('ContentCapture');
    });
  });
});
