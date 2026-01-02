/**
 * Device emulation command help texts
 * Commands: setMobilePreset, listMobilePresets, resetMobilePreset
 */

import type { CommandHelpRecord } from './types';

export const deviceEmulationHelp: CommandHelpRecord = {
  setMobilePreset: `Usage: browser-cmd setMobilePreset <name>

Set device emulation preset

Available Presets:
  - iPhone 12
  - iPhone 14
  - iPhone 14 Pro Max
  - iPad Pro
  - Galaxy S21
  - Pixel 5

Emulates:
  - Viewport dimensions
  - Device scale factor
  - Touch support
  - User agent

Examples:
  browser-cmd setMobilePreset "iPhone 12"
  browser-cmd setMobilePreset "iPad Pro"`,

  listMobilePresets: `Usage: browser-cmd listMobilePresets

List available device presets

Examples:
  browser-cmd listMobilePresets`,

  resetMobilePreset: `Usage: browser-cmd resetMobilePreset

Reset to desktop viewport

Clears device emulation and returns to default desktop settings.

Examples:
  browser-cmd resetMobilePreset`,
};
