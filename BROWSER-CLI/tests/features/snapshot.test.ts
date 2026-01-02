/**
 * SnapshotFeature Unit Tests
 * Tests command handler registration, snapshot capture, ref-based interactions, and form analysis
 */

import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { SnapshotFeature } from '../../SCRIPTS/features/snapshotModules/SnapshotFeature';
import { StateTrackingFeature } from '../../SCRIPTS/features/state-tracking';
import { Page, Locator } from 'playwright';

// Extended mock page with ariaSnapshot method for locators
interface SnapshotMockPage extends MockPage {
  getByRole: Mock;
}

interface SnapshotMockLocator {
  ariaSnapshot: Mock;
  click: Mock;
  dblclick: Mock;
  fill: Mock;
  hover: Mock;
  waitFor: Mock;
  first: Mock;
}

function createSnapshotMockLocator(overrides?: Partial<SnapshotMockLocator>): SnapshotMockLocator {
  const locator: SnapshotMockLocator = {
    ariaSnapshot: vi.fn().mockResolvedValue(`- document:
  - heading "Welcome" [level=1]
  - button "Submit"
  - textbox "Email"`),
    click: vi.fn().mockResolvedValue(undefined),
    dblclick: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    hover: vi.fn().mockResolvedValue(undefined),
    waitFor: vi.fn().mockResolvedValue(undefined),
    first: vi.fn(),
    ...overrides,
  };
  // first() returns self
  locator.first.mockReturnValue(locator);
  return locator;
}

function createSnapshotMockPage(overrides?: Partial<SnapshotMockPage>): SnapshotMockPage {
  const baseMock = createMockPage();
  const mockLocator = createSnapshotMockLocator();

  return {
    ...baseMock,
    locator: vi.fn().mockReturnValue(mockLocator),
    getByRole: vi.fn().mockReturnValue({
      click: vi.fn().mockResolvedValue(undefined),
      dblclick: vi.fn().mockResolvedValue(undefined),
      fill: vi.fn().mockResolvedValue(undefined),
      hover: vi.fn().mockResolvedValue(undefined),
      waitFor: vi.fn().mockResolvedValue(undefined),
      nth: vi.fn().mockReturnValue({
        click: vi.fn().mockResolvedValue(undefined),
        dblclick: vi.fn().mockResolvedValue(undefined),
        fill: vi.fn().mockResolvedValue(undefined),
        hover: vi.fn().mockResolvedValue(undefined),
        waitFor: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    ...overrides,
  };
}

describe('SnapshotFeature', () => {
  let mockPage: SnapshotMockPage;
  let feature: SnapshotFeature;

  beforeEach(() => {
    mockPage = createSnapshotMockPage();
    feature = new SnapshotFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 7 command handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(7);
    });

    it('registers snapshot handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('snapshot')).toBe(true);
      expect(typeof handlers.get('snapshot')).toBe('function');
    });

    it('registers changes handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('changes')).toBe(true);
    });

    it('registers clickByRef handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('clickByRef')).toBe(true);
    });

    it('registers dblclickByRef handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('dblclickByRef')).toBe(true);
    });

    it('registers typeByRef handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('typeByRef')).toBe(true);
    });

    it('registers hoverByRef handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('hoverByRef')).toBe(true);
    });

    it('registers waitForSelectorByRef handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('waitForSelectorByRef')).toBe(true);
    });
  });

  describe('snapshot command', () => {
    it('captures accessibility tree with refs', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;

      const result = await snapshot({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('snapshot');
      expect(result.data).toHaveProperty('refCount');
      expect(result.data).toHaveProperty('snapshotId');
    });

    it('generates refs for interactive elements', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;

      const result = await snapshot({});

      expect(result.status).toBe('ok');
      // Refs are generated for button and textbox elements
      expect((result.data as { refCount: number }).refCount).toBeGreaterThan(0);
    });

    it('uses fallback when ariaSnapshot returns empty', async () => {
      const mockLocator = createSnapshotMockLocator({
        ariaSnapshot: vi.fn().mockResolvedValue(''),
      });
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);
      // Mock content for DOM fallback
      mockPage.content = vi.fn().mockResolvedValue('<html><body><h1>Test</h1></body></html>');

      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;

      const result = await snapshot({});

      expect(result.status).toBe('ok');
      expect((result.data as { fallbackUsed: boolean }).fallbackUsed).toBe(true);
    });

    it('handles ariaSnapshot failure with fallback', async () => {
      const mockLocator = createSnapshotMockLocator({
        ariaSnapshot: vi.fn().mockRejectedValue(new Error('ariaSnapshot failed')),
      });
      mockPage.locator = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;

      const result = await snapshot({});

      // The feature catches errors and returns ok with error info
      expect(result.status).toBe('ok');
      expect((result.data as { snapshot: string }).snapshot).toContain('ERROR');
    });

    it('includes form analysis with --forms flag', async () => {
      // Mock document.querySelectorAll for form analysis
      mockPage.evaluate = vi.fn().mockResolvedValue([]);

      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;

      const result = await snapshot({ forms: true });

      expect(result.status).toBe('ok');
      expect((result.data as { snapshot: string }).snapshot).toContain('FORMS');
    });

    it('includes element state with --full flag', async () => {
      mockPage.evaluate = vi.fn().mockResolvedValue([]);

      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;

      const result = await snapshot({ full: true });

      expect(result.status).toBe('ok');
      expect((result.data as { snapshot: string }).snapshot).toContain('SNAPSHOT+');
      expect((result.data as { snapshot: string }).snapshot).toContain('ELEMENT STATE');
    });

    it('generates unique snapshotId for each capture', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;

      const result1 = await snapshot({});
      const result2 = await snapshot({});

      expect((result1.data as { snapshotId: string }).snapshotId).toBeDefined();
      expect((result2.data as { snapshotId: string }).snapshotId).toBeDefined();
      expect((result1.data as { snapshotId: string }).snapshotId).not.toBe(
        (result2.data as { snapshotId: string }).snapshotId
      );
    });

    it('tracks changes with state tracking enabled', async () => {
      // Create a mock state tracking feature
      const mockStateTracking = {
        markStateChanges: vi.fn((snapshot: string) => snapshot.replace('button', 'button <changed>')),
        getChangedElements: vi.fn().mockReturnValue(['e1']),
        getChangeCount: vi.fn().mockReturnValue(1),
      } as unknown as StateTrackingFeature;

      feature.setStateTracking(mockStateTracking);

      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;

      const result = await snapshot({});

      expect(result.status).toBe('ok');
      expect(mockStateTracking.markStateChanges).toHaveBeenCalled();
    });
  });

  describe('clickByRef', () => {
    it('returns error for non-existent ref', async () => {
      const handlers = feature.getCommandHandlers();
      const clickByRef = handlers.get('clickByRef')!;

      const result = await clickByRef({ ref: 'e999' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid ref');
    });

    it('clicks element by valid ref after snapshot', async () => {
      // First capture a snapshot to populate refMap
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;
      await snapshot({});

      const clickByRef = handlers.get('clickByRef')!;
      const result = await clickByRef({ ref: 'e1' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('ref', 'e1');
    });

    it('supports button options (e.g., right-click)', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;
      await snapshot({});

      const clickByRef = handlers.get('clickByRef')!;
      const result = await clickByRef({ ref: 'e1', button: 'right' });

      expect(result.status).toBe('ok');
    });

    it('includes selector in successful response', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;
      await snapshot({});

      const clickByRef = handlers.get('clickByRef')!;
      const result = await clickByRef({ ref: 'e1' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('selector');
    });
  });

  describe('dblclickByRef', () => {
    it('returns error for non-existent ref', async () => {
      const handlers = feature.getCommandHandlers();
      const dblclickByRef = handlers.get('dblclickByRef')!;

      const result = await dblclickByRef({ ref: 'e888' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid ref');
    });

    it('double-clicks element by valid ref after snapshot', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;
      await snapshot({});

      const dblclickByRef = handlers.get('dblclickByRef')!;
      const result = await dblclickByRef({ ref: 'e1' });

      expect(result.status).toBe('ok');
    });
  });

  describe('typeByRef', () => {
    it('returns error for non-existent ref', async () => {
      const handlers = feature.getCommandHandlers();
      const typeByRef = handlers.get('typeByRef')!;

      const result = await typeByRef({ ref: 'e777', text: 'test' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid ref');
    });

    it('types text into element by valid ref', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;
      await snapshot({});

      // Find a textbox ref
      const typeByRef = handlers.get('typeByRef')!;
      const result = await typeByRef({ ref: 'e2', text: 'test@example.com' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('text', 'test@example.com');
    });

    it('includes typed text in response data', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;
      await snapshot({});

      const typeByRef = handlers.get('typeByRef')!;
      const result = await typeByRef({ ref: 'e1', text: 'Hello World' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('text', 'Hello World');
    });
  });

  describe('hoverByRef', () => {
    it('returns error for non-existent ref', async () => {
      const handlers = feature.getCommandHandlers();
      const hoverByRef = handlers.get('hoverByRef')!;

      const result = await hoverByRef({ ref: 'e666' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid ref');
    });

    it('hovers over element by valid ref', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;
      await snapshot({});

      const hoverByRef = handlers.get('hoverByRef')!;
      const result = await hoverByRef({ ref: 'e1' });

      expect(result.status).toBe('ok');
    });
  });

  describe('changes command', () => {
    it('returns error when state tracking disabled', async () => {
      const handlers = feature.getCommandHandlers();
      const changes = handlers.get('changes')!;

      const result = await changes({});

      expect(result.status).toBe('error');
      expect(result.message).toContain('State tracking not enabled');
    });

    it('returns changed element refs when state tracking enabled', async () => {
      const mockStateTracking = {
        markStateChanges: vi.fn((snapshot: string) => snapshot),
        getChangedElements: vi.fn().mockReturnValue(['e1', 'e2']),
        getChangeCount: vi.fn().mockReturnValue(2),
      } as unknown as StateTrackingFeature;

      feature.setStateTracking(mockStateTracking);

      const handlers = feature.getCommandHandlers();
      const changes = handlers.get('changes')!;

      const result = await changes({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('changes');
      expect((result.data as { changes: string[] }).changes).toEqual(['e1', 'e2']);
      expect((result.data as { count: number }).count).toBe(2);
    });
  });

  describe('waitForSelectorByRef', () => {
    it('returns error for non-existent ref', async () => {
      const handlers = feature.getCommandHandlers();
      const waitForSelectorByRef = handlers.get('waitForSelectorByRef')!;

      const result = await waitForSelectorByRef({ ref: 'e555' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid ref');
    });

    it('waits for element by valid ref', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;
      await snapshot({});

      const waitForSelectorByRef = handlers.get('waitForSelectorByRef')!;
      const result = await waitForSelectorByRef({ ref: 'e1' });

      expect(result.status).toBe('ok');
    });

    it('supports state and timeout options', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;
      await snapshot({});

      const waitForSelectorByRef = handlers.get('waitForSelectorByRef')!;
      const result = await waitForSelectorByRef({ ref: 'e1', state: 'visible', timeout: 5000 });

      expect(result.status).toBe('ok');
    });
  });

  describe('getRefMap', () => {
    it('returns empty map before snapshot', () => {
      const refMap = feature.getRefMap();
      expect(refMap).toBeInstanceOf(Map);
      expect(refMap.size).toBe(0);
    });

    it('returns populated map after snapshot', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;
      await snapshot({});

      const refMap = feature.getRefMap();
      expect(refMap.size).toBeGreaterThan(0);
    });
  });

  describe('incremental snapshot mode', () => {
    it('indicates first snapshot in incremental mode', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;

      const result = await snapshot({ incremental: true });

      expect(result.status).toBe('ok');
      expect((result.data as { incremental: { isFirst: boolean } }).incremental.isFirst).toBe(true);
    });

    it('shows changes in subsequent incremental snapshots', async () => {
      const handlers = feature.getCommandHandlers();
      const snapshot = handlers.get('snapshot')!;

      // First snapshot
      await snapshot({ incremental: true });

      // Second snapshot
      const result = await snapshot({ incremental: true });

      expect(result.status).toBe('ok');
      expect((result.data as { incremental: { isFirst: boolean } }).incremental.isFirst).toBe(false);
      expect((result.data as { incremental: { summary: object } }).incremental.summary).toBeDefined();
    });
  });
});
