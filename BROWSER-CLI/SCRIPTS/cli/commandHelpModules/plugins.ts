/**
 * Plugin system command help texts
 * Commands: loadPlugin, unloadPlugin, listPlugins
 */

import type { CommandHelpRecord } from './types';

export const pluginsHelp: CommandHelpRecord = {
  loadPlugin: `Usage: browser-cmd loadPlugin <path>

Load a plugin from a TypeScript file

Plugin Requirements:
  - Must export BrowserCLIPlugin interface
  - Commands must not conflict with built-in commands
  - Command names cannot start with reserved prefixes

Examples:
  browser-cmd loadPlugin ./my-plugin.ts
  browser-cmd loadPlugin /path/to/custom-plugin.ts`,

  unloadPlugin: `Usage: browser-cmd unloadPlugin <name>

Unload a plugin by name

Examples:
  browser-cmd unloadPlugin my-plugin`,

  listPlugins: `Usage: browser-cmd listPlugins

List all loaded plugins with their commands

Output includes:
  - Plugin name and version
  - Commands provided
  - Load timestamp

Examples:
  browser-cmd listPlugins`,
};
