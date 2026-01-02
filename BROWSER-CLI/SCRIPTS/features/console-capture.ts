/**
 * Phase 1: Console Capture
 * Captures and manages browser console messages
 */

import { Page } from 'playwright';
import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse, ConsoleMessage } from '../core/types';
import { CircularBuffer } from '../utils/circular-buffer';
import { CONSOLE_BUFFER_DEFAULT, CONSOLE_BUFFER_MIN, CONSOLE_BUFFER_MAX } from '../core/constants';

/**
 * Console capture feature for tracking browser console messages.
 *
 * Automatically captures console.log, console.error, console.warn, etc.
 * Maintains a rolling buffer using CircularBuffer for O(1) operations.
 */

export class ConsoleCaptureFeature extends BaseFeature {
  public readonly name = 'ConsoleCapture';
  private messages: CircularBuffer<ConsoleMessage>;
  private discardedErrors = 0;

  constructor(page: Page) {
    super(page);
    this.messages = new CircularBuffer<ConsoleMessage>(CONSOLE_BUFFER_DEFAULT);
  }

  /**
   * Setup console listener when feature initializes
   */
  async setup(): Promise<void> {
    this.page.on('console', (msg) => {
      const messageType = msg.type();
      const wasAtCapacity = this.messages.size === this.messages.capacity;
      
      // Track if we're about to discard an error/warning
      if (wasAtCapacity) {
        const oldest = this.messages.peek();
        if (oldest && (oldest.type === 'error' || oldest.type === 'warning')) {
          this.discardedErrors++;
          this.log(`Warning: Discarded ${oldest.type} message due to buffer overflow`);
        }
      }

      this.messages.push({
        type: messageType,
        text: msg.text(),
        timestamp: Date.now(),
        location: msg.location()?.url,
        lineNumber: msg.location()?.lineNumber || undefined,
        columnNumber: msg.location()?.columnNumber || undefined,
        args: msg.args().map(a => a.toString()),
      });
    });
  }

  /**
   * Get command handlers for console operations
   */
  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['console', this.getConsole.bind(this)],
      ['clearConsole', this.clearConsole.bind(this)],
      ['getConsoleBufferStats', this.handleGetConsoleBufferStats.bind(this)],
      ['setConsoleBufferCapacity', this.handleSetConsoleBufferCapacity.bind(this)],
    ]);
  }

  /**
   * Get recent console messages
   */
  async getConsole(args: { count?: number }): Promise<CommandResponse> {
    const count = args.count || 5;
    const recent = this.getRecentConsole(count);

    return {
      status: 'ok',
      data: { messages: recent, total: this.messages.size }
    };
  }

  /**
   * Clear all console messages
   */
  async clearConsole(): Promise<CommandResponse> {
    this.messages.clear();
    this.discardedErrors = 0;
    this.log('Console messages cleared');

    return {
      status: 'ok',
      data: { cleared: true }
    };
  }

  /**
   * Get recent console messages (internal helper)
   */
  getRecentConsole(count: number = 5): ConsoleMessage[] {
    return this.messages.slice(count);
  }

  /**
   * Get all console messages
   */
  getAllMessages(): ConsoleMessage[] {
    return this.messages.toArray();
  }

  /**
   * Get buffer statistics
   */
  getBufferStats(): {
    capacity: number;
    current: number;
    overflow: number;
    discardedErrors: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    const oldest = this.messages.peek();
    const newest = this.messages.peekLast();
    return {
      capacity: this.messages.capacity,
      current: this.messages.size,
      overflow: this.messages.overflowCount,
      discardedErrors: this.discardedErrors,
      oldestTimestamp: oldest ? oldest.timestamp : null,
      newestTimestamp: newest ? newest.timestamp : null,
    };
  }

  /**
   * Set buffer capacity (clamped between MIN-MAX)
   */
  setBufferCapacity(capacity: number): void {
    const clampedCapacity = Math.max(CONSOLE_BUFFER_MIN, Math.min(CONSOLE_BUFFER_MAX, capacity));
    
    // Track discarded errors before resize if shrinking
    if (clampedCapacity < this.messages.size) {
      const messages = this.messages.toArray();
      const discardCount = messages.length - clampedCapacity;
      for (let i = 0; i < discardCount; i++) {
        if (messages[i].type === 'error' || messages[i].type === 'warning') {
          this.discardedErrors++;
        }
      }
    }
    
    this.messages.setCapacity(clampedCapacity);
  }

  /**
   * Handler for getConsoleBufferStats command
   */
  private async handleGetConsoleBufferStats(): Promise<CommandResponse> {
    return {
      status: 'ok',
      data: this.getBufferStats()
    };
  }

  /**
   * Handler for setConsoleBufferCapacity command
   */
  private async handleSetConsoleBufferCapacity(args: { capacity: number }): Promise<CommandResponse> {
    const oldCapacity = this.messages.capacity;
    this.setBufferCapacity(args.capacity);
    return {
      status: 'ok',
      data: {
        previousCapacity: oldCapacity,
        newCapacity: this.messages.capacity,
        currentSize: this.messages.size
      }
    };
  }
}
