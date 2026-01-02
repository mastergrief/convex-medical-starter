/**
 * Shell completion script generator for Browser-CLI
 *
 * Generates autocomplete scripts for bash, zsh, and fish shells.
 * Usage: npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts --completion <shell>
 */

// Complete list of all valid commands (matches VALID_COMMANDS in command-validator.ts)
const COMMANDS = [
  // Navigation
  'start',
  'navigate',

  // Interaction
  'click',
  'clickByRef',
  'clickBySemantic',
  'dblclick',
  'dblclickByRef',
  'dblclickBySemantic',
  'type',
  'typeByRef',
  'typeBySemantic',
  'pressKey',
  'pressKeyCombo',
  'holdKey',
  'tapKey',
  'hover',
  'hoverByRef',
  'hoverBySemantic',
  'drag',
  'dragByRef',
  'dragByCSS',
  'selectOption',
  'fillForm',
  'uploadFile',

  // Waiting
  'wait',
  'waitForSelector',
  'waitForSelectorByRef',
  'waitForSelectorBySemantic',

  // Capture
  'snapshot',
  'changes',
  'screenshot',
  'clearConsole',
  'listBaselines',

  // Tabs
  'tabs',
  'newTab',
  'switchTab',
  'closeTab',

  // Utility
  'resize',
  'evaluate',
  'console',
  'network',
  'networkClear',
  'status',
  'close',

  // Phase 2
  'exec',
  'saveState',
  'restoreState',
  'listStates',
  'deleteState',
  'saveBrowserState',
  'restoreBrowserState',
  'listBrowserStates',
  'deleteBrowserState',
  'saveSnapshotBaseline',
  'compareSnapshots',

  // Phase 3
  'saveScreenshotBaseline',
  'compareScreenshots',
  'listScreenshotBaselines',
  'setupNetworkMocking',
  'mockRoute',
  'clearMocks',
  'listMocks',
  'listSchemas',
  'validateMock',
  'loadSchema',
  'capturePerformanceMetrics',
  'getPerformanceMetrics',
  'abortRoute',
  'modifyRequestHeaders',
  'modifyResponseHeaders',
  'blockByPattern',
  'listAborts',
  'getMockHistory',
  'disableMock',
  'enableMock',

  // Content
  'getPageHTML',
  'getPageText',
  'getElementHTML',
  'getElementText',

  // Events (Phase 4)
  'getEventLog',
  'clearEventLog',
  'waitForEvent',
  'dismissDialog',
  'acceptDialog',

  // DOM Inspection (Phase 4)
  'getComputedStyle',
  'getElementVisibility',
  'getOverlayingElements',
  'countElements',

  // Buffer Management (Phase 2.4)
  'getConsoleBufferStats',
  'setConsoleBufferCapacity',
  'getNetworkBufferStats',
  'setNetworkBufferCapacity',
  'getEventBufferStats',
  'setEventBufferCapacity',

  // Assertions (Phase 1d)
  'assert',
  'assertCount',
  'assertConsole',
  'assertNetwork',
  'assertPerformance',
  'getAssertionResults',
  'clearAssertionResults',

  // Runtime Configuration (Phase 2)
  'setHeadless',

  // Device Emulation (Phase 3.5)
  'setMobilePreset',
  'listMobilePresets',
  'resetMobilePreset',

  // Video Recording (Phase 3.2)
  'startRecording',
  'stopRecording',
  'getRecordingStatus',
  'listRecordings',

  // HAR Export (Phase 3.3)
  'startHAR',
  'exportHAR',
  'getHARData',

  // Accessibility Audit (Phase 3.4)
  'auditAccessibility',
  'getAccessibilityResults',

  // Plugin Management (Phase 3.1)
  'loadPlugin',
  'unloadPlugin',
  'listPlugins',

  // Flaky Test Detection (Phase 3.7)
  'runTestMultipleTimes',
  'analyzeFlakiness',

  // Test Orchestration (Phase 3.6)
  'orchestrate',
  'getOrchestrationStatus',
  'abortOrchestration',

  // Help
  'help',
];

// List of global flags
const FLAGS = [
  '--quiet',
  '-q',
  '--json',
  '--raw',
  '--fail-fast',
  '--trace',
  '--help',
  '-h',
  '--list',
  '--interactive',
  '-i',
  '--completion',
  '--reporter',
  '--junit-output',
];

// Flag descriptions for completion
const FLAG_DESCRIPTIONS: Record<string, string> = {
  '--quiet': 'Suppress emojis and headers',
  '-q': 'Suppress emojis and headers',
  '--json': 'Force JSON output',
  '--raw': 'No formatting',
  '--fail-fast': 'Stop on first failure',
  '--trace': 'Enable execution tracing',
  '--help': 'Show help',
  '-h': 'Show help',
  '--list': 'List commands',
  '--interactive': 'Start REPL mode',
  '-i': 'Start REPL mode',
  '--completion': 'Generate shell completion script',
  '--reporter': 'Set reporter type',
  '--junit-output': 'JUnit output file path',
};

export class CompletionGenerator {
  /**
   * Generate Bash completion script
   */
  generateBash(): string {
    const commandList = COMMANDS.join(' ');
    const flagList = FLAGS.filter((f) => !f.includes('=')).join(' ');

    return `# Browser-CLI Bash completion
# Installation: npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts --completion bash >> ~/.bashrc
# Then: source ~/.bashrc

_browser_cmd_completions() {
    local cur="\${COMP_WORDS[COMP_CWORD]}"
    local prev="\${COMP_WORDS[COMP_CWORD-1]}"

    local commands="${commandList}"
    local flags="${flagList}"

    # Flag completion
    if [[ "\${cur}" == -* ]]; then
        COMPREPLY=( $(compgen -W "\${flags}" -- "\${cur}") )
        return 0
    fi

    # Command completion (first word after browser-cmd.ts)
    if [[ \${COMP_CWORD} -eq 1 ]]; then
        COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
        return 0
    fi

    # Context-specific completion
    case "\${prev}" in
        navigate|start)
            COMPREPLY=( $(compgen -W "http:// https:// localhost" -- "\${cur}") )
            ;;
        --log-format)
            COMPREPLY=( $(compgen -W "text json silent" -- "\${cur}") )
            ;;
        --completion)
            COMPREPLY=( $(compgen -W "bash zsh fish" -- "\${cur}") )
            ;;
        --reporter)
            COMPREPLY=( $(compgen -W "junit" -- "\${cur}") )
            ;;
        restoreState|deleteState|restoreBrowserState|deleteBrowserState)
            # State names would require runtime lookup
            ;;
        setHeadless)
            COMPREPLY=( $(compgen -W "true false" -- "\${cur}") )
            ;;
        screenshot|saveScreenshotBaseline)
            # File path completion
            COMPREPLY=( $(compgen -f -- "\${cur}") )
            ;;
        help)
            COMPREPLY=( $(compgen -W "\${commands} selectors assertions" -- "\${cur}") )
            ;;
        *)
            COMPREPLY=( $(compgen -W "\${commands}" -- "\${cur}") )
            ;;
    esac
}

complete -F _browser_cmd_completions browser-cmd
complete -F _browser_cmd_completions "npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts"
`;
  }

  /**
   * Generate Zsh completion script
   */
  generateZsh(): string {
    const commandDescriptions = COMMANDS.map((c) => `'${c}:${c} command'`).join('\n        ');
    const flagDescriptions = FLAGS.filter((f) => !f.includes('='))
      .map((f) => {
        const desc = FLAG_DESCRIPTIONS[f] || `${f.replace(/^-+/, '')} flag`;
        return `'${f}[${desc}]'`;
      })
      .join('\n        ');

    return `#compdef browser-cmd
# Browser-CLI Zsh completion
# Installation: npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts --completion zsh >> ~/.zshrc
# Then: source ~/.zshrc

_browser_cmd() {
    local -a commands flags

    commands=(
        ${commandDescriptions}
    )

    flags=(
        ${flagDescriptions}
        '--log-format[Set log format]:format:(text json silent)'
        '--completion[Generate shell completion]:shell:(bash zsh fish)'
        '--reporter[Set reporter type]:reporter:(junit)'
        '--junit-output[JUnit output file]:file:_files'
    )

    _arguments -s \\
        '1:command:->command' \\
        '*:argument:->args' \\
        \${flags[@]}

    case \$state in
        command)
            _describe 'command' commands
            ;;
        args)
            case \$words[2] in
                navigate|start)
                    _urls
                    ;;
                setHeadless)
                    _values 'boolean' true false
                    ;;
                screenshot|saveScreenshotBaseline)
                    _files
                    ;;
                help)
                    _values 'topic' \${commands[@]%%:*} selectors assertions
                    ;;
                restoreState|deleteState|restoreBrowserState|deleteBrowserState)
                    # Would need runtime state lookup
                    ;;
                *)
                    _files
                    ;;
            esac
            ;;
    esac
}

compdef _browser_cmd browser-cmd
`;
  }

  /**
   * Generate Fish completion script
   */
  generateFish(): string {
    const commandCompletions = COMMANDS.map(
      (c) => `complete -c browser-cmd -n "__fish_use_subcommand" -a "${c}" -d "${c} command"`
    ).join('\n');

    return `# Browser-CLI Fish completion
# Installation: npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts --completion fish > ~/.config/fish/completions/browser-cmd.fish

# Disable file completion by default for commands
complete -c browser-cmd -f

# Commands
${commandCompletions}

# Global flags
complete -c browser-cmd -s q -l quiet -d "Suppress emojis and headers"
complete -c browser-cmd -l json -d "Force JSON output"
complete -c browser-cmd -l raw -d "No formatting"
complete -c browser-cmd -l fail-fast -d "Stop on first failure"
complete -c browser-cmd -l trace -d "Enable execution tracing"
complete -c browser-cmd -s h -l help -d "Show help"
complete -c browser-cmd -s i -l interactive -d "Start REPL mode"
complete -c browser-cmd -l list -d "List commands"

# --log-format values
complete -c browser-cmd -l log-format -xa "text json silent" -d "Log output format"

# --completion values
complete -c browser-cmd -l completion -xa "bash zsh fish" -d "Generate completion script"

# --reporter values
complete -c browser-cmd -l reporter -xa "junit" -d "Set reporter type"

# --junit-output (file completion)
complete -c browser-cmd -l junit-output -rF -d "JUnit output file path"

# setHeadless values
complete -c browser-cmd -n "__fish_seen_subcommand_from setHeadless" -xa "true false"

# help topics
complete -c browser-cmd -n "__fish_seen_subcommand_from help" -xa "${COMMANDS.join(' ')} selectors assertions"

# screenshot/baseline commands need file completion
complete -c browser-cmd -n "__fish_seen_subcommand_from screenshot saveScreenshotBaseline" -rF
`;
  }

  /**
   * Get completion script for specified shell
   */
  getCompletion(shell: string): string {
    switch (shell.toLowerCase()) {
      case 'bash':
        return this.generateBash();
      case 'zsh':
        return this.generateZsh();
      case 'fish':
        return this.generateFish();
      default:
        throw new Error(`Unsupported shell: ${shell}. Use bash, zsh, or fish.`);
    }
  }
}

/**
 * Generate and return completion script
 */
export function generateCompletion(shell: string): string {
  const generator = new CompletionGenerator();
  return generator.getCompletion(shell);
}
