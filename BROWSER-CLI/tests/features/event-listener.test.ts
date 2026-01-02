/**
 * EventListenerFeature Unit Tests
 * Tests browser event capture and dialog handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { EventListenerFeature, BrowserEvent } from '../../SCRIPTS/features/event-listener';
import { Page, Dialog } from 'playwright';

// Extended mock with event listener specific methods
interface ExtendedMockPage extends MockPage {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
}

function createEventMockPage(): ExtendedMockPage {
  const baseMock = createMockPage();

  return {
    ...baseMock,
    on: vi.fn(),
    off: vi.fn(),
  };
}

// Mock dialog factory
function createMockDialog(
  type: 'alert' | 'confirm' | 'prompt' = 'alert',
  message = 'Test dialog',
  defaultValue = ''
): Dialog {
  return {
    type: () => type,
    message: () => message,
    defaultValue: () => defaultValue,
    accept: vi.fn().mockResolvedValue(undefined),
    dismiss: vi.fn().mockResolvedValue(undefined),
    page: vi.fn().mockReturnValue(null),
  } as unknown as Dialog;
}

describe('EventListenerFeature', () => {
  let mockPage: ExtendedMockPage;
  let feature: EventListenerFeature;

  beforeEach(() => {
    mockPage = createEventMockPage();
    feature = new EventListenerFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with expected handlers', () => {
      const handlers = feature.getCommandHandlers();

      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.has('getEventLog')).toBe(true);
      expect(handlers.has('clearEventLog')).toBe(true);
      expect(handlers.has('waitForEvent')).toBe(true);
      expect(handlers.has('acceptDialog')).toBe(true);
      expect(handlers.has('dismissDialog')).toBe(true);
      expect(handlers.has('getEventBufferStats')).toBe(true);
      expect(handlers.has('setEventBufferCapacity')).toBe(true);
    });

    it('returns exactly 7 handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.size).toBe(7);
    });
  });

  describe('getEventLog', () => {
    it('returns empty array when no events', async () => {
      const handlers = feature.getCommandHandlers();
      const getEventLogHandler = handlers.get('getEventLog');

      const result = await getEventLogHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.events).toEqual([]);
      expect(result.data?.total).toBe(0);
    });

    it('returns all captured events', async () => {
      // Access private method to record events via reflection
      const recordEvent = (feature as any).recordEvent.bind(feature);
      recordEvent('dialog', { type: 'alert', message: 'Hello' });
      recordEvent('popup', { url: 'http://example.com' });
      recordEvent('pageerror', { message: 'Error', name: 'Error' });

      const handlers = feature.getCommandHandlers();
      const getEventLogHandler = handlers.get('getEventLog');

      const result = await getEventLogHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.events.length).toBe(3);
      expect(result.data?.total).toBe(3);
    });

    it('events include type, timestamp, and data', async () => {
      const recordEvent = (feature as any).recordEvent.bind(feature);
      const beforeTimestamp = Date.now();
      recordEvent('dialog', { type: 'confirm', message: 'Are you sure?' });
      const afterTimestamp = Date.now();

      const handlers = feature.getCommandHandlers();
      const getEventLogHandler = handlers.get('getEventLog');

      const result = await getEventLogHandler!({});
      const event = result.data?.events[0] as BrowserEvent;

      expect(event.type).toBe('dialog');
      expect(event.timestamp).toBeGreaterThanOrEqual(beforeTimestamp);
      expect(event.timestamp).toBeLessThanOrEqual(afterTimestamp);
      expect(event.data).toEqual({ type: 'confirm', message: 'Are you sure?' });
    });

    it('filters events by type when eventType provided', async () => {
      const recordEvent = (feature as any).recordEvent.bind(feature);
      recordEvent('dialog', { type: 'alert', message: 'Alert 1' });
      recordEvent('popup', { url: 'http://example.com' });
      recordEvent('dialog', { type: 'alert', message: 'Alert 2' });
      recordEvent('pageerror', { message: 'Error' });

      const handlers = feature.getCommandHandlers();
      const getEventLogHandler = handlers.get('getEventLog');

      const result = await getEventLogHandler!({ eventType: 'dialog' });

      expect(result.status).toBe('ok');
      expect(result.data?.events.length).toBe(2);
      expect(result.data?.events.every((e: BrowserEvent) => e.type === 'dialog')).toBe(true);
    });

    it('limits events when count provided', async () => {
      const recordEvent = (feature as any).recordEvent.bind(feature);
      for (let i = 0; i < 10; i++) {
        recordEvent('dialog', { message: `Dialog ${i}` });
      }

      const handlers = feature.getCommandHandlers();
      const getEventLogHandler = handlers.get('getEventLog');

      const result = await getEventLogHandler!({ count: 3 });

      expect(result.status).toBe('ok');
      expect(result.data?.events.length).toBe(3);
      // Should return last 3 events
      const lastEvent = result.data?.events[2] as BrowserEvent;
      expect(lastEvent.data.message).toBe('Dialog 9');
    });
  });

  describe('clearEventLog', () => {
    it('clears all events', async () => {
      // Record some events first
      const recordEvent = (feature as any).recordEvent.bind(feature);
      recordEvent('dialog', { message: 'Test' });
      recordEvent('popup', { url: 'http://example.com' });

      const handlers = feature.getCommandHandlers();
      const clearHandler = handlers.get('clearEventLog');
      const getHandler = handlers.get('getEventLog');

      // Clear events
      await clearHandler!({});

      // Verify cleared
      const result = await getHandler!({});
      expect(result.data?.events).toEqual([]);
      expect(result.data?.total).toBe(0);
    });

    it('returns success response', async () => {
      const handlers = feature.getCommandHandlers();
      const clearHandler = handlers.get('clearEventLog');

      const result = await clearHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.cleared).toBe(true);
    });
  });

  describe('waitForEvent', () => {
    it('waits for dialog event', async () => {
      // Override waitForTimeout to actually delay, allowing setTimeout to fire
      mockPage.waitForTimeout = vi.fn().mockImplementation(
        (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      );
      feature = new EventListenerFeature(mockPage as unknown as Page);

      const handlers = feature.getCommandHandlers();
      const waitHandler = handlers.get('waitForEvent');

      // Simulate dialog event arriving after a short delay
      setTimeout(() => {
        const recordEvent = (feature as any).recordEvent.bind(feature);
        recordEvent('dialog', { type: 'alert', message: 'Delayed dialog' });
      }, 50);

      const result = await waitHandler!({ eventType: 'dialog', timeout: 1000 });

      expect(result.status).toBe('ok');
      expect(result.data?.event).not.toBeNull();
      expect(result.data?.event?.type).toBe('dialog');
    });

    it('waits for popup event', async () => {
      // Override waitForTimeout to actually delay
      mockPage.waitForTimeout = vi.fn().mockImplementation(
        (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      );
      feature = new EventListenerFeature(mockPage as unknown as Page);

      const handlers = feature.getCommandHandlers();
      const waitHandler = handlers.get('waitForEvent');

      // Simulate popup event
      setTimeout(() => {
        const recordEvent = (feature as any).recordEvent.bind(feature);
        recordEvent('popup', { url: 'http://popup.example.com' });
      }, 50);

      const result = await waitHandler!({ eventType: 'popup', timeout: 1000 });

      expect(result.status).toBe('ok');
      expect(result.data?.event?.type).toBe('popup');
      expect(result.data?.event?.data?.url).toBe('http://popup.example.com');
    });

    it('waits for pageerror event', async () => {
      // Override waitForTimeout to actually delay
      mockPage.waitForTimeout = vi.fn().mockImplementation(
        (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
      );
      feature = new EventListenerFeature(mockPage as unknown as Page);

      const handlers = feature.getCommandHandlers();
      const waitHandler = handlers.get('waitForEvent');

      // Simulate error event
      setTimeout(() => {
        const recordEvent = (feature as any).recordEvent.bind(feature);
        recordEvent('pageerror', { message: 'Uncaught TypeError', name: 'TypeError' });
      }, 50);

      const result = await waitHandler!({ eventType: 'pageerror', timeout: 1000 });

      expect(result.status).toBe('ok');
      expect(result.data?.event?.type).toBe('pageerror');
      expect(result.data?.event?.data?.message).toBe('Uncaught TypeError');
    });

    it('handles timeout when event does not arrive', async () => {
      const handlers = feature.getCommandHandlers();
      const waitHandler = handlers.get('waitForEvent');

      const result = await waitHandler!({ eventType: 'dialog', timeout: 200 });

      expect(result.status).toBe('ok');
      expect(result.data?.event).toBeNull();
      expect(result.data?.message).toBe('Timeout waiting for event');
    });
  });

  describe('acceptDialog', () => {
    it('accepts dialog when one is pending', async () => {
      // Set up pending dialog via reflection
      const mockDialog = createMockDialog('confirm', 'Are you sure?');
      (feature as any).pendingDialog = mockDialog;

      const handlers = feature.getCommandHandlers();
      const acceptHandler = handlers.get('acceptDialog');

      const result = await acceptHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.accepted).toBe(true);
      expect(mockDialog.accept).toHaveBeenCalled();
    });

    it('accepts dialog with optional prompt text', async () => {
      const mockDialog = createMockDialog('prompt', 'Enter name:', 'default');
      (feature as any).pendingDialog = mockDialog;

      const handlers = feature.getCommandHandlers();
      const acceptHandler = handlers.get('acceptDialog');

      const result = await acceptHandler!({ promptText: 'John Doe' });

      expect(result.status).toBe('ok');
      expect(result.data?.accepted).toBe(true);
      expect(mockDialog.accept).toHaveBeenCalledWith('John Doe');
    });

    it('returns false if no dialog pending', async () => {
      const handlers = feature.getCommandHandlers();
      const acceptHandler = handlers.get('acceptDialog');

      const result = await acceptHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.accepted).toBe(false);
    });

    it('clears pending dialog after accepting', async () => {
      const mockDialog = createMockDialog('alert', 'OK');
      (feature as any).pendingDialog = mockDialog;

      const handlers = feature.getCommandHandlers();
      const acceptHandler = handlers.get('acceptDialog');

      await acceptHandler!({});

      expect((feature as any).pendingDialog).toBeNull();
    });
  });

  describe('dismissDialog', () => {
    it('dismisses dialog when one is pending', async () => {
      const mockDialog = createMockDialog('confirm', 'Cancel?');
      (feature as any).pendingDialog = mockDialog;

      const handlers = feature.getCommandHandlers();
      const dismissHandler = handlers.get('dismissDialog');

      const result = await dismissHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.dismissed).toBe(true);
      expect(mockDialog.dismiss).toHaveBeenCalled();
    });

    it('returns false if no dialog pending', async () => {
      const handlers = feature.getCommandHandlers();
      const dismissHandler = handlers.get('dismissDialog');

      const result = await dismissHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.dismissed).toBe(false);
    });

    it('clears pending dialog after dismissing', async () => {
      const mockDialog = createMockDialog('confirm', 'Dismiss me');
      (feature as any).pendingDialog = mockDialog;

      const handlers = feature.getCommandHandlers();
      const dismissHandler = handlers.get('dismissDialog');

      await dismissHandler!({});

      expect((feature as any).pendingDialog).toBeNull();
    });
  });

  describe('getEventBufferStats', () => {
    it('returns buffer statistics', async () => {
      const handlers = feature.getCommandHandlers();
      const statsHandler = handlers.get('getEventBufferStats');

      const result = await statsHandler!({});

      expect(result.status).toBe('ok');
      expect(result.data?.capacity).toBe(100); // EVENT_BUFFER_DEFAULT
      expect(result.data?.current).toBe(0);
      expect(result.data?.overflow).toBe(0);
      expect(result.data?.oldestTimestamp).toBeNull();
      expect(result.data?.newestTimestamp).toBeNull();
    });

    it('shows timestamps when events exist', async () => {
      const recordEvent = (feature as any).recordEvent.bind(feature);
      recordEvent('dialog', { message: 'First' });
      recordEvent('popup', { url: 'http://example.com' });

      const handlers = feature.getCommandHandlers();
      const statsHandler = handlers.get('getEventBufferStats');

      const result = await statsHandler!({});

      expect(result.data?.current).toBe(2);
      expect(result.data?.oldestTimestamp).not.toBeNull();
      expect(result.data?.newestTimestamp).not.toBeNull();
    });
  });

  describe('setEventBufferCapacity', () => {
    it('sets buffer capacity', async () => {
      const handlers = feature.getCommandHandlers();
      const setCapacityHandler = handlers.get('setEventBufferCapacity');

      const result = await setCapacityHandler!({ capacity: 200 });

      expect(result.status).toBe('ok');
      expect(result.data?.previousCapacity).toBe(100);
      expect(result.data?.newCapacity).toBe(200);
    });

    it('clamps capacity to minimum', async () => {
      const handlers = feature.getCommandHandlers();
      const setCapacityHandler = handlers.get('setEventBufferCapacity');

      const result = await setCapacityHandler!({ capacity: 1 });

      expect(result.status).toBe('ok');
      expect(result.data?.newCapacity).toBe(10); // EVENT_BUFFER_MIN
    });

    it('clamps capacity to maximum', async () => {
      const handlers = feature.getCommandHandlers();
      const setCapacityHandler = handlers.get('setEventBufferCapacity');

      const result = await setCapacityHandler!({ capacity: 10000 });

      expect(result.status).toBe('ok');
      expect(result.data?.newCapacity).toBe(1000); // EVENT_BUFFER_MAX
    });
  });

  describe('setup', () => {
    it('registers event listeners on page', async () => {
      await feature.setup();

      // Verify page.on was called for expected events
      expect(mockPage.on).toHaveBeenCalledWith('popup', expect.any(Function));
      expect(mockPage.on).toHaveBeenCalledWith('dialog', expect.any(Function));
      expect(mockPage.on).toHaveBeenCalledWith('filechooser', expect.any(Function));
      expect(mockPage.on).toHaveBeenCalledWith('pageerror', expect.any(Function));
      expect(mockPage.on).toHaveBeenCalledWith('framenavigated', expect.any(Function));
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('EventListener');
    });
  });
});
