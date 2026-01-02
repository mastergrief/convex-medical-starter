/**
 * DragFeature Unit Tests
 * Tests CDP-based drag-and-drop functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { DragFeature } from '../../SCRIPTS/features/drag';
import { Page, CDPSession } from 'playwright';

// Extended mock with CDP session
interface ExtendedMockPage extends MockPage {
  context: ReturnType<typeof vi.fn>;
}

function createDragMockPage(): ExtendedMockPage {
  const baseMock = createMockPage();

  // Mock CDP session
  const mockCDPSession: Partial<CDPSession> = {
    send: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn().mockResolvedValue(undefined),
  };

  // Mock locator with bounding box
  const mockLocator = {
    boundingBox: vi.fn().mockResolvedValue({ x: 100, y: 100, width: 50, height: 50 }),
    evaluate: vi.fn().mockResolvedValue(null),
    isVisible: vi.fn().mockResolvedValue(true),
  };

  // Mock context with newCDPSession
  const mockContext = {
    newCDPSession: vi.fn().mockResolvedValue(mockCDPSession),
  };

  return {
    ...baseMock,
    locator: vi.fn().mockReturnValue(mockLocator),
    context: vi.fn().mockReturnValue(mockContext),
    // Override evaluate to return grip coords for CDP drag
    evaluate: vi.fn().mockResolvedValue({ x: 110, y: 125, found: false }),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
  };
}

describe('DragFeature', () => {
  let mockPage: ExtendedMockPage;
  let feature: DragFeature;

  beforeEach(() => {
    mockPage = createDragMockPage();
    feature = new DragFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with drag command handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.has('dragByRef')).toBe(true);
      expect(handlers.has('dragByCSS')).toBe(true);
      expect(handlers.size).toBe(2);
    });
  });

  describe('dragByCSS', () => {
    it('performs CDP drag between two CSS selectors', async () => {
      const handlers = feature.getCommandHandlers();
      const dragHandler = handlers.get('dragByCSS');
      expect(dragHandler).toBeDefined();

      const result = await dragHandler!({
        sourceSelector: '.source',
        targetSelector: '.target',
      });

      expect(result.status).toBe('ok');
      expect(mockPage.locator).toHaveBeenCalledWith('.source');
      expect(mockPage.locator).toHaveBeenCalledWith('.target');
    });

    it('returns error when source element not found', async () => {
      // Override to return null bounding box
      const mockLocator = {
        boundingBox: vi.fn().mockResolvedValue(null),
        evaluate: vi.fn().mockResolvedValue(null),
        isVisible: vi.fn().mockResolvedValue(false),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const dragHandler = handlers.get('dragByCSS');

      const result = await dragHandler!({
        sourceSelector: '.missing',
        targetSelector: '.target',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('not found');
    });
  });

  describe('dragByRef', () => {
    it('returns error when SnapshotFeature not set', async () => {
      const handlers = feature.getCommandHandlers();
      const dragHandler = handlers.get('dragByRef');

      const result = await dragHandler!({
        sourceRef: 'e5',
        targetRef: 'e10',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('SnapshotFeature');
    });

    it('resolves refs to CSS selectors when SnapshotFeature is set', async () => {
      // Mock SnapshotFeature
      const mockSnapshotFeature = {
        getRefMap: vi.fn().mockReturnValue(
          new Map([
            ['e5', { cssSelector: '.source-element' }],
            ['e10', { cssSelector: '.target-element' }],
          ])
        ),
      };
      feature.setSnapshotFeature(mockSnapshotFeature as any);

      const handlers = feature.getCommandHandlers();
      const dragHandler = handlers.get('dragByRef');

      const result = await dragHandler!({
        sourceRef: 'e5',
        targetRef: 'e10',
      });

      expect(result.status).toBe('ok');
    });

    it('returns error for invalid source ref', async () => {
      const mockSnapshotFeature = {
        getRefMap: vi.fn().mockReturnValue(new Map()),
      };
      feature.setSnapshotFeature(mockSnapshotFeature as any);

      const handlers = feature.getCommandHandlers();
      const dragHandler = handlers.get('dragByRef');

      const result = await dragHandler!({
        sourceRef: 'invalid',
        targetRef: 'e10',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid');
    });
  });

  describe('grip icon detection', () => {
    it('detects SVG grip icon and adjusts drag position', async () => {
      const mockLocator = {
        boundingBox: vi.fn().mockResolvedValue({ x: 100, y: 100, width: 200, height: 50 }),
        isVisible: vi.fn().mockResolvedValue(true),
      };
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);
      // Mock page.evaluate to return grip icon coordinates (grip icon found)
      mockPage.evaluate = vi.fn().mockResolvedValue({ x: 110, y: 125, found: true });

      const handlers = feature.getCommandHandlers();
      const dragHandler = handlers.get('dragByCSS');

      const result = await dragHandler!({
        sourceSelector: '.card-with-grip',
        targetSelector: '.target',
      });

      expect(result.status).toBe('ok');
      // Verify grip detection was attempted via page.evaluate
      expect(mockPage.evaluate).toHaveBeenCalled();
      // Verify data indicates grip was found
      expect(result.data?.gripFound).toBe(true);
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('Drag');
    });
  });
});
