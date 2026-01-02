#!/usr/bin/env tsx
import * as fs from 'fs';
import * as path from 'path';

const PLUGIN_TEMPLATE = `import type { BrowserCLIPlugin, PluginContext, PluginEventHooks } from './SCRIPTS/plugins/plugin-interface';
import type { CommandResponse } from './SCRIPTS/core/types';

/**
 * {{NAME}} Plugin
 *
 * {{DESCRIPTION}}
 */
const plugin: BrowserCLIPlugin = {
  name: '{{NAME}}',
  version: '1.0.0',
  description: '{{DESCRIPTION}}',

  commands: [
    {
      name: '{{NAME}}:hello',
      description: 'Example command - greets the user',
      usage: '{{NAME}}:hello [name]',
      handler: async (ctx: PluginContext, args: string[]): Promise<CommandResponse> => {
        const name = args[0] || 'World';
        return {
          status: 'ok',
          data: { message: \`Hello from {{NAME}}, \${name}!\` },
          code: \`// {{NAME}} plugin - hello command\\nconsole.log('Hello, \${name}!');\`
        };
      }
    }
  ],

  // Optional lifecycle hooks
  async onLoad(ctx: PluginContext): Promise<void> {
    ctx.log('{{NAME}} plugin loaded');
  },

  async onUnload(ctx: PluginContext): Promise<void> {
    ctx.log('{{NAME}} plugin unloaded');
  },

  // Optional event hooks (uncomment to use)
  // hooks: {
  //   beforeCommand: async (cmd, args) => {
  //     console.log(\`[{{NAME}}] Before command: \${cmd}\`);
  //   },
  //   afterCommand: async (cmd, args, result) => {
  //     console.log(\`[{{NAME}}] After command: \${cmd}\`);
  //   },
  //   onError: async (cmd, error) => {
  //     console.error(\`[{{NAME}}] Error in \${cmd}: \${error.message}\`);
  //   }
  // }
};

export default plugin;
`;

function scaffold(name: string, description: string = 'Custom Browser-CLI plugin'): void {
  // Validate name
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    console.error('Error: Plugin name must start with a letter and contain only letters, numbers, underscores, and hyphens');
    process.exit(1);
  }

  const pluginDir = path.join(process.cwd(), 'BROWSER-CLI', 'plugins');
  const pluginPath = path.join(pluginDir, `${name}-plugin.ts`);

  if (fs.existsSync(pluginPath)) {
    console.error(`Error: Plugin '${name}' already exists at ${pluginPath}`);
    process.exit(1);
  }

  // Ensure plugins directory exists
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir, { recursive: true });
  }

  const content = PLUGIN_TEMPLATE
    .replace(/\{\{NAME\}\}/g, name)
    .replace(/\{\{DESCRIPTION\}\}/g, description);

  fs.writeFileSync(pluginPath, content);

  console.log(`Created plugin: ${pluginPath}`);
  console.log('');
  console.log('Usage:');
  console.log(`  npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts loadPlugin plugins/${name}-plugin.ts`);
  console.log(`  npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts ${name}:hello`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Edit the plugin file to add your commands');
  console.log('  2. Load the plugin to test it');
  console.log('  3. Uncomment the hooks section if needed');
}

// CLI entry point
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('Browser-CLI Plugin Scaffold');
  console.log('');
  console.log('Usage: npx tsx scaffold.ts <plugin-name> [description]');
  console.log('');
  console.log('Creates a new plugin from template in BROWSER-CLI/plugins/');
  console.log('');
  console.log('Arguments:');
  console.log('  plugin-name   Name for the plugin (letters, numbers, underscores, hyphens)');
  console.log('  description   Optional description for the plugin');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scaffold.ts my-plugin');
  console.log('  npx tsx scaffold.ts analytics "Analytics tracking plugin"');
  console.log('  npx tsx scaffold.ts custom-commands "Custom testing commands"');
  process.exit(0);
}

scaffold(args[0], args.slice(1).join(' ') || undefined);
