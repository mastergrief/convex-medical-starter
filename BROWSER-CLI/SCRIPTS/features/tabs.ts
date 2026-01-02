/**
 * Tabs Feature - Multi-tab browser management
 *
 * Provides functionality to manage multiple browser tabs:
 * - List all open tabs with URLs and titles
 * - Create new tabs (optionally navigating to URL)
 * - Switch between tabs
 * - Close tabs
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';

/**
 * Tab information returned by list operation
 */
interface TabInfo {
  index: number;
  url: string;
  title: string;
}

/**
 * Arguments for tabs command
 */
interface TabsArgs {
  action?: 'list' | 'new' | 'switch' | 'close';
  url?: string;
  index?: number;
}

/**
 * Tabs Feature
 *
 * Manages multiple browser tabs within the current browser context.
 * Useful for:
 * - Testing multi-tab workflows
 * - Opening external links in new tabs
 * - Comparing different pages side by side
 *
 * Commands:
 * - tabs: Main command with action parameter
 *   - action: 'list' (default) | 'new' | 'switch' | 'close'
 *   - url: URL to navigate (for 'new' action)
 *   - index: Tab index (for 'switch' and 'close' actions)
 * - newTab: Create new tab (shorthand)
 * - switchTab: Switch to tab by index (shorthand)
 * - closeTab: Close tab by index (shorthand)
 */
export class TabsFeature extends BaseFeature {
  public readonly name = 'Tabs';

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['tabs', this.handleTabs.bind(this)],
    ]);
  }

  /**
   * Main tabs command with action parameter
   */
  private async handleTabs(args: TabsArgs): Promise<CommandResponse> {
    const action = args.action || 'list';

    switch (action) {
      case 'list':
        return this.listTabs();
      case 'new':
        return this.handleNewTab({ url: args.url });
      case 'switch':
        if (args.index === undefined) {
          return {
            status: 'error',
            message: 'Tab index required for switch action',
          };
        }
        return this.handleSwitchTab({ index: args.index });
      case 'close':
        if (args.index === undefined) {
          return {
            status: 'error',
            message: 'Tab index required for close action',
          };
        }
        return this.handleCloseTab({ index: args.index });
      default:
        return {
          status: 'error',
          message: `Unknown action: ${action}. Valid actions: list, new, switch, close`,
        };
    }
  }

  /**
   * List all open tabs
   */
  private async listTabs(): Promise<CommandResponse> {
    const context = this.page.context();
    const pages = context.pages();

    const tabs: TabInfo[] = await Promise.all(
      pages.map(async (page, index) => ({
        index,
        url: page.url(),
        title: await page.title(),
      }))
    );

    this.log(`Found ${tabs.length} open tab(s)`);
    return { status: 'ok', data: { tabs, count: tabs.length } };
  }

  /**
   * Create a new tab
   */
  private async handleNewTab(args: { url?: string }): Promise<CommandResponse> {
    const context = this.page.context();
    const newPage = await context.newPage();

    if (args.url) {
      await newPage.goto(args.url, { waitUntil: 'networkidle' });
      this.log(`Created new tab and navigated to: ${args.url}`);
    } else {
      this.log('Created new blank tab');
    }

    return {
      status: 'ok',
      data: {
        url: newPage.url(),
        title: await newPage.title(),
        index: context.pages().length - 1,
      },
    };
  }

  /**
   * Switch to a tab by index
   */
  private async handleSwitchTab(args: { index: number }): Promise<CommandResponse> {
    const context = this.page.context();
    const pages = context.pages();

    if (args.index < 0 || args.index >= pages.length) {
      return {
        status: 'error',
        message: `Invalid tab index: ${args.index}. Valid range: 0-${pages.length - 1}`,
      };
    }

    const targetPage = pages[args.index];
    await targetPage.bringToFront();

    this.log(`Switched to tab ${args.index}: ${targetPage.url()}`);
    return {
      status: 'ok',
      data: {
        index: args.index,
        url: targetPage.url(),
        title: await targetPage.title(),
      },
    };
  }

  /**
   * Close a tab by index
   */
  private async handleCloseTab(args: { index: number }): Promise<CommandResponse> {
    const context = this.page.context();
    const pages = context.pages();

    if (args.index < 0 || args.index >= pages.length) {
      return {
        status: 'error',
        message: `Invalid tab index: ${args.index}. Valid range: 0-${pages.length - 1}`,
      };
    }

    if (pages.length <= 1) {
      return {
        status: 'error',
        message: 'Cannot close the last remaining tab',
      };
    }

    const closedUrl = pages[args.index].url();
    await pages[args.index].close();

    this.log(`Closed tab ${args.index}: ${closedUrl}`);
    return {
      status: 'ok',
      data: {
        closedIndex: args.index,
        closedUrl,
        remainingTabs: context.pages().length,
      },
    };
  }
}
