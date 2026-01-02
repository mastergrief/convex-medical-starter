/**
 * Command Discovery Module
 * Provides command listing and categorization for --list functionality
 */

export interface CommandMetadata {
  name: string;
  category: CommandCategory;
  aliases?: string[];
  description: string;
}

export type CommandCategory =
  | 'navigation'
  | 'interaction'
  | 'snapshot'
  | 'state'
  | 'network'
  | 'content'
  | 'events'
  | 'dom'
  | 'utility';

export const VALID_CATEGORIES: CommandCategory[] = [
  'navigation',
  'interaction',
  'snapshot',
  'state',
  'network',
  'content',
  'events',
  'dom',
  'utility',
];

// Build complete command metadata from existing commands
// Reference BROWSER-CLI/SCRIPTS/cli/command-validator.ts for full command list
export const COMMAND_METADATA: CommandMetadata[] = [
  // Navigation
  { name: 'start', category: 'navigation', description: 'Start browser and navigate to URL' },
  { name: 'navigate', category: 'navigation', description: 'Navigate to URL' },
  { name: 'wait', category: 'navigation', description: 'Wait milliseconds' },
  { name: 'waitForSelector', category: 'navigation', description: 'Wait for element' },
  { name: 'resize', category: 'navigation', description: 'Resize viewport' },

  // Interaction
  {
    name: 'click',
    category: 'interaction',
    aliases: ['clickByRef', 'clickBySemantic'],
    description: 'Click element',
  },
  {
    name: 'dblclick',
    category: 'interaction',
    aliases: ['dblclickByRef', 'dblclickBySemantic'],
    description: 'Double-click element',
  },
  {
    name: 'type',
    category: 'interaction',
    aliases: ['typeByRef', 'typeBySemantic'],
    description: 'Type into input',
  },
  { name: 'pressKey', category: 'interaction', description: 'Press keyboard key' },
  { name: 'pressKeyCombo', category: 'interaction', description: 'Press key combination' },
  { name: 'holdKey', category: 'interaction', description: 'Hold key for duration' },
  { name: 'tapKey', category: 'interaction', description: 'Tap key repeatedly' },
  {
    name: 'hover',
    category: 'interaction',
    aliases: ['hoverByRef', 'hoverBySemantic'],
    description: 'Hover over element',
  },
  {
    name: 'drag',
    category: 'interaction',
    aliases: ['dragByRef'],
    description: 'Drag element to target',
  },
  { name: 'selectOption', category: 'interaction', description: 'Select dropdown option' },
  { name: 'fillForm', category: 'interaction', description: 'Fill form fields' },
  { name: 'uploadFile', category: 'interaction', description: 'Upload file to input' },

  // Snapshot
  { name: 'snapshot', category: 'snapshot', description: 'Capture accessibility snapshot' },
  { name: 'screenshot', category: 'snapshot', description: 'Take screenshot' },
  { name: 'changes', category: 'snapshot', description: 'Get changed element refs' },
  { name: 'saveSnapshotBaseline', category: 'snapshot', description: 'Save snapshot baseline' },
  { name: 'compareSnapshots', category: 'snapshot', description: 'Compare against baseline' },
  { name: 'listBaselines', category: 'snapshot', description: 'List snapshot baselines' },
  {
    name: 'saveScreenshotBaseline',
    category: 'snapshot',
    description: 'Save screenshot baseline',
  },
  { name: 'compareScreenshots', category: 'snapshot', description: 'Compare screenshots' },
  {
    name: 'listScreenshotBaselines',
    category: 'snapshot',
    description: 'List screenshot baselines',
  },
  { name: 'evaluate', category: 'snapshot', description: 'Evaluate JavaScript' },

  // State
  { name: 'saveState', category: 'state', description: 'Save browser state' },
  { name: 'restoreState', category: 'state', description: 'Restore browser state' },
  { name: 'listStates', category: 'state', description: 'List saved states' },
  { name: 'deleteState', category: 'state', description: 'Delete saved state' },
  { name: 'tabs', category: 'state', description: 'Manage browser tabs' },
  { name: 'exec', category: 'state', description: 'Execute chained commands' },

  // Network
  { name: 'network', category: 'network', description: 'Show network requests' },
  { name: 'networkClear', category: 'network', description: 'Clear network buffer' },
  {
    name: 'setupNetworkMocking',
    category: 'network',
    description: 'Enable request interception',
  },
  { name: 'mockRoute', category: 'network', description: 'Mock API response' },
  { name: 'clearMocks', category: 'network', description: 'Clear all mocks' },
  { name: 'listMocks', category: 'network', description: 'List active mocks' },
  { name: 'disableMock', category: 'network', description: 'Disable a mock' },
  { name: 'enableMock', category: 'network', description: 'Re-enable a mock' },
  { name: 'getMockHistory', category: 'network', description: 'Get mock operation history' },
  { name: 'abortRoute', category: 'network', description: 'Block requests by pattern' },
  { name: 'listAborts', category: 'network', description: 'List blocked patterns' },
  { name: 'blockByPattern', category: 'network', description: 'Block URLs by pattern' },
  {
    name: 'modifyRequestHeaders',
    category: 'network',
    description: 'Modify request headers',
  },
  {
    name: 'modifyResponseHeaders',
    category: 'network',
    description: 'Modify response headers',
  },
  { name: 'listSchemas', category: 'network', description: 'List available schemas' },
  { name: 'validateMock', category: 'network', description: 'Validate mock against schema' },
  { name: 'loadSchema', category: 'network', description: 'Load custom schema' },
  { name: 'capturePerformanceMetrics', category: 'network', description: 'Capture Web Vitals' },
  { name: 'getPerformanceMetrics', category: 'network', description: 'Get performance metrics' },

  // Content
  { name: 'getPageHTML', category: 'content', description: 'Get page HTML' },
  { name: 'getPageText', category: 'content', description: 'Get page text' },
  { name: 'getElementHTML', category: 'content', description: 'Get element HTML' },
  { name: 'getElementText', category: 'content', description: 'Get element text' },

  // Events
  { name: 'getEventLog', category: 'events', description: 'Get captured events' },
  { name: 'clearEventLog', category: 'events', description: 'Clear event buffer' },
  { name: 'waitForEvent', category: 'events', description: 'Wait for browser event' },
  { name: 'dismissDialog', category: 'events', description: 'Dismiss dialog' },
  { name: 'acceptDialog', category: 'events', description: 'Accept dialog' },

  // DOM Inspection
  { name: 'getComputedStyle', category: 'dom', description: 'Get element CSS styles' },
  { name: 'getElementVisibility', category: 'dom', description: 'Check element visibility' },
  { name: 'getOverlayingElements', category: 'dom', description: 'Find overlaying elements' },
  { name: 'countElements', category: 'dom', description: 'Count matching elements' },

  // Utility
  { name: 'status', category: 'utility', description: 'Show manager status' },
  { name: 'console', category: 'utility', description: 'Show console messages' },
  { name: 'clearConsole', category: 'utility', description: 'Clear console buffer' },
  { name: 'close', category: 'utility', description: 'Close browser' },
  {
    name: 'getConsoleBufferStats',
    category: 'utility',
    description: 'Get console buffer stats',
  },
  {
    name: 'setConsoleBufferCapacity',
    category: 'utility',
    description: 'Set console buffer size',
  },
  {
    name: 'getNetworkBufferStats',
    category: 'utility',
    description: 'Get network buffer stats',
  },
  {
    name: 'setNetworkBufferCapacity',
    category: 'utility',
    description: 'Set network buffer size',
  },
  { name: 'getEventBufferStats', category: 'utility', description: 'Get event buffer stats' },
  { name: 'setEventBufferCapacity', category: 'utility', description: 'Set event buffer size' },
];

export function isValidCategory(category: string): category is CommandCategory {
  return VALID_CATEGORIES.includes(category as CommandCategory);
}

export function getAvailableCategories(): CommandCategory[] {
  return VALID_CATEGORIES;
}

export function listAllCommands(): string {
  const grouped = new Map<CommandCategory, CommandMetadata[]>();

  for (const cmd of COMMAND_METADATA) {
    const list = grouped.get(cmd.category) || [];
    list.push(cmd);
    grouped.set(cmd.category, list);
  }

  let output = `BROWSER-CLI Commands (${COMMAND_METADATA.length} total)\n\n`;

  for (const category of VALID_CATEGORIES) {
    const commands = grouped.get(category) || [];
    if (commands.length === 0) continue;

    const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
    output += `${categoryTitle} (${commands.length} commands):\n`;

    for (const cmd of commands) {
      const aliasInfo = cmd.aliases ? ` (aliases: ${cmd.aliases.join(', ')})` : '';
      output += `  ${cmd.name.padEnd(28)} ${cmd.description}${aliasInfo}\n`;
    }
    output += '\n';
  }

  output += `Use 'browser-cmd --list <category>' to filter by category.\n`;
  output += `Use 'browser-cmd <command> --help' for command details.`;

  return output;
}

export function listCommandsByCategory(category: CommandCategory): string {
  const commands = COMMAND_METADATA.filter((cmd) => cmd.category === category);

  if (commands.length === 0) {
    return `No commands found in category: ${category}`;
  }

  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);
  let output = `${categoryTitle} Commands (${commands.length}):\n\n`;

  for (const cmd of commands) {
    const aliasInfo = cmd.aliases ? `\n    Aliases: ${cmd.aliases.join(', ')}` : '';
    output += `  ${cmd.name.padEnd(28)} ${cmd.description}${aliasInfo}\n`;
  }

  output += `\nUse 'browser-cmd <command> --help' for command details.`;

  return output;
}
