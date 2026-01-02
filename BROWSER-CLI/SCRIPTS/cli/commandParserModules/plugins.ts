/**
 * Plugin Command Parsers - Browser-CLI P3.1
 *
 * Parses CLI arguments for plugin management commands.
 */

import { ParsedCommand } from './types';

/**
 * Parse loadPlugin command.
 * Usage: loadPlugin <path>
 */
export function parseLoadPlugin(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('loadPlugin requires a path to the plugin file');
  }
  return {
    command: 'loadPlugin',
    args: { path: args[1] },
    backendCommand: 'loadPlugin',
  };
}

/**
 * Parse unloadPlugin command.
 * Usage: unloadPlugin <name>
 */
export function parseUnloadPlugin(args: string[]): ParsedCommand {
  if (!args[1]) {
    throw new Error('unloadPlugin requires a plugin name');
  }
  return {
    command: 'unloadPlugin',
    args: { name: args[1] },
    backendCommand: 'unloadPlugin',
  };
}

/**
 * Parse listPlugins command.
 * Usage: listPlugins
 */
export function parseListPlugins(): ParsedCommand {
  return {
    command: 'listPlugins',
    args: {},
    backendCommand: 'listPlugins',
  };
}
