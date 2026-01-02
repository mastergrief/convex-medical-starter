/**
 * HAR Export Feature
 *
 * Captures network traffic and exports it in HAR 1.2 format for analysis
 * in Chrome DevTools or other HAR viewers.
 *
 * HAR 1.2 Spec: https://w3c.github.io/web-performance/specs/HAR/Overview.html
 */

import { Page } from 'playwright';
import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';
import { NetworkCaptureFeature, NetworkRequest } from './network-capture';
import * as fs from 'fs';
import * as path from 'path';

/**
 * HAR 1.2 entry structure
 */
interface HAREntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    cookies: any[];
    headers: Array<{ name: string; value: string }>;
    queryString: Array<{ name: string; value: string }>;
    postData?: {
      mimeType: string;
      text: string;
    };
    headersSize: number;
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    cookies: any[];
    headers: Array<{ name: string; value: string }>;
    content: {
      size: number;
      mimeType: string;
      text?: string;
    };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: Record<string, never>;
  timings: {
    blocked: number;
    dns: number;
    connect: number;
    send: number;
    wait: number;
    receive: number;
    ssl: number;
  };
}

/**
 * Complete HAR 1.2 structure
 */
interface HAR {
  log: {
    version: string;
    creator: {
      name: string;
      version: string;
    };
    browser?: {
      name: string;
      version: string;
    };
    pages?: Array<{
      startedDateTime: string;
      id: string;
      title: string;
      pageTimings: {
        onContentLoad: number;
        onLoad: number;
      };
    }>;
    entries: HAREntry[];
  };
}

/**
 * HAR Export Feature for Browser-CLI
 *
 * Provides commands to capture and export network traffic in HAR format.
 */
export class HARExportFeature extends BaseFeature {
  public readonly name = 'HARExport';
  private networkCapture: NetworkCaptureFeature | null = null;
  private harStartTime: number | null = null;
  private isCapturing = false;

  /**
   * Set the NetworkCaptureFeature dependency via setter injection
   */
  setNetworkCaptureFeature(feature: NetworkCaptureFeature): void {
    this.networkCapture = feature;
  }

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['startHAR', this.startHAR.bind(this)],
      ['exportHAR', this.exportHAR.bind(this)],
      ['getHARData', this.getHARData.bind(this)],
    ]);
  }

  /**
   * Start HAR capture - marks the start time for filtering requests
   */
  private async startHAR(): Promise<CommandResponse> {
    if (!this.networkCapture) {
      return {
        status: 'error',
        message: 'NetworkCaptureFeature not available. Ensure network capture is enabled.',
      };
    }

    this.harStartTime = Date.now();
    this.isCapturing = true;
    this.log('HAR capture started');

    return {
      status: 'ok',
      data: {
        startTime: this.harStartTime,
        startTimeISO: new Date(this.harStartTime).toISOString(),
        message: 'HAR capture started. Use exportHAR to save the captured traffic.',
      },
    };
  }

  /**
   * Export captured network data to HAR 1.2 format file
   */
  private async exportHAR(args: { filename?: string }): Promise<CommandResponse> {
    if (!this.networkCapture) {
      return {
        status: 'error',
        message: 'NetworkCaptureFeature not available. Ensure network capture is enabled.',
      };
    }

    const requests = this.networkCapture.getAllRequests();
    const filteredRequests = this.harStartTime
      ? requests.filter((r) => r.timestamp >= this.harStartTime!)
      : requests;

    if (filteredRequests.length === 0) {
      return {
        status: 'error',
        message: 'No network requests captured. Navigate to pages or use startHAR first.',
      };
    }

    const har = this.buildHAR(filteredRequests);
    const filename = args.filename || `har-export-${Date.now()}.har`;
    const outputDir = path.join(process.cwd(), 'BROWSER-CLI', 'har-exports');

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(har, null, 2), 'utf-8');

    this.log(`HAR exported to ${filepath}`);

    // Reset capture state after export
    this.isCapturing = false;
    this.harStartTime = null;

    return {
      status: 'ok',
      data: {
        filepath,
        entryCount: filteredRequests.length,
        fileSize: fs.statSync(filepath).size,
        message: `Exported ${filteredRequests.length} requests to ${filename}`,
      },
    };
  }

  /**
   * Get current HAR data as JSON without writing to file
   */
  private async getHARData(): Promise<CommandResponse> {
    if (!this.networkCapture) {
      return {
        status: 'error',
        message: 'NetworkCaptureFeature not available. Ensure network capture is enabled.',
      };
    }

    const requests = this.networkCapture.getAllRequests();
    const filteredRequests = this.harStartTime
      ? requests.filter((r) => r.timestamp >= this.harStartTime!)
      : requests;

    const har = this.buildHAR(filteredRequests);

    return {
      status: 'ok',
      data: {
        har,
        entryCount: filteredRequests.length,
        isCapturing: this.isCapturing,
        captureStartTime: this.harStartTime
          ? new Date(this.harStartTime).toISOString()
          : null,
      },
    };
  }

  /**
   * Build HAR 1.2 compliant structure from captured network requests
   */
  private buildHAR(requests: NetworkRequest[]): HAR {
    const entries: HAREntry[] = requests.map((req) => this.convertToHAREntry(req));

    return {
      log: {
        version: '1.2',
        creator: {
          name: 'Browser-CLI',
          version: '1.0.0',
        },
        browser: {
          name: 'Chromium (Playwright)',
          version: '1.x',
        },
        entries,
      },
    };
  }

  /**
   * Convert a NetworkRequest to HAR 1.2 entry format
   */
  private convertToHAREntry(req: NetworkRequest): HAREntry {
    const startedDateTime = new Date(req.timestamp).toISOString();
    const duration = req.timing?.duration ?? 0;

    // Parse URL for query string
    const url = new URL(req.url);
    const queryString: Array<{ name: string; value: string }> = [];
    url.searchParams.forEach((value, name) => {
      queryString.push({ name, value });
    });

    // Convert headers object to HAR format
    const requestHeaders = Object.entries(req.headers || {}).map(([name, value]) => ({
      name,
      value: String(value),
    }));

    const responseHeaders = Object.entries(req.responseHeaders || {}).map(([name, value]) => ({
      name,
      value: String(value),
    }));

    // Calculate header sizes (approximate)
    const requestHeadersSize = requestHeaders.reduce(
      (acc, h) => acc + h.name.length + h.value.length + 4,
      0
    );
    const responseHeadersSize = responseHeaders.reduce(
      (acc, h) => acc + h.name.length + h.value.length + 4,
      0
    );

    const entry: HAREntry = {
      startedDateTime,
      time: duration,
      request: {
        method: req.method,
        url: req.url,
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: requestHeaders,
        queryString,
        headersSize: requestHeadersSize,
        bodySize: req.postData ? req.postData.length : 0,
      },
      response: {
        status: req.status ?? 0,
        statusText: req.statusText ?? '',
        httpVersion: 'HTTP/1.1',
        cookies: [],
        headers: responseHeaders,
        content: {
          size: 0, // Content size not captured by NetworkCaptureFeature
          mimeType: this.getMimeType(responseHeaders),
        },
        redirectURL: '',
        headersSize: responseHeadersSize,
        bodySize: -1, // Unknown
      },
      cache: {},
      timings: {
        blocked: -1,
        dns: -1,
        connect: -1,
        send: 0,
        wait: duration,
        receive: 0,
        ssl: -1,
      },
    };

    // Add post data if present
    if (req.postData) {
      entry.request.postData = {
        mimeType: this.getRequestMimeType(requestHeaders),
        text: req.postData,
      };
    }

    return entry;
  }

  /**
   * Extract MIME type from response headers
   */
  private getMimeType(headers: Array<{ name: string; value: string }>): string {
    const contentType = headers.find(
      (h) => h.name.toLowerCase() === 'content-type'
    );
    if (contentType) {
      // Extract just the MIME type, removing charset etc.
      return contentType.value.split(';')[0].trim();
    }
    return 'application/octet-stream';
  }

  /**
   * Extract request MIME type from headers
   */
  private getRequestMimeType(headers: Array<{ name: string; value: string }>): string {
    const contentType = headers.find(
      (h) => h.name.toLowerCase() === 'content-type'
    );
    if (contentType) {
      return contentType.value.split(';')[0].trim();
    }
    return 'application/x-www-form-urlencoded';
  }
}
