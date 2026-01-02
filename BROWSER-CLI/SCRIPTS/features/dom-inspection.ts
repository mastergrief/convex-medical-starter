/**
 * DOM Inspection Feature
 * CSS computed styles, visibility analysis, overlay detection
 */

import { Page } from 'playwright-core';
import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';

export interface VisibilityInfo {
  visible: boolean;
  reasons: {
    hasSize: boolean;
    notHidden: boolean;
    notDisplayNone: boolean;
    opacity: number;
    inViewport: boolean;
  };
  boundingBox: { x: number; y: number; width: number; height: number } | null;
}

export interface OverlayInfo {
  elementAtPoint: string | null;
  overlayingElements: Array<{ tagName: string; id?: string; classes: string[] }>;
  isBlocked: boolean;
}

export class DOMInspectionFeature extends BaseFeature {
  public readonly name = 'DOMInspection';

  constructor(page: Page) {
    super(page);
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['getComputedStyle', this.handleGetComputedStyle.bind(this)],
      ['getElementVisibility', this.handleGetElementVisibility.bind(this)],
      ['getOverlayingElements', this.handleGetOverlayingElements.bind(this)],
      ['countElements', this.handleCountElements.bind(this)],
    ]);
  }

  /**
   * Get computed CSS styles for an element
   */
  async getComputedStyle(
    selector: string,
    properties?: string[]
  ): Promise<{ styles: Record<string, string>; code: string }> {
    this.log(`Getting computed style for: ${selector}`);
    const styles = await this.page.locator(selector).evaluate((el, props) => {
      const cs = window.getComputedStyle(el);
      if (props && props.length > 0) {
        return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
      }
      // Return common styles if no specific properties requested
      const common = [
        'display',
        'visibility',
        'opacity',
        'position',
        'width',
        'height',
        'color',
        'background-color',
        'font-size',
        'z-index',
      ];
      return Object.fromEntries(common.map((p) => [p, cs.getPropertyValue(p)]));
    }, properties);
    const propsStr = properties ? `, ${JSON.stringify(properties)}` : '';
    return {
      styles,
      code: `const styles = await page.locator('${selector}').evaluate((el, props) => { const cs = window.getComputedStyle(el); /* ... */ }${propsStr});`,
    };
  }

  /**
   * Analyze why an element is visible or hidden
   */
  async getElementVisibility(
    selector: string
  ): Promise<{ info: VisibilityInfo; code: string }> {
    this.log(`Analyzing visibility for: ${selector}`);
    const info = await this.page.locator(selector).evaluate((el) => {
      const box = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        visible:
          box.width > 0 &&
          box.height > 0 &&
          cs.visibility !== 'hidden' &&
          cs.display !== 'none' &&
          parseFloat(cs.opacity) > 0,
        reasons: {
          hasSize: box.width > 0 && box.height > 0,
          notHidden: cs.visibility !== 'hidden',
          notDisplayNone: cs.display !== 'none',
          opacity: parseFloat(cs.opacity),
          inViewport:
            box.top < window.innerHeight &&
            box.bottom > 0 &&
            box.left < window.innerWidth &&
            box.right > 0,
        },
        boundingBox:
          box.width > 0
            ? { x: box.x, y: box.y, width: box.width, height: box.height }
            : null,
      };
    });
    return {
      info,
      code: `const info = await page.locator('${selector}').evaluate(el => { /* visibility analysis */ });`,
    };
  }

  /**
   * Find elements overlaying a target element
   */
  async getOverlayingElements(
    selector: string
  ): Promise<{ info: OverlayInfo; code: string }> {
    this.log(`Finding overlaying elements for: ${selector}`);
    const info = await this.page.locator(selector).evaluate((el) => {
      const box = el.getBoundingClientRect();
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;
      const elementAtPoint = document.elementFromPoint(centerX, centerY);
      const overlays: Array<{ tagName: string; id?: string; classes: string[] }> = [];

      // Find all elements at this point
      const allAtPoint = document.elementsFromPoint(centerX, centerY);
      let foundTarget = false;
      for (const e of allAtPoint) {
        if (e === el) {
          foundTarget = true;
          break;
        }
        overlays.push({
          tagName: e.tagName.toLowerCase(),
          id: e.id || undefined,
          classes: Array.from(e.classList),
        });
      }

      return {
        elementAtPoint: elementAtPoint
          ? elementAtPoint.tagName.toLowerCase() +
            (elementAtPoint.id ? `#${elementAtPoint.id}` : '')
          : null,
        overlayingElements: overlays,
        isBlocked: overlays.length > 0 && !foundTarget,
      };
    });
    return {
      info,
      code: `const info = await page.locator('${selector}').evaluate(el => { /* overlay analysis */ });`,
    };
  }

  /**
   * Count elements matching a selector
   */
  async countElements(selector: string): Promise<{ count: number; code: string }> {
    this.log(`Counting elements: ${selector}`);
    const count = await this.page.locator(selector).count();
    return {
      count,
      code: `const count = await page.locator('${selector}').count();`,
    };
  }

  // Command Handlers
  private async handleGetComputedStyle(args: {
    selector: string;
    properties?: string[];
  }): Promise<CommandResponse> {
    try {
      const result = await this.getComputedStyle(args.selector, args.properties);
      return { status: 'ok', data: { styles: result.styles }, code: result.code };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async handleGetElementVisibility(args: {
    selector: string;
  }): Promise<CommandResponse> {
    try {
      const result = await this.getElementVisibility(args.selector);
      return { status: 'ok', data: result.info, code: result.code };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async handleGetOverlayingElements(args: {
    selector: string;
  }): Promise<CommandResponse> {
    try {
      const result = await this.getOverlayingElements(args.selector);
      return { status: 'ok', data: result.info, code: result.code };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async handleCountElements(args: {
    selector: string;
  }): Promise<CommandResponse> {
    try {
      const result = await this.countElements(args.selector);
      return { status: 'ok', data: { count: result.count, selector: args.selector }, code: result.code };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
