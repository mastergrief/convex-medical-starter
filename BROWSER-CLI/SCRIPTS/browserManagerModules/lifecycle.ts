/**
 * Browser Lifecycle Module
 *
 * Manages browser start, close, state persistence, and status reporting.
 * Does NOT initialize features - that is delegated to BrowserManager.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import * as fs from 'fs';
import { BrowserFeature } from '../core/types';
import { STORAGE_STATE_FILE } from '../core/constants';
import { Logger } from '../utils/logger';
import { BrowserConfig, DEFAULT_CONFIG } from './types';

/**
 * Internal lifecycle state
 */

export interface LifecycleState {
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
  url: string | null;
  startTime: number;
}

/**
 * Manages browser lifecycle: start, stop, state persistence
 */

/**
 * Patterns that indicate corrupted storage state (snapshot injection)
 */
const CORRUPTION_PATTERNS = [
  '=== SNAPSHOT',
  '[ref=e',
  'ELEMENT STATE',
  'ACCESSIBILITY TREE',
  '- document:',
  '- heading',
  '- button',
];

/**
 * Validate storage state file and return it if valid, null otherwise.
 * Detects snapshot text contamination that could cause page injection.
 */
function validateStorageState(filePath: string, logger: Logger): object | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const storageState = JSON.parse(content);

    // Basic structure validation
    if (!storageState || typeof storageState !== 'object') {
      logger.log('Invalid storage state: not an object');
      fs.unlinkSync(filePath);
      return null;
    }

    // Check for snapshot contamination in the serialized content
    const contentLower = content.toLowerCase();
    for (const pattern of CORRUPTION_PATTERNS) {
      if (content.includes(pattern) || contentLower.includes(pattern.toLowerCase())) {
        logger.log(`Corrupted storage state detected (contains "${pattern}"), removing...`);
        fs.unlinkSync(filePath);
        return null;
      }
    }

    // Validate expected structure (cookies array, origins array)
    if (storageState.cookies && !Array.isArray(storageState.cookies)) {
      logger.log('Invalid storage state: cookies is not an array');
      fs.unlinkSync(filePath);
      return null;
    }

    if (storageState.origins && !Array.isArray(storageState.origins)) {
      logger.log('Invalid storage state: origins is not an array');
      fs.unlinkSync(filePath);
      return null;
    }

    return storageState;
  } catch (error) {
    logger.log(`Failed to parse storage state: ${error instanceof Error ? error.message : error}`);
    try {
      fs.unlinkSync(filePath);
    } catch {
      // Ignore unlink errors
    }
    return null;
  }
}

export class BrowserLifecycle {
  private state: LifecycleState = {
    browser: null,
    context: null,
    page: null,
    url: null,
    startTime: Date.now(),
  };

  private config: BrowserConfig = { ...DEFAULT_CONFIG };
  private features: Map<string, BrowserFeature>;

  constructor(
    private logger: Logger,
    features: Map<string, BrowserFeature>
  ) {
    this.features = features;
  }

  get page(): Page | null {
    return this.state.page;
  }

  get context(): BrowserContext | null {
    return this.state.context;
  }

  get isRunning(): boolean {
    return !!this.state.browser;
  }

  get currentUrl(): string | null {
    return this.state.url;
  }

  get browserConfig(): BrowserConfig {
    return this.config;
  }

  getFeatures(): Map<string, BrowserFeature> {
    return this.features;
  }

  /**
   * Update features map (called after feature initialization)
   */
  updateFeatures(features: Map<string, BrowserFeature>): void {
    this.features = features;
  }


  /**
   * Update configuration (called before browser start)
   */
  setConfig(config: Partial<BrowserConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log(`Config updated: viewport=${this.config.width}x${this.config.height}`);
  }

  /**
   * Start browser with given URL (does NOT initialize features)
   */
  async start(url: string): Promise<void> {
    if (this.state.browser) {
      throw new Error('Browser already running');
    }

    this.logger.log('Launching browser...');
    this.state.browser = await chromium.launch({
      headless: this.config.headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    // Load storage state if it exists
    const contextOptions: any = {
      viewport: { width: this.config.width, height: this.config.height },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    };

    // Validate and restore storage state (with corruption detection)
    const validatedState = validateStorageState(STORAGE_STATE_FILE, this.logger);
    if (validatedState) {
      this.logger.log('Restoring validated browser state...');
      contextOptions.storageState = validatedState;
      this.logger.log('Browser state restored');
    }

    this.state.context = await this.state.browser.newContext(contextOptions);
    this.state.page = await this.state.context.newPage();

    this.logger.log(`Navigating to: ${url}`);
    await this.state.page.goto(url, { waitUntil: 'networkidle' });
    this.state.url = this.state.page.url();

    this.logger.log('Browser ready');
  }

  /**
   * Auto-start browser if not already running (MCP-like behavior)
   */
  async ensureBrowserStarted(defaultUrl: string = 'about:blank'): Promise<void> {
    if (!this.state.browser) {
      this.logger.log('Auto-starting browser...');
      await this.start(defaultUrl);
    }
  }

  /**
   * Save storage state (cookies, localStorage, etc.)
   */
  async saveStorageState(): Promise<void> {
    if (!this.state.context) {
      return;
    }

    try {
      this.logger.log('Saving browser state...');
      const storageState = await this.state.context.storageState();
      fs.writeFileSync(STORAGE_STATE_FILE, JSON.stringify(storageState, null, 2));
      this.logger.log('Browser state saved');
    } catch (error) {
      this.logger.log(`Failed to save storage state: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * Close browser and cleanup
   */
  async close(): Promise<void> {
    if (this.state.browser) {
      // Save storage state before closing
      await this.saveStorageState();

      this.logger.log('Closing browser...');
      await this.state.browser.close();
      this.state = {
        browser: null,
        context: null,
        page: null,
        url: null,
        startTime: this.state.startTime,
      };
    }
  }


  /**
   * Recreate browser context with new options (e.g., for video recording)
   * Preserves the current URL and restores navigation after context recreation
   */
  async recreateContext(options?: {
    recordVideo?: { dir: string; size: { width: number; height: number } };
  }): Promise<{ page: Page; context: BrowserContext } | null> {
    if (!this.state.browser) {
      this.logger.log('Cannot recreate context: browser not running');
      return null;
    }

    const currentUrl = this.state.page?.url() || 'about:blank';
    this.logger.log(`Recreating context with options: ${JSON.stringify(options)}`);

    // Close current context (if exists)
    if (this.state.context) {
      // Save storage state before closing
      await this.saveStorageState();
      await this.state.context.close();
    }

    // Build new context options
    const contextOptions: any = {
      viewport: { width: this.config.width, height: this.config.height },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
    };

    // Add video recording options if provided
    if (options?.recordVideo) {
      contextOptions.recordVideo = options.recordVideo;
      this.logger.log(`Video recording enabled: ${options.recordVideo.dir}`);
    }

    // Validate and restore storage state (with corruption detection)
    const validatedState = validateStorageState(STORAGE_STATE_FILE, this.logger);
    if (validatedState) {
      contextOptions.storageState = validatedState;
    }

    // Create new context with options
    this.state.context = await this.state.browser.newContext(contextOptions);
    this.state.page = await this.state.context.newPage();

    // Navigate back to the original URL
    if (currentUrl !== 'about:blank') {
      this.logger.log(`Navigating back to: ${currentUrl}`);
      await this.state.page.goto(currentUrl, { waitUntil: 'networkidle' });
    }
    this.state.url = this.state.page.url();

    this.logger.log('Context recreated successfully');
    return { page: this.state.page, context: this.state.context };
  }


  /**
   * Set headless mode. If the browser is running, it will be restarted.
   */
  async setHeadless(headless: boolean): Promise<{ restarted: boolean; previousValue: boolean }> {
    const previousValue = this.config.headless;
    
    // If value is the same, no action needed
    if (previousValue === headless) {
      this.logger.log(`Headless mode already set to ${headless}`);
      return { restarted: false, previousValue };
    }

    // Update config
    this.config.headless = headless;
    this.logger.log(`Headless mode changed from ${previousValue} to ${headless}`);

    // If browser is running, restart it with the new setting
    if (this.state.browser) {
      const currentUrl = this.state.url || 'about:blank';
      this.logger.log('Restarting browser with new headless setting...');
      await this.close();
      await this.start(currentUrl);
      return { restarted: true, previousValue };
    }

    return { restarted: false, previousValue };
  }

  /**
   * Update page reference (for tab switching)
   */
  setPage(page: Page, url: string): void {
    this.state.page = page;
    this.state.url = url;
  }

  /**
   * Update URL reference
   */
  setUrl(url: string): void {
    this.state.url = url;
  }

  /**
   * Get status information
   */
  getStatus(verbose: boolean = false): object {
    const basicStatus = {
      running: !!this.state.browser,
      url: this.state.url,
      hasPage: !!this.state.page,
    };

    if (!verbose) {
      return basicStatus;
    }

    // Calculate uptime
    const uptime = Date.now() - this.state.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);

    // Get tab count from context
    const tabCount = this.state.context ? this.state.context.pages().length : 0;

    return {
      ...basicStatus,
      verbose: {
        uptime: {
          milliseconds: uptime,
          formatted:
            uptimeHours > 0
              ? `${uptimeHours}h ${uptimeMinutes % 60}m ${uptimeSeconds % 60}s`
              : uptimeMinutes > 0
                ? `${uptimeMinutes}m ${uptimeSeconds % 60}s`
                : `${uptimeSeconds}s`,
        },
        config: {
          width: this.config.width,
          height: this.config.height,
          headless: this.config.headless,
        },
        features: Array.from(this.features.keys()),
        featureCount: this.features.size,
        browserContext: this.state.context ? 'initialized' : 'not initialized',
        tabCount,
      },
    };
  }
}
