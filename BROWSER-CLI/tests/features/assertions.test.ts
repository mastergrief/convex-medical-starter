/**
 * AssertionsFeature Unit Tests
 * Tests assertion framework for test validation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { AssertionsFeature } from '../../SCRIPTS/features/assertions';
import { Page } from 'playwright';

// Extended mock with assertion-specific methods
interface ExtendedMockPage extends MockPage {
  isVisible: ReturnType<typeof vi.fn>;
  isHidden: ReturnType<typeof vi.fn>;
  isEnabled: ReturnType<typeof vi.fn>;
  isDisabled: ReturnType<typeof vi.fn>;
  textContent: ReturnType<typeof vi.fn>;
  inputValue: ReturnType<typeof vi.fn>;
  isChecked: ReturnType<typeof vi.fn>;
  locator: ReturnType<typeof vi.fn>;
}

function createAssertionMockPage(): ExtendedMockPage {
  const baseMock = createMockPage();

  // Mock locator with assertion methods
  const mockLocator = {
    isVisible: vi.fn().mockResolvedValue(true),
    isHidden: vi.fn().mockResolvedValue(false),
    isEnabled: vi.fn().mockResolvedValue(true),
    isDisabled: vi.fn().mockResolvedValue(false),
    textContent: vi.fn().mockResolvedValue('Submit'),
    inputValue: vi.fn().mockResolvedValue('test value'),
    isChecked: vi.fn().mockResolvedValue(false),
    count: vi.fn().mockResolvedValue(5),
    evaluate: vi.fn().mockResolvedValue(undefined),
    boundingBox: vi.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 50 }),
  };

  return {
    ...baseMock,
    isVisible: vi.fn().mockResolvedValue(true),
    isHidden: vi.fn().mockResolvedValue(false),
    isEnabled: vi.fn().mockResolvedValue(true),
    isDisabled: vi.fn().mockResolvedValue(false),
    textContent: vi.fn().mockResolvedValue('Submit'),
    inputValue: vi.fn().mockResolvedValue('test value'),
    isChecked: vi.fn().mockResolvedValue(false),
    locator: vi.fn().mockReturnValue(mockLocator),
  };
}

describe('AssertionsFeature', () => {
  let mockPage: ExtendedMockPage;
  let feature: AssertionsFeature;

  beforeEach(() => {
    mockPage = createAssertionMockPage();
    feature = new AssertionsFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with assertion handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.has('assert')).toBe(true);
      expect(handlers.has('assertCount')).toBe(true);
      expect(handlers.has('assertConsole')).toBe(true);
      expect(handlers.has('assertNetwork')).toBe(true);
      expect(handlers.has('assertPerformance')).toBe(true);
      expect(handlers.has('getAssertionResults')).toBe(true);
      expect(handlers.has('clearAssertionResults')).toBe(true);
    });
  });

  describe('assert visible', () => {
    it('passes when element is visible', async () => {
      const handlers = feature.getCommandHandlers();
      const assertHandler = handlers.get('assert');

      const result = await assertHandler!({
        selector: 'e5',
        visible: true,
      });

      expect(result.status).toBe('ok');
      expect(result.data?.passed).toBe(true);
    });

    it('fails when element is not visible', async () => {
      // Override to return not visible
      const mockLocator = {
        isVisible: vi.fn().mockResolvedValue(false),
        count: vi.fn().mockResolvedValue(1),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      // Recreate feature with updated mock to pick up the new locator
      feature = new AssertionsFeature(mockPage as unknown as Page);

      const handlers = feature.getCommandHandlers();
      const assertHandler = handlers.get('assert');

      const result = await assertHandler!({
        selector: 'e5',
        visible: true,
      });

      // When assertion fails, status is 'error' (implementation behavior)
      expect(result.status).toBe('error');
      expect(result.data?.passed).toBe(false);
    });
  });

  describe('assert hidden', () => {
    it('passes when element is hidden', async () => {
      const mockLocator = {
        isVisible: vi.fn().mockResolvedValue(false),
        isHidden: vi.fn().mockResolvedValue(true),
        count: vi.fn().mockResolvedValue(1),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const assertHandler = handlers.get('assert');

      const result = await assertHandler!({
        selector: 'e5',
        hidden: true,
      });

      expect(result.status).toBe('ok');
      expect(result.data?.passed).toBe(true);
    });
  });

  describe('assert text', () => {
    it('passes when element text matches', async () => {
      const mockLocator = {
        textContent: vi.fn().mockResolvedValue('Submit'),
        count: vi.fn().mockResolvedValue(1),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const assertHandler = handlers.get('assert');

      const result = await assertHandler!({
        selector: 'e5',
        text: 'Submit',
      });

      expect(result.status).toBe('ok');
      expect(result.data?.passed).toBe(true);
    });

    it('fails when element text does not match', async () => {
      const mockLocator = {
        textContent: vi.fn().mockResolvedValue('Cancel'),
        count: vi.fn().mockResolvedValue(1),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      // Recreate feature with updated mock to pick up the new locator
      feature = new AssertionsFeature(mockPage as unknown as Page);

      const handlers = feature.getCommandHandlers();
      const assertHandler = handlers.get('assert');

      const result = await assertHandler!({
        selector: 'e5',
        text: 'Submit',
      });

      // When assertion fails, status is 'error' (implementation behavior)
      expect(result.status).toBe('error');
      expect(result.data?.passed).toBe(false);
    });
  });

  describe('assertCount', () => {
    it('passes when count equals expected', async () => {
      const mockLocator = {
        count: vi.fn().mockResolvedValue(5),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const assertCountHandler = handlers.get('assertCount');

      const result = await assertCountHandler!({
        selector: 'li.item',
        equals: 5,
      });

      expect(result.status).toBe('ok');
      expect(result.data?.passed).toBe(true);
    });

    it('passes when count is greater than expected', async () => {
      const mockLocator = {
        count: vi.fn().mockResolvedValue(10),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const assertCountHandler = handlers.get('assertCount');

      const result = await assertCountHandler!({
        selector: 'li.item',
        gt: 5,
      });

      expect(result.status).toBe('ok');
      expect(result.data?.passed).toBe(true);
    });

    it('fails when count is less than expected (gt check)', async () => {
      const mockLocator = {
        count: vi.fn().mockResolvedValue(3),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      // Recreate feature with updated mock to pick up the new locator
      feature = new AssertionsFeature(mockPage as unknown as Page);

      const handlers = feature.getCommandHandlers();
      const assertCountHandler = handlers.get('assertCount');

      const result = await assertCountHandler!({
        selector: 'li.item',
        gt: 5,
      });

      // When assertion fails, status is 'error' (implementation behavior)
      expect(result.status).toBe('error');
      expect(result.data?.passed).toBe(false);
    });
  });

  describe('assertConsole', () => {
    it('passes when no console errors exist', async () => {
      // Mock ConsoleCaptureFeature with no errors
      // Uses getAllMessages() as per the actual implementation
      const mockConsoleFeature = {
        getAllMessages: vi.fn().mockReturnValue([]),
      };
      feature.setConsoleCaptureFeature(mockConsoleFeature as any);

      const handlers = feature.getCommandHandlers();
      const assertConsoleHandler = handlers.get('assertConsole');

      const result = await assertConsoleHandler!({
        noErrors: true,
      });

      expect(result.status).toBe('ok');
      expect(result.data?.passed).toBe(true);
    });

    it('fails when console errors exist', async () => {
      // Create fresh feature and mock ConsoleCaptureFeature with errors
      feature = new AssertionsFeature(mockPage as unknown as Page);

      // Uses getAllMessages() as per the actual implementation
      const mockConsoleFeature = {
        getAllMessages: vi.fn().mockReturnValue([
          { type: 'error', text: 'React error' },
        ]),
      };
      feature.setConsoleCaptureFeature(mockConsoleFeature as any);

      const handlers = feature.getCommandHandlers();
      const assertConsoleHandler = handlers.get('assertConsole');

      const result = await assertConsoleHandler!({
        noErrors: true,
      });

      // When assertion fails, status is 'error' (implementation behavior)
      expect(result.status).toBe('error');
      expect(result.data?.passed).toBe(false);
    });
  });

  describe('getAssertionResults', () => {
    it('returns assertion history', async () => {
      // Run some assertions first
      const handlers = feature.getCommandHandlers();
      await handlers.get('assert')!({ selector: 'e5', check: 'visible' });
      await handlers.get('assertCount')!({ selector: 'li', operator: 'gt', count: 0 });

      const resultsHandler = handlers.get('getAssertionResults');
      const result = await resultsHandler!({});

      expect(result.status).toBe('ok');
      expect(Array.isArray(result.data?.results)).toBe(true);
      expect(result.data?.results.length).toBe(2);
    });
  });

  describe('clearAssertionResults', () => {
    it('clears assertion history', async () => {
      // Run some assertions first
      const handlers = feature.getCommandHandlers();
      await handlers.get('assert')!({ selector: 'e5', check: 'visible' });

      // Clear results
      const clearHandler = handlers.get('clearAssertionResults');
      await clearHandler!({});

      // Verify cleared
      const resultsHandler = handlers.get('getAssertionResults');
      const result = await resultsHandler!({});

      expect(result.data?.results).toEqual([]);
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('Assertions');
    });
  });

  describe('dependency injection', () => {
    it('accepts ConsoleCaptureFeature via setter', () => {
      const mockConsoleFeature = { getConsoleMessages: vi.fn() };
      expect(() => feature.setConsoleCaptureFeature(mockConsoleFeature as any)).not.toThrow();
    });

    it('accepts NetworkCaptureFeature via setter', () => {
      const mockNetworkFeature = { getRequests: vi.fn() };
      expect(() => feature.setNetworkCaptureFeature(mockNetworkFeature as any)).not.toThrow();
    });

    it('accepts PerformanceMetricsFeature via setter', () => {
      const mockPerfFeature = { getMetrics: vi.fn() };
      expect(() => feature.setPerformanceMetricsFeature(mockPerfFeature as any)).not.toThrow();
    });
  });
});
