/**
 * VisualRegressionFeature Unit Tests
 * Tests screenshot baseline management and comparison functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockPage, MockPage, createMockScreenshotBuffer } from '../setup';
import { VisualRegressionFeature } from '../../SCRIPTS/features/visual-regression';
import { Page } from 'playwright';
import * as fs from 'fs';
import { PNG } from 'pngjs';

// Mock external modules
vi.mock('fs');
vi.mock('pngjs');
vi.mock('pixelmatch', () => ({
  default: vi.fn()
}));
vi.mock('../../SCRIPTS/utils/diff-image-generator', () => ({
  generateDiffImage: vi.fn().mockResolvedValue(undefined),
  generateHTMLReport: vi.fn()
}));

// Import mocked modules for assertions
import pixelmatch from 'pixelmatch';
import { generateDiffImage, generateHTMLReport } from '../../SCRIPTS/utils/diff-image-generator';

describe('VisualRegressionFeature', () => {
  let mockPage: MockPage;
  let feature: VisualRegressionFeature;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPage = createMockPage();
    // Configure screenshot to return a buffer
    mockPage.screenshot = vi.fn().mockResolvedValue(createMockScreenshotBuffer('current'));
    feature = new VisualRegressionFeature(mockPage as unknown as Page);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 3 command handlers', () => {
      const handlers = feature.getCommandHandlers();

      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(3);
      expect(handlers.has('saveScreenshotBaseline')).toBe(true);
      expect(handlers.has('compareScreenshots')).toBe(true);
      expect(handlers.has('listScreenshotBaselines')).toBe(true);
    });
  });

  describe('saveScreenshotBaseline', () => {
    it('saves baseline with valid name', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;

      const result = await saveHandler({ name: 'homepage' });

      expect(result.status).toBe('ok');
      expect(result.data?.name).toBe('homepage');
      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({ fullPage: true })
      );
    });

    it('returns correct path in response', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;

      // Save with custom path
      const result = await saveHandler({ name: 'custom', path: '/tmp/custom-baseline.png' });

      expect(result.status).toBe('ok');
      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({ path: '/tmp/custom-baseline.png' })
      );
    });

    it('uses default path when not provided', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;

      await saveHandler({ name: 'test-baseline' });

      expect(mockPage.screenshot).toHaveBeenCalledWith(
        expect.objectContaining({
          path: expect.stringContaining('baseline-test-baseline-'),
          fullPage: true
        })
      );
    });
  });

  describe('compareScreenshots', () => {
    beforeEach(() => {
      // Setup PNG mock to return consistent image data
      const mockPngData = {
        width: 800,
        height: 600,
        data: Buffer.alloc(800 * 600 * 4) // RGBA buffer
      };

      vi.mocked(PNG.sync.read).mockReturnValue(mockPngData as unknown as PNG);
      vi.mocked(fs.readFileSync).mockReturnValue(Buffer.from('mock-png-data'));
      vi.mocked(fs.writeFileSync).mockImplementation(() => undefined);
      vi.mocked(fs.existsSync).mockReturnValue(true);

      // Mock PNG constructor
      vi.mocked(PNG).mockImplementation(function(this: any, opts?: { width?: number; height?: number }) {
        this.width = opts?.width ?? 800;
        this.height = opts?.height ?? 600;
        this.data = Buffer.alloc((opts?.width ?? 800) * (opts?.height ?? 600) * 4);
        return this;
      } as any);
    });

    it('returns error when baseline not found', async () => {
      const handlers = feature.getCommandHandlers();
      const compareHandler = handlers.get('compareScreenshots')!;

      const result = await compareHandler({ name: 'nonexistent' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('No baseline screenshot found with name: nonexistent');
    });

    it('detects identical images (0% diff)', async () => {
      // First save a baseline
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;
      await saveHandler({ name: 'identical-test' });

      // Mock pixelmatch to return 0 diff pixels
      vi.mocked(pixelmatch).mockReturnValue(0);

      const compareHandler = handlers.get('compareScreenshots')!;
      const result = await compareHandler({ name: 'identical-test' });

      expect(result.status).toBe('ok');
      expect(result.data?.match).toBe(true);
      expect(result.data?.diffPixels).toBe(0);
      expect(result.data?.diffPercentage).toBe(0);
    });

    it('calculates match percentage correctly', async () => {
      // Save baseline first
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;
      await saveHandler({ name: 'diff-test' });

      // Mock pixelmatch to return some diff pixels (10% of 800x600 = 48000 pixels)
      const totalPixels = 800 * 600;
      const diffPixels = 48000; // 10% difference
      vi.mocked(pixelmatch).mockReturnValue(diffPixels);

      const compareHandler = handlers.get('compareScreenshots')!;
      const result = await compareHandler({ name: 'diff-test' });

      expect(result.status).toBe('ok');
      expect(result.data?.match).toBe(false);
      expect(result.data?.diffPixels).toBe(diffPixels);
      expect(result.data?.diffPercentage).toBeCloseTo((diffPixels / totalPixels) * 100, 1);
    });

    it('generates diff image on mismatch', async () => {
      // Save baseline first
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;
      await saveHandler({ name: 'mismatch-test' });

      // Mock pixelmatch to return differences
      vi.mocked(pixelmatch).mockReturnValue(1000);

      // Mock PNG.sync.write
      vi.mocked(PNG.sync.write).mockReturnValue(Buffer.from('diff-image-data'));

      const compareHandler = handlers.get('compareScreenshots')!;
      const result = await compareHandler({ name: 'mismatch-test' });

      expect(result.status).toBe('ok');
      expect(result.data?.match).toBe(false);
      expect(result.data?.diffPath).toBeDefined();
      expect(result.data?.diffPath).toContain('diff-mismatch-test-');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('generates composite and HTML report on mismatch by default', async () => {
      // Save baseline first
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;
      await saveHandler({ name: 'report-test' });

      // Mock pixelmatch to return differences
      vi.mocked(pixelmatch).mockReturnValue(500);
      vi.mocked(PNG.sync.write).mockReturnValue(Buffer.from('diff-image-data'));

      const compareHandler = handlers.get('compareScreenshots')!;
      const result = await compareHandler({ name: 'report-test' });

      expect(result.status).toBe('ok');
      expect(result.data?.compositePath).toBeDefined();
      expect(result.data?.reportPath).toBeDefined();
      expect(generateDiffImage).toHaveBeenCalled();
      expect(generateHTMLReport).toHaveBeenCalled();
    });

    it('skips composite generation when disabled', async () => {
      // Save baseline first
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;
      await saveHandler({ name: 'no-composite-test' });

      // Mock pixelmatch to return differences
      vi.mocked(pixelmatch).mockReturnValue(100);
      vi.mocked(PNG.sync.write).mockReturnValue(Buffer.from('diff-image-data'));

      const compareHandler = handlers.get('compareScreenshots')!;
      const result = await compareHandler({
        name: 'no-composite-test',
        generateComposite: false
      });

      expect(result.status).toBe('ok');
      expect(result.data?.compositePath).toBeUndefined();
      expect(result.data?.reportPath).toBeUndefined();
      expect(generateDiffImage).not.toHaveBeenCalled();
      expect(generateHTMLReport).not.toHaveBeenCalled();
    });

    it('handles dimension mismatch error', async () => {
      // Save baseline first
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;
      await saveHandler({ name: 'dimension-test' });

      // Mock PNG.sync.read to return different dimensions for second read
      let callCount = 0;
      vi.mocked(PNG.sync.read).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { width: 800, height: 600, data: Buffer.alloc(800 * 600 * 4) } as unknown as PNG;
        }
        return { width: 1024, height: 768, data: Buffer.alloc(1024 * 768 * 4) } as unknown as PNG;
      });

      const compareHandler = handlers.get('compareScreenshots')!;
      const result = await compareHandler({ name: 'dimension-test' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Screenshot dimensions mismatch');
    });

    it('uses custom threshold when provided', async () => {
      // Save baseline first
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;
      await saveHandler({ name: 'threshold-test' });

      // Mock pixelmatch
      vi.mocked(pixelmatch).mockReturnValue(0);

      const compareHandler = handlers.get('compareScreenshots')!;
      await compareHandler({ name: 'threshold-test', threshold: 0.05 });

      // Verify pixelmatch was called with custom threshold
      expect(pixelmatch).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.any(Buffer),
        expect.any(Buffer),
        800,
        600,
        { threshold: 0.05 }
      );
    });
  });

  describe('listScreenshotBaselines', () => {
    it('returns empty array when no baselines', async () => {
      const handlers = feature.getCommandHandlers();
      const listHandler = handlers.get('listScreenshotBaselines')!;

      const result = await listHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.baselines).toEqual([]);
    });

    it('returns all saved baselines with metadata', async () => {
      const handlers = feature.getCommandHandlers();
      const saveHandler = handlers.get('saveScreenshotBaseline')!;

      // Save multiple baselines
      await saveHandler({ name: 'baseline1', path: '/path/to/baseline1.png' });
      await saveHandler({ name: 'baseline2', path: '/path/to/baseline2.png' });
      await saveHandler({ name: 'baseline3', path: '/path/to/baseline3.png' });

      const listHandler = handlers.get('listScreenshotBaselines')!;
      const result = await listHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.baselines).toHaveLength(3);
      expect(result.data?.baselines).toEqual(
        expect.arrayContaining([
          { name: 'baseline1', path: '/path/to/baseline1.png' },
          { name: 'baseline2', path: '/path/to/baseline2.png' },
          { name: 'baseline3', path: '/path/to/baseline3.png' }
        ])
      );
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('VisualRegression');
    });
  });
});
