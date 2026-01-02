/**
 * Error Context Helper
 * Adds helpful context and recovery suggestions to errors
 */

import * as fs from 'fs';
import * as path from 'path';

export class ErrorContext {
  // Configurable screenshot directory for failure captures
  private static screenshotDir: string = 'BROWSER-CLI/evidence';

  /**
   * Configure ErrorContext settings
   */
  static configure(config: { screenshotDir?: string }): void {
    if (config.screenshotDir) {
      this.screenshotDir = config.screenshotDir;
    }
  }

  /**
   * Capture screenshot on failure
   * @param sendCommand Function to send commands to browser manager
   * @returns Screenshot file path or null if capture failed
   */
  static async captureFailureScreenshot(
    sendCommand: (cmd: string, args: Record<string, any>) => Promise<any>
  ): Promise<string | null> {
    try {
      const timestamp = Date.now();
      const filename = `failure-${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);

      // Ensure directory exists
      fs.mkdirSync(this.screenshotDir, { recursive: true });

      // Take screenshot via existing screenshot command
      await sendCommand('screenshot', { path: filepath });

      return filepath;
    } catch {
      // If screenshot fails, return null (don't throw - primary error is more important)
      return null;
    }
  }

  /**
   * Enhanced error message with automatic screenshot capture
   * @param error The error that occurred
   * @param command The command that failed
   * @param args Command arguments
   * @param sendCommand Function to send commands to browser manager
   * @returns Enhanced error message with screenshot path if captured
   */
  static async enhanceWithScreenshot(
    error: Error,
    command: string,
    args: Record<string, any>,
    sendCommand: (cmd: string, args: Record<string, any>) => Promise<any>
  ): Promise<string> {
    // First get the base enhanced error message
    let message = this.enhance(error, command, args);

    // Try to capture screenshot
    const screenshotPath = await this.captureFailureScreenshot(sendCommand);
    if (screenshotPath) {
      message += `\n\n📸 Screenshot saved: ${screenshotPath}`;
    }

    return message;
  }

  static enhance(error: Error, command: string, args: Record<string, any>): string {
    let message = `❌ Error: ${error.message}`;

    // Add command-specific context
    const suggestion = this.getSuggestion(error, command, args);
    if (suggestion) {
      message += '\n\n' + suggestion;
    }

    return message;
  }

  /**
   * Get context-aware recovery suggestions
   */
  private static getSuggestion(error: Error, command: string, args: Record<string, any>): string {
    const msg = error.message.toLowerCase();

    // Browser/connection errors
    if (msg.includes('target closed') || msg.includes('browser has been closed')) {
      return '💡 Browser was closed. To fix:\n' +
             '  1. Check if browser-manager is running: lsof -ti:3456\n' +
             '  2. Restart manager: npx tsx BROWSER-CLI/SCRIPTS/browser-manager.ts &\n' +
             '  3. Retry your command';
    }

    if (msg.includes('econnrefused')) {
      return '💡 Cannot connect to browser-manager. To fix:\n' +
             '  1. Start the manager: npx tsx BROWSER-CLI/SCRIPTS/browser-manager.ts &\n' +
             '  2. Wait 2 seconds for initialization\n' +
             '  3. Retry your command';
    }

    // Navigation timeout (check first, more specific)
    if (msg.includes('timeout') && (command === 'navigate' || command === 'start')) {
      return '💡 Navigation timeout. To fix:\n' +
             '  1. Check URL is correct and accessible\n' +
             '  2. Increase timeout: navigate <url> --timeout=60000\n' +
             '  3. Check network connection\n' +
             '  4. Try waiting for specific element instead of networkidle';
    }

    // Selector/element errors (general timeout)
    if (msg.includes('timeout')) {
      const selector = this.extractSelector(error.message);
      return '💡 Element not found. To fix:\n' +
             `  1. Verify element exists: snapshot\n` +
             `  2. Check selector syntax: "${selector}"\n` +
             '  3. Wait for page to load: wait 1000\n' +
             '  4. Try semantic selector: click "role:button:Text"';
    }

    // Click/interaction errors
    if (msg.includes('not visible') || msg.includes('not enabled')) {
      return '💡 Element not interactable. To fix:\n' +
             '  1. Check element is visible: snapshot\n' +
             '  2. Scroll to element: evaluate "el.scrollIntoView()"\n' +
             '  3. Wait for element to be ready: wait 500\n' +
             '  4. Check if element is covered by overlay';
    }

    // Ref-specific errors
    if (msg.includes('invalid ref')) {
      return '💡 Element ref not found. To fix:\n' +
             '  1. Capture fresh snapshot: snapshot\n' +
             '  2. Use ref from snapshot output: [ref=eXX]\n' +
             '  3. Note: refs reset on each snapshot';
    }

    // Evaluate errors
    if (msg.includes('evaluation failed') || msg.includes('javascript error')) {
      return '💡 JavaScript evaluation failed. To fix:\n' +
             '  1. Check syntax: evaluate "() => document.title"\n' +
             '  2. Use arrow function for complex code\n' +
             '  3. Check for undefined variables\n' +
             '  4. Use console.log for debugging';
    }

    // File errors
    if (msg.includes('enoent') || msg.includes('no such file')) {
      return '💡 File not found. To fix:\n' +
             '  1. Check file path is correct\n' +
             '  2. Use absolute path: /full/path/to/file\n' +
             '  3. Verify file exists: ls <path>';
    }

    // Command validation errors
    if (msg.includes('invalid semantic selector')) {
      return '💡 Semantic selector format incorrect. Examples:\n' +
             '  - role:button:Submit\n' +
             '  - text:Click here\n' +
             '  - label:Email address\n' +
             '  - placeholder:Enter name';
    }

    return '';
  }

  /**
   * Extract selector from error message for better context
   */
  private static extractSelector(message: string): string {
    // Try to match selector in quotes
    let match = message.match(/selector ["']([^"']+)["']/);
    if (match) return match[1];

    // Try to match locator syntax: locator('selector')
    match = message.match(/locator\(['"]([^'"]+)['"]\)/);
    if (match) return match[1];

    return '(selector)';
  }

  /**
   * Format validation error with examples
   */
  static formatValidationError(command: string, missing: string): string {
    const examples = this.getCommandExamples(command);

    let message = `❌ Error: ${command} requires ${missing}`;

    if (examples.length > 0) {
      message += '\n\n💡 Examples:';
      examples.forEach(ex => {
        message += `\n  ${ex}`;
      });
    }

    return message;
  }

  /**
   * Get usage examples for command
   */
  private static getCommandExamples(command: string): string[] {
    const examples: Record<string, string[]> = {
      click: [
        'click e42',
        'click "role:button:Submit"',
        'click .my-button'
      ],
      type: [
        'type e15 "text here"',
        'type "role:textbox:Email" "user@example.com"',
        'type #input-field "value"'
      ],
      navigate: [
        'navigate http://localhost:5173',
        'navigate https://example.com'
      ],
      evaluate: [
        'evaluate "document.title"',
        'evaluate "() => window.location.href"',
        'evaluate "el.textContent" --ref=e42'
      ],
      snapshot: [
        'snapshot',
        'snapshot --file',
        'snapshot --baseline=auth-flow'
      ],
      network: [
        'network',
        'network --filter=convex',
        'network --method=POST --status=200'
      ],
      screenshot: [
        'screenshot test.png',
        'screenshot /path/to/output.png'
      ],
      hover: [
        'hover e42',
        'hover "role:button:Submit"',
        'hover .my-element'
      ],
      drag: [
        'drag e1 e2',
        'drag .source .target'
      ],
      wait: [
        'wait 1000',
        'wait 500'
      ],
      resize: [
        'resize 1920 1080',
        'resize 800 600'
      ]
    };

    return examples[command] || [];
  }
}
