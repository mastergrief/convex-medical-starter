import terminalImage from 'terminal-image';
import * as fs from 'fs';
import sharp from 'sharp';

export class ScreenshotFormatter {
  /**
   * Check if terminal supports images (iTerm2, Kitty, WezTerm)
   */
  static isImageTerminalSupported(): boolean {
    const term = process.env.TERM_PROGRAM || process.env.TERM || '';
    return (
      term.includes('iTerm') ||
      term.includes('kitty') ||
      term.includes('WezTerm') ||
      process.env.KITTY_WINDOW_ID !== undefined
    );
  }

  /**
   * Render image in terminal (iTerm2/Kitty protocol)
   */
  static async renderTerminalImage(imagePath: string): Promise<string> {
    try {
      if (!this.isImageTerminalSupported()) {
        return '';
      }

      // Read the image buffer
      const imageBuffer = await fs.promises.readFile(imagePath);

      // terminal-image renders image inline using terminal protocols
      return await terminalImage.buffer(imageBuffer, {
        width: '50%', // 50% of terminal width
        preserveAspectRatio: true,
      });
    } catch (error) {
      return '';
    }
  }

  /**
   * Generate simple text preview (fallback for terminals without image support)
   */
  static async generateTextPreview(imagePath: string): Promise<string> {
    try {
      // Get image metadata using sharp
      const metadata = await sharp(imagePath).metadata();

      return [
        '📸 Screenshot Details:',
        `   Size: ${metadata.width}x${metadata.height}`,
        `   Format: ${metadata.format}`,
        `   File: ${imagePath}`,
        '',
        '   (Terminal image preview not supported in this terminal)',
        '   (Supported terminals: iTerm2, Kitty, WezTerm)',
      ].join('\n');
    } catch (error) {
      return `   Screenshot saved to: ${imagePath}`;
    }
  }

  /**
   * Format screenshot output with best available visualization
   */
  static async format(
    imagePath: string,
    options?: {
      showImage?: boolean;
    }
  ): Promise<string> {
    const opts = {
      showImage: options?.showImage ?? true,
    };

    let output = '';

    // Try terminal image first (best quality)
    if (opts.showImage && this.isImageTerminalSupported()) {
      const termImage = await this.renderTerminalImage(imagePath);
      if (termImage) {
        output += '\n\n' + termImage;
        return output;
      }
    }

    // Fallback to text preview
    const textPreview = await this.generateTextPreview(imagePath);
    output += '\n\n' + textPreview;

    return output;
  }
}
