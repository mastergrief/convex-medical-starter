/**
 * Parsed command representation
 */
export interface ParsedCommand {
  command: string;
  args: Record<string, any>;
  backendCommand?: string;
}
