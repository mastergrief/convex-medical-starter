/**
 * Plugin Validator - Browser-CLI P3.1
 *
 * Validates plugin structure and ensures command names don't conflict
 * with built-in commands.
 */

import { BrowserCLIPlugin, PluginCommand } from './plugin-interface';

/**
 * Result of plugin validation.
 */
export interface ValidationResult {
  /** Whether the plugin passed all validation checks */
  valid: boolean;
  /** Critical errors that prevent loading */
  errors: string[];
  /** Non-critical warnings */
  warnings: string[];
}

/**
 * Reserved command prefixes that plugins cannot use.
 */
const RESERVED_PREFIXES = ['plugin_', 'internal_', '_', 'browser_'];

/**
 * Built-in commands that plugins cannot override.
 */
const BUILT_IN_COMMANDS = new Set([
  // Navigation
  'start',
  'navigate',
  // Interaction
  'click',
  'clickByRef',
  'clickBySemantic',
  'dblclick',
  'dblclickByRef',
  'dblclickBySemantic',
  'type',
  'typeByRef',
  'typeBySemantic',
  'pressKey',
  'pressKeyCombo',
  'holdKey',
  'tapKey',
  'hover',
  'hoverByRef',
  'hoverBySemantic',
  'drag',
  'dragByRef',
  'dragByCSS',
  'selectOption',
  'fillForm',
  'uploadFile',
  // Waiting
  'wait',
  'waitForSelector',
  'waitForSelectorByRef',
  'waitForSelectorBySemantic',
  // Capture
  'snapshot',
  'changes',
  'screenshot',
  'clearConsole',
  'listBaselines',
  // Tabs
  'tabs',
  'newTab',
  'switchTab',
  'closeTab',
  // Utility
  'resize',
  'evaluate',
  'console',
  'network',
  'networkClear',
  'status',
  'close',
  // Phase 2
  'exec',
  'saveState',
  'restoreState',
  'listStates',
  'deleteState',
  'saveBrowserState',
  'restoreBrowserState',
  'listBrowserStates',
  'deleteBrowserState',
  'saveSnapshotBaseline',
  'compareSnapshots',
  // Phase 3
  'saveScreenshotBaseline',
  'compareScreenshots',
  'listScreenshotBaselines',
  'setupNetworkMocking',
  'mockRoute',
  'clearMocks',
  'listMocks',
  'listSchemas',
  'validateMock',
  'loadSchema',
  'capturePerformanceMetrics',
  'getPerformanceMetrics',
  'abortRoute',
  'modifyRequestHeaders',
  'modifyResponseHeaders',
  'blockByPattern',
  'listAborts',
  'getMockHistory',
  'disableMock',
  'enableMock',
  // Content
  'getPageHTML',
  'getPageText',
  'getElementHTML',
  'getElementText',
  // Events
  'getEventLog',
  'clearEventLog',
  'waitForEvent',
  'dismissDialog',
  'acceptDialog',
  // DOM Inspection
  'getComputedStyle',
  'getElementVisibility',
  'getOverlayingElements',
  'countElements',
  // Buffer Management
  'getConsoleBufferStats',
  'setConsoleBufferCapacity',
  'getNetworkBufferStats',
  'setNetworkBufferCapacity',
  'getEventBufferStats',
  'setEventBufferCapacity',
  // Assertions
  'assert',
  'assertCount',
  'assertConsole',
  'assertNetwork',
  'assertPerformance',
  'getAssertionResults',
  'clearAssertionResults',
  // Runtime Configuration
  'setHeadless',
  // Device Emulation
  'setMobilePreset',
  'listMobilePresets',
  'resetMobilePreset',
  // Video Recording
  'startRecording',
  'stopRecording',
  'getRecordingStatus',
  'listRecordings',
  // HAR Export
  'startHAR',
  'exportHAR',
  'getHARData',
  // Accessibility Audit
  'auditAccessibility',
  'getAccessibilityResults',
  // Plugin Management (reserved)
  'loadPlugin',
  'unloadPlugin',
  'listPlugins',
  // Help
  'help',
]);

/**
 * Validate a semver-like version string.
 * Accepts: "1.0.0", "0.1.0", "1.2.3-beta"
 */
function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+(-[\w.]+)?$/.test(version);
}

/**
 * Check if a command name uses a reserved prefix.
 */
function hasReservedPrefix(name: string): boolean {
  return RESERVED_PREFIXES.some((prefix) => name.startsWith(prefix));
}

/**
 * Check if a command name conflicts with built-in commands.
 */
function isBuiltInCommand(name: string): boolean {
  return BUILT_IN_COMMANDS.has(name);
}

/**
 * Validate a plugin command.
 */
function validateCommand(
  command: PluginCommand,
  index: number
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!command.name || typeof command.name !== 'string') {
    errors.push(`Command at index ${index}: missing or invalid 'name'`);
  } else {
    // Check for reserved prefixes
    if (hasReservedPrefix(command.name)) {
      errors.push(
        `Command '${command.name}': uses reserved prefix (${RESERVED_PREFIXES.join(', ')})`
      );
    }

    // Check for built-in command conflict
    if (isBuiltInCommand(command.name)) {
      errors.push(
        `Command '${command.name}': conflicts with built-in command`
      );
    }

    // Warn about non-alphanumeric names
    if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(command.name)) {
      warnings.push(
        `Command '${command.name}': name should start with letter and contain only alphanumerics`
      );
    }
  }

  if (!command.handler || typeof command.handler !== 'function') {
    errors.push(`Command at index ${index}: missing or invalid 'handler'`);
  }

  if (!command.description || typeof command.description !== 'string') {
    warnings.push(
      `Command '${command.name || `index ${index}`}': missing description`
    );
  }

  return { errors, warnings };
}

/**
 * Validate a plugin structure.
 *
 * @param plugin - The plugin object to validate (unknown type for runtime safety)
 * @returns Validation result with errors and warnings
 */
export function validatePlugin(plugin: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic type check
  if (!plugin || typeof plugin !== 'object') {
    return {
      valid: false,
      errors: ['Plugin must be an object'],
      warnings: [],
    };
  }

  const p = plugin as Record<string, unknown>;

  // Validate name
  if (!p.name || typeof p.name !== 'string') {
    errors.push("Plugin must have a 'name' property (string)");
  } else if (p.name.length === 0) {
    errors.push("Plugin 'name' cannot be empty");
  }

  // Validate version
  if (!p.version || typeof p.version !== 'string') {
    errors.push("Plugin must have a 'version' property (string)");
  } else if (!isValidVersion(p.version)) {
    warnings.push(
      `Plugin version '${p.version}' does not follow semver format (e.g., 1.0.0)`
    );
  }

  // Validate commands array
  if (!Array.isArray(p.commands)) {
    errors.push("Plugin must have a 'commands' array");
  } else if (p.commands.length === 0) {
    errors.push('Plugin must provide at least one command');
  } else {
    // Validate each command
    const seenNames = new Set<string>();
    for (let i = 0; i < p.commands.length; i++) {
      const cmd = p.commands[i] as PluginCommand;
      const cmdResult = validateCommand(cmd, i);
      errors.push(...cmdResult.errors);
      warnings.push(...cmdResult.warnings);

      // Check for duplicate command names within plugin
      if (cmd.name && seenNames.has(cmd.name)) {
        errors.push(`Duplicate command name '${cmd.name}' within plugin`);
      }
      seenNames.add(cmd.name);
    }
  }

  // Validate optional description
  if (p.description !== undefined && typeof p.description !== 'string') {
    warnings.push("Plugin 'description' should be a string");
  }

  // Validate optional lifecycle hooks
  if (p.onLoad !== undefined && typeof p.onLoad !== 'function') {
    errors.push("Plugin 'onLoad' must be a function if provided");
  }

  if (p.onUnload !== undefined && typeof p.onUnload !== 'function') {
    errors.push("Plugin 'onUnload' must be a function if provided");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check if a command name conflicts with an existing set of commands.
 *
 * @param commandName - The command name to check
 * @param existingCommands - Set of already registered command names
 * @returns Error message if conflict, undefined otherwise
 */
export function checkCommandConflict(
  commandName: string,
  existingCommands: Set<string>
): string | undefined {
  if (existingCommands.has(commandName)) {
    return `Command '${commandName}' conflicts with an already registered command`;
  }
  return undefined;
}

/**
 * Get the set of built-in commands (for external use).
 */
export function getBuiltInCommands(): Set<string> {
  return new Set(BUILT_IN_COMMANDS);
}
