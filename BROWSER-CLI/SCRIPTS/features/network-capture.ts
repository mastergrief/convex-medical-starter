/**
 * Phase 1 Enhancement: Network Request Capture
 * Captures and manages network requests/responses for debugging and analysis
 */

import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';

import { CircularBuffer } from '../utils/circular-buffer';
import { NETWORK_BUFFER_DEFAULT, NETWORK_BUFFER_MIN, NETWORK_BUFFER_MAX } from '../core/constants';
import type { Page } from 'playwright';

export interface NetworkRequest {
  method: string;
  url: string;
  timestamp: number;
  status?: number;
  statusText?: string;
  headers: Record<string, string>;
  postData?: string;
  responseHeaders?: Record<string, string>;
  timing?: {
    startTime: number;
    endTime?: number;
    duration?: number;
  };
  /** Internal ID for pending request tracking - O(1) response matching */
  _id?: number;
}

/**
 * Network capture feature for tracking HTTP requests and responses.
 *
 * Automatically captures all network requests made by the page.
 * Maintains a rolling buffer of the last 1000 requests to prevent memory bloat.
 */
export class NetworkCaptureFeature extends BaseFeature {
  public readonly name = 'NetworkCapture';
  private requests: CircularBuffer<NetworkRequest>;
  /** Map for O(1) pending request lookup during response matching */
  private pendingRequests: Map<string, NetworkRequest> = new Map();
  /** Counter for unique request IDs */
  private requestCounter = 0;
  /** Cleanup interval handle */
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(page: Page) {
    super(page);
    this.requests = new CircularBuffer<NetworkRequest>(NETWORK_BUFFER_DEFAULT);
  }

  /**
   * Generate a unique key for pending request tracking
   */
  private generateRequestKey(url: string, method: string, id: number): string {
    return `${method}:${url}:${id}`;
  }

  /**
   * Cleanup stale pending requests (older than 60 seconds)
   */
  private cleanupPendingRequests(): void {
    const now = Date.now();
    const TIMEOUT = 60000; // 60 seconds
    for (const [key, req] of this.pendingRequests) {
      if (now - req.timestamp > TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Setup network listeners when feature initializes
   */
  async setup(): Promise<void> {
    // Start periodic cleanup of stale pending requests (every 30 seconds)
    this.cleanupInterval = setInterval(() => this.cleanupPendingRequests(), 30000);

    // Capture request initiation
    this.page.on('request', (request) => {
      const requestData: NetworkRequest = {
        method: request.method(),
        url: request.url(),
        timestamp: Date.now(),
        headers: request.headers(),
        postData: request.postData() || undefined,
        timing: {
          startTime: Date.now()
        },
        _id: ++this.requestCounter
      };

      this.requests.push(requestData);

      // Add to pending map for O(1) response matching
      const key = this.generateRequestKey(request.url(), request.method(), requestData._id!);
      this.pendingRequests.set(key, requestData);
      // CircularBuffer handles overflow automatically
    });

    // Capture response completion
    this.page.on('response', (response) => {
      // O(1) lookup by iterating pending requests (typically small set)
      let matchedKey: string | undefined;
      let matchedReq: NetworkRequest | undefined;

      for (const [key, req] of this.pendingRequests) {
        if (req.url === response.url() && req.method === response.request().method() && !req.status) {
          matchedKey = key;
          matchedReq = req;
          break;
        }
      }

      if (matchedReq && matchedKey) {
        matchedReq.status = response.status();
        matchedReq.statusText = response.statusText();
        matchedReq.responseHeaders = response.headers();

        if (matchedReq.timing) {
          matchedReq.timing.endTime = Date.now();
          matchedReq.timing.duration = matchedReq.timing.endTime - matchedReq.timing.startTime;
        }

        // Remove from pending map after matching
        this.pendingRequests.delete(matchedKey);
      }
    });
  }

  /**
   * Cleanup resources when feature is destroyed
   */
  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.pendingRequests.clear();
  }

  /**
   * Get command handlers for network operations
   */
  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['network', this.getNetwork.bind(this)],
      ['networkClear', this.clearNetwork.bind(this)],
      ['getNetworkBufferStats', this.handleGetNetworkBufferStats.bind(this)],
      ['setNetworkBufferCapacity', this.handleSetNetworkBufferCapacity.bind(this)],
    ]);
  }

  /**
   * Get network requests with optional filtering
   */
  async getNetwork(args: {
    filter?: string;
    method?: string;
    status?: number;
    limit?: number;
  }): Promise<CommandResponse> {
    let filtered = this.requests.toArray();

    // Filter by URL pattern
    if (args.filter) {
      filtered = filtered.filter(r => r.url.includes(args.filter!));
    }

    // Filter by HTTP method
    if (args.method) {
      filtered = filtered.filter(r => r.method === args.method!.toUpperCase());
    }

    // Filter by status code
    if (args.status) {
      filtered = filtered.filter(r => r.status === args.status);
    }

    // Limit results (take last N)
    if (args.limit) {
      filtered = filtered.slice(-args.limit);
    }

    return {
      status: 'ok',
      data: {
        requests: filtered,
        total: this.requests.size,
        filtered: filtered.length
      }
    };
  }

  /**
   * Clear all network requests
   */
  async clearNetwork(): Promise<CommandResponse> {
    const count = this.requests.size;
    this.requests.clear();
    this.pendingRequests.clear();
    this.log('Network requests cleared');

    return {
      status: 'ok',
      data: { cleared: count }
    };
  }

  /**
   * Get all network requests (internal helper)
   */
  getAllRequests(): NetworkRequest[] {
    return this.requests.toArray();
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
    const oldest = this.requests.peek();
    const newest = this.requests.peekLast();
    return {
      capacity: this.requests.capacity,
      current: this.requests.size,
      overflow: this.requests.overflowCount,
      oldestTimestamp: oldest ? oldest.timestamp : null,
      newestTimestamp: newest ? newest.timestamp : null,
    };
  }

  /**
   * Set buffer capacity (clamped between MIN and MAX)
   */
  setBufferCapacity(capacity: number): void {
    const clamped = Math.max(NETWORK_BUFFER_MIN, Math.min(NETWORK_BUFFER_MAX, capacity));
    this.requests.setCapacity(clamped);
  }

  /**
   * Handler for getNetworkBufferStats command
   */
  private async handleGetNetworkBufferStats(): Promise<CommandResponse> {
    return {
      status: 'ok',
      data: this.getBufferStats()
    };
  }

  /**
   * Handler for setNetworkBufferCapacity command
   */
  private async handleSetNetworkBufferCapacity(args: { capacity: number }): Promise<CommandResponse> {
    const oldCapacity = this.requests.capacity;
    this.setBufferCapacity(args.capacity);
    return {
      status: 'ok',
      data: {
        previousCapacity: oldCapacity,
        newCapacity: this.requests.capacity,
        currentSize: this.requests.size
      }
    };
  }
}
