/**
 * Browser Manager - Composed Module
 *
 * Composes lifecycle, features, command dispatch, and TCP server
 * into a unified manager for browser automation.
 */

import { BrowserFeature } from '../core/types';
import { DEFAULT_PORT, PID_FILE, PORT_FILE } from '../core/constants';
import { CommandServer } from '../core/server';
import { Logger } from '../utils/logger';
import { BrowserLifecycle } from './lifecycle';
import { CommandDispatcher } from './command-dispatcher';
import { ResponseEnricher } from './response-enricher';
import {
  initializeFeatures,
  cleanupFeatures,
  buildCommandIndex,
  loadLazyFeature,
  CommandIndexEntry
} from './feature-registry';

/**
 * Main browser manager composing all modules
 */
export class BrowserManager {
  private server: CommandServer | null = null;
  private port: number;
  private logger: Logger;
  private features: Map<string, BrowserFeature> = new Map();
  private lifecycle: BrowserLifecycle;
  private dispatcher: CommandDispatcher | null = null;
  private featuresInitialized: boolean = false;
  private commandIndex: Map<string, CommandIndexEntry> | null = null;
  private sessionId: string | undefined = undefined;

  constructor(port: number = DEFAULT_PORT) {
    this.port = port;
    this.logger = new Logger('BrowserManager');
    this.lifecycle = new BrowserLifecycle(this.logger, this.features);
  }

  /**
   * Set session ID for session-scoped browser management.
   * When set, the close command requires a matching session ID to shut down.
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    this.logger.log(`Session ID set: ${sessionId}`);
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | undefined {
    return this.sessionId;
  }

  /**
   * Initialize features lazily after browser page is available
   */
  private async ensureFeaturesInitialized(): Promise<void> {
    if (this.featuresInitialized || !this.lifecycle.page) return;

    // Initialize only core features
    this.features = await initializeFeatures(
      this.lifecycle.page,
      this.logger,
      this.handleCommand.bind(this),
      this.lifecycle.context ?? undefined
    );
    this.lifecycle.updateFeatures(this.features);

    // Build command index for O(1) lookup
    this.commandIndex = buildCommandIndex(this.features);

    // Create lazy feature loader callback
    const lazyLoader = async (featureName: string) => {
      if (!this.lifecycle.page) return null;
      return loadLazyFeature(
        featureName,
        this.lifecycle.page,
        this.logger,
        this.features,
        this.handleCommand.bind(this),
        this.lifecycle.context ?? undefined
      );
    };

    const enricher = new ResponseEnricher();
    this.dispatcher = new CommandDispatcher(
      this.features,
      this.lifecycle,
      enricher,
      lazyLoader,
      this.commandIndex
    );
    this.featuresInitialized = true;
  }

  /**
   * Handle incoming command from TCP server
   */
  private async handleCommand(data: any): Promise<any> {
    const { cmd, ...args } = data;

    // Lifecycle commands that don't need features
    if (cmd === 'status') {
      return { status: 'ok', data: this.lifecycle.getStatus(args.verbose) };
    }

    // Start command initializes features after browser starts
    if (cmd === 'start') {
      await this.lifecycle.start(args.url);
      await this.ensureFeaturesInitialized();
      return { status: 'ok', data: { url: this.lifecycle.currentUrl } };
    }

    if (cmd === 'close') {
      // Session-scoped close: if manager has a session ID and command provides one, they must match
      if (this.sessionId && args.sessionId && args.sessionId !== this.sessionId) {
        return {
          status: 'error',
          message: `Session ID mismatch. Manager session: ${this.sessionId}, requested: ${args.sessionId}`,
        };
      }
      await this.close();
      this.stopServer();
      return { status: 'ok', data: { sessionId: this.sessionId } };
    }

    // Headless toggle - lifecycle command that may restart browser
    if (cmd === 'setHeadless') {
      const result = await this.lifecycle.setHeadless(args.headless);
      // Re-initialize features if browser was restarted
      if (result.restarted) {
        this.featuresInitialized = false;
        await this.ensureFeaturesInitialized();
      }
      return {
        status: 'ok',
        data: {
          headless: args.headless,
          restarted: result.restarted,
          previousValue: result.previousValue,
        },
      };
    }

    // All other commands need browser + features
    await this.lifecycle.ensureBrowserStarted();
    await this.ensureFeaturesInitialized();

    if (!this.dispatcher) {
      throw new Error('Command dispatcher not initialized');
    }

    const result = await this.dispatcher.dispatch(cmd, args);

    // Handle context recreation for video recording
    if (result.status === 'ok' && result.data?.requiresContextRestart && result.data?.recordVideoOptions) {
      this.logger.log('Recreating context for video recording...');
      
      const recreateResult = await this.lifecycle.recreateContext({
        recordVideo: result.data.recordVideoOptions,
      });

      if (recreateResult) {
        // Reinitialize features with new page/context
        this.featuresInitialized = false;
        await this.ensureFeaturesInitialized();

        // Wire VideoRecordingFeature with new context
        const videoFeature = this.features.get('VideoRecording');
        if (videoFeature && 'setContext' in videoFeature) {
          (videoFeature as any).setContext(recreateResult.context);
        }

        this.logger.log('Context recreated successfully for video recording');
      }
    }

    return result;
  }

  /**
   * Start TCP server for command handling
   */
  async startServer(): Promise<void> {
    this.server = new CommandServer(
      { port: this.port, pidFile: PID_FILE, portFile: PORT_FILE, logger: this.logger },
      this.handleCommand.bind(this)
    );
    await this.server.start();
    this.logger.log('Browser Manager ready');
  }

  /**
   * Close browser and cleanup features
   */
  async close(): Promise<void> {
    if (this.featuresInitialized) {
      await cleanupFeatures(this.features);
    }
    await this.lifecycle.close();
  }

  /**
   * Stop TCP server and exit
   */
  stopServer(): void {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
    process.exit(0);
  }


  /**
   * Update lifecycle configuration (must be called before browser starts)
   */
  setConfig(config: { width?: number; height?: number; headless?: boolean }): void {
    this.lifecycle.setConfig(config);
  }
}
