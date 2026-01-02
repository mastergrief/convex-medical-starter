/**
 * Navigation command help texts
 * Commands: start, navigate, wait, waitForSelector
 */

import type { CommandHelpRecord } from './types';

export const navigationHelp: CommandHelpRecord = {
  start: `Usage: browser-cmd start <url>

Start browser and navigate to URL

Arguments:
  <url>    The URL to navigate to (required)

Examples:
  browser-cmd start http://localhost:5173
  browser-cmd start https://example.com`,

  navigate: `Usage: browser-cmd navigate <url>

Navigate to a URL

Arguments:
  <url>    The URL to navigate to (required)

Examples:
  browser-cmd navigate http://localhost:5173
  browser-cmd navigate https://example.com/login`,

  wait: `Usage: browser-cmd wait <milliseconds>

Wait for specified time

Arguments:
  <milliseconds>    Time to wait in milliseconds (required)

Examples:
  browser-cmd wait 1000
  browser-cmd wait 500`,

  waitForSelector: `Usage: browser-cmd waitForSelector <selector> [options]

Wait for element to appear/disappear

Aliases: waitForSelectorByRef, waitForSelectorBySemantic (auto-detected from selector format)

Arguments:
  <selector>    Element selector (ref, semantic, or CSS)

Options:
  --state=<state>     Wait for state: attached, detached, visible, hidden
  --timeout=<ms>      Timeout in milliseconds (default: 30000)

Selector Auto-Detection:
  - e5 patterns        → uses waitForSelectorByRef (element refs)
  - role:/text:/label: → uses waitForSelectorBySemantic (accessibility selectors)
  - Other patterns     → CSS selector

Examples:
  waitForSelector e5 --state=visible       # Element ref → waitForSelectorByRef
  waitForSelector "role:dialog:Confirm"    # Semantic → waitForSelectorBySemantic
  waitForSelector ".modal"                 # CSS selector
  waitForSelector ".loading" --state=hidden

Best Practice: Use refs from snapshot for waiting on specific elements.`,
};
