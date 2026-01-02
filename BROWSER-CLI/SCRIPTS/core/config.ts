/**
 * Configuration loader for Browser CLI
 *
 * Supports priority hierarchy: CLI flags > env vars > .browser-cli.yaml > defaults
 * Includes a simple custom YAML parser (no npm dependency)
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Viewport configuration
 */
export interface ViewportConfig {
  width: number;
  height: number;
}

/**
 * Complete Browser CLI configuration
 */
export interface BrowserConfig {
  port: number;
  headless: boolean;
  viewport: ViewportConfig;
  timeout: number;
  retries: number;
  screenshotDir: string;
  stateDir: string;
  recordingsDir: string;
  screenshotOnFailure: boolean;
  junitOutput?: string;
}

/**
 * Detect if running in CI/test environment
 */
const isTestEnvironment = (): boolean => {
  return !!(
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.VITEST === 'true' ||
    process.env.JEST_WORKER_ID ||
    process.env.NODE_ENV === 'test'
  );
};

/**
 * Default configuration values
 * Note: headless defaults to true in CI/test environments, false otherwise
 */
export const DEFAULT_BROWSER_CONFIG: BrowserConfig = {
  port: 3456,
  headless: isTestEnvironment() ? true : false,
  viewport: { width: 2560, height: 1440 },
  timeout: 30000,
  retries: 3,
  screenshotDir: './evidence',
  stateDir: './states',
  recordingsDir: './recordings',
  screenshotOnFailure: false,
};

/**
 * Configuration loader with YAML parsing and priority merging
 */
export class ConfigLoader {
  private static config: BrowserConfig | null = null;

  /**
   * Parse simple YAML content into a partial config object
   * Supports:
   * - key: value pairs
   * - nested objects with 2-space indentation
   * - comments starting with #
   * - boolean values (true/false/yes/no)
   * - numbers (int and float)
   * - optional quoted strings
   */
  static parseYAML(content: string): Partial<BrowserConfig> {
    const result: Record<string, unknown> = {};
    const lines = content.split('\n');
    let currentParent: string | null = null;
    let currentNested: Record<string, unknown> = {};

    for (const rawLine of lines) {
      // Skip empty lines and comments
      const line = rawLine.trimEnd();
      if (!line || line.trim().startsWith('#')) {
        continue;
      }

      // Check indentation level
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1].length : 0;

      // Parse key: value
      const kvMatch = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*(.*)?$/);
      if (!kvMatch) {
        continue;
      }

      const key = kvMatch[1];
      const rawValue = kvMatch[2]?.trim() || '';

      // If indented and we have a parent, this is a nested property
      if (indent >= 2 && currentParent) {
        currentNested[key] = this.parseValue(rawValue);
        continue;
      }

      // If we were building a nested object, save it
      if (currentParent && Object.keys(currentNested).length > 0) {
        result[currentParent] = currentNested;
        currentParent = null;
        currentNested = {};
      }

      // Check if this is the start of a nested object (no value after colon)
      if (!rawValue) {
        currentParent = key;
        currentNested = {};
        continue;
      }

      // Regular key: value at root level
      result[key] = this.parseValue(rawValue);
    }

    // Save any remaining nested object
    if (currentParent && Object.keys(currentNested).length > 0) {
      result[currentParent] = currentNested;
    }

    return result as Partial<BrowserConfig>;
  }

  /**
   * Parse a YAML value into the appropriate JavaScript type
   */
  private static parseValue(value: string): unknown {
    // Handle empty values
    if (!value) {
      return undefined;
    }

    // Remove inline comments
    const commentIndex = value.indexOf('#');
    if (commentIndex > 0) {
      value = value.substring(0, commentIndex).trim();
    }

    // Boolean values
    const lowerValue = value.toLowerCase();
    if (lowerValue === 'true' || lowerValue === 'yes') {
      return true;
    }
    if (lowerValue === 'false' || lowerValue === 'no') {
      return false;
    }

    // Null/undefined
    if (lowerValue === 'null' || lowerValue === '~') {
      return undefined;
    }

    // Numbers
    if (/^-?\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    if (/^-?\d+\.\d+$/.test(value)) {
      return parseFloat(value);
    }

    // Quoted strings - remove quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    // Plain string
    return value;
  }

  /**
   * Find config file in standard locations
   */
  private static findConfigFile(customPath?: string): string | null {
    // Priority 1: Custom path from --config flag
    if (customPath) {
      if (fs.existsSync(customPath)) {
        return customPath;
      }
      return null;
    }

    // Priority 2: .browser-cli.yaml in current working directory
    const cwdConfig = path.join(process.cwd(), '.browser-cli.yaml');
    if (fs.existsSync(cwdConfig)) {
      return cwdConfig;
    }

    // Priority 3: .browser-cli.yaml in BROWSER-CLI directory
    const browserCliDir = path.join(process.cwd(), 'BROWSER-CLI', '.browser-cli.yaml');
    if (fs.existsSync(browserCliDir)) {
      return browserCliDir;
    }

    return null;
  }

  /**
   * Load environment variable overrides
   */
  private static loadEnvOverrides(): Partial<BrowserConfig> {
    const overrides: Partial<BrowserConfig> = {};

    // BROWSER_PORT -> port
    const portEnv = process.env.BROWSER_PORT;
    if (portEnv) {
      const port = parseInt(portEnv, 10);
      if (!isNaN(port)) {
        overrides.port = port;
      }
    }

    // BROWSER_HEADLESS -> headless
    const headlessEnv = process.env.BROWSER_HEADLESS;
    if (headlessEnv !== undefined) {
      overrides.headless = headlessEnv.toLowerCase() === 'true' || headlessEnv === '1';
    }

    // BROWSER_TIMEOUT -> timeout
    const timeoutEnv = process.env.BROWSER_TIMEOUT;
    if (timeoutEnv) {
      const timeout = parseInt(timeoutEnv, 10);
      if (!isNaN(timeout)) {
        overrides.timeout = timeout;
      }
    }

    return overrides;
  }

  /**
   * Deep merge two config objects
   */
  private static mergeConfig(base: BrowserConfig, override: Partial<BrowserConfig>): BrowserConfig {
    const result = { ...base };

    for (const key of Object.keys(override) as Array<keyof BrowserConfig>) {
      const value = override[key];
      if (value === undefined) {
        continue;
      }

      // Handle nested viewport object
      if (key === 'viewport' && typeof value === 'object') {
        result.viewport = {
          ...result.viewport,
          ...(value as Partial<ViewportConfig>),
        };
      } else {
        (result as Record<string, unknown>)[key] = value;
      }
    }

    return result;
  }

  /**
   * Load configuration with hierarchy: CLI flags > env vars > file > defaults
   */
  static load(options?: {
    configPath?: string;
    cliFlags?: Partial<BrowserConfig>;
  }): BrowserConfig {
    // Start with defaults
    let config: BrowserConfig = { ...DEFAULT_BROWSER_CONFIG };

    // Layer 1: Config file
    const configFile = this.findConfigFile(options?.configPath);
    if (configFile) {
      try {
        const fileContent = fs.readFileSync(configFile, 'utf-8');
        const fileConfig = this.parseYAML(fileContent);
        config = this.mergeConfig(config, fileConfig);
      } catch (error) {
        // Silently ignore config file errors, use defaults
        console.warn(`Warning: Failed to load config file ${configFile}:`, error);
      }
    }

    // Layer 2: Environment variables
    const envConfig = this.loadEnvOverrides();
    config = this.mergeConfig(config, envConfig);

    // Layer 3: CLI flags (highest priority)
    if (options?.cliFlags) {
      config = this.mergeConfig(config, options.cliFlags);
    }

    // Cache the result
    this.config = config;

    return config;
  }

  /**
   * Get current config (cached after first load)
   * If not yet loaded, loads with default options
   */
  static get(): BrowserConfig {
    if (!this.config) {
      return this.load();
    }
    return this.config;
  }

  /**
   * Reset config cache (for testing)
   */
  static reset(): void {
    this.config = null;
  }
}
