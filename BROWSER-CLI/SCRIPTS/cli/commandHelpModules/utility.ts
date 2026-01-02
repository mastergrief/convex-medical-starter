/**
 * Utility command help texts
 * Commands: console, clearConsole, exec, status, resize, close, evaluate
 */

import type { CommandHelpRecord } from './types';

export const utilityHelp: CommandHelpRecord = {
  console: `Usage: browser-cmd console

Get console messages from the browser

Features:
  - Shows timestamp, type, and message
  - Includes file location and line numbers
  - Maintains buffer of last 100 messages
  - Auto-captured on click/type commands

Examples:
  browser-cmd console`,

  clearConsole: `Usage: browser-cmd clearConsole

Clear all captured console messages from buffer

Use Case: Clear baseline console state before testing specific action

Examples:
  browser-cmd clearConsole`,

  exec: `Usage: browser-cmd exec "<commands>"

Execute multiple commands sequentially

Arguments:
  <commands>    Commands separated by && (required)

Examples:
  browser-cmd exec "navigate http://localhost:5173 && wait 1000 && snapshot"
  browser-cmd exec "click e1 && wait 500 && screenshot test.png"`,

  status: `Usage: browser-cmd status [options]

Get browser manager status

Options:
  --verbose    Show detailed status including config and features

Examples:
  browser-cmd status
  browser-cmd status --verbose`,

  resize: `Usage: browser-cmd resize <width> <height>

Resize browser viewport

Arguments:
  <width>     Viewport width in pixels (required)
  <height>    Viewport height in pixels (required)

Examples:
  browser-cmd resize 1920 1080
  browser-cmd resize 375 667`,

  close: `Usage: browser-cmd close

Close the browser

Examples:
  browser-cmd close`,

  evaluate: `Usage: browser-cmd evaluate <code> [options]

Execute JavaScript in the browser

Arguments:
  <code>         JavaScript code to execute (required)

Options:
  --ref=<ref>         Execute on specific element (e.g., --ref=e42)
  --element=<desc>    Human-readable element description

Examples:
  browser-cmd evaluate "document.title"
  browser-cmd evaluate "() => window.location.href"
  browser-cmd evaluate "el.textContent" --ref=e42
  browser-cmd evaluate "el.click()" --ref=e15 --element="Submit button"`,

  setHeadless: `Usage: browser-cmd setHeadless <true|false>

Toggle headless browser mode at runtime.

Arguments:
  <true|false>    Enable or disable headless mode

Note: Changes take effect on next browser launch.

Examples:
  browser-cmd setHeadless true     # Run browser headlessly
  browser-cmd setHeadless false    # Show browser window`,

  // Buffer Management Commands (Phase 2.4)
  getConsoleBufferStats: `Usage: browser-cmd getConsoleBufferStats

Get console buffer statistics including capacity, current size, and overflow count

Returns:
  capacity          Maximum buffer size (default: 100)
  current           Current number of messages in buffer
  overflow          Number of messages discarded due to overflow
  discardedErrors   Number of error/warning messages discarded
  oldestTimestamp   Timestamp of oldest message (null if empty)
  newestTimestamp   Timestamp of newest message (null if empty)

Examples:
  browser-cmd getConsoleBufferStats`,

  setConsoleBufferCapacity: `Usage: browser-cmd setConsoleBufferCapacity <capacity>

Set console buffer capacity (clamped between 10-1000)

Arguments:
  <capacity>    New buffer capacity (required)

Examples:
  browser-cmd setConsoleBufferCapacity 200
  browser-cmd setConsoleBufferCapacity 50`,

  getNetworkBufferStats: `Usage: browser-cmd getNetworkBufferStats

Get network request buffer statistics

Returns:
  capacity          Maximum buffer size (default: 1000)
  current           Current number of requests in buffer
  overflow          Number of requests discarded due to overflow
  oldestTimestamp   Timestamp of oldest request (null if empty)
  newestTimestamp   Timestamp of newest request (null if empty)

Examples:
  browser-cmd getNetworkBufferStats`,

  setNetworkBufferCapacity: `Usage: browser-cmd setNetworkBufferCapacity <capacity>

Set network request buffer capacity (clamped between 10-1000)

Arguments:
  <capacity>    New buffer capacity (required)

Examples:
  browser-cmd setNetworkBufferCapacity 500
  browser-cmd setNetworkBufferCapacity 100`,

  getEventBufferStats: `Usage: browser-cmd getEventBufferStats

Get event log buffer statistics

Returns:
  capacity          Maximum buffer size (default: 100)
  current           Current number of events in buffer
  overflow          Number of events discarded due to overflow
  oldestTimestamp   Timestamp of oldest event (null if empty)
  newestTimestamp   Timestamp of newest event (null if empty)

Examples:
  browser-cmd getEventBufferStats`,

  setEventBufferCapacity: `Usage: browser-cmd setEventBufferCapacity <capacity>

Set event log buffer capacity (clamped between 10-1000)

Arguments:
  <capacity>    New buffer capacity (required)

Examples:
  browser-cmd setEventBufferCapacity 200
  browser-cmd setEventBufferCapacity 50`,
};;;
