/**
 * DeviceEmulationFeature Unit Tests
 * Tests device preset emulation with viewport manipulation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { DeviceEmulationFeature } from '../../SCRIPTS/features/device-emulation';
import { Page } from 'playwright';

// Extended mock page with viewportSize method needed by DeviceEmulationFeature
interface ExtendedMockPage extends MockPage {
  viewportSize: ReturnType<typeof vi.fn>;
}

function createExtendedMockPage(overrides?: Partial<ExtendedMockPage>): ExtendedMockPage {
  const baseMock = createMockPage();

  return {
    ...baseMock,
    viewportSize: vi.fn().mockReturnValue({ width: 1280, height: 720 }),
    ...overrides,
  };
}

describe('DeviceEmulationFeature', () => {
  let mockPage: ExtendedMockPage;
  let feature: DeviceEmulationFeature;

  beforeEach(() => {
    mockPage = createExtendedMockPage();
    feature = new DeviceEmulationFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 3 command handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(3);
    });

    it('registers setMobilePreset handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('setMobilePreset')).toBe(true);
      expect(typeof handlers.get('setMobilePreset')).toBe('function');
    });

    it('registers listMobilePresets handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('listMobilePresets')).toBe(true);
      expect(typeof handlers.get('listMobilePresets')).toBe('function');
    });

    it('registers resetMobilePreset handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('resetMobilePreset')).toBe(true);
      expect(typeof handlers.get('resetMobilePreset')).toBe('function');
    });
  });

  describe('setMobilePreset command', () => {
    it('sets valid preset (iPhone 12)', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;

      const result = await setMobilePreset({ device: 'iPhone 12' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('device');
      expect(result.data.device.name).toBe('iPhone 12');
      expect(result.code).toContain('page.setViewportSize');
    });

    it('returns error for invalid preset', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;

      const result = await setMobilePreset({ device: 'NonExistent Device 999' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Unknown device');
      expect(result.message).toContain('NonExistent Device 999');
    });

    it('returns error when device name not provided', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;

      const result = await setMobilePreset({});

      expect(result.status).toBe('error');
      expect(result.message).toContain('Device name required');
    });

    it('updates viewport dimensions', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;

      await setMobilePreset({ device: 'iPhone 12' });

      expect(mockPage.setViewportSize).toHaveBeenCalled();
      const callArgs = mockPage.setViewportSize.mock.calls[0][0];
      expect(callArgs).toHaveProperty('width');
      expect(callArgs).toHaveProperty('height');
      expect(callArgs.width).toBeGreaterThan(0);
      expect(callArgs.height).toBeGreaterThan(0);
    });

    it('saves original viewport before applying preset', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;

      const result = await setMobilePreset({ device: 'iPhone 12' });

      expect(result.data).toHaveProperty('previousViewport');
      expect(result.data.previousViewport).toEqual({ width: 1280, height: 720 });
    });

    it('returns device info with viewport, userAgent, isMobile, hasTouch', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;

      const result = await setMobilePreset({ device: 'iPhone 12' });

      expect(result.data.device).toHaveProperty('viewport');
      expect(result.data.device).toHaveProperty('userAgent');
      expect(result.data.device).toHaveProperty('deviceScaleFactor');
      expect(result.data.device).toHaveProperty('isMobile');
      expect(result.data.device).toHaveProperty('hasTouch');
    });

    it('handles case-insensitive device names', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;

      const result = await setMobilePreset({ device: 'iphone 12' });

      expect(result.status).toBe('ok');
      expect(result.data.device.name).toBe('iPhone 12');
    });
  });

  describe('listMobilePresets command', () => {
    it('returns list of available presets', async () => {
      const handlers = feature.getCommandHandlers();
      const listMobilePresets = handlers.get('listMobilePresets')!;

      const result = await listMobilePresets({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('popular');
      expect(result.data).toHaveProperty('allDevices');
      expect(result.data).toHaveProperty('totalAvailable');
    });

    it('each preset has name, viewport, isMobile, hasTouch', async () => {
      const handlers = feature.getCommandHandlers();
      const listMobilePresets = handlers.get('listMobilePresets')!;

      const result = await listMobilePresets({});

      expect(Array.isArray(result.data.popular)).toBe(true);
      expect(result.data.popular.length).toBeGreaterThan(0);

      const firstPreset = result.data.popular[0];
      expect(firstPreset).toHaveProperty('name');
      expect(firstPreset).toHaveProperty('viewport');
      expect(firstPreset).toHaveProperty('isMobile');
      expect(firstPreset).toHaveProperty('hasTouch');
    });

    it('viewport format is widthxheight string', async () => {
      const handlers = feature.getCommandHandlers();
      const listMobilePresets = handlers.get('listMobilePresets')!;

      const result = await listMobilePresets({});

      const firstPreset = result.data.popular[0];
      expect(firstPreset.viewport).toMatch(/^\d+x\d+$/);
    });

    it('returns total available device count', async () => {
      const handlers = feature.getCommandHandlers();
      const listMobilePresets = handlers.get('listMobilePresets')!;

      const result = await listMobilePresets({});

      expect(typeof result.data.totalAvailable).toBe('number');
      expect(result.data.totalAvailable).toBeGreaterThan(0);
    });

    it('returns current device when one is set', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;
      const listMobilePresets = handlers.get('listMobilePresets')!;

      await setMobilePreset({ device: 'iPhone 12' });
      const result = await listMobilePresets({});

      expect(result.data.currentDevice).toBe('iPhone 12');
    });

    it('returns null currentDevice when none is set', async () => {
      const handlers = feature.getCommandHandlers();
      const listMobilePresets = handlers.get('listMobilePresets')!;

      const result = await listMobilePresets({});

      expect(result.data.currentDevice).toBeNull();
    });
  });

  describe('resetMobilePreset command', () => {
    it('resets to desktop viewport after preset was applied', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;
      const resetMobilePreset = handlers.get('resetMobilePreset')!;

      await setMobilePreset({ device: 'iPhone 12' });
      const result = await resetMobilePreset({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('viewport');
      expect(result.data.viewport).toEqual({ width: 1280, height: 720 });
    });

    it('returns success response with message', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;
      const resetMobilePreset = handlers.get('resetMobilePreset')!;

      await setMobilePreset({ device: 'iPhone 12' });
      const result = await resetMobilePreset({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('message');
      expect(result.data.message).toContain('reset');
    });

    it('returns previous device name', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;
      const resetMobilePreset = handlers.get('resetMobilePreset')!;

      await setMobilePreset({ device: 'iPhone 12' });
      const result = await resetMobilePreset({});

      expect(result.data.previousDevice).toBe('iPhone 12');
    });

    it('calls page.setViewportSize with original dimensions', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;
      const resetMobilePreset = handlers.get('resetMobilePreset')!;

      await setMobilePreset({ device: 'iPhone 12' });
      mockPage.setViewportSize.mockClear();
      await resetMobilePreset({});

      expect(mockPage.setViewportSize).toHaveBeenCalledWith({ width: 1280, height: 720 });
    });

    it('includes code in response', async () => {
      const handlers = feature.getCommandHandlers();
      const setMobilePreset = handlers.get('setMobilePreset')!;
      const resetMobilePreset = handlers.get('resetMobilePreset')!;

      await setMobilePreset({ device: 'iPhone 12' });
      const result = await resetMobilePreset({});

      expect(result.code).toContain('page.setViewportSize');
      expect(result.code).toContain('1280');
      expect(result.code).toContain('720');
    });

    it('handles reset when no preset was applied', async () => {
      const handlers = feature.getCommandHandlers();
      const resetMobilePreset = handlers.get('resetMobilePreset')!;

      const result = await resetMobilePreset({});

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('message');
      expect(result.data.message).toContain('No device preset was applied');
      expect(result.data.currentDevice).toBeNull();
    });

    it('does not call setViewportSize when no preset was applied', async () => {
      const handlers = feature.getCommandHandlers();
      const resetMobilePreset = handlers.get('resetMobilePreset')!;

      await resetMobilePreset({});

      expect(mockPage.setViewportSize).not.toHaveBeenCalled();
    });
  });
});
