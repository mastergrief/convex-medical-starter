/**
 * Content Capture Feature
 * Extract page and element content (HTML, text)
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';

export class ContentCaptureFeature extends BaseFeature {
  public readonly name = 'ContentCapture';

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['getPageHTML', this.handleGetPageHTML.bind(this)],
      ['getPageText', this.handleGetPageText.bind(this)],
      ['getElementHTML', this.handleGetElementHTML.bind(this)],
      ['getElementText', this.handleGetElementText.bind(this)],
    ]);
  }

  /**
   * Get full page HTML content
   */
  async getPageHTML(): Promise<{ html: string; length: number; code: string }> {
    this.log('Getting page HTML...');
    const html = await this.page.content();
    return {
      html,
      length: html.length,
      code: `const html = await page.content();`
    };
  }

  /**
   * Get visible page text (body innerText)
   */
  async getPageText(): Promise<{ text: string; length: number; code: string }> {
    this.log('Getting page text...');
    const text = await this.page.innerText('body');
    return {
      text,
      length: text.length,
      code: `const text = await page.innerText('body');`
    };
  }

  /**
   * Get element outerHTML
   */
  async getElementHTML(selector: string): Promise<{ html: string; length: number; code: string }> {
    this.log(`Getting element HTML: ${selector}`);
    const html = await this.page.locator(selector).evaluate(el => el.outerHTML);
    return {
      html,
      length: html.length,
      code: `const html = await page.locator('${selector}').evaluate(el => el.outerHTML);`
    };
  }

  /**
   * Get element innerText
   */
  async getElementText(selector: string): Promise<{ text: string; length: number; code: string }> {
    this.log(`Getting element text: ${selector}`);
    const text = await this.page.locator(selector).innerText();
    return {
      text,
      length: text.length,
      code: `const text = await page.locator('${selector}').innerText();`
    };
  }

  // Command Handlers
  private async handleGetPageHTML(): Promise<CommandResponse> {
    try {
      const result = await this.getPageHTML();
      return { status: 'ok', data: { length: result.length, preview: result.html.substring(0, 500) + '...' }, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleGetPageText(): Promise<CommandResponse> {
    try {
      const result = await this.getPageText();
      return { status: 'ok', data: { length: result.length, preview: result.text.substring(0, 500) + '...' }, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleGetElementHTML(args: { selector: string }): Promise<CommandResponse> {
    try {
      const result = await this.getElementHTML(args.selector);
      return { status: 'ok', data: { length: result.length, html: result.html }, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleGetElementText(args: { selector: string }): Promise<CommandResponse> {
    try {
      const result = await this.getElementText(args.selector);
      return { status: 'ok', data: { length: result.length, text: result.text }, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }
}
