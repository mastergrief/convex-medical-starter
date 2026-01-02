/**
 * Screenshot comparison formatting functions
 * Commands: compareScreenshots, listScreenshotBaselines, saveScreenshotBaseline
 */

import type { CommandResponse } from './types';

/**
 * Format save screenshot baseline response
 */
export function formatSaveScreenshotBaseline(response: CommandResponse): string {
  return `\n\n📸 Screenshot baseline saved: ${response.data.name}`;
}

/**
 * Format compare screenshots response
 */
export function formatCompareScreenshots(
  response: CommandResponse,
  cmdArgs: Record<string, any>
): string {
  const {
    match,
    diffPath,
    compositePath,
    reportPath,
    diffPixels,
    diffPercentage,
    threshold,
    dimensions,
  } = response.data;
  let output = `\n\n🔍 Screenshot comparison: ${cmdArgs.name}`;

  if (match) {
    output += '\n  ✅ Screenshots match perfectly (0 pixel difference)';
  } else {
    output += '\n  ⚠️  Screenshots differ';
    if (diffPixels !== undefined)
      output += `\n     Different pixels: ${diffPixels.toLocaleString()}`;
    if (diffPercentage !== undefined)
      output += `\n     Difference: ${diffPercentage.toFixed(4)}%`;
    if (threshold !== undefined)
      output += `\n     Threshold: ${(threshold * 100).toFixed(1)}%`;
    if (dimensions) output += `\n     Dimensions: ${dimensions.width}x${dimensions.height}`;
    output += '\n';
    if (diffPath) output += `\n     📄 Diff image: ${diffPath}`;
    if (compositePath) output += `\n     🖼️  Composite: ${compositePath}`;
    if (reportPath) output += `\n     📊 HTML Report: ${reportPath}`;
    if (reportPath) output += `\n\n     💡 Open ${reportPath} in browser for interactive view`;
  }

  return output;
}

/**
 * Format list screenshot baselines response
 */
export function formatListScreenshotBaselines(response: CommandResponse): string {
  let output = '\n\n📸 Screenshot baselines:';
  if (response.data.baselines.length === 0) {
    output += '\n  (no baselines saved)';
  } else {
    response.data.baselines.forEach((baseline: any) => {
      output += `\n  - ${baseline.name}: ${baseline.path}`;
    });
  }
  return output;
}
