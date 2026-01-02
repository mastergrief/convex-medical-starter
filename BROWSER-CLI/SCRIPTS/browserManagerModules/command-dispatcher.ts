/**
 * Command Dispatcher Module
 *
 * Routes commands to appropriate handlers (lifecycle, features, or core actions).
 */

import { BrowserFeature, CommandResponse } from '../core/types';
import { BrowserLifecycle } from './lifecycle';
import { ResponseEnricher } from './response-enricher';
import { CommandIndexEntry, preloadAnticipatedFeatures } from './feature-registry';
import type { PluginsFeature } from '../features/plugins-feature';

/**
 * Dispatches commands to appropriate handlers
 */

export class CommandDispatcher {
  private commandIndex: Map<string, CommandIndexEntry>;

  constructor(
    private features: Map<string, BrowserFeature>,
    private lifecycle: BrowserLifecycle,
    private enricher: ResponseEnricher,
    private lazyFeatureLoader: (featureName: string) => Promise<BrowserFeature | null>,
    commandIndex: Map<string, CommandIndexEntry>
  ) {
    this.commandIndex = commandIndex;
  }

  /**
   * Get PluginsFeature if available
   */
  private getPluginsFeature(): PluginsFeature | undefined {
    return this.features.get('Plugins') as PluginsFeature | undefined;
  }

  /**
   * Dispatch a command and return the response
   */
  async dispatch(cmd: string, args: any): Promise<CommandResponse> {
    // O(1) command lookup
    const entry = this.commandIndex.get(cmd);
    
    if (!entry) {
      return {
        status: 'error',
        message: `Unknown command: ${cmd}`,
      };
    }

    // Load lazy feature if needed
    let feature = this.features.get(entry.featureName);
    if (!feature && entry.isLazy) {
      feature = await this.lazyFeatureLoader(entry.featureName) ?? undefined;
      if (!feature) {
        return {
          status: 'error',
          message: `Failed to load feature: ${entry.featureName}`,
        };
      }
    }

    if (!feature) {
      return {
        status: 'error',
        message: `Feature not found: ${entry.featureName}`,
      };
    }

    const handler = feature.getCommandHandlers().get(cmd);
    if (!handler) {
      return {
        status: 'error',
        message: `Handler not found for command: ${cmd}`,
      };
    }

    // Trigger beforeCommand hooks
    const pluginsFeature = this.getPluginsFeature();
    if (pluginsFeature) {
      try {
        const skipResult = await pluginsFeature.triggerBeforeCommand(cmd, args);
        if (skipResult?.skip) {
          return {
            status: 'ok',
            message: `Command skipped by plugin: ${skipResult.reason || 'no reason given'}`,
            data: { skipped: true, command: cmd }
          };
        }
      } catch {
        // Continue if hook triggering fails
      }
    }

    try {
      const result = await handler(args);
      const enrichedResult = this.enricher.enrich(cmd, result, this.features);

      // Trigger afterCommand hooks
      if (pluginsFeature) {
        try {
          await pluginsFeature.triggerAfterCommand(cmd, args, enrichedResult);
        } catch {
          // Continue if hook triggering fails
        }
      }

      // Preload anticipated features (fire and forget, non-blocking)
      const page = this.lifecycle.page;
      if (page) {
        preloadAnticipatedFeatures(cmd, page, this.features, async (name, pg, feats) => {
          // Create a loader that matches the signature expected by preloadAnticipatedFeatures
          const loaded = await this.lazyFeatureLoader(name);
          return loaded;
        }).catch(() => {}); // Fire and forget
      }

      return enrichedResult;
    } catch (err) {
      // Trigger onError hooks
      if (pluginsFeature) {
        try {
          await pluginsFeature.triggerOnError(cmd, err instanceof Error ? err : new Error(String(err)));
        } catch {
          // Continue if hook triggering fails
        }
      }
      throw err;
    }
  }

  /**
   * Check if a command exists (O(1) lookup)
   */
  hasCommand(cmd: string): boolean {
    return this.commandIndex.has(cmd);
  }
}
