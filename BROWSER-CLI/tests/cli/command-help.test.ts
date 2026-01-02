/**
 * Unit tests for command-help module
 * Tests help text coverage, getCommandHelp function, and command alias normalization
 */

import { describe, it, expect } from 'vitest';
import { commandHelp, getCommandHelp } from '../../SCRIPTS/cli/commandHelpModules';

// List of commands from command-validator.ts for cross-reference
const VALID_COMMANDS = [
  // Navigation
  'start',
  'navigate',
  // Interaction
  'click',
  'clickByRef',
  'clickBySemantic',
  'dblclick',
  'dblclickByRef',
  'dblclickBySemantic',
  'type',
  'typeByRef',
  'typeBySemantic',
  'pressKey',
  'hover',
  'hoverByRef',
  'hoverBySemantic',
  'drag',
  'dragByRef',
  'dragByCSS',
  'selectOption',
  'fillForm',
  'uploadFile',
  // Waiting
  'wait',
  'waitForSelector',
  'waitForSelectorByRef',
  'waitForSelectorBySemantic',
  // Capture
  'snapshot',
  'changes',
  'screenshot',
  'clearConsole',
  'listBaselines',
  // Tabs
  'tabs',
  'newTab',
  'switchTab',
  'closeTab',
  // Utility
  'resize',
  'evaluate',
  'console',
  'network',
  'networkClear',
  'handleDialog',
  'status',
  'close',
  // Phase 2
  'exec',
  'saveState',
  'restoreState',
  'listStates',
  'deleteState',
  'saveBrowserState',
  'restoreBrowserState',
  'listBrowserStates',
  'deleteBrowserState',
  'saveSnapshotBaseline',
  'compareSnapshots',
  // Phase 3
  'saveScreenshotBaseline',
  'compareScreenshots',
  'listScreenshotBaselines',
  'setupNetworkMocking',
  'mockRoute',
  'clearMocks',
  'listMocks',
  'listSchemas',
  'validateMock',
  'loadSchema',
  'capturePerformanceMetrics',
  'getPerformanceMetrics',
];

describe('command-help', () => {
  describe('commandHelp Record', () => {
    it('has help text for all documented commands (50+)', () => {
      const commands = Object.keys(commandHelp);
      expect(commands.length).toBeGreaterThan(50);
    });

    it('all commands have non-empty help text', () => {
      for (const [command, help] of Object.entries(commandHelp)) {
        expect(help.length, `Help text for '${command}' should not be empty`).toBeGreaterThan(0);
        expect(help.trim().length, `Help text for '${command}' should not be whitespace only`).toBeGreaterThan(0);
      }
    });

    it('each help text includes Usage: header', () => {
      for (const [command, help] of Object.entries(commandHelp)) {
        expect(help, `Help text for '${command}' should include 'Usage:'`).toContain('Usage:');
      }
    });

    it('each help text includes Examples: section', () => {
      for (const [command, help] of Object.entries(commandHelp)) {
        expect(help, `Help text for '${command}' should include 'Examples:'`).toContain('Examples:');
      }
    });

    it('click help includes selector types documentation', () => {
      const help = commandHelp['click'];
      expect(help).toContain('Selector Types:');
      expect(help).toContain('CSS selector');
      expect(help).toContain('Element ref');
      expect(help).toContain('Semantic');
    });
  });

  describe('getCommandHelp', () => {
    it('returns help text for valid command (click)', () => {
      const help = getCommandHelp('click');
      expect(help).toContain('Usage: browser-cmd click');
      expect(help).toContain('Selector Types:');
    });

    it('returns fallback message for unknown command', () => {
      const help = getCommandHelp('unknownCommand');
      expect(help).toContain('No detailed help available');
      expect(help).toContain('unknownCommand');
    });

    it('normalizes clickByRef to click help', () => {
      const help = getCommandHelp('clickByRef');
      expect(help).toContain('Usage: browser-cmd click');
    });
  });

  describe('command alias normalization', () => {
    it('clickByRef maps to click help', () => {
      const clickHelp = getCommandHelp('click');
      const clickByRefHelp = getCommandHelp('clickByRef');
      expect(clickByRefHelp).toBe(clickHelp);
    });

    it('typeBySemantic maps to type help', () => {
      const typeHelp = getCommandHelp('type');
      const typeBySemanticHelp = getCommandHelp('typeBySemantic');
      expect(typeBySemanticHelp).toBe(typeHelp);
    });

    it('clickBySemantic maps to click help', () => {
      const clickHelp = getCommandHelp('click');
      const clickBySemanticHelp = getCommandHelp('clickBySemantic');
      expect(clickBySemanticHelp).toBe(clickHelp);
    });

    it('typeByRef maps to type help', () => {
      const typeHelp = getCommandHelp('type');
      const typeByRefHelp = getCommandHelp('typeByRef');
      expect(typeByRefHelp).toBe(typeHelp);
    });
  });

  describe('specific command help content', () => {
    it('snapshot help documents all flags', () => {
      const help = commandHelp['snapshot'];
      expect(help).toContain('--file');
      expect(help).toContain('--baseline');
      expect(help).toContain('--compare');
      expect(help).toContain('--quiet');
    });

    it('click help documents ref syntax with example', () => {
      const help = commandHelp['click'];
      expect(help).toContain('e42');
      expect(help).toContain('[ref=e42]');
    });

    it('screenshot help documents options', () => {
      const help = commandHelp['screenshot'];
      expect(help).toContain('--no-preview');
      expect(help).toContain('--ascii-only');
    });

    it('network help documents all filter options', () => {
      const help = commandHelp['network'];
      expect(help).toContain('--filter');
      expect(help).toContain('--method');
      expect(help).toContain('--status');
      expect(help).toContain('--limit');
    });

    it('mockRoute help documents schema validation', () => {
      const help = commandHelp['mockRoute'];
      expect(help).toContain('--schema');
      expect(help).toContain('--skip-validation');
      expect(help).toContain('Available Schemas:');
    });
  });

  describe('cross-reference with VALID_COMMANDS', () => {
    it('every VALID_COMMAND has help (direct or via alias)', () => {
      const missingHelp: string[] = [];

      for (const command of VALID_COMMANDS) {
        const help = getCommandHelp(command);
        // If it returns fallback message, it's missing
        if (help.includes('No detailed help available')) {
          missingHelp.push(command);
        }
      }

      // dragByCSS and tabs are expected to be missing (handled specially)
      const expectedMissing = ['dragByCSS', 'tabs'];
      const unexpectedMissing = missingHelp.filter(cmd => !expectedMissing.includes(cmd));

      expect(
        unexpectedMissing,
        `Commands missing help: ${unexpectedMissing.join(', ')}`
      ).toHaveLength(0);
    });
  });
});
