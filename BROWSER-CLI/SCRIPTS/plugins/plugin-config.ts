import * as fs from 'fs';
import * as path from 'path';

const CONFIG_DIR = path.join(process.cwd(), 'BROWSER-CLI', 'plugin-configs');

/**
 * Manages persistent configuration files for Browser-CLI plugins.
 * Configs are stored as JSON files in BROWSER-CLI/plugin-configs/
 */
export class PluginConfigManager {
  /**
   * Get configuration for a plugin, merging with defaults.
   * @param pluginName - Plugin identifier
   * @param defaults - Default configuration values
   * @returns Merged configuration (saved values override defaults)
   */
  static getConfig<T extends Record<string, unknown>>(
    pluginName: string,
    defaults: T
  ): T {
    const configPath = this.getConfigPath(pluginName);

    if (!fs.existsSync(configPath)) {
      return defaults;
    }

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      const saved = JSON.parse(content) as Partial<T>;
      return { ...defaults, ...saved };
    } catch {
      return defaults;
    }
  }

  /**
   * Save configuration for a plugin.
   * @param pluginName - Plugin identifier
   * @param config - Configuration object to save
   */
  static setConfig<T extends Record<string, unknown>>(
    pluginName: string,
    config: T
  ): void {
    this.ensureConfigDir();
    const configPath = this.getConfigPath(pluginName);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  /**
   * Delete configuration for a plugin.
   * @param pluginName - Plugin identifier
   * @returns true if config existed and was deleted
   */
  static deleteConfig(pluginName: string): boolean {
    const configPath = this.getConfigPath(pluginName);
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
      return true;
    }
    return false;
  }

  /**
   * List all plugin configurations.
   * @returns Array of plugin names with configs
   */
  static listConfigs(): string[] {
    if (!fs.existsSync(CONFIG_DIR)) {
      return [];
    }
    return fs.readdirSync(CONFIG_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  /**
   * Check if a plugin has saved configuration.
   * @param pluginName - Plugin identifier
   */
  static hasConfig(pluginName: string): boolean {
    return fs.existsSync(this.getConfigPath(pluginName));
  }

  private static getConfigPath(pluginName: string): string {
    // Sanitize plugin name to prevent path traversal
    const safeName = pluginName.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(CONFIG_DIR, `${safeName}.json`);
  }

  private static ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
  }
}
