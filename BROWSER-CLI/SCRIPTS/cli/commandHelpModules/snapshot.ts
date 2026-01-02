/**
 * Snapshot and screenshot command help texts
 * Commands: snapshot, screenshot, changes, saveSnapshotBaseline, compareSnapshots, listBaselines,
 *           saveScreenshotBaseline, compareScreenshots, listScreenshotBaselines
 */

import type { CommandHelpRecord } from './types';

export const snapshotHelp: CommandHelpRecord = {
  snapshot: `Usage: browser-cmd snapshot [options] [selector]

Capture accessibility snapshot of the page

Options:
  --file                Save to file instead of console
  --baseline=<name>     Save as baseline for comparison
  --compare=<name>      Compare with saved baseline
  --quiet               File-only output (no console display)

Arguments:
  [selector]    Optional selector to snapshot specific element

Features:
  - Shows [ref=e123] tags for interactive elements
  - Displays <changed> markers for elements that changed since last snapshot
  - Captures semantic structure for reliable testing

Examples:
  browser-cmd snapshot
  browser-cmd snapshot --file
  browser-cmd snapshot --baseline=login-page
  browser-cmd snapshot --compare=login-page
  browser-cmd snapshot .modal
  browser-cmd snapshot --file --quiet`,

  'snapshot+': `Usage: browser-cmd snapshot+ [options]

Enhanced snapshot with full element state analysis.

Equivalent to 'snapshot --full'. Provides:
  - Standard accessibility tree with refs
  - Element state enrichment (enabled/disabled/readonly/loading)
  - Form field analysis with quickFill commands
  - Visibility computation
  - Validation error detection

Options:
  --file=<name>    Save to file
  --quiet          File-only output (no terminal display)

Examples:
  browser-cmd snapshot+
  browser-cmd snapshot+ --file=debug
  browser-cmd snapshot+ --quiet --file=form-state`,

  screenshot: `Usage: browser-cmd screenshot <path> [options]

Take a screenshot of the page

Arguments:
  <path>         Output file path (required)

Options:
  --no-preview   Don't show preview in terminal
  --ascii-only   Show ASCII preview only (no terminal image)

Examples:
  browser-cmd screenshot test.png
  browser-cmd screenshot ./screenshots/login.png
  browser-cmd screenshot test.png --no-preview
  browser-cmd screenshot test.png --ascii-only`,

  changes: `Usage: browser-cmd changes

Get list of element refs that changed in last snapshot comparison

Returns: Array of refs with <changed> markers

Requires: State tracking (automatic)

Examples:
  browser-cmd changes`,

  saveSnapshotBaseline: `Usage: browser-cmd saveSnapshotBaseline <name>

Save current accessibility snapshot as baseline

Arguments:
  <name>    Baseline name identifier

Storage: In-memory (resets on browser restart)

Use Case: Detect structural DOM changes (elements added/removed/changed)

Examples:
  browser-cmd saveSnapshotBaseline login-v1
  browser-cmd saveSnapshotBaseline feature-before-change`,

  compareSnapshots: `Usage: browser-cmd compareSnapshots <name>

Compare current snapshot with saved baseline

Arguments:
  <name>    Baseline name to compare against

Returns:
  - added: Lines added to structure
  - removed: Lines removed from structure
  - changed: Lines modified in structure

Note: Ignores ref tag differences (e.g., e5 vs e7 on same element)

Examples:
  browser-cmd compareSnapshots login-v1
  browser-cmd compareSnapshots feature-before-change`,

  listBaselines: `Usage: browser-cmd listBaselines

List all saved snapshot baselines

Returns: Array of baseline names

Examples:
  browser-cmd listBaselines`,

  saveScreenshotBaseline: `Usage: browser-cmd saveScreenshotBaseline <name> [path]

Save screenshot as baseline for visual regression testing

Arguments:
  <name>    Baseline name identifier (required)
  [path]    Optional screenshot path (uses current page if not provided)

Examples:
  browser-cmd saveScreenshotBaseline login-page
  browser-cmd saveScreenshotBaseline dashboard ./dashboard.png`,

  compareScreenshots: `Usage: browser-cmd compareScreenshots <name> [path] [--threshold=0.1]

Compare screenshot with saved baseline using pixel-level diff

Arguments:
  <name>              Baseline name identifier (required)
  [path]              Optional screenshot path (uses current page if not provided)
  --threshold=<n>     Pixel difference tolerance (0-1 scale, default: 0.1)

Features:
  - Pixel-level comparison using pixelmatch algorithm
  - Generates diff image with highlighted changes (red pixels)
  - Reports exact pixel count and percentage difference
  - Dimension validation

Examples:
  browser-cmd compareScreenshots login-page
  browser-cmd compareScreenshots dashboard ./current.png
  browser-cmd compareScreenshots hero --threshold=0.05`,

  listScreenshotBaselines: `Usage: browser-cmd listScreenshotBaselines

List all saved screenshot baselines for visual regression

Returns: Array of baseline objects with name and path

Examples:
  browser-cmd listScreenshotBaselines`,
};;
