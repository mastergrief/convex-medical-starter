/**
 * Phase 2: Browser State Management Feature
 *
 * Saves and restores complete browser state including cookies, localStorage, sessionStorage, and URL.
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';
import { STATE_DIR } from '../core/constants';
import { getDefaultValidator } from '../utils/schema-validator';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Browser state structure for save/restore operations
 */
interface BrowserState {
  url: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  localStorage: string;
  sessionStorage: string;
  timestamp?: number;
}

/**
 * Browser State Management Feature
 *
 * Provides functionality to save and restore complete browser state beyond
 * just authentication. Useful for:
 * - Testing complex user flows that require specific state
 * - Resuming work from exact browser state
 * - Creating test fixtures with pre-configured state
 *
 * State includes:
 * - Current URL
 * - All cookies
 * - localStorage contents
 * - sessionStorage contents
 * - Timestamp of when state was saved
 *
 * Commands:
 * - saveBrowserState: Save current browser state with a name
 * - restoreBrowserState: Restore saved browser state
 * - listBrowserStates: List all saved states
 * - deleteBrowserState: Delete a saved state
 */
export class BrowserStateFeature extends BaseFeature {
  public readonly name = 'BrowserState';

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['saveBrowserState', this.saveState.bind(this)],
      ['restoreBrowserState', this.restoreState.bind(this)],
      ['listBrowserStates', this.listStates.bind(this)],
      ['deleteBrowserState', this.deleteState.bind(this)]
    ]);
  }

  /**
   * Validate state name to prevent path traversal attacks
   */
  private validateStateName(name: string): { valid: boolean; error?: string } {
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      return {
        valid: false,
        error: 'Invalid state name - must not contain path separators or ".."'
      };
    }
    if (name.length === 0) {
      return {
        valid: false,
        error: 'State name cannot be empty'
      };
    }
    if (name.length > 255) {
      return {
        valid: false,
        error: 'State name too long (max 255 characters)'
      };
    }
    return { valid: true };
  }

  /**
   * Save full browser state
   */
  private async saveState(args: { name: string }): Promise<CommandResponse> {
    // Validate state name (prevent path traversal)
    const validation = this.validateStateName(args.name);
    if (!validation.valid) {
      return {
        status: 'error',
        message: validation.error!
      };
    }

    const context = this.page.context();
    if (!context) {
      return {
        status: 'error',
        message: 'Browser context not available'
      };
    }

    const stateDir = path.join(STATE_DIR, 'states');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const statePath = path.join(stateDir, `${args.name}.json`);

    const state: BrowserState = {
      url: this.page.url(),
      cookies: await context.cookies(),
      localStorage: await this.page.evaluate(() => JSON.stringify(localStorage)),
      sessionStorage: await this.page.evaluate(() => JSON.stringify(sessionStorage)),
      timestamp: Date.now(),
    };

    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    this.log(`Saved browser state: ${args.name}`);

    return { status: 'ok', data: { name: args.name } };
  }

  /**
   * Restore browser state with validation
   */
  private async restoreState(args: { name: string }): Promise<CommandResponse> {
    // Validate state name (prevent path traversal)
    const nameValidation = this.validateStateName(args.name);
    if (!nameValidation.valid) {
      return {
        status: 'error',
        message: nameValidation.error!
      };
    }

    const statePath = path.join(STATE_DIR, 'states', `${args.name}.json`);
    if (!fs.existsSync(statePath)) {
      return {
        status: 'error',
        message: `No saved state found with name: ${args.name}`
      };
    }

    // Parse state file
    let rawState: unknown;
    try {
      rawState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    } catch (e) {
      return {
        status: 'error',
        message: `Failed to parse state file: ${e instanceof Error ? e.message : 'Unknown error'}`
      };
    }

    // Validate against schema
    const validator = getDefaultValidator();
    const validation = validator.validate('browser-state', rawState);
    if (!validation.valid) {
      return {
        status: 'error',
        message: 'Invalid state file structure',
        data: {
          errors: validation.errors.map(err => ({
            field: err.field,
            message: err.message
          }))
        }
      };
    }

    // Type assertion after validation
    const state = rawState as BrowserState;
    const context = this.page.context();

    // Restore cookies
    await context.addCookies(state.cookies);

    // Navigate to saved URL
    await this.page.goto(state.url, { waitUntil: 'networkidle' });

    // Restore localStorage and sessionStorage
    await this.page.evaluate((data) => {
      const localData = JSON.parse(data.localStorage);
      const sessionData = JSON.parse(data.sessionStorage);

      Object.entries(localData).forEach(([key, value]) => {
        localStorage.setItem(key, value as string);
      });

      Object.entries(sessionData).forEach(([key, value]) => {
        sessionStorage.setItem(key, value as string);
      });
    }, state);

    this.log(`Restored browser state: ${args.name}`);
    return { status: 'ok', data: { name: args.name, url: this.page.url() } };
  }

  /**
   * List all saved browser states
   */
  private async listStates(): Promise<CommandResponse> {
    const stateDir = path.join(STATE_DIR, 'states');
    if (!fs.existsSync(stateDir)) {
      return { status: 'ok', data: { states: [] } };
    }

    const states = fs.readdirSync(stateDir)
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));

    return { status: 'ok', data: { states } };
  }

  /**
   * Delete a saved browser state
   */
  private async deleteState(args: { name: string }): Promise<CommandResponse> {
    // Validate state name (prevent path traversal)
    const validation = this.validateStateName(args.name);
    if (!validation.valid) {
      return {
        status: 'error',
        message: validation.error!
      };
    }

    const statePath = path.join(STATE_DIR, 'states', `${args.name}.json`);
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
      this.log(`Deleted browser state: ${args.name}`);
      return { status: 'ok', data: { name: args.name } };
    } else {
      return {
        status: 'error',
        message: `No saved state found with name: ${args.name}`
      };
    }
  }
}
