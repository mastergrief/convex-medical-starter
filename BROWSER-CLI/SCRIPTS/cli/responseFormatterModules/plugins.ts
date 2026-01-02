/**
 * Plugin Response Formatters - Browser-CLI P3.1
 *
 * Formats output for plugin management commands.
 */

import { CommandResponse } from '../../core/types';

/**
 * Format loadPlugin response.
 */
export function formatLoadPlugin(response: CommandResponse): string {
  const { data } = response;
  if (!data) return '\nPlugin loaded';

  const lines: string[] = [];
  lines.push(`\nLoaded plugin: ${data.name} v${data.version}`);

  if (data.description) {
    lines.push(`  ${data.description}`);
  }

  if (data.commands && data.commands.length > 0) {
    lines.push(`\n  Commands (${data.commands.length}):`);
    for (const cmd of data.commands) {
      const usage = cmd.usage ? ` ${cmd.usage}` : '';
      lines.push(`    ${cmd.name}${usage}`);
      if (cmd.description) {
        lines.push(`      ${cmd.description}`);
      }
    }
  }

  lines.push(`\n  Path: ${data.path}`);

  return lines.join('\n');
}

/**
 * Format unloadPlugin response.
 */
export function formatUnloadPlugin(response: CommandResponse): string {
  const { data } = response;
  if (!data) return '\nPlugin unloaded';

  return `\nUnloaded plugin: ${data.unloaded}`;
}

/**
 * Format listPlugins response.
 */
export function formatListPlugins(response: CommandResponse): string {
  const { data } = response;
  if (!data) return '\nNo plugins loaded';

  const lines: string[] = [];

  if (data.count === 0) {
    lines.push('\nNo plugins loaded');
    lines.push('  Use: loadPlugin <path> to load a plugin');
  } else {
    lines.push(`\nLoaded plugins (${data.count}):`);

    for (const plugin of data.plugins) {
      lines.push(`\n  ${plugin.name} v${plugin.version}`);
      if (plugin.description) {
        lines.push(`    ${plugin.description}`);
      }
      lines.push(`    Commands: ${plugin.commands.join(', ')}`);
      lines.push(`    Path: ${plugin.path}`);
      lines.push(`    Loaded: ${plugin.loadedAt}`);
    }
  }

  return lines.join('\n');
}
