/**
 * Unit tests for ErrorContext helper
 * Tests contextual error messages with recovery suggestions
 */

import { describe, it, expect } from 'vitest';
import { ErrorContext } from '../../SCRIPTS/cli/error-context';

describe('ErrorContext', () => {
  describe('enhance()', () => {
    // =========================================================================
    // Browser/Connection Errors
    // =========================================================================
    describe('connection errors', () => {
      it('suggests starting browser-manager for ECONNREFUSED', () => {
        const error = new Error('connect ECONNREFUSED 127.0.0.1:3456');
        const result = ErrorContext.enhance(error, 'navigate', {});

        expect(result).toContain('ECONNREFUSED');
        expect(result).toContain('browser-manager');
        expect(result).toContain('Start the manager');
      });

      it('suggests restarting for target closed error', () => {
        const error = new Error('Target closed unexpectedly');
        const result = ErrorContext.enhance(error, 'click', { selector: 'e5' });

        expect(result).toContain('Target closed');
        expect(result).toContain('Browser was closed');
        expect(result).toContain('lsof -ti:3456');
      });

      it('suggests restarting for browser has been closed error', () => {
        const error = new Error('Protocol error: browser has been closed');
        const result = ErrorContext.enhance(error, 'snapshot', {});

        expect(result).toContain('browser has been closed');
        expect(result).toContain('browser-manager');
        expect(result).toContain('Restart manager');
      });
    });

    // =========================================================================
    // Navigation Timeout Errors
    // =========================================================================
    describe('navigation timeout errors', () => {
      it('suggests URL check and timeout increase for navigate timeout', () => {
        const error = new Error('Timeout 30000ms exceeded while navigating');
        const result = ErrorContext.enhance(error, 'navigate', { url: 'http://localhost:5173' });

        expect(result).toContain('Timeout');
        expect(result).toContain('Navigation timeout');
        expect(result).toContain('Check URL is correct');
        expect(result).toContain('Increase timeout');
        expect(result).toContain('network connection');
      });

      it('suggests URL check for start command timeout', () => {
        const error = new Error('timeout waiting for page load');
        const result = ErrorContext.enhance(error, 'start', { url: 'http://example.com' });

        expect(result).toContain('Navigation timeout');
        expect(result).toContain('Check URL');
      });
    });

    // =========================================================================
    // Selector/Element Errors
    // =========================================================================
    describe('selector errors', () => {
      it('suggests snapshot for general timeout (element not found)', () => {
        const error = new Error('Timeout waiting for selector ".missing-element"');
        const result = ErrorContext.enhance(error, 'click', { selector: '.missing-element' });

        expect(result).toContain('Element not found');
        expect(result).toContain('snapshot');
        expect(result).toContain('.missing-element');
        expect(result).toContain('Wait for page to load');
      });

      it('extracts selector from locator syntax in error', () => {
        const error = new Error("Timeout waiting for locator('.my-button')");
        const result = ErrorContext.enhance(error, 'click', {});

        expect(result).toContain('.my-button');
        expect(result).toContain('snapshot');
      });

      it('suggests scroll or wait for not visible element', () => {
        const error = new Error('Element is not visible');
        const result = ErrorContext.enhance(error, 'click', { selector: 'e10' });

        expect(result).toContain('not visible');
        expect(result).toContain('Element not interactable');
        expect(result).toContain('scrollIntoView');
        expect(result).toContain('wait');
      });

      it('suggests wait for not enabled element', () => {
        const error = new Error('Element is not enabled');
        const result = ErrorContext.enhance(error, 'click', { selector: 'e5' });

        expect(result).toContain('not enabled');
        expect(result).toContain('not interactable');
        expect(result).toContain('overlay');
      });
    });

    // =========================================================================
    // Ref-specific Errors
    // =========================================================================
    describe('ref errors', () => {
      it('suggests fresh snapshot for invalid ref', () => {
        const error = new Error('Invalid ref: e999 not found in current snapshot');
        const result = ErrorContext.enhance(error, 'click', { selector: 'e999' });

        expect(result).toContain('Invalid ref');
        expect(result).toContain('ref not found');
        expect(result).toContain('fresh snapshot');
        expect(result).toContain('[ref=eXX]');
      });

      it('notes that refs reset on each snapshot', () => {
        const error = new Error('Invalid ref e50');
        const result = ErrorContext.enhance(error, 'type', { selector: 'e50', text: 'test' });

        expect(result).toContain('refs reset');
      });
    });

    // =========================================================================
    // Evaluate Errors
    // =========================================================================
    describe('evaluate errors', () => {
      it('suggests syntax check for evaluation failed', () => {
        const error = new Error('Evaluation failed: ReferenceError: foo is not defined');
        const result = ErrorContext.enhance(error, 'evaluate', { code: 'foo.bar()' });

        expect(result).toContain('Evaluation failed');
        expect(result).toContain('JavaScript evaluation failed');
        expect(result).toContain('Check syntax');
        expect(result).toContain('arrow function');
      });

      it('suggests debugging for JavaScript error', () => {
        const error = new Error('JavaScript error: Cannot read property of undefined');
        const result = ErrorContext.enhance(error, 'evaluate', { code: 'obj.prop.value' });

        expect(result).toContain('JavaScript error');
        expect(result).toContain('undefined variables');
        expect(result).toContain('console.log');
      });
    });

    // =========================================================================
    // File Errors
    // =========================================================================
    describe('file errors', () => {
      it('suggests checking path for ENOENT error', () => {
        const error = new Error('ENOENT: no such file or directory');
        const result = ErrorContext.enhance(error, 'uploadFile', { path: '/tmp/missing.png' });

        expect(result).toContain('ENOENT');
        expect(result).toContain('File not found');
        expect(result).toContain('path is correct');
        expect(result).toContain('absolute path');
      });

      it('suggests ls command to verify file existence', () => {
        const error = new Error('no such file: /path/to/file.txt');
        const result = ErrorContext.enhance(error, 'screenshot', { path: '/path/to/file.txt' });

        expect(result).toContain('ls');
        expect(result).toContain('Verify file exists');
      });
    });

    // =========================================================================
    // Validation Errors
    // =========================================================================
    describe('validation errors', () => {
      it('shows examples for invalid semantic selector', () => {
        const error = new Error('Invalid semantic selector: badformat');
        const result = ErrorContext.enhance(error, 'click', { selector: 'badformat' });

        expect(result).toContain('Invalid semantic selector');
        expect(result).toContain('role:button:Submit');
        expect(result).toContain('text:Click here');
        expect(result).toContain('label:Email address');
        expect(result).toContain('placeholder:Enter name');
      });
    });

    // =========================================================================
    // General Enhancement Behavior
    // =========================================================================
    describe('general behavior', () => {
      it('includes original error message', () => {
        const error = new Error('Some unexpected error occurred');
        const result = ErrorContext.enhance(error, 'click', {});

        expect(result).toContain('Some unexpected error occurred');
        expect(result).toContain('Error:');
      });

      it('returns error only when no suggestion matches', () => {
        const error = new Error('Unknown error type XYZ');
        const result = ErrorContext.enhance(error, 'wait', {});

        expect(result).toBe('❌ Error: Unknown error type XYZ');
        // No suggestion appended
        expect(result).not.toContain('\n\n');
      });

      it('formats with emoji prefix', () => {
        const error = new Error('test error');
        const result = ErrorContext.enhance(error, 'snapshot', {});

        expect(result.startsWith('❌')).toBe(true);
      });
    });
  });

  describe('formatValidationError()', () => {
    it('includes command and missing parameter', () => {
      const result = ErrorContext.formatValidationError('click', 'selector');

      expect(result).toContain('click');
      expect(result).toContain('requires');
      expect(result).toContain('selector');
    });

    it('shows examples for click command', () => {
      const result = ErrorContext.formatValidationError('click', 'a selector');

      expect(result).toContain('Examples');
      expect(result).toContain('click e42');
      expect(result).toContain('role:button:Submit');
      expect(result).toContain('.my-button');
    });

    it('shows examples for type command', () => {
      const result = ErrorContext.formatValidationError('type', 'selector and text');

      expect(result).toContain('Examples');
      expect(result).toContain('type e15');
      expect(result).toContain('role:textbox:Email');
      expect(result).toContain('#input-field');
    });

    it('shows examples for navigate command', () => {
      const result = ErrorContext.formatValidationError('navigate', 'a URL');

      expect(result).toContain('Examples');
      expect(result).toContain('http://localhost:5173');
      expect(result).toContain('https://example.com');
    });

    it('shows examples for evaluate command', () => {
      const result = ErrorContext.formatValidationError('evaluate', 'JavaScript code');

      expect(result).toContain('Examples');
      expect(result).toContain('document.title');
      expect(result).toContain('window.location.href');
      expect(result).toContain('--ref=e42');
    });

    it('shows examples for snapshot command', () => {
      const result = ErrorContext.formatValidationError('snapshot', 'valid options');

      expect(result).toContain('Examples');
      expect(result).toContain('snapshot');
      expect(result).toContain('--file');
      expect(result).toContain('--baseline');
    });

    it('shows examples for network command', () => {
      const result = ErrorContext.formatValidationError('network', 'valid options');

      expect(result).toContain('Examples');
      expect(result).toContain('--filter=convex');
      expect(result).toContain('--method=POST');
      expect(result).toContain('--status=200');
    });

    it('shows examples for screenshot command', () => {
      const result = ErrorContext.formatValidationError('screenshot', 'output path');

      expect(result).toContain('Examples');
      expect(result).toContain('test.png');
      expect(result).toContain('/path/to/output.png');
    });

    it('shows examples for hover command', () => {
      const result = ErrorContext.formatValidationError('hover', 'selector');

      expect(result).toContain('Examples');
      expect(result).toContain('hover e42');
      expect(result).toContain('.my-element');
    });

    it('shows examples for drag command', () => {
      const result = ErrorContext.formatValidationError('drag', 'source and target');

      expect(result).toContain('Examples');
      expect(result).toContain('drag e1 e2');
      expect(result).toContain('.source .target');
    });

    it('shows examples for wait command', () => {
      const result = ErrorContext.formatValidationError('wait', 'duration in ms');

      expect(result).toContain('Examples');
      expect(result).toContain('wait 1000');
      expect(result).toContain('wait 500');
    });

    it('shows examples for resize command', () => {
      const result = ErrorContext.formatValidationError('resize', 'width and height');

      expect(result).toContain('Examples');
      expect(result).toContain('1920 1080');
      expect(result).toContain('800 600');
    });

    it('returns message without examples for unknown command', () => {
      const result = ErrorContext.formatValidationError('unknownCmd', 'parameters');

      expect(result).toContain('unknownCmd');
      expect(result).toContain('requires');
      expect(result).toContain('parameters');
      // No examples section for unknown commands
      expect(result).not.toContain('Examples');
    });

    it('formats with emoji prefix', () => {
      const result = ErrorContext.formatValidationError('click', 'selector');

      expect(result.startsWith('❌')).toBe(true);
    });
  });
});
