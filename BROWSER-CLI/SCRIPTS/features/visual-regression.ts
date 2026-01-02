/**
 * Phase 3: Visual Regression Testing Feature
 *
 * Provides screenshot baseline management and comparison for visual regression testing.
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';
import * as fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { generateDiffImage, generateHTMLReport } from '../utils/diff-image-generator';

/**
 * Visual Regression Testing Feature
 *
 * Manages screenshot baselines and provides comparison functionality for
 * detecting visual regressions across application changes.
 *
 * Commands:
 * - saveScreenshotBaseline: Save a screenshot as a named baseline
 * - compareScreenshots: Compare current page with saved baseline
 * - listScreenshotBaselines: List all saved baselines
 */
export class VisualRegressionFeature extends BaseFeature {
  public readonly name = 'VisualRegression';

  private screenshotBaselines: Map<string, string> = new Map();

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['saveScreenshotBaseline', this.saveBaseline.bind(this)],
      ['compareScreenshots', this.compareScreenshots.bind(this)],
      ['listScreenshotBaselines', this.listBaselines.bind(this)]
    ]);
  }

  /**
   * Save a screenshot as a baseline for future comparisons
   */
  private async saveBaseline(args: { name: string; path?: string }): Promise<CommandResponse> {
    const screenshotPath = args.path || `baseline-${args.name}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.screenshotBaselines.set(args.name, screenshotPath);
    this.log(`Saved screenshot baseline: ${args.name} at ${screenshotPath}`);

    return { status: 'ok', data: { name: args.name } };
  }

  /**
   * Compare current screenshot with baseline using pixel-level diff
   * Returns match status and diff information if differences found
   */
  private async compareScreenshots(args: {
    name: string;
    path?: string;
    threshold?: number; // Default 0.1 (0-1 scale)
    generateComposite?: boolean; // Default true
  }): Promise<CommandResponse> {
    const baselinePath = this.screenshotBaselines.get(args.name);
    if (!baselinePath) {
      return {
        status: 'error',
        message: `No baseline screenshot found with name: ${args.name}`
      };
    }

    const currentScreenshotPath = args.path || `current-${args.name}-${Date.now()}.png`;
    await this.page.screenshot({ path: currentScreenshotPath, fullPage: true });

    try {
      // Read and parse PNG images
      const baselineImg = PNG.sync.read(fs.readFileSync(baselinePath));
      const currentImg = PNG.sync.read(fs.readFileSync(currentScreenshotPath));

      // Validate dimensions match
      if (baselineImg.width !== currentImg.width || baselineImg.height !== currentImg.height) {
        return {
          status: 'error',
          message: `Screenshot dimensions mismatch: baseline ${baselineImg.width}x${baselineImg.height}, current ${currentImg.width}x${currentImg.height}`
        };
      }

      // Create diff image
      const { width, height } = baselineImg;
      const diff = new PNG({ width, height });

      // Run pixelmatch comparison
      const threshold = args.threshold ?? 0.1; // Default 10% tolerance
      const diffPixels = pixelmatch(
        baselineImg.data,
        currentImg.data,
        diff.data,
        width,
        height,
        { threshold }
      );

      const totalPixels = width * height;
      const diffPercentage = (diffPixels / totalPixels) * 100;

      // Determine if match passes threshold
      const match = diffPixels === 0;

      if (!match) {
        // Save diff image with highlighted changes
        const diffPath = `diff-${args.name}-${Date.now()}.png`;
        fs.writeFileSync(diffPath, PNG.sync.write(diff));

        // Generate composite image if requested
        if (args.generateComposite !== false) {
          const compositePath = `composite-${args.name}-${Date.now()}.png`;
          await generateDiffImage({
            baselinePath,
            currentPath: currentScreenshotPath,
            diffPath,
            outputPath: compositePath
          });

          // Generate HTML report
          const reportPath = `report-${args.name}-${Date.now()}.html`;
          generateHTMLReport({
            baselinePath,
            currentPath: currentScreenshotPath,
            diffPath,
            compositePath,
            diffPixels,
            diffPercentage,
            outputPath: reportPath
          });

          return {
            status: 'ok',
            data: {
              match: false,
              diffPath,
              compositePath,
              reportPath,
              diffPixels,
              diffPercentage,
              threshold,
              dimensions: { width, height }
            }
          };
        }

        return {
          status: 'ok',
          data: {
            match: false,
            diffPath,
            diffPixels,
            diffPercentage,
            threshold,
            dimensions: { width, height }
          }
        };
      }

      return {
        status: 'ok',
        data: {
          match: true,
          diffPixels: 0,
          diffPercentage: 0
        }
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to compare screenshots: ${error}`
      };
    }
  }

  /**
   * List all saved screenshot baselines
   */
  private async listBaselines(): Promise<CommandResponse> {
    const baselines = Array.from(this.screenshotBaselines.entries()).map(([name, path]) => ({
      name,
      path
    }));

    return { status: 'ok', data: { baselines } };
  }
}
