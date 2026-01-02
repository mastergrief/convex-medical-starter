/**
 * Snapshot Modules - Barrel Export
 * Re-exports all snapshot module components
 */

// Main class
export { SnapshotFeature } from './SnapshotFeature';

// Types
export type {
  RefData,
  FormField,
  AnalyzedForm,
  FormAnalysis,
  LogFn,
  InteractionContext
} from './types';

// Capture
export type { CaptureContext } from './capture';
export {
  buildFallbackSnapshot,
  addRefsToSnapshot,
  captureCssSelectors
} from './capture';

// Formatters
export {
  formatEnhancedRefs,
  formatMinimalOutput,
  formatEnhancedOutput
} from './formatters';

// Interactions
export {
  clickByRef,
  dblclickByRef,
  typeByRef,
  hoverByRef
} from './interactions';

// Forms
export { analyzeForms } from './forms';

// Ref Versioning
export type { RefLifecycle, RefValidation } from './ref-version';
export { RefVersionManager } from './ref-version';

// Ref Stability Tracking
export type { StableRef, StabilityReport } from './ref-stability';
export { RefStabilityTracker } from './ref-stability';
