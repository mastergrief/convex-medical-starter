/**
 * State management command help texts
 * Commands: saveState, restoreState, listStates, deleteState,
 *           saveBrowserState, restoreBrowserState, listBrowserStates, deleteBrowserState
 */

import type { CommandHelpRecord } from './types';

export const stateHelp: CommandHelpRecord = {
  saveState: `Usage: browser-cmd saveState <name>

Save complete browser state (cookies, localStorage, sessionStorage, URL)

Arguments:
  <name>    State name identifier (required)

Examples:
  browser-cmd saveState authenticated
  browser-cmd saveState checkout-page`,

  restoreState: `Usage: browser-cmd restoreState <name>

Restore previously saved browser state

Arguments:
  <name>    State name identifier (required)

Examples:
  browser-cmd restoreState authenticated
  browser-cmd restoreState checkout-page`,

  listStates: `Usage: browser-cmd listStates

List all saved browser states

Returns: Array of state names

Storage location: BROWSER-CLI/states/

Examples:
  browser-cmd listStates`,

  deleteState: `Usage: browser-cmd deleteState <name>

Delete a saved browser state

Arguments:
  <name>    State name identifier

Examples:
  browser-cmd deleteState old-test-state`,

  // Browser state aliases (Phase 2)
  saveBrowserState: `Usage: browser-cmd saveBrowserState <name>

Save complete browser state (alias for saveState)

Arguments:
  <name>    State name identifier

Saves:
  - Current URL
  - All cookies
  - localStorage contents
  - sessionStorage contents
  - Timestamp

Examples:
  browser-cmd saveBrowserState authenticated
  browser-cmd saveBrowserState checkout-step-3`,

  restoreBrowserState: `Usage: browser-cmd restoreBrowserState <name>

Restore previously saved browser state (alias for restoreState)

Arguments:
  <name>    State name identifier

Examples:
  browser-cmd restoreBrowserState authenticated`,

  listBrowserStates: `Usage: browser-cmd listBrowserStates

List all saved browser states (alias for listStates)

Examples:
  browser-cmd listBrowserStates`,

  deleteBrowserState: `Usage: browser-cmd deleteBrowserState <name>

Delete a saved browser state (alias for deleteState)

Arguments:
  <name>    State name identifier

Examples:
  browser-cmd deleteBrowserState old-test`,
};
