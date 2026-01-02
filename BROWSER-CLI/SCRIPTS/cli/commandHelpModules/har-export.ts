/**
 * HAR export command help texts
 * Commands: startHAR, exportHAR, getHARData
 */

import type { CommandHelpRecord } from './types';

export const harExportHelp: CommandHelpRecord = {
  startHAR: `Usage: browser-cmd startHAR

Begin HAR (HTTP Archive) capture

Call this before navigation to capture all network activity.
HAR format is compatible with Chrome DevTools and other tools.

Examples:
  browser-cmd startHAR
  browser-cmd navigate /page
  browser-cmd exportHAR network-trace`,

  exportHAR: `Usage: browser-cmd exportHAR <filename>

Export captured network activity to HAR file

Arguments:
  filename    Name for the HAR file (without extension)

Saves to BROWSER-CLI/har-exports/<filename>.har

Examples:
  browser-cmd exportHAR login-flow
  browser-cmd exportHAR api-calls`,

  getHARData: `Usage: browser-cmd getHARData

Get current HAR data as JSON

Returns HAR object with:
  - log.entries: all captured requests
  - log.pages: page load info
  - timing data for each request

Examples:
  browser-cmd getHARData`,
};
