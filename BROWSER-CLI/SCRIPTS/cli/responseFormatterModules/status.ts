/**
 * Status and utility formatting functions
 * Commands: status, evaluate, console, tabs, exec
 */

import type { CommandResponse } from './types';
import { formatConsoleMessages } from './base';

/**
 * Format status response
 */
export function formatStatus(response: CommandResponse, cmdArgs: Record<string, any>): string {
  let output = '\n\n📊 Browser Manager Status';

  // Basic status (always shown)
  output += '\n\n  Basic Info:';
  output += `\n    Running: ${response.data.running ? '✅ Yes' : '❌ No'}`;
  output += `\n    Port: ${response.data.port}`;
  output += `\n    Has Page: ${response.data.hasPage ? '✅ Yes' : '❌ No'}`;
  output += `\n    Current URL: ${response.data.url || '(none)'}`;

  // Verbose status (only shown with --verbose flag)
  if (cmdArgs.verbose && response.data.verbose) {
    const verbose = response.data.verbose;

    output += '\n\n  Uptime:';
    output += `\n    ${verbose.uptime.formatted}`;

    output += '\n\n  Configuration:';
    output += `\n    Viewport: ${verbose.config.width}x${verbose.config.height}`;
    output += `\n    Headless: ${verbose.config.headless ? 'Yes' : 'No'}`;

    output += '\n\n  Tabs:';
    output += `\n    Open: ${verbose.tabCount}`;

    output += '\n\n  Features:';
    output += `\n    Total: ${verbose.featureCount} modules`;
    verbose.features.forEach((feature: string) => {
      output += `\n    - ${feature}`;
    });

    output += '\n\n  Browser Context:';
    output += `\n    Status: ${verbose.browserContext}`;
  } else if (!cmdArgs.verbose) {
    output += '\n\n💡 Use --verbose flag for detailed status information';
  }

  return output;
}

/**
 * Format evaluate response with result, code, and page state
 */
export function formatEvaluate(response: CommandResponse): string {
  let output = '';

  // Show result
  output += '\n\n### Result';
  output += '\n```json';
  output += '\n' + JSON.stringify(response.data.result, null, 2);
  output += '\n```';

  // Show executed Playwright code (transparency)
  if (response.data.code) {
    output += '\n\n### Ran Playwright code';
    output += '\n```js';
    output += '\n' + response.data.code;
    output += '\n```';
  }

  // Show element description if element-scoped
  if (response.data.element) {
    output += `\n\n### Evaluated on element: ${response.data.element}`;
  }

  // Show console messages if present
  output += formatConsoleMessages(response.data.console);

  // Show page state
  output += '\n\n### Page state';
  output += `\n- Page URL: ${response.data.url || 'unknown'}`;
  output += `\n- Page Title: ${response.data.title || 'unknown'}`;

  if (response.data.snapshot) {
    output += '\n- Page Snapshot:';
    output += '\n```yaml';
    // Convert snapshot to string if it's an object
    const snapshotStr =
      typeof response.data.snapshot === 'string'
        ? response.data.snapshot
        : JSON.stringify(response.data.snapshot, null, 2);
    output += '\n' + snapshotStr;
    output += '\n```';
  }

  return output;
}

/**
 * Format console messages response
 */
export function formatConsole(response: CommandResponse): string {
  let output = '\n\nConsole messages:';
  if (response.data.messages.length === 0) {
    output += '\n  (no messages captured)';
  } else {
    response.data.messages.forEach((msg: any) => {
      const timestamp = new Date(msg.timestamp).toISOString().split('T')[1].split('.')[0];
      output += `\n  [${timestamp}] [${msg.type.toUpperCase()}] ${msg.text}`;

      // Add location with line:column if available
      if (msg.location) {
        const filename = msg.location.split('/').pop() || msg.location;
        if (msg.lineNumber) {
          output += ` @ ${filename}:${msg.lineNumber}`;
          if (msg.columnNumber) {
            output += `:${msg.columnNumber}`;
          }
        } else {
          output += ` @ ${filename}`;
        }
      }
    });
  }
  return output;
}

/**
 * Format tabs response
 */
export function formatTabs(response: CommandResponse): string {
  // Handle tabs close (returns closedUrl, closedIndex, remainingTabs)
  if (response.data.closedUrl !== undefined) {
    let output = '\n\nTab closed:';
    output += `\n  [${response.data.closedIndex}] ${response.data.closedUrl}`;
    output += `\n  Remaining tabs: ${response.data.remainingTabs}`;
    return output;
  }
  // Handle tabs new/switch (single tab result)
  if (response.data.url !== undefined && !response.data.tabs) {
    const action = response.data.index !== undefined ? 'Tab' : 'Action';
    let output = `\n\n${action}:`;
    if (response.data.title) {
      output += `\n  [${response.data.index}] ${response.data.title}`;
      output += `\n      ${response.data.url}`;
    } else {
      output += `\n  URL: ${response.data.url}`;
    }
    return output;
  }
  // Handle tabs list (array of tabs)
  let output = '\n\nOpen tabs:';
  response.data.tabs.forEach((tab: any) => {
    output += `\n  [${tab.index}] ${tab.title}`;
    output += `\n      ${tab.url}`;
  });
  return output;
}

/**
 * Format exec (multi-command) response
 */
export function formatExec(response: CommandResponse): string {
  let output = '\n\n### Multi-command execution results:';
  response.data.results.forEach((result: any, index: number) => {
    const parallelTag = result.parallel ? ' [parallel]' : ' [sequential]';
    output += `\n\n${index + 1}. ${result.command}${parallelTag}`;
    if (result.result.status === 'ok') {
      output += '\n   ✅ Success';
    } else {
      output += `\n   ❌ Error: ${result.result.message || 'Unknown error'}`;
    }
  });
  return output;
}


/**
 * Format setHeadless response
 */
export function formatSetHeadless(response: CommandResponse): string {
  let output = '\n\nHeadless mode configuration:';
  output += `\n  Headless: ${response.data.headless ? 'enabled' : 'disabled'}`;
  output += `\n  Previous value: ${response.data.previousValue ? 'enabled' : 'disabled'}`;
  if (response.data.restarted) {
    output += '\n  Browser: restarted with new setting';
  } else if (response.data.headless === response.data.previousValue) {
    output += '\n  Browser: no change (already set)';
  } else {
    output += '\n  Browser: will apply on next start';
  }
  return output;
}


/**
 * Format setMobilePreset response
 */
export function formatSetMobilePreset(response: CommandResponse): string {
  const device = response.data.device;
  let output = '\n\nDevice preset applied:';
  output += `\n  Device: ${device.name}`;
  output += `\n  Viewport: ${device.viewport.width}x${device.viewport.height}`;
  output += `\n  Mobile: ${device.isMobile ? 'Yes' : 'No'}`;
  output += `\n  Touch: ${device.hasTouch ? 'Yes' : 'No'}`;
  output += `\n  Scale Factor: ${device.deviceScaleFactor}`;
  if (response.data.previousViewport) {
    output += `\n  Previous Viewport: ${response.data.previousViewport.width}x${response.data.previousViewport.height}`;
  }
  return output;
}

/**
 * Format listMobilePresets response
 */
export function formatListMobilePresets(response: CommandResponse): string {
  let output = '\n\nMobile Device Presets:';
  
  if (response.data.currentDevice) {
    output += `\n\n  Current Device: ${response.data.currentDevice}`;
  }
  
  output += '\n\n  Popular Devices:';
  output += '\n  ┌───────────────────────────┬─────────────┬────────┬───────┐';
  output += '\n  │ Device                    │ Viewport    │ Mobile │ Touch │';
  output += '\n  ├───────────────────────────┼─────────────┼────────┼───────┤';
  
  for (const device of response.data.popular) {
    const name = device.name.padEnd(25);
    const viewport = device.viewport.padEnd(11);
    const mobile = (device.isMobile ? 'Yes' : 'No').padEnd(6);
    const touch = (device.hasTouch ? 'Yes' : 'No').padEnd(5);
    output += `\n  │ ${name} │ ${viewport} │ ${mobile} │ ${touch} │`;
  }
  
  output += '\n  └───────────────────────────┴─────────────┴────────┴───────┘';
  output += `\n\n  Total available: ${response.data.totalAvailable} devices`;
  output += '\n  Use setMobilePreset "<device name>" to apply a preset';
  
  return output;
}

/**
 * Format resetMobilePreset response
 */
export function formatResetMobilePreset(response: CommandResponse): string {
  let output = '\n\nDevice preset reset:';
  output += `\n  ${response.data.message}`;
  if (response.data.previousDevice) {
    output += `\n  Previous Device: ${response.data.previousDevice}`;
  }
  if (response.data.viewport) {
    output += `\n  Restored Viewport: ${response.data.viewport.width}x${response.data.viewport.height}`;
  }
  return output;
}


// Video Recording formatters (Phase 3.2)

/**
 * Format startRecording response
 */
export function formatStartRecording(response: CommandResponse): string {
  let output = '\n\nVideo Recording:';
  output += `\n  Status: Started`;
  output += `\n  Name: ${response.data.name}`;
  output += `\n  Output Path: ${response.data.outputPath}`;
  if (response.data.message) {
    output += `\n  Note: ${response.data.message}`;
  }
  return output;
}

/**
 * Format stopRecording response
 */
export function formatStopRecording(response: CommandResponse): string {
  let output = '\n\nVideo Recording:';
  output += `\n  Status: Stopped`;
  output += `\n  Name: ${response.data.name}`;
  output += `\n  Output Path: ${response.data.outputPath}`;
  output += `\n  Duration: ${response.data.duration}s`;
  if (response.data.message) {
    output += `\n  ${response.data.message}`;
  }
  return output;
}

/**
 * Format getRecordingStatus response
 */
export function formatGetRecordingStatus(response: CommandResponse): string {
  let output = '\n\nVideo Recording Status:';
  if (response.data.isRecording) {
    output += `\n  Recording: Yes`;
    output += `\n  Name: ${response.data.name}`;
    output += `\n  Duration: ${response.data.duration}s`;
    output += `\n  Output Path: ${response.data.outputPath}`;
  } else {
    output += `\n  Recording: No`;
    output += `\n  ${response.data.message || 'No recording in progress'}`;
  }
  return output;
}

/**
 * Format listRecordings response
 */
export function formatListRecordings(response: CommandResponse): string {
  let output = '\n\nSaved Recordings:';
  output += `\n  Directory: ${response.data.directory}`;
  output += `\n  Count: ${response.data.count}`;
  
  if (response.data.recordings.length === 0) {
    output += '\n  (no recordings found)';
  } else {
    output += '\n';
    for (const rec of response.data.recordings) {
      output += `\n  ${rec.name}`;
      output += `\n    Size: ${rec.sizeFormatted}`;
      output += `\n    Created: ${rec.created}`;
    }
  }
  return output;
}
