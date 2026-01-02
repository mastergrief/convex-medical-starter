/**
 * Screenshot Diff Image Generator
 * Creates side-by-side comparison with highlighted changes
 */

import { PNG } from 'pngjs';
import * as fs from 'fs';

export interface DiffImageOptions {
  baselinePath: string;
  currentPath: string;
  diffPath: string;
  outputPath: string;
  highlightColor?: { r: number; g: number; b: number };
}

/**
 * Generate side-by-side comparison image with diff overlay
 */
export async function generateDiffImage(options: DiffImageOptions): Promise<void> {
  const {
    baselinePath,
    currentPath,
    diffPath,
    outputPath,
    highlightColor = { r: 255, g: 0, b: 255 } // Magenta
  } = options;

  // Read all images
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const current = PNG.sync.read(fs.readFileSync(currentPath));
  const diff = PNG.sync.read(fs.readFileSync(diffPath));

  const { width, height } = baseline;

  // Create output image: [baseline | current | diff] side-by-side
  const outputWidth = width * 3 + 40; // 20px padding between each
  const outputHeight = height + 60;  // Space for labels

  const output = new PNG({ width: outputWidth, height: outputHeight });

  // Fill background with white
  for (let y = 0; y < outputHeight; y++) {
    for (let x = 0; x < outputWidth; x++) {
      const idx = (outputWidth * y + x) << 2;
      output.data[idx] = 255;     // R
      output.data[idx + 1] = 255; // G
      output.data[idx + 2] = 255; // B
      output.data[idx + 3] = 255; // A
    }
  }

  // Copy baseline image (left third)
  copyImage(baseline, output, 0, 30, width, height);

  // Copy current image (middle third)
  copyImage(current, output, width + 20, 30, width, height);

  // Copy diff with highlight overlay (right third)
  copyImageWithHighlight(diff, output, (width + 20) * 2, 30, width, height, highlightColor);

  // Save output
  fs.writeFileSync(outputPath, PNG.sync.write(output));
}

/**
 * Copy source image to destination at specified position
 */
function copyImage(
  source: PNG,
  dest: PNG,
  destX: number,
  destY: number,
  width: number,
  height: number
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (source.width * y + x) << 2;
      const destIdx = (dest.width * (y + destY) + (x + destX)) << 2;

      dest.data[destIdx] = source.data[srcIdx];         // R
      dest.data[destIdx + 1] = source.data[srcIdx + 1]; // G
      dest.data[destIdx + 2] = source.data[srcIdx + 2]; // B
      dest.data[destIdx + 3] = source.data[srcIdx + 3]; // A
    }
  }
}

/**
 * Copy image with magenta highlight on changed pixels
 */
function copyImageWithHighlight(
  source: PNG,
  dest: PNG,
  destX: number,
  destY: number,
  width: number,
  height: number,
  highlightColor: { r: number; g: number; b: number }
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (source.width * y + x) << 2;
      const destIdx = (dest.width * (y + destY) + (x + destX)) << 2;

      // Check if pixel is part of diff (red in pixelmatch output)
      const isChanged = source.data[srcIdx] === 255 &&
                       source.data[srcIdx + 1] === 0 &&
                       source.data[srcIdx + 2] === 0;

      if (isChanged) {
        // Apply highlight color
        dest.data[destIdx] = highlightColor.r;
        dest.data[destIdx + 1] = highlightColor.g;
        dest.data[destIdx + 2] = highlightColor.b;
        dest.data[destIdx + 3] = 255;
      } else {
        // Copy original pixel
        dest.data[destIdx] = source.data[srcIdx];
        dest.data[destIdx + 1] = source.data[srcIdx + 1];
        dest.data[destIdx + 2] = source.data[srcIdx + 2];
        dest.data[destIdx + 3] = source.data[srcIdx + 3];
      }
    }
  }
}

/**
 * Generate HTML report with interactive diff view
 */
export function generateHTMLReport(options: {
  baselinePath: string;
  currentPath: string;
  diffPath: string;
  compositePath: string;
  diffPixels: number;
  diffPercentage: number;
  outputPath: string;
}): void {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Visual Regression Report</title>
  <style>
    body { font-family: system-ui; margin: 20px; background: #f5f5f5; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
    .header { border-bottom: 2px solid #ddd; padding-bottom: 20px; margin-bottom: 20px; }
    .stats { display: flex; gap: 20px; margin-bottom: 20px; }
    .stat { padding: 10px 20px; background: #f0f0f0; border-radius: 4px; }
    .stat-label { font-size: 12px; color: #666; }
    .stat-value { font-size: 24px; font-weight: bold; color: #333; }
    .images { display: flex; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
    .image-panel { flex: 1; min-width: 300px; }
    .image-panel img { width: 100%; border: 1px solid #ddd; border-radius: 4px; }
    .image-label { font-weight: bold; margin-bottom: 8px; }
    .composite { margin-top: 20px; }
    .composite img { width: 100%; border: 2px solid #333; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Visual Regression Report</h1>
      <p>Generated: ${new Date().toISOString()}</p>
    </div>

    <div class="stats">
      <div class="stat">
        <div class="stat-label">Different Pixels</div>
        <div class="stat-value">${options.diffPixels.toLocaleString()}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Difference %</div>
        <div class="stat-value">${options.diffPercentage.toFixed(4)}%</div>
      </div>
    </div>

    <div class="images">
      <div class="image-panel">
        <div class="image-label">Baseline</div>
        <img src="${options.baselinePath}" alt="Baseline">
      </div>
      <div class="image-panel">
        <div class="image-label">Current</div>
        <img src="${options.currentPath}" alt="Current">
      </div>
      <div class="image-panel">
        <div class="image-label">Diff (Red = Changed)</div>
        <img src="${options.diffPath}" alt="Diff">
      </div>
    </div>

    <div class="composite">
      <div class="image-label">Side-by-Side Comparison</div>
      <img src="${options.compositePath}" alt="Composite">
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(options.outputPath, html);
}
