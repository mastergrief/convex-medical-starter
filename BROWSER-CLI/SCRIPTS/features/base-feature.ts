/**
 * Abstract base class for browser features
 */

import { Page } from 'playwright';
import { BrowserFeature, CommandHandler } from '../core/types';

/**
 * Base class for all browser features.
 *
 * Features are self-contained modules that provide specific functionality
 * to the Browser CLI. Each feature:
 * - Receives a Page instance via constructor (dependency injection)
 * - Exposes command handlers via getCommandHandlers()
 * - Can optionally implement setup() and cleanup() lifecycle methods
 *
 * Example usage:
 * ```typescript
 * class MyFeature extends BaseFeature {
 *   public readonly name = 'MyFeature';
 *
 *   getCommandHandlers(): Map<string, CommandHandler> {
 *     return new Map([
 *       ['myCommand', this.handleMyCommand.bind(this)]
 *     ]);
 *   }
 *
 *   async handleMyCommand(args: any): Promise<CommandResponse> {
 *     // Use this.page to interact with the browser
 *     return { status: 'ok', data: { result: 'success' } };
 *   }
 * }
 * ```
 */
export abstract class BaseFeature implements BrowserFeature {
  protected page: Page;
  public abstract readonly name: string;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Optional setup called when feature is initialized.
   * Override in subclasses to perform feature-specific setup.
   *
   * Example:
   * ```typescript
   * async setup(): Promise<void> {
   *   await this.page.route('**', route => route.continue());
   * }
   * ```
   */
  async setup(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Optional cleanup called when browser closes.
   * Override in subclasses to perform feature-specific cleanup.
   *
   * Example:
   * ```typescript
   * async cleanup(): Promise<void> {
   *   await this.saveState();
   * }
   * ```
   */
  async cleanup(): Promise<void> {
    // Override in subclasses if needed
  }

  /**
   * Return map of command names to handlers.
   *
   * Must be implemented by all features. The returned map defines
   * which commands this feature can handle.
   *
   * @returns Map of command name to handler function
   */
  abstract getCommandHandlers(): Map<string, CommandHandler>;

  /**
   * Utility: Log with feature name prefix.
   *
   * @param message - Message to log
   */
  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }
}
