/**
 * Video recording command help texts
 * Commands: startRecording, stopRecording, getRecordingStatus, listRecordings
 */

import type { CommandHelpRecord } from './types';

export const videoRecordingHelp: CommandHelpRecord = {
  startRecording: `Usage: browser-cmd startRecording <name>

Start video recording of browser session

Arguments:
  name    Name for the recording file

Note: Recording saves to BROWSER-CLI/recordings/

Examples:
  browser-cmd startRecording login-test
  browser-cmd startRecording checkout-flow`,

  stopRecording: `Usage: browser-cmd stopRecording

Stop current video recording and save file

The recording is saved as MP4 to BROWSER-CLI/recordings/

Examples:
  browser-cmd stopRecording`,

  getRecordingStatus: `Usage: browser-cmd getRecordingStatus

Check if video recording is active

Returns:
  - isRecording: boolean
  - name: current recording name
  - startTime: when recording started
  - outputPath: where file will be saved

Examples:
  browser-cmd getRecordingStatus`,

  listRecordings: `Usage: browser-cmd listRecordings

List all saved video recordings

Examples:
  browser-cmd listRecordings`,
};
