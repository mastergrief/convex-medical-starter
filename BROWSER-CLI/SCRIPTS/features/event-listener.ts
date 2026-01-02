/**
 * Event Listener Feature
 * Track browser events: popup, dialog, filechooser, pageerror
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';
import { Dialog } from 'playwright';

import { CircularBuffer } from '../utils/circular-buffer';
import { EVENT_BUFFER_DEFAULT, EVENT_BUFFER_MIN, EVENT_BUFFER_MAX } from '../core/constants';

export interface BrowserEvent {
  type: 'popup' | 'dialog' | 'filechooser' | 'pageerror' | 'framenavigated';
  data: any;
  timestamp: number;
}

export class EventListenerFeature extends BaseFeature {
  public readonly name = 'EventListener';
  private events: CircularBuffer<BrowserEvent>;
  private pendingDialog: Dialog | null = null;

  constructor(page: import('playwright').Page) {
    super(page);
    this.events = new CircularBuffer<BrowserEvent>(EVENT_BUFFER_DEFAULT);
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['getEventLog', this.handleGetEventLog.bind(this)],
      ['clearEventLog', this.handleClearEventLog.bind(this)],
      ['waitForEvent', this.handleWaitForEvent.bind(this)],
      ['dismissDialog', this.handleDismissDialog.bind(this)],
      ['acceptDialog', this.handleAcceptDialog.bind(this)],
      ['getEventBufferStats', this.handleGetEventBufferStats.bind(this)],
      ['setEventBufferCapacity', this.handleSetEventBufferCapacity.bind(this)],
    ]);
  }

  async setup(): Promise<void> {
    this.log('Setting up event listeners...');

    // Popup event
    this.page.on('popup', (popup) => {
      this.recordEvent('popup', { url: popup.url() });
    });

    // Dialog event (alert, confirm, prompt)
    this.page.on('dialog', (dialog) => {
      this.pendingDialog = dialog;
      this.recordEvent('dialog', {
        type: dialog.type(),
        message: dialog.message(),
        defaultValue: dialog.defaultValue(),
      });
    });

    // File chooser event
    this.page.on('filechooser', (chooser) => {
      this.recordEvent('filechooser', {
        multiple: chooser.isMultiple(),
      });
    });

    // Page error event
    this.page.on('pageerror', (error) => {
      this.recordEvent('pageerror', {
        message: error.message,
        name: error.name,
      });
    });

    // Frame navigated event
    this.page.on('framenavigated', (frame) => {
      if (frame === this.page.mainFrame()) {
        this.recordEvent('framenavigated', {
          url: frame.url(),
        });
      }
    });
  }

  private recordEvent(type: BrowserEvent['type'], data: any): void {
    this.events.push({
      type,
      data,
      timestamp: Date.now(),
    });
    this.log(`Event recorded: ${type}`);
  }

  /**
   * Get event log
   */
  getEventLog(count?: number, eventType?: string): BrowserEvent[] {
    let eventArray = this.events.toArray();
    if (eventType) {
      eventArray = eventArray.filter((e) => e.type === eventType);
    }
    if (count) {
      eventArray = eventArray.slice(-count);
    }
    return eventArray;
  }

  /**
   * Clear event log
   */
  clearEventLog(): void {
    this.events.clear();
    this.log('Event log cleared');
  }

  /**
   * Wait for specific event type
   */
  async waitForEvent(
    eventType: BrowserEvent['type'],
    timeout: number = 30000
  ): Promise<BrowserEvent | null> {
    this.log(`Waiting for event: ${eventType}`);
    const startTime = Date.now();
    const initialSize = this.events.size;

    while (Date.now() - startTime < timeout) {
      // Check for new events since we started waiting
      const allEvents = this.events.toArray();
      const newEvents = allEvents.slice(initialSize);
      const matchingEvent = newEvents.find((e) => e.type === eventType);
      if (matchingEvent) {
        return matchingEvent;
      }
      await this.page.waitForTimeout(100);
    }
    return null;
  }

  /**
   * Dismiss pending dialog
   */
  async dismissDialog(): Promise<boolean> {
    if (this.pendingDialog) {
      await this.pendingDialog.dismiss();
      this.pendingDialog = null;
      return true;
    }
    return false;
  }

  /**
   * Accept pending dialog
   */
  async acceptDialog(promptText?: string): Promise<boolean> {
    if (this.pendingDialog) {
      await this.pendingDialog.accept(promptText);
      this.pendingDialog = null;
      return true;
    }
    return false;
  }

  /**
   * Get buffer statistics
   */
  getBufferStats(): {
    capacity: number;
    current: number;
    overflow: number;
    oldestTimestamp: number | null;
    newestTimestamp: number | null;
  } {
    const oldest = this.events.peek();
    const newest = this.events.peekLast();
    return {
      capacity: this.events.capacity,
      current: this.events.size,
      overflow: this.events.overflowCount,
      oldestTimestamp: oldest ? oldest.timestamp : null,
      newestTimestamp: newest ? newest.timestamp : null,
    };
  }

  /**
   * Set buffer capacity (clamped between EVENT_BUFFER_MIN and EVENT_BUFFER_MAX)
   */
  setBufferCapacity(capacity: number): void {
    const clampedCapacity = Math.max(EVENT_BUFFER_MIN, Math.min(EVENT_BUFFER_MAX, capacity));
    this.events.setCapacity(clampedCapacity);
  }

  // Command Handlers
  private async handleGetEventLog(args: {
    count?: number;
    eventType?: string;
  }): Promise<CommandResponse> {
    const eventArray = this.getEventLog(args.count, args.eventType);
    return { status: 'ok', data: { events: eventArray, total: this.events.size } };
  }

  private async handleClearEventLog(): Promise<CommandResponse> {
    this.clearEventLog();
    return { status: 'ok', data: { cleared: true } };
  }

  private async handleWaitForEvent(args: {
    eventType: BrowserEvent['type'];
    timeout?: number;
  }): Promise<CommandResponse> {
    try {
      const event = await this.waitForEvent(args.eventType, args.timeout);
      if (event) {
        return { status: 'ok', data: { event } };
      }
      return {
        status: 'ok',
        data: { event: null, message: 'Timeout waiting for event' },
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async handleDismissDialog(): Promise<CommandResponse> {
    const dismissed = await this.dismissDialog();
    return { status: 'ok', data: { dismissed } };
  }

  private async handleAcceptDialog(args: {
    promptText?: string;
  }): Promise<CommandResponse> {
    const accepted = await this.acceptDialog(args.promptText);
    return { status: 'ok', data: { accepted } };
  }

  /**
   * Handler for getEventBufferStats command
   */
  private async handleGetEventBufferStats(): Promise<CommandResponse> {
    return {
      status: 'ok',
      data: this.getBufferStats()
    };
  }

  /**
   * Handler for setEventBufferCapacity command
   */
  private async handleSetEventBufferCapacity(args: { capacity: number }): Promise<CommandResponse> {
    const oldCapacity = this.events.capacity;
    this.setBufferCapacity(args.capacity);
    return {
      status: 'ok',
      data: {
        previousCapacity: oldCapacity,
        newCapacity: this.events.capacity,
        currentSize: this.events.size
      }
    };
  }
}
