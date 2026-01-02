/**
 * Browser Manager Modules - Barrel Export
 *
 * Facade pattern: This file re-exports all module functionality
 * for clean imports from the browser-manager.ts main file.
 */

// Types
export * from './types';

// Feature initialization
export { initializeFeatures, cleanupFeatures } from './feature-registry';

// Response enrichment
export { ResponseEnricher } from './response-enricher';

// Browser lifecycle management
export { BrowserLifecycle, type LifecycleState } from './lifecycle';

// Command routing
export { CommandDispatcher } from './command-dispatcher';

// Main composed manager
export { BrowserManager } from './BrowserManager';
