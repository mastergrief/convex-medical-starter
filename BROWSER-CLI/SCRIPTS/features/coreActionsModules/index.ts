/**
 * Core Actions Modules - Barrel Export
 * Re-exports all core actions module components
 */

// Main class
export { CoreActionsFeature } from './CoreActionsFeature';

// Types
export type {
  LogFn,
  ActionContext,
  NavigateOptions,
  NavigateState,
  ClickOptions,
  DblclickOptions,
  TypeOptions,
  WaitForSelectorOptions,
  ResizeConfig,
  EvaluateResult
} from './types';

// Navigation
export {
  navigate,
  wait,
  waitForSelector,
  resize
} from './navigation';

// Interaction
export {
  click,
  dblclick,
  hover,
  drag,
  type InteractionResult
} from './interaction';

// Input
export {
  type,
  pressKey,
  selectOption,
  fillForm,
  uploadFile
} from './input';

// Utilities
export {
  screenshot,
  evaluate
} from './utilities';

// Keyboard
export {
  pressKeyCombo,
  holdKey,
  tapKey
} from './keyboard';
