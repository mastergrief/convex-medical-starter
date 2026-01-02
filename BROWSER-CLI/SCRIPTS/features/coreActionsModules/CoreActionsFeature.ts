/**
 * Core Actions Feature - Main Class
 * Orchestrates core browser operations via modular functions
 */

import { BaseFeature } from '../base-feature';
import { CommandHandler, CommandResponse } from '../../core/types';

// Import types
import type {
  NavigateOptions,
  NavigateState,
  ClickOptions,
  DblclickOptions,
  TypeOptions,
  WaitForSelectorOptions,
  ResizeConfig,
  EvaluateResult
} from './types';

// Import module functions
import {
  navigate as navigateFn,
  wait as waitFn,
  waitForSelector as waitForSelectorFn,
  resize as resizeFn
} from './navigation';

import {
  click as clickFn,
  dblclick as dblclickFn,
  hover as hoverFn,
  drag as dragFn,
  type InteractionResult
} from './interaction';

import {
  type as typeFn,
  pressKey as pressKeyFn,
  selectOption as selectOptionFn,
  fillForm as fillFormFn,
  uploadFile as uploadFileFn
} from './input';

import {
  pressKeyCombo as pressKeyComboFn,
  holdKey as holdKeyFn,
  tapKey as tapKeyFn
} from './keyboard';

import {
  screenshot as screenshotFn,
  evaluate as evaluateFn
} from './utilities';

import type { PluginsFeature } from '../plugins-feature';

/**
 * Core actions feature providing fundamental browser operations.
 *
 * These are the basic building blocks for browser automation:
 * - Navigation (navigate)
 * - Interaction (click, type, hover, drag)
 * - Input (pressKey, selectOption, fillForm, uploadFile)
 * - Waiting (wait, waitForSelector)
 * - Utilities (screenshot, evaluate, resize)
 */
export class CoreActionsFeature extends BaseFeature {
  public readonly name = 'CoreActions';
  private pluginsFeature?: PluginsFeature;

  setPluginsFeature(plugins: PluginsFeature): void {
    this.pluginsFeature = plugins;
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['navigate', this.handleNavigate.bind(this)],
      ['screenshot', this.handleScreenshot.bind(this)],
      ['evaluate', this.handleEvaluate.bind(this)],
      ['click', this.handleClick.bind(this)],
      ['dblclick', this.handleDblclick.bind(this)],
      ['type', this.handleType.bind(this)],
      ['pressKey', this.handlePressKey.bind(this)],
      ['pressKeyCombo', this.handlePressKeyCombo.bind(this)],
      ['holdKey', this.handleHoldKey.bind(this)],
      ['tapKey', this.handleTapKey.bind(this)],
      ['hover', this.handleHover.bind(this)],
      ['drag', this.handleDrag.bind(this)],
      ['selectOption', this.handleSelectOption.bind(this)],
      ['fillForm', this.handleFillForm.bind(this)],
      ['uploadFile', this.handleUploadFile.bind(this)],
      ['resize', this.handleResize.bind(this)],
      ['wait', this.handleWait.bind(this)],
      ['waitForSelector', this.handleWaitForSelector.bind(this)],
    ]);
  }

  // ========================================
  // Public API Methods
  // ========================================

  async navigate(url: string, state?: NavigateState, options?: NavigateOptions): Promise<string> {
    return navigateFn(this.page, this.log.bind(this), url, state, options);
  }

  async screenshot(filepath: string): Promise<string> {
    return screenshotFn(this.page, this.log.bind(this), filepath);
  }

  async evaluate(code: string, ref?: string, unsafe?: boolean): Promise<EvaluateResult> {
    return evaluateFn(this.page, this.log.bind(this), code, ref, unsafe);
  }

  async click(selector: string, options?: ClickOptions): Promise<InteractionResult> {
    return clickFn(this.page, this.log.bind(this), selector, options);
  }

  async dblclick(selector: string, options?: DblclickOptions): Promise<InteractionResult> {
    return dblclickFn(this.page, this.log.bind(this), selector, options);
  }

  async type(selector: string, text: string, options?: TypeOptions): Promise<string> {
    return typeFn(this.page, this.log.bind(this), selector, text, options);
  }

  async pressKey(key: string): Promise<string> {
    return pressKeyFn(this.page, this.log.bind(this), key);
  }

  async pressKeyCombo(combo: string): Promise<string> {
    return pressKeyComboFn(this.page, this.log.bind(this), combo);
  }

  async holdKey(key: string, durationMs: number): Promise<string> {
    return holdKeyFn(this.page, this.log.bind(this), key, durationMs);
  }

  async tapKey(key: string, count: number, delayMs?: number): Promise<string> {
    return tapKeyFn(this.page, this.log.bind(this), key, count, delayMs);
  }

  async hover(selector: string): Promise<InteractionResult> {
    return hoverFn(this.page, this.log.bind(this), selector);
  }

  async drag(sourceSelector: string, targetSelector: string): Promise<string> {
    return dragFn(this.page, this.log.bind(this), sourceSelector, targetSelector);
  }

  async selectOption(selector: string, value: string): Promise<string> {
    return selectOptionFn(this.page, this.log.bind(this), selector, value);
  }

  async fillForm(fields: Record<string, string>): Promise<string[]> {
    return fillFormFn(this.page, this.log.bind(this), fields);
  }

  async uploadFile(selector: string, filePath: string | string[]): Promise<string> {
    return uploadFileFn(this.page, this.log.bind(this), selector, filePath);
  }

  async resize(width: number, height: number, config?: ResizeConfig): Promise<string> {
    return resizeFn(this.page, this.log.bind(this), width, height, config);
  }

  async wait(ms: number): Promise<string> {
    return waitFn(this.page, this.log.bind(this), ms);
  }

  async waitForSelector(selector: string, options?: WaitForSelectorOptions): Promise<string> {
    return waitForSelectorFn(this.page, this.log.bind(this), selector, options);
  }

  // ========================================
  // Command Handler Methods
  // ========================================

  private async handleNavigate(args: { url: string; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' }): Promise<CommandResponse> {
    try {
      const code = await this.navigate(args.url, undefined, { waitUntil: args.waitUntil });
      // Trigger plugin onNavigate hook after successful navigation
      await this.pluginsFeature?.triggerOnNavigate(args.url);
      return { status: 'ok', data: { url: this.page.url() }, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleScreenshot(args: { path: string }): Promise<CommandResponse> {
    try {
      const code = await this.screenshot(args.path);
      return { status: 'ok', data: { path: args.path }, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleEvaluate(args: { code: string; ref?: string; unsafe?: boolean }): Promise<CommandResponse> {
    try {
      const result = await this.evaluate(args.code, args.ref, args.unsafe);
      
      // Check if evaluate returned an error status (blocked pattern)
      if (result.status === 'error') {
        return { status: 'error', message: result.message };
      }
      
      return { status: 'ok', data: { result: result.result, url: result.url, title: result.title }, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleClick(args: { selector: string; button?: 'left' | 'right' | 'middle'; clickCount?: number }): Promise<CommandResponse> {
    try {
      const result = await this.click(args.selector, { button: args.button, clickCount: args.clickCount });
      return { status: 'ok', data: { metrics: result.metrics }, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleDblclick(args: { selector: string; button?: 'left' | 'right' | 'middle' }): Promise<CommandResponse> {
    try {
      const result = await this.dblclick(args.selector, { button: args.button });
      return { status: 'ok', data: { metrics: result.metrics }, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleType(args: { selector: string; text: string; delay?: number }): Promise<CommandResponse> {
    try {
      const code = await this.type(args.selector, args.text, { delay: args.delay });
      return { status: 'ok', data: {}, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handlePressKey(args: { key: string }): Promise<CommandResponse> {
    try {
      const code = await this.pressKey(args.key);
      return { status: 'ok', data: {}, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handlePressKeyCombo(args: { combo: string }): Promise<CommandResponse> {
    try {
      const code = await this.pressKeyCombo(args.combo);
      return { status: 'ok', data: {}, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleHoldKey(args: { key: string; durationMs: number }): Promise<CommandResponse> {
    try {
      const code = await this.holdKey(args.key, args.durationMs);
      return { status: 'ok', data: {}, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleTapKey(args: { key: string; count: number; delayMs?: number }): Promise<CommandResponse> {
    try {
      const code = await this.tapKey(args.key, args.count, args.delayMs);
      return { status: 'ok', data: {}, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleHover(args: { selector: string }): Promise<CommandResponse> {
    try {
      const result = await this.hover(args.selector);
      return { status: 'ok', data: { metrics: result.metrics }, code: result.code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleDrag(args: { sourceSelector: string; targetSelector: string }): Promise<CommandResponse> {
    try {
      const code = await this.drag(args.sourceSelector, args.targetSelector);
      return { status: 'ok', data: {}, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleSelectOption(args: { selector: string; value: string }): Promise<CommandResponse> {
    try {
      const code = await this.selectOption(args.selector, args.value);
      return { status: 'ok', data: {}, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleFillForm(args: { fields: Record<string, string> }): Promise<CommandResponse> {
    try {
      const codeLines = await this.fillForm(args.fields);
      return { status: 'ok', data: { fieldsCount: Object.keys(args.fields).length }, code: codeLines.join('\n') };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleUploadFile(args: { selector: string; filePath: string | string[] }): Promise<CommandResponse> {
    try {
      const code = await this.uploadFile(args.selector, args.filePath);
      return { status: 'ok', data: {}, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleResize(args: { width: number; height: number }): Promise<CommandResponse> {
    try {
      const code = await this.resize(args.width, args.height);
      return { status: 'ok', data: { width: args.width, height: args.height }, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleWait(args: { ms: number }): Promise<CommandResponse> {
    try {
      const code = await this.wait(args.ms);
      return { status: 'ok', data: { ms: args.ms }, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }

  private async handleWaitForSelector(args: { selector: string; state?: 'attached' | 'detached' | 'visible' | 'hidden'; timeout?: number }): Promise<CommandResponse> {
    try {
      const code = await this.waitForSelector(args.selector, { state: args.state, timeout: args.timeout });
      return { status: 'ok', data: {}, code };
    } catch (error) {
      return { status: 'error', message: error instanceof Error ? error.message : String(error) };
    }
  }
}
