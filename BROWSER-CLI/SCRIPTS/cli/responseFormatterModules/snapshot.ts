/**
 * Snapshot formatting functions
 * Commands: snapshot, changes, screenshot
 */

import * as fs from 'fs';
import type { CommandResponse, SendCommandFn } from './types';
import { ScreenshotFormatter } from '../screenshot-formatter';

/**
 * Format snapshot response
 */
export function formatSnapshot(
  response: CommandResponse,
  _args: string[],
  cmdArgs: Record<string, any>
): string {
  // Handle incremental mode
  if (cmdArgs.incremental && response.data.incremental) {
    const inc = response.data.incremental;
    
    if (inc.isFirst) {
      // First snapshot - show full snapshot with note
      let output = '\n\n### Incremental Snapshot';
      output += '\n\n**Note:** ' + inc.message;
      output += `\n\n- Snapshot ID: ${response.data?.snapshotId || 'unknown'}`;
      output += '\n- Page Snapshot:';
      output += '\n```yaml';
      output += '\n' + response.data.snapshot;
      output += '\n```';
      return output;
    }

    // Format incremental diff output
    let output = '\n\nINCREMENTAL SNAPSHOT (since last capture)';
    output += '\n=========================================';
    
    // Added elements
    if (inc.added && inc.added.length > 0) {
      output += '\n\n[+] Added Elements:';
      for (const item of inc.added) {
        output += `\n  ${item.description} [ref=${item.ref}]`;
      }
    }
    
    // Removed elements
    if (inc.removed && inc.removed.length > 0) {
      output += '\n\n[-] Removed Elements:';
      for (const item of inc.removed) {
        output += `\n  ${item.description} (was ${item.ref})`;
      }
    }
    
    // Changed elements
    if (inc.changed && inc.changed.length > 0) {
      output += '\n\n[~] Changed Elements:';
      for (const item of inc.changed) {
        output += `\n  ${item.description} [ref=${item.ref}]: ${item.changeType}`;
      }
    }
    
    // Summary
    const summary = inc.summary;
    if (summary) {
      const totalChanges = summary.addedCount + summary.removedCount + summary.changedCount;
      if (totalChanges === 0) {
        output += '\n\nNo changes detected since last snapshot.';
      }
      output += `\n\nUnchanged: ${summary.unchangedCount} elements (use \`snapshot\` without --incremental to see all)`;
    }
    
    // Ref stability if present
    if (response.data.stability) {
      const s = response.data.stability;
      output += '\n\n### Ref Stability';
      output += `\n- Score: ${(s.score * 100).toFixed(0)}%`;
      output += `\n- Stable: ${s.stable}`;
      output += `\n- New: ${s.new}`;
      output += `\n- Lost: ${s.lost}`;
      if (s.message) {
        output += `\n- ${s.message}`;
      }
    }
    
    return output;
  }

  // Phase 3: Handle custom filename from cmdArgs
  if (cmdArgs.filename) {
    fs.writeFileSync(cmdArgs.filename, response.data.snapshot);

    // If --quiet flag is set, return minimal output
    if (cmdArgs.quiet) {
      return `\nSnapshot saved to: ${cmdArgs.filename}`;
    }

    // Otherwise, show file info plus snapshot content
    let output = `\nSnapshot saved to: ${cmdArgs.filename}`;
    output += '\n\n### Page state';
    output += `\n- Snapshot ID: ${response.data?.snapshotId || 'unknown'}`;
    output += `\n- Page URL: ${response.data.url || 'unknown'}`;
    output += `\n- Page Title: ${response.data.title || 'unknown'}`;
    output += '\n- Page Snapshot:';
    output += '\n```yaml';
    output += '\n' + response.data.snapshot;
    output += '\n```';

    // Section 4: Ref Stability display
    if (response.data.stability) {
      const s = response.data.stability;
      output += '\n\n### Ref Stability';
      output += `\n- Score: ${(s.score * 100).toFixed(0)}%`;
      output += `\n- Stable: ${s.stable}`;
      output += `\n- New: ${s.new}`;
      output += `\n- Lost: ${s.lost}`;
      if (s.message) {
        output += `\n- ${s.message}`;
      }
    }

    return output;
  } else if (!cmdArgs.compareName) {
    // MCP-style interactive output (default) - skip if we just did a comparison
    let output = '\n\n### Page state';
    output += `\n- Snapshot ID: ${response.data?.snapshotId || 'unknown'}`;
    output += `\n- Page URL: ${response.data.url || 'unknown'}`;
    output += `\n- Page Title: ${response.data.title || 'unknown'}`;
    output += '\n- Page Snapshot:';
    output += '\n```yaml';
    output += '\n' + response.data.snapshot;
    output += '\n```';

    // Section 4: Ref Stability display
    if (response.data.stability) {
      const s = response.data.stability;
      output += '\n\n### Ref Stability';
      output += `\n- Score: ${(s.score * 100).toFixed(0)}%`;
      output += `\n- Stable: ${s.stable}`;
      output += `\n- New: ${s.new}`;
      output += `\n- Lost: ${s.lost}`;
      if (s.message) {
        output += `\n- ${s.message}`;
      }
    }

    return output;
  }
  return '';
}

/**
 * Format changes response (changed element refs)
 */
export function formatChanges(response: CommandResponse): string {
  let output = '\n\n### Changed Elements';

  if (response.data.count === 0) {
    output += '\n  (no changes detected)';
  } else {
    output += `\n  Total: ${response.data.count} changed elements`;
    output += '\n\n  Element Refs:';
    response.data.changes.forEach((ref: string) => {
      output += `\n    - ${ref}`;
    });
  }

  return output;
}

/**
 * Format screenshot with visual preview
 */
export async function formatScreenshot(
  response: CommandResponse,
  args: string[]
): Promise<string> {
  let output = `\n\n📸 Screenshot saved: ${response.data.path}`;

  // Display code if present
  if (response.data.code) {
    output += '\n\n### Ran Playwright code';
    output += '\n```js';
    output += '\n' + response.data.code;
    output += '\n```';
  }

  // Check for flags
  const noPreview = args.includes('--no-preview');

  if (noPreview) {
    return output;
  }

  // Add visual preview
  const preview = await ScreenshotFormatter.format(response.data.path, {
    showImage: true,
  });

  output += preview;

  return output;
}

/**
 * Handle snapshot baseline/comparison post-processing
 */
export async function handleSnapshotComparison(
  cmdArgs: Record<string, any>,
  snapshot: string,
  sendCommand: SendCommandFn
): Promise<void> {
  // Save baseline if requested
  if (cmdArgs.saveBaseline) {
    const baselineResponse = await sendCommand('saveSnapshotBaseline', {
      name: cmdArgs.saveBaseline,
      snapshot: snapshot,
    });
    if (baselineResponse.status === 'ok') {
      console.log(`📸 Baseline saved: ${cmdArgs.saveBaseline}`);
    }
  }

  // Compare with baseline if requested
  if (cmdArgs.compareName) {
    const compareResponse = await sendCommand('compareSnapshots', {
      name: cmdArgs.compareName,
      snapshot: snapshot,
    });
    if (compareResponse.status === 'ok') {
      const { added, removed, changed } = compareResponse.data;
      console.log(`\n🔍 Comparison with baseline: ${cmdArgs.compareName}`);
      if (added.length === 0 && removed.length === 0 && changed.length === 0) {
        console.log('  ✅ No changes detected');
      } else {
        if (added.length > 0) {
          console.log(`\n  ➕ Added (${added.length}):`);
          added.slice(0, 10).forEach((line: string) => console.log(`    ${line}`));
          if (added.length > 10) console.log(`    ... and ${added.length - 10} more`);
        }
        if (removed.length > 0) {
          console.log(`\n  ➖ Removed (${removed.length}):`);
          removed.slice(0, 10).forEach((line: string) => console.log(`    ${line}`));
          if (removed.length > 10) console.log(`    ... and ${removed.length - 10} more`);
        }
        if (changed.length > 0) {
          console.log(`\n  🔄 Changed (${changed.length}):`);
          changed.slice(0, 5).forEach((line: string) => console.log(`    ${line}`));
          if (changed.length > 5) console.log(`    ... and ${changed.length - 5} more`);
        }
      }
    }
  }
}
