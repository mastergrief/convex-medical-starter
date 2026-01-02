/**
 * Buffer management command help texts
 * Commands: getConsoleBufferStats, setConsoleBufferCapacity, getNetworkBufferStats,
 *           setNetworkBufferCapacity, getEventBufferStats, setEventBufferCapacity
 */

import type { CommandHelpRecord } from './types';

export const bufferManagementHelp: CommandHelpRecord = {
  getConsoleBufferStats: `Usage: browser-cmd getConsoleBufferStats

Get console message buffer statistics

Returns:
  - current size
  - max capacity (default: 100)
  - overflow count (discarded messages)

Examples:
  browser-cmd getConsoleBufferStats`,

  setConsoleBufferCapacity: `Usage: browser-cmd setConsoleBufferCapacity <size>

Change console buffer capacity

Arguments:
  size    New buffer size (default: 100)

Examples:
  browser-cmd setConsoleBufferCapacity 200`,

  getNetworkBufferStats: `Usage: browser-cmd getNetworkBufferStats

Get network request buffer statistics

Returns:
  - current size
  - max capacity (default: 1000)
  - overflow count (discarded requests)

Examples:
  browser-cmd getNetworkBufferStats`,

  setNetworkBufferCapacity: `Usage: browser-cmd setNetworkBufferCapacity <size>

Change network buffer capacity

Arguments:
  size    New buffer size (default: 1000)

Examples:
  browser-cmd setNetworkBufferCapacity 2000`,

  getEventBufferStats: `Usage: browser-cmd getEventBufferStats

Get event buffer statistics

Returns:
  - current size
  - max capacity (default: 500)
  - overflow count (discarded events)
  - oldest/newest timestamps

Examples:
  browser-cmd getEventBufferStats`,

  setEventBufferCapacity: `Usage: browser-cmd setEventBufferCapacity <size>

Change event buffer capacity

Arguments:
  size    New buffer size (default: 500)

Examples:
  browser-cmd setEventBufferCapacity 1000`,
};
