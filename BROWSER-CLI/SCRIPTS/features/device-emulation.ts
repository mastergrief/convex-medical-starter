/**
 * Device Emulation Feature
 * Provides mobile device preset emulation using Playwright's built-in device registry
 */
import { Page, devices } from 'playwright';
import { BaseFeature } from './base-feature';
import type { CommandHandler, CommandResponse } from '../core/types';

/**
 * Popular device presets from Playwright's device registry
 * These are the most commonly used devices for testing
 */
const POPULAR_DEVICES = [
  // iPhones
  'iPhone 14 Pro Max',
  'iPhone 14 Pro',
  'iPhone 14',
  'iPhone 13 Pro Max',
  'iPhone 13 Pro',
  'iPhone 13',
  'iPhone 12 Pro Max',
  'iPhone 12 Pro',
  'iPhone 12',
  'iPhone SE',
  // iPads
  'iPad Pro 11',
  'iPad Mini',
  // Android
  'Pixel 7',
  'Pixel 6',
  'Pixel 5',
  'Galaxy S9+',
  'Galaxy S8',
  'Galaxy Tab S4',
  // Other
  'Kindle Fire HDX',
  'Blackberry PlayBook',
];

/**
 * Device information returned in response
 */
interface DeviceInfo {
  name: string;
  viewport: {
    width: number;
    height: number;
  };
  userAgent: string;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
}

export class DeviceEmulationFeature extends BaseFeature {
  public readonly name = 'DeviceEmulation';
  private originalViewport: { width: number; height: number } | null = null;
  private currentDevice: string | null = null;

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['setMobilePreset', this.setPreset.bind(this)],
      ['listMobilePresets', this.listPresets.bind(this)],
      ['resetMobilePreset', this.resetPreset.bind(this)],
    ]);
  }

  /**
   * Set viewport and user agent to match a mobile device preset
   */
  private async setPreset(args: { device?: string }): Promise<CommandResponse> {
    if (!args.device) {
      return {
        status: 'error',
        message: 'Device name required. Use listMobilePresets to see available devices.',
      };
    }

    const deviceName = args.device;
    const deviceDescriptor = devices[deviceName];

    if (!deviceDescriptor) {
      // Try case-insensitive match
      const normalizedName = deviceName.toLowerCase();
      const matchedDevice = Object.keys(devices).find(
        (d) => d.toLowerCase() === normalizedName
      );

      if (matchedDevice) {
        return this.setPreset({ device: matchedDevice });
      }

      return {
        status: 'error',
        message: `Unknown device: "${deviceName}". Use listMobilePresets to see available devices.`,
      };
    }

    // Save original viewport if not already saved
    if (!this.originalViewport) {
      const viewportSize = this.page.viewportSize();
      this.originalViewport = viewportSize || { width: 1280, height: 720 };
    }

    // Apply device viewport
    await this.page.setViewportSize({
      width: deviceDescriptor.viewport.width,
      height: deviceDescriptor.viewport.height,
    });

    this.currentDevice = deviceName;
    this.log(`Applied device preset: ${deviceName}`);

    const deviceInfo: DeviceInfo = {
      name: deviceName,
      viewport: {
        width: deviceDescriptor.viewport.width,
        height: deviceDescriptor.viewport.height,
      },
      userAgent: deviceDescriptor.userAgent,
      deviceScaleFactor: deviceDescriptor.deviceScaleFactor,
      isMobile: deviceDescriptor.isMobile,
      hasTouch: deviceDescriptor.hasTouch,
    };

    const code = `// Apply device preset
await page.setViewportSize({ width: ${deviceDescriptor.viewport.width}, height: ${deviceDescriptor.viewport.height} });`;

    return {
      status: 'ok',
      data: {
        device: deviceInfo,
        previousViewport: this.originalViewport,
      },
      code,
    };
  }

  /**
   * List available mobile device presets
   */
  private async listPresets(): Promise<CommandResponse> {
    // Build list of popular devices with their details
    const popularDevices = POPULAR_DEVICES.filter((name) => devices[name]).map((name) => {
      const device = devices[name];
      return {
        name,
        viewport: `${device.viewport.width}x${device.viewport.height}`,
        isMobile: device.isMobile,
        hasTouch: device.hasTouch,
      };
    });

    // Get all available device names for reference
    const allDeviceNames = Object.keys(devices).sort();

    return {
      status: 'ok',
      data: {
        popular: popularDevices,
        totalAvailable: allDeviceNames.length,
        allDevices: allDeviceNames,
        currentDevice: this.currentDevice,
      },
    };
  }

  /**
   * Reset viewport to original size before device emulation was applied
   */
  private async resetPreset(): Promise<CommandResponse> {
    if (!this.originalViewport) {
      return {
        status: 'ok',
        data: {
          message: 'No device preset was applied. Viewport unchanged.',
          currentDevice: null,
        },
      };
    }

    await this.page.setViewportSize({
      width: this.originalViewport.width,
      height: this.originalViewport.height,
    });

    const previousDevice = this.currentDevice;
    const restoredViewport = { ...this.originalViewport };

    this.currentDevice = null;
    this.originalViewport = null;

    this.log('Reset to original viewport');

    const code = `// Reset viewport to original
await page.setViewportSize({ width: ${restoredViewport.width}, height: ${restoredViewport.height} });`;

    return {
      status: 'ok',
      data: {
        message: 'Viewport reset to original size',
        previousDevice,
        viewport: restoredViewport,
      },
      code,
    };
  }
}
