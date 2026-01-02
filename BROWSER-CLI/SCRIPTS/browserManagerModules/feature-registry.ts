/**
 * Feature Registry Module
 *
 * Handles initialization and dependency injection for all browser features.
 */

import { Page, BrowserContext } from 'playwright';
import { BrowserFeature, CommandHandler } from '../core/types';
import { Logger } from '../utils/logger';

// Import all features
import { CoreActionsFeature } from '../features/core-actions';
import { ConsoleCaptureFeature } from '../features/console-capture';
import { StateTrackingFeature } from '../features/state-tracking';
import { SemanticSelectorsFeature } from '../features/semantic-selectors';
import { SnapshotFeature } from '../features/snapshot';
import { DragFeature } from '../features/drag';
import { NetworkCaptureFeature } from '../features/network-capture';
import { BrowserStateFeature } from '../features/browser-state';
import { SnapshotComparisonFeature } from '../features/snapshot-comparison';
import { MultiCommandFeature } from '../features/multi-command';
import { PerformanceMetricsFeature } from '../features/performance-metrics';
import { VisualRegressionFeature } from '../features/visual-regression';
import { NetworkMockingFeature } from '../features/network-mocking';
import { TabsFeature } from '../features/tabs';
import { ContentCaptureFeature } from '../features/content-capture';
import { EventListenerFeature } from '../features/event-listener';
import { DOMInspectionFeature } from '../features/dom-inspection';
import { AssertionsFeature } from '../features/assertions';
import { DeviceEmulationFeature } from '../features/device-emulation';
import { VideoRecordingFeature } from '../features/video-recording';
import { HARExportFeature } from '../features/har-export';
import { A11yAuditFeature } from '../features/a11y-audit';
import { PluginsFeature } from '../features/plugins-feature';
import { FlakyDetectionFeature } from '../features/flaky-detection';
import { OrchestrationFeature } from '../features/orchestration-feature';

/**
 * List of all feature classes in initialization order
 */
const CORE_FEATURES = [
  // Core actions (fundamental operations)
  CoreActionsFeature,
  // Phase 1 core features (always loaded)
  ConsoleCaptureFeature,
  StateTrackingFeature,
  SemanticSelectorsFeature,
  SnapshotFeature,
  // Phase 1d - Assertions framework
  AssertionsFeature,
  // Phase 3.1 - Plugin system
  PluginsFeature,
  // Promoted from lazy to core (frequently used, fast init)
  DragFeature,
  BrowserStateFeature,
  VisualRegressionFeature,
  SnapshotComparisonFeature,
  TabsFeature,
  DOMInspectionFeature,
  MultiCommandFeature,
] as const;


/**
 * Type for lazy feature class constructors
 */
type FeatureClass = new (page: Page) => BrowserFeature;

/**
 * Registry of lazy-loaded features (loaded on-demand)
 */
export const LAZY_FEATURE_REGISTRY: Map<string, FeatureClass> = new Map([
  ['NetworkCapture', NetworkCaptureFeature],
  ['PerformanceMetrics', PerformanceMetricsFeature],
  ['NetworkMocking', NetworkMockingFeature],
  ['ContentCapture', ContentCaptureFeature],
  ['EventListener', EventListenerFeature],
  ['DeviceEmulation', DeviceEmulationFeature],
  ['VideoRecording', VideoRecordingFeature],
  ['HARExport', HARExportFeature],
  ['A11yAudit', A11yAuditFeature],
  ['FlakyDetection', FlakyDetectionFeature],
  ['Orchestration', OrchestrationFeature],
]);


/**
 * Preload hints based on command patterns.
 * Maps commands to features that are commonly used next.
 */
const PRELOAD_HINTS: Record<string, string[]> = {
  'navigate': ['NetworkCapture', 'PerformanceMetrics'],
  'startRecording': ['VideoRecording'],
  'setupNetworkMocking': ['NetworkMocking'],
  'auditAccessibility': ['A11yAudit'],
  'startHAR': ['HARExport'],
  'mockRoute': ['NetworkMocking'],
};

/**
 * Command index entry for O(1) command dispatch
 */
export interface CommandIndexEntry {
  featureName: string;
  isLazy: boolean;
}

/**
 * Build command index mapping command names to feature info
 * Called once during initialization for O(1) command lookup
 */
export function buildCommandIndex(
  coreFeatures: Map<string, BrowserFeature>
): Map<string, CommandIndexEntry> {
  const index = new Map<string, CommandIndexEntry>();

  // Index core feature commands
  for (const feature of coreFeatures.values()) {
    for (const cmd of feature.getCommandHandlers().keys()) {
      index.set(cmd, { featureName: feature.name, isLazy: false });
    }
  }

  // Index lazy feature commands by instantiating temporarily
  // Note: We use a dummy page to get command names only
  const tempPage = null as unknown as Page;
  for (const [featureName, FeatureClass] of LAZY_FEATURE_REGISTRY.entries()) {
    try {
      const tempFeature = new FeatureClass(tempPage);
      for (const cmd of tempFeature.getCommandHandlers().keys()) {
        index.set(cmd, { featureName, isLazy: true });
      }
    } catch {
      // Some features may throw during construction without a real page
      // We'll catch commands on first use
    }
  }

  return index;
}

/**
 * Load a lazy feature on-demand
 */
export async function loadLazyFeature(
  featureName: string,
  page: Page,
  logger: Logger,
  features: Map<string, BrowserFeature>,
  commandExecutor?: (data: any) => Promise<any>,
  context?: BrowserContext
): Promise<BrowserFeature | null> {
  // Check if already loaded
  if (features.has(featureName)) {
    return features.get(featureName)!;
  }

  const FeatureClass = LAZY_FEATURE_REGISTRY.get(featureName);
  if (!FeatureClass) {
    logger.log(`Unknown lazy feature: ${featureName}`);
    return null;
  }

  const feature = new FeatureClass(page);
  await feature.setup?.();
  features.set(featureName, feature);
  logger.log(`Lazy-loaded feature: ${featureName}`);

  // Wire dependencies for specific features
  wireLazyFeatureDependencies(featureName, feature, features, commandExecutor, context);

  return feature;
}

/**
 * Wire dependencies for a lazy-loaded feature
 */
function wireLazyFeatureDependencies(
  featureName: string,
  feature: BrowserFeature,
  features: Map<string, BrowserFeature>,
  commandExecutor?: (data: any) => Promise<any>,
  context?: BrowserContext
): void {
  const snapshot = features.get('Snapshot') as SnapshotFeature | undefined;
  const assertions = features.get('Assertions') as AssertionsFeature | undefined;

  switch (featureName) {
    case 'Drag':
      if (snapshot) {
        (feature as DragFeature).setSnapshotFeature(snapshot);
      }
      break;
    case 'MultiCommand':
      if (commandExecutor) {
        (feature as MultiCommandFeature).setCommandExecutor(commandExecutor);
      }
      break;
    case 'FlakyDetection':
      if (commandExecutor) {
        (feature as FlakyDetectionFeature).setCommandExecutor(commandExecutor);
      }
      break;
    case 'NetworkCapture': {
      // Wire network capture to assertions feature
      if (assertions) {
        assertions.setNetworkCaptureFeature(feature as NetworkCaptureFeature);
      }
      // Also wire to HARExport if already loaded
      const harExport = features.get('HARExport') as HARExportFeature | undefined;
      if (harExport) {
        harExport.setNetworkCaptureFeature(feature as NetworkCaptureFeature);
      }
      break;
    }
    case 'PerformanceMetrics':
      // Wire performance metrics to assertions feature
      if (assertions) {
        assertions.setPerformanceMetricsFeature(feature as PerformanceMetricsFeature);
      }
      break;
    case 'HARExport': {
      // Wire network capture to HAR export feature
      const networkCapture = features.get('NetworkCapture') as NetworkCaptureFeature | undefined;
      if (networkCapture) {
        (feature as HARExportFeature).setNetworkCaptureFeature(networkCapture);
      }
      break;
    }
    case 'VideoRecording': {
      // Wire browser context to video recording feature
      if (context) {
        (feature as VideoRecordingFeature).setContext(context);
      }
      break;
    }
  }
}

/**
 * Initialize all features and wire up their dependencies
 */
export async function initializeFeatures(
  page: Page,
  logger: Logger,
  commandExecutor?: (data: any) => Promise<any>,
  context?: BrowserContext
): Promise<Map<string, BrowserFeature>> {
  const features = new Map<string, BrowserFeature>();

  // Initialize only core features at startup
  for (const FeatureClass of CORE_FEATURES) {
    const feature = new FeatureClass(page);
    await feature.setup?.();
    features.set(feature.name, feature);
    logger.log(`Initialized core feature: ${feature.name}`);
  }

  // Wire up core feature dependencies

  // Set state tracking for SnapshotFeature
  const snapshot = features.get('Snapshot') as SnapshotFeature | undefined;
  const stateTracking = features.get('StateTracking') as StateTrackingFeature | undefined;
  if (snapshot && stateTracking) {
    snapshot.setStateTracking(stateTracking);
  }

  // Set console capture for AssertionsFeature
  const assertions = features.get('Assertions') as AssertionsFeature | undefined;
  const consoleCapture = features.get('ConsoleCapture') as ConsoleCaptureFeature | undefined;
  if (assertions && consoleCapture) {
    assertions.setConsoleCaptureFeature(consoleCapture);
  }
  // Set snapshot feature for ref resolution in assertions
  if (assertions && snapshot) {
    assertions.setSnapshotFeature(snapshot);
  }
  // Note: NetworkCapture and PerformanceMetrics are lazy-loaded
  // They will be wired to assertions when they're loaded

  // Set browser context for PluginsFeature (P3.1)
  const plugins = features.get('Plugins') as PluginsFeature | undefined;
  if (plugins && context) {
    plugins.setBrowserContext(context);
  }

  // Wire plugins to core features for hook triggering (Phase 6)
  const coreActions = features.get('CoreActions') as CoreActionsFeature | undefined;
  if (coreActions && plugins) {
    coreActions.setPluginsFeature(plugins);
  }
  if (snapshot && plugins) {
    snapshot.setPluginsFeature(plugins);
  }

  // Wire dependencies for promoted core features
  const drag = features.get('Drag') as DragFeature | undefined;
  if (drag && snapshot) {
    drag.setSnapshotFeature(snapshot);
  }

  const multiCommand = features.get('MultiCommand') as MultiCommandFeature | undefined;
  if (multiCommand && commandExecutor) {
    multiCommand.setCommandExecutor(commandExecutor);
  }

  return features;
}

/**
 * Cleanup all features
 */
export async function cleanupFeatures(features: Map<string, BrowserFeature>): Promise<void> {
  for (const feature of features.values()) {
    await feature.cleanup?.();
  }
}


/**
 * Preload anticipated features based on the last executed command.
 * Non-blocking - features load in background.
 *
 * @param lastCommand - The command that was just executed
 * @param page - Playwright Page instance
 * @param features - Current loaded features map
 * @param loader - Function to load lazy features
 */
export async function preloadAnticipatedFeatures(
  lastCommand: string,
  page: import('playwright').Page,
  features: Map<string, BrowserFeature>,
  loader: (name: string, page: import('playwright').Page, features: Map<string, BrowserFeature>) => Promise<BrowserFeature | null>
): Promise<void> {
  const hints = PRELOAD_HINTS[lastCommand];
  if (!hints) return;

  // Preload in background (non-blocking, fire and forget)
  for (const featureName of hints) {
    if (!features.has(featureName)) {
      // Don't await - let it load in background
      loader(featureName, page, features).catch(() => {
        // Ignore errors during preload - it's just an optimization
      });
    }
  }
}
