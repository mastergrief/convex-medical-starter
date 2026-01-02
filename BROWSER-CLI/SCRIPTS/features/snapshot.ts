/**
 * Snapshot Feature - Facade
 * Re-exports SnapshotFeature class and types for API compatibility
 *
 * This is a thin facade layer that maintains backward compatibility
 * while the actual implementation lives in snapshotModules/
 */

// Re-export main class
export { SnapshotFeature } from './snapshotModules/SnapshotFeature';

// Re-export types for consumers
export type {
  RefData,
  FormField,
  AnalyzedForm,
  FormAnalysis,
  LogFn,
  InteractionContext
} from './snapshotModules/types';

// Re-export capture functions for direct access if needed
export {
  buildFallbackSnapshot,
  addRefsToSnapshot,
  captureCssSelectors
} from './snapshotModules/capture';

// Re-export formatters
export {
  formatEnhancedRefs,
  formatMinimalOutput,
  formatEnhancedOutput
} from './snapshotModules/formatters';

// Re-export interactions
export {
  clickByRef,
  dblclickByRef,
  typeByRef,
  hoverByRef
} from './snapshotModules/interactions';

// Re-export forms
export { analyzeForms } from './snapshotModules/forms';
