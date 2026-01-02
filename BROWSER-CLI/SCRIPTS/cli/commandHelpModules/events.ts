/**
 * Event Commands Help Module
 *
 * Help text for browser event listener commands.
 */

import type { CommandHelpRecord } from './types';

export const eventsHelp: CommandHelpRecord = {
  getEventLog: `Usage: browser-cmd getEventLog [count] [type]

Get captured browser events (popup, dialog, filechooser, pageerror, framenavigated)

Arguments:
  [count]    Optional. Number of recent events to return
  [type]     Optional. Filter by event type

Event Types:
  popup          - New window/tab opened
  dialog         - Alert, confirm, or prompt dialog
  filechooser    - File upload dialog triggered
  pageerror      - JavaScript error on page
  framenavigated - Main frame navigation

Examples:
  browser-cmd getEventLog           # Get all events
  browser-cmd getEventLog 5         # Get last 5 events
  browser-cmd getEventLog 10 dialog # Get last 10 dialog events`,

  clearEventLog: `Usage: browser-cmd clearEventLog

Clear the event log buffer

Examples:
  browser-cmd clearEventLog`,

  waitForEvent: `Usage: browser-cmd waitForEvent <type> [timeout]

Wait for a specific browser event to occur

Arguments:
  <type>     Required. Event type to wait for
  [timeout]  Optional. Timeout in milliseconds (default: 30000)

Event Types:
  popup          - New window/tab opened
  dialog         - Alert, confirm, or prompt dialog
  filechooser    - File upload dialog triggered
  pageerror      - JavaScript error on page
  framenavigated - Main frame navigation

Examples:
  browser-cmd waitForEvent dialog
  browser-cmd waitForEvent popup 10000`,

  dismissDialog: `Usage: browser-cmd dismissDialog

Dismiss the pending dialog (alert, confirm, prompt)

Equivalent to clicking "Cancel" or pressing Escape.

Examples:
  browser-cmd dismissDialog`,

  acceptDialog: `Usage: browser-cmd acceptDialog [text]

Accept the pending dialog with optional prompt text

Arguments:
  [text]    Optional. Text to enter for prompt dialogs

Examples:
  browser-cmd acceptDialog              # Accept alert/confirm
  browser-cmd acceptDialog "my input"   # Accept prompt with text`,
};
