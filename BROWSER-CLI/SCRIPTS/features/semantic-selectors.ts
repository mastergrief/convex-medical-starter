/**
 * Phase 1: Semantic Selectors
 * Support for Playwright getByRole/getByText/getByLabel selectors
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';

/**
 * Semantic selectors feature for readable, stable selectors.
 *
 * Supports Playwright's semantic selector methods:
 * - role:button:Submit
 * - text:Learn More
 * - label:Email
 * - placeholder:Enter name
 *
 * These selectors are more stable than CSS classes and more readable.
 */
export class SemanticSelectorsFeature extends BaseFeature {
  public readonly name = 'SemanticSelectors';

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['clickBySemantic', this.clickBySemantic.bind(this)],
      ['dblclickBySemantic', this.dblclickBySemantic.bind(this)],
      ['typeBySemantic', this.typeBySemantic.bind(this)],
      ['hoverBySemantic', this.hoverBySemantic.bind(this)],
      ['waitForSelectorBySemantic', this.waitForSelectorBySemantic.bind(this)],
    ]);
  }

  /**
   * Click using semantic selector
   */
  async clickBySemantic(args: {
    selector: string;
    button?: 'left' | 'right' | 'middle';
    clickCount?: number;
  }): Promise<CommandResponse> {
    const { selector, button, clickCount } = args;
    const parts = selector.split(':');
    if (parts.length < 2) {
      return {
        status: 'error',
        message: `Invalid semantic selector: ${selector}. Expected format: role:element or role:element:name`
      };
    }

    const [selectorType, role, ...nameParts] = parts;
    const name = nameParts.join(':'); // Handle names with colons

    this.log(`Clicking semantic: ${selector}`);

    const options = { button, clickCount };

    try {
      switch (selectorType) {
        case 'role':
          if (name) {
            await this.page.getByRole(role as any, { name }).click(options);
          } else {
            await this.page.getByRole(role as any).click(options);
          }
          break;
        case 'text':
          await this.page.getByText(role).click(options); // role is actually the text here
          break;
        case 'label':
          await this.page.getByLabel(role).click(options);
          break;
        case 'placeholder':
          await this.page.getByPlaceholder(role).click(options);
          break;
        default:
          return {
            status: 'error',
            message: `Unknown selector type: ${selectorType}. Supported: role, text, label, placeholder`
          };
      }

      return {
        status: 'ok',
        data: { selector },
        code: this.generateSemanticCode(selector, 'click')
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Double-click using semantic selector
   */
  async dblclickBySemantic(args: {
    selector: string;
    button?: 'left' | 'right' | 'middle';
  }): Promise<CommandResponse> {
    const { selector, button } = args;
    const parts = selector.split(':');
    if (parts.length < 2) {
      return {
        status: 'error',
        message: `Invalid semantic selector: ${selector}. Expected format: role:element or role:element:name`
      };
    }

    const [selectorType, role, ...nameParts] = parts;
    const name = nameParts.join(':'); // Handle names with colons

    this.log(`Double-clicking semantic: ${selector}`);

    const options = { button, delay: 0 };

    try {
      switch (selectorType) {
        case 'role':
          if (name) {
            await this.page.getByRole(role as any, { name }).dblclick(options);
          } else {
            await this.page.getByRole(role as any).dblclick(options);
          }
          break;
        case 'text':
          await this.page.getByText(role).dblclick(options); // role is actually the text here
          break;
        case 'label':
          await this.page.getByLabel(role).dblclick(options);
          break;
        case 'placeholder':
          await this.page.getByPlaceholder(role).dblclick(options);
          break;
        default:
          return {
            status: 'error',
            message: `Unknown selector type: ${selectorType}. Supported: role, text, label, placeholder`
          };
      }

      return {
        status: 'ok',
        data: { selector },
        code: this.generateSemanticCode(selector, 'dblclick')
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Type using semantic selector
   */
  async typeBySemantic(args: {
    selector: string;
    text: string;
    delay?: number;
  }): Promise<CommandResponse> {
    const { selector, text } = args;
    const parts = selector.split(':');
    if (parts.length < 2) {
      return {
        status: 'error',
        message: `Invalid semantic selector: ${selector}. Expected format: role:element or role:element:name`
      };
    }

    const [selectorType, role, ...nameParts] = parts;
    const name = nameParts.join(':');

    this.log(`Typing semantic: ${selector}`);

    try {
      switch (selectorType) {
        case 'role':
          if (name) {
            await this.page.getByRole(role as any, { name }).fill(text);
          } else {
            await this.page.getByRole(role as any).fill(text);
          }
          break;
        case 'label':
          await this.page.getByLabel(role).fill(text);
          break;
        case 'placeholder':
          await this.page.getByPlaceholder(role).fill(text);
          break;
        default:
          return {
            status: 'error',
            message: `Unknown selector type: ${selectorType}. Supported for type: role, label, placeholder`
          };
      }

      return {
        status: 'ok',
        data: { selector, text },
        code: this.generateSemanticCode(selector, 'fill', text)
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Hover using semantic selector
   */
  async hoverBySemantic(args: { selector: string }): Promise<CommandResponse> {
    const { selector } = args;
    const parts = selector.split(':');
    if (parts.length < 2) {
      return {
        status: 'error',
        message: `Invalid semantic selector: ${selector}. Expected format: role:element or role:element:name`
      };
    }

    const [selectorType, role, ...nameParts] = parts;
    const name = nameParts.join(':');

    this.log(`Hovering semantic: ${selector}`);

    try {
      switch (selectorType) {
        case 'role':
          if (name) {
            await this.page.getByRole(role as any, { name }).hover();
          } else {
            await this.page.getByRole(role as any).hover();
          }
          break;
        case 'text':
          await this.page.getByText(role).hover();
          break;
        case 'label':
          await this.page.getByLabel(role).hover();
          break;
        case 'placeholder':
          await this.page.getByPlaceholder(role).hover();
          break;
        default:
          return {
            status: 'error',
            message: `Unknown selector type: ${selectorType}. Supported: role, text, label, placeholder`
          };
      }

      return {
        status: 'ok',
        data: { selector },
        code: this.generateSemanticCode(selector, 'hover')
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Wait for selector using semantic selector
   */
  async waitForSelectorBySemantic(args: {
    selector: string;
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }): Promise<CommandResponse> {
    const { selector, state, timeout } = args;
    const parts = selector.split(':');
    if (parts.length < 2) {
      return {
        status: 'error',
        message: `Invalid semantic selector: ${selector}. Expected format: role:element or role:element:name`
      };
    }

    const [selectorType, role, ...nameParts] = parts;
    const name = nameParts.join(':');

    this.log(`Waiting for semantic: ${selector}`);

    try {
      const options = { state, timeout };
      switch (selectorType) {
        case 'role':
          if (name) {
            await this.page.getByRole(role as any, { name }).waitFor(options);
          } else {
            await this.page.getByRole(role as any).waitFor(options);
          }
          break;
        case 'text':
          await this.page.getByText(role).waitFor(options);
          break;
        case 'label':
          await this.page.getByLabel(role).waitFor(options);
          break;
        case 'placeholder':
          await this.page.getByPlaceholder(role).waitFor(options);
          break;
        default:
          return {
            status: 'error',
            message: `Unknown selector type: ${selectorType}. Supported: role, text, label, placeholder`
          };
      }

      return {
        status: 'ok',
        data: { selector },
        code: this.generateSemanticCode(selector, 'waitFor')
      };
    } catch (error: any) {
      return {
        status: 'error',
        message: error.message
      };
    }
  }

  /**
   * Generate Playwright code for semantic selector
   */
  private generateSemanticCode(selector: string, action: string, text?: string): string {
    const parts = selector.split(':');
    const [selectorType, role, ...nameParts] = parts;
    const name = nameParts.join(':');

    switch (selectorType) {
      case 'role':
        if (name) {
          return `await page.getByRole('${role}', { name: '${name}' }).${action}(${text ? `'${text}'` : ''});`;
        } else {
          return `await page.getByRole('${role}').${action}(${text ? `'${text}'` : ''});`;
        }
      case 'text':
        return `await page.getByText('${role}').${action}(${text ? `'${text}'` : ''});`;
      case 'label':
        return `await page.getByLabel('${role}').${action}(${text ? `'${text}'` : ''});`;
      case 'placeholder':
        return `await page.getByPlaceholder('${role}').${action}(${text ? `'${text}'` : ''});`;
      default:
        return `await page.${action}('${selector}'${text ? `, '${text}'` : ''});`;
    }
  }
}
