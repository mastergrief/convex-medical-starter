/**
 * Tab management command help texts
 * Commands: tabs, newTab, switchTab, closeTab
 */

import type { CommandHelpRecord } from './types';

export const tabsHelp: CommandHelpRecord = {
  tabs: `Usage: browser-cmd tabs <action> [args]

Manage browser tabs

Actions:
  list              List all tabs
  new [url]         Open new tab (optionally with URL)
  switch <index>    Switch to tab by index
  close [index]     Close tab (current if no index)

Examples:
  browser-cmd tabs list
  browser-cmd tabs new
  browser-cmd tabs new http://example.com
  browser-cmd tabs switch 1
  browser-cmd tabs close
  browser-cmd tabs close 2`,

  newTab: `Usage: browser-cmd newTab [url]

Open new browser tab

Arguments:
  [url]    Optional URL to navigate to in new tab

Examples:
  browser-cmd newTab
  browser-cmd newTab http://localhost:5173/dashboard`,

  switchTab: `Usage: browser-cmd switchTab <index>

Switch to tab by index

Arguments:
  <index>    Tab index (0-based)

Examples:
  browser-cmd switchTab 0
  browser-cmd switchTab 1`,

  closeTab: `Usage: browser-cmd closeTab [index]

Close browser tab

Arguments:
  [index]    Optional tab index (closes current if not specified)

Examples:
  browser-cmd closeTab
  browser-cmd closeTab 2`,
};
