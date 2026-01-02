/**
 * Video Recording Feature for Browser-CLI
 *
 * Captures browser sessions as video files using Playwright's recordVideo capability.
 * Note: Playwright requires recordVideo option set at context creation time.
 *
 * Commands:
 * - startRecording <name> - Begin recording session (requires browser restart)
 * - stopRecording - End recording, finalize video file
 * - getRecordingStatus - Check if recording is active
 */

import { Page, BrowserContext } from 'playwright';
import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Recording state for video capture
 */
interface RecordingState {
  isRecording: boolean;
  name: string | null;
  startTime: number | null;
  outputPath: string | null;
}

/**
 * VideoRecordingFeature - Captures browser sessions as video files
 *
 * Uses Playwright's native video recording which captures at context level.
 * Recording requires context recreation with recordVideo option.
 */
export class VideoRecordingFeature extends BaseFeature {
  public readonly name = 'VideoRecording';

  private recordingState: RecordingState = {
    isRecording: false,
    name: null,
    startTime: null,
    outputPath: null,
  };

  private recordingsDir = 'BROWSER-CLI/recordings';
  private context: BrowserContext | null = null;

  /**
   * Set the browser context for video operations
   */
  setContext(context: BrowserContext): void {
    this.context = context;
  }

  /**
   * Set recordings directory from config
   */
  setRecordingsDir(dir: string): void {
    this.recordingsDir = dir;
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['startRecording', this.startRecording.bind(this)],
      ['stopRecording', this.stopRecording.bind(this)],
      ['getRecordingStatus', this.getRecordingStatus.bind(this)],
      ['listRecordings', this.listRecordings.bind(this)],
    ]);
  }

  /**
   * Ensure recordings directory exists
   */
  private ensureRecordingsDir(): void {
    const absPath = path.resolve(this.recordingsDir);
    if (!fs.existsSync(absPath)) {
      fs.mkdirSync(absPath, { recursive: true });
      this.log(`Created recordings directory: ${absPath}`);
    }
  }

  /**
   * Start video recording
   *
   * Note: This command signals intent to record. The actual recording
   * requires browser context recreation with recordVideo option.
   * BrowserManager handles the context recreation on receiving this command.
   */
  private async startRecording(args: {
    name?: string;
  }): Promise<CommandResponse> {
    if (this.recordingState.isRecording) {
      return {
        status: 'error',
        message: `Recording already in progress: ${this.recordingState.name}. Stop it first with stopRecording.`,
      };
    }

    const name = args.name || `recording-${Date.now()}`;
    this.ensureRecordingsDir();

    const outputPath = path.resolve(this.recordingsDir, `${name}.webm`);

    this.recordingState = {
      isRecording: true,
      name,
      startTime: Date.now(),
      outputPath,
    };

    this.log(`Recording started: ${name}`);

    return {
      status: 'ok',
      data: {
        name,
        outputPath,
        message:
          'Recording started. Video will be saved when stopRecording is called.',
        requiresContextRestart: true,
        recordVideoOptions: {
          dir: path.resolve(this.recordingsDir),
          size: { width: 1920, height: 1080 },
        },
      },
      playwrightCode: `// Recording started with Playwright
const context = await browser.newContext({
  recordVideo: {
    dir: '${path.resolve(this.recordingsDir)}',
    size: { width: 1920, height: 1080 }
  }
});`,
    };
  }

  /**
   * Stop video recording and finalize the video file
   */
  private async stopRecording(): Promise<CommandResponse> {
    if (!this.recordingState.isRecording) {
      return {
        status: 'error',
        message: 'No recording in progress. Start one with startRecording.',
      };
    }

    const { name, startTime, outputPath } = this.recordingState;
    const duration = startTime ? Date.now() - startTime : 0;

    // Close context to finalize video (Playwright requirement)
    // The video file is written when the context closes
    let videoPath: string | null = null;
    if (this.context) {
      try {
        const pages = this.context.pages();
        if (pages.length > 0) {
          const video = pages[0].video();
          if (video) {
            videoPath = await video.path();
          }
        }
      } catch (error) {
        this.log(`Video path retrieval warning: ${error}`);
      }
    }

    const finalPath = videoPath || outputPath;

    // Reset recording state
    this.recordingState = {
      isRecording: false,
      name: null,
      startTime: null,
      outputPath: null,
    };

    this.log(`Recording stopped: ${name}`);

    return {
      status: 'ok',
      data: {
        name,
        outputPath: finalPath,
        duration: Math.round(duration / 1000),
        message: `Recording saved to ${finalPath}`,
        requiresContextClose: true,
      },
      playwrightCode: `// Stop recording - video saved when context closes
const video = page.video();
if (video) {
  const path = await video.path();
  console.log('Video saved to:', path);
}
await context.close();`,
    };
  }

  /**
   * Get current recording status
   */
  private async getRecordingStatus(): Promise<CommandResponse> {
    const { isRecording, name, startTime, outputPath } = this.recordingState;

    if (!isRecording) {
      return {
        status: 'ok',
        data: {
          isRecording: false,
          message: 'No recording in progress',
        },
      };
    }

    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;

    return {
      status: 'ok',
      data: {
        isRecording: true,
        name,
        duration,
        outputPath,
        message: `Recording "${name}" in progress (${duration}s)`,
      },
    };
  }

  /**
   * List all recordings in the recordings directory
   */
  private async listRecordings(): Promise<CommandResponse> {
    this.ensureRecordingsDir();
    const absPath = path.resolve(this.recordingsDir);

    try {
      const files = fs.readdirSync(absPath);
      const recordings = files
        .filter((f) => f.endsWith('.webm'))
        .map((f) => {
          const filePath = path.join(absPath, f);
          const stats = fs.statSync(filePath);
          return {
            name: f.replace('.webm', ''),
            path: filePath,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            created: stats.birthtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      return {
        status: 'ok',
        data: {
          count: recordings.length,
          recordings,
          directory: absPath,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Failed to list recordings: ${error}`,
      };
    }
  }

  /**
   * Cleanup: Stop any active recording when browser closes
   */
  async cleanup(): Promise<void> {
    if (this.recordingState.isRecording) {
      this.log(
        `Cleanup: Recording "${this.recordingState.name}" will be finalized on context close`
      );
      this.recordingState = {
        isRecording: false,
        name: null,
        startTime: null,
        outputPath: null,
      };
    }
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
