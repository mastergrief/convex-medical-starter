/**
 * DOMInspectionFeature Unit Tests
 * Tests command handler registration and execution for DOM inspection commands
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { DOMInspectionFeature } from '../../SCRIPTS/features/dom-inspection';
import { Page } from 'playwright';

// Extended mock page with locator that has evaluate and count
interface ExtendedMockPage extends MockPage {
  locator: ReturnType<typeof vi.fn>;
}

function createExtendedMockPage(overrides?: Partial<ExtendedMockPage>): ExtendedMockPage {
  const baseMock = createMockPage();

  // Create locator mock with evaluate and count
  const mockLocator = {
    evaluate: vi.fn().mockResolvedValue({}),
    count: vi.fn().mockResolvedValue(0),
  };

  return {
    ...baseMock,
    locator: vi.fn().mockReturnValue(mockLocator),
    ...overrides,
  };
}

describe('DOMInspectionFeature', () => {
  let mockPage: ExtendedMockPage;
  let feature: DOMInspectionFeature;

  beforeEach(() => {
    mockPage = createExtendedMockPage();
    feature = new DOMInspectionFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 4 handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(4);
    });

    it('registers countElements handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('countElements')).toBe(true);
      expect(typeof handlers.get('countElements')).toBe('function');
    });

    it('registers getElementVisibility handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('getElementVisibility')).toBe(true);
      expect(typeof handlers.get('getElementVisibility')).toBe('function');
    });

    it('registers getComputedStyle handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('getComputedStyle')).toBe(true);
      expect(typeof handlers.get('getComputedStyle')).toBe('function');
    });

    it('registers getOverlayingElements handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('getOverlayingElements')).toBe(true);
      expect(typeof handlers.get('getOverlayingElements')).toBe('function');
    });
  });

  describe('countElements command', () => {
    it('returns count for valid selector', async () => {
      const mockLocator = mockPage.locator('.button');
      mockLocator.count.mockResolvedValue(5);

      const handlers = feature.getCommandHandlers();
      const countElements = handlers.get('countElements')!;

      const result = await countElements({ selector: '.button' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('count', 5);
      expect(result.code).toContain('page.locator');
      expect(result.code).toContain('.count()');
    });

    it('returns 0 for no matches', async () => {
      const mockLocator = mockPage.locator('.nonexistent');
      mockLocator.count.mockResolvedValue(0);

      const handlers = feature.getCommandHandlers();
      const countElements = handlers.get('countElements')!;

      const result = await countElements({ selector: '.nonexistent' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('count', 0);
    });

    it('returns error for invalid selector', async () => {
      const mockLocator = mockPage.locator('invalid[[[');
      mockLocator.count.mockRejectedValue(new Error('Malformed selector'));

      const handlers = feature.getCommandHandlers();
      const countElements = handlers.get('countElements')!;

      const result = await countElements({ selector: 'invalid[[[' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Malformed selector');
    });
  });

  describe('getElementVisibility command', () => {
    it('returns visible for visible elements', async () => {
      const mockLocator = mockPage.locator('.visible-element');
      mockLocator.evaluate.mockResolvedValue({
        visible: true,
        reasons: {
          hasSize: true,
          notHidden: true,
          notDisplayNone: true,
          opacity: 1,
          inViewport: true,
        },
        boundingBox: { x: 100, y: 200, width: 150, height: 50 },
      });

      const handlers = feature.getCommandHandlers();
      const getElementVisibility = handlers.get('getElementVisibility')!;

      const result = await getElementVisibility({ selector: '.visible-element' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('visible', true);
      expect(result.data).toHaveProperty('reasons');
      expect((result.data as { reasons: { hasSize: boolean } }).reasons.hasSize).toBe(true);
      expect(result.code).toContain('visibility analysis');
    });

    it('returns hidden with reasons', async () => {
      const mockLocator = mockPage.locator('.hidden-element');
      mockLocator.evaluate.mockResolvedValue({
        visible: false,
        reasons: {
          hasSize: true,
          notHidden: false, // visibility: hidden
          notDisplayNone: true,
          opacity: 1,
          inViewport: true,
        },
        boundingBox: { x: 100, y: 200, width: 150, height: 50 },
      });

      const handlers = feature.getCommandHandlers();
      const getElementVisibility = handlers.get('getElementVisibility')!;

      const result = await getElementVisibility({ selector: '.hidden-element' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('visible', false);
      expect((result.data as { reasons: { notHidden: boolean } }).reasons.notHidden).toBe(false);
    });

    it('checks display, visibility, opacity', async () => {
      const mockLocator = mockPage.locator('.styled-element');
      mockLocator.evaluate.mockResolvedValue({
        visible: false,
        reasons: {
          hasSize: false, // width/height is 0
          notHidden: true,
          notDisplayNone: false, // display: none
          opacity: 0.5,
          inViewport: true,
        },
        boundingBox: null,
      });

      const handlers = feature.getCommandHandlers();
      const getElementVisibility = handlers.get('getElementVisibility')!;

      const result = await getElementVisibility({ selector: '.styled-element' });

      expect(result.status).toBe('ok');
      const data = result.data as {
        visible: boolean;
        reasons: { hasSize: boolean; notDisplayNone: boolean; opacity: number };
        boundingBox: null;
      };
      expect(data.visible).toBe(false);
      expect(data.reasons.hasSize).toBe(false);
      expect(data.reasons.notDisplayNone).toBe(false);
      expect(data.reasons.opacity).toBe(0.5);
      expect(data.boundingBox).toBeNull();
    });

    it('returns error when element not found', async () => {
      const mockLocator = mockPage.locator('.nonexistent');
      mockLocator.evaluate.mockRejectedValue(new Error('Element not found'));

      const handlers = feature.getCommandHandlers();
      const getElementVisibility = handlers.get('getElementVisibility')!;

      const result = await getElementVisibility({ selector: '.nonexistent' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Element not found');
    });
  });

  describe('getComputedStyle command', () => {
    it('returns property value', async () => {
      const mockLocator = mockPage.locator('.styled');
      mockLocator.evaluate.mockResolvedValue({
        display: 'flex',
        visibility: 'visible',
        opacity: '1',
        position: 'relative',
        width: '200px',
        height: '100px',
        color: 'rgb(0, 0, 0)',
        'background-color': 'rgb(255, 255, 255)',
        'font-size': '16px',
        'z-index': 'auto',
      });

      const handlers = feature.getCommandHandlers();
      const getComputedStyle = handlers.get('getComputedStyle')!;

      const result = await getComputedStyle({ selector: '.styled' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('styles');
      const styles = (result.data as { styles: Record<string, string> }).styles;
      expect(styles.display).toBe('flex');
      expect(styles.visibility).toBe('visible');
      expect(result.code).toContain('getComputedStyle');
    });

    it('returns error for missing element', async () => {
      const mockLocator = mockPage.locator('.missing');
      mockLocator.evaluate.mockRejectedValue(new Error('Element not attached to DOM'));

      const handlers = feature.getCommandHandlers();
      const getComputedStyle = handlers.get('getComputedStyle')!;

      const result = await getComputedStyle({ selector: '.missing' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('not attached');
    });

    it('handles various CSS properties', async () => {
      const mockLocator = mockPage.locator('.complex');
      mockLocator.evaluate.mockResolvedValue({
        'border-radius': '8px',
        'box-shadow': 'none',
      });

      const handlers = feature.getCommandHandlers();
      const getComputedStyle = handlers.get('getComputedStyle')!;

      const result = await getComputedStyle({
        selector: '.complex',
        properties: ['border-radius', 'box-shadow'],
      });

      expect(result.status).toBe('ok');
      const styles = (result.data as { styles: Record<string, string> }).styles;
      expect(styles['border-radius']).toBe('8px');
      expect(styles['box-shadow']).toBe('none');
    });

    it('returns common styles when no properties specified', async () => {
      const mockLocator = mockPage.locator('.element');
      mockLocator.evaluate.mockResolvedValue({
        display: 'block',
        visibility: 'visible',
        opacity: '1',
        position: 'static',
        width: '100px',
        height: '50px',
        color: 'rgb(0, 0, 0)',
        'background-color': 'transparent',
        'font-size': '14px',
        'z-index': 'auto',
      });

      const handlers = feature.getCommandHandlers();
      const getComputedStyle = handlers.get('getComputedStyle')!;

      const result = await getComputedStyle({ selector: '.element' });

      expect(result.status).toBe('ok');
      const styles = (result.data as { styles: Record<string, string> }).styles;
      // Should return common styles
      expect(styles).toHaveProperty('display');
      expect(styles).toHaveProperty('visibility');
      expect(styles).toHaveProperty('opacity');
      expect(styles).toHaveProperty('position');
    });
  });

  describe('getOverlayingElements command', () => {
    it('returns empty when no overlays', async () => {
      const mockLocator = mockPage.locator('.unblocked');
      mockLocator.evaluate.mockResolvedValue({
        elementAtPoint: 'div',
        overlayingElements: [],
        isBlocked: false,
      });

      const handlers = feature.getCommandHandlers();
      const getOverlayingElements = handlers.get('getOverlayingElements')!;

      const result = await getOverlayingElements({ selector: '.unblocked' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('overlayingElements');
      expect((result.data as { overlayingElements: unknown[] }).overlayingElements).toHaveLength(0);
      expect((result.data as { isBlocked: boolean }).isBlocked).toBe(false);
      expect(result.code).toContain('overlay analysis');
    });

    it('detects overlaying elements', async () => {
      const mockLocator = mockPage.locator('.blocked');
      mockLocator.evaluate.mockResolvedValue({
        elementAtPoint: 'div#modal',
        overlayingElements: [
          { tagName: 'div', id: 'modal', classes: ['modal', 'open'] },
          { tagName: 'div', id: 'overlay', classes: ['backdrop'] },
        ],
        isBlocked: true,
      });

      const handlers = feature.getCommandHandlers();
      const getOverlayingElements = handlers.get('getOverlayingElements')!;

      const result = await getOverlayingElements({ selector: '.blocked' });

      expect(result.status).toBe('ok');
      expect((result.data as { isBlocked: boolean }).isBlocked).toBe(true);
      const overlays = (result.data as { overlayingElements: Array<{ tagName: string; id: string; classes: string[] }> }).overlayingElements;
      expect(overlays).toHaveLength(2);
      expect(overlays[0].tagName).toBe('div');
      expect(overlays[0].id).toBe('modal');
    });

    it('returns overlay details', async () => {
      const mockLocator = mockPage.locator('.target');
      mockLocator.evaluate.mockResolvedValue({
        elementAtPoint: 'div#tooltip',
        overlayingElements: [
          { tagName: 'div', id: 'tooltip', classes: ['tooltip', 'visible', 'top'] },
        ],
        isBlocked: true,
      });

      const handlers = feature.getCommandHandlers();
      const getOverlayingElements = handlers.get('getOverlayingElements')!;

      const result = await getOverlayingElements({ selector: '.target' });

      expect(result.status).toBe('ok');
      const overlays = (result.data as { overlayingElements: Array<{ tagName: string; id: string; classes: string[] }> }).overlayingElements;
      expect(overlays[0].classes).toContain('tooltip');
      expect(overlays[0].classes).toContain('visible');
      expect((result.data as { elementAtPoint: string }).elementAtPoint).toBe('div#tooltip');
    });

    it('returns error when element not found', async () => {
      const mockLocator = mockPage.locator('.missing');
      mockLocator.evaluate.mockRejectedValue(new Error('Element not found'));

      const handlers = feature.getCommandHandlers();
      const getOverlayingElements = handlers.get('getOverlayingElements')!;

      const result = await getOverlayingElements({ selector: '.missing' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Element not found');
    });
  });
});
