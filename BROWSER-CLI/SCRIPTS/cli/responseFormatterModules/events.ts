/**
 * Event handling formatting functions
 * Commands: getEventLog, clearEventLog, waitForEvent, dismissDialog, acceptDialog
 */

import type { CommandResponse } from './types';

/**
 * Browser event structure from event-listener feature
 */
interface BrowserEvent {
  type: 'popup' | 'dialog' | 'filechooser' | 'pageerror' | 'framenavigated';
  data: any;
  timestamp: number;
}

/**
 * Format get event log response
 */
export function formatGetEventLog(response: CommandResponse): string {
  const events: BrowserEvent[] = response.data?.events || [];
  const total = response.data?.total || 0;

  if (events.length === 0) {
    return '\n\nNo events recorded';
  }

  let output = `\n\nEvent Log (${events.length}${total > events.length ? ` of ${total}` : ''} events):`;
  events.forEach((event: BrowserEvent) => {
    const timestamp = new Date(event.timestamp).toISOString().split('T')[1].split('.')[0];
    const details = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
    output += `\n  [${timestamp}] [${event.type.toUpperCase()}] ${details}`;
  });

  return output;
}

/**
 * Format clear event log response
 */
export function formatClearEventLog(_response: CommandResponse): string {
  return '\n\nEvent log cleared';
}

/**
 * Format wait for event response
 */
export function formatWaitForEvent(response: CommandResponse): string {
  const event: BrowserEvent | null = response.data?.event;

  if (!event) {
    const message = response.data?.message || 'Timeout waiting for event';
    return `\n\nNo event received: ${message}`;
  }

  const timestamp = new Date(event.timestamp).toISOString().split('T')[1].split('.')[0];
  const details = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
  return `\n\nEvent received:\n  [${timestamp}] [${event.type.toUpperCase()}] ${details}`;
}

/**
 * Format dismiss dialog response
 */
export function formatDismissDialog(response: CommandResponse): string {
  const dismissed = response.data?.dismissed;
  if (dismissed) {
    return '\n\nDialog dismissed';
  }
  return '\n\nNo pending dialog to dismiss';
}

/**
 * Format accept dialog response
 */
export function formatAcceptDialog(response: CommandResponse): string {
  const accepted = response.data?.accepted;
  if (accepted) {
    return '\n\nDialog accepted';
  }
  return '\n\nNo pending dialog to accept';
}
