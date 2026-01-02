/**
 * Response Enricher Module
 *
 * Enriches command responses with additional context like console messages.
 */

import { BrowserFeature, CommandResponse } from '../core/types';
import { ConsoleCaptureFeature } from '../features/console-capture';

/**
 * Commands that should have console messages appended to their response
 */
const CONSOLE_ENRICHED_COMMANDS = new Set([
  'click',
  'dblclick',
  'type',
  'evaluate',
  'navigate',
]);

/**
 * Enriches command responses with additional context
 */
export class ResponseEnricher {
  /**
   * Enrich a command response with console messages if applicable
   */
  enrich(
    cmd: string,
    result: CommandResponse,
    features: Map<string, BrowserFeature>
  ): CommandResponse {
    if (!result.data) {
      return result;
    }

    if (CONSOLE_ENRICHED_COMMANDS.has(cmd)) {
      const consoleFeature = features.get('ConsoleCapture') as ConsoleCaptureFeature | undefined;
      if (consoleFeature && !result.data.console) {
        result.data.console = consoleFeature.getRecentConsole(5);
      }
    }

    return result;
  }
}
