/**
 * Example Plugin - Browser-CLI P3.1
 *
 * Demonstrates the plugin API with sample commands.
 * Use this as a template for creating your own plugins.
 *
 * Usage:
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts loadPlugin BROWSER-CLI/example-plugin.ts
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts hello World
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts pageInfo
 *   npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts unloadPlugin example
 */

import { BrowserCLIPlugin, PluginContext } from './SCRIPTS/plugins/plugin-interface';
import { CommandResponse } from './SCRIPTS/core/types';

const examplePlugin: BrowserCLIPlugin = {
  name: 'example',
  version: '1.0.0',
  description: 'Example plugin demonstrating the Browser-CLI plugin API',

  commands: [
    {
      name: 'hello',
      description: 'Say hello to someone',
      usage: '<name>',
      handler: async (
        _ctx: PluginContext,
        args: string[]
      ): Promise<CommandResponse> => {
        const name = args[0] || 'World';
        return {
          status: 'ok',
          data: {
            message: `Hello, ${name}!`,
            timestamp: new Date().toISOString(),
          },
          code: `console.log("Hello, ${name}!");`,
        };
      },
    },
    {
      name: 'pageInfo',
      description: 'Get current page information',
      handler: async (ctx: PluginContext): Promise<CommandResponse> => {
        const { page } = ctx;

        const title = await page.title();
        const url = page.url();
        const viewport = page.viewportSize();

        return {
          status: 'ok',
          data: {
            title,
            url,
            viewport,
          },
          code: `const title = await page.title();
const url = page.url();
const viewport = page.viewportSize();`,
        };
      },
    },
    {
      name: 'countLinks',
      description: 'Count all links on the current page',
      handler: async (ctx: PluginContext): Promise<CommandResponse> => {
        const { page } = ctx;

        const count = await page.locator('a').count();
        const externalCount = await page
          .locator('a[href^="http"]')
          .count();

        return {
          status: 'ok',
          data: {
            total: count,
            external: externalCount,
            internal: count - externalCount,
          },
          code: `const count = await page.locator('a').count();`,
        };
      },
    },
  ],

  // Lifecycle hooks (optional)
  onLoad: async (ctx: PluginContext): Promise<void> => {
    ctx.log('Example plugin loaded! Try: hello, pageInfo, countLinks');
  },

  onUnload: async (ctx: PluginContext): Promise<void> => {
    ctx.log('Example plugin unloaded. Goodbye!');
  },
};

export default examplePlugin;
