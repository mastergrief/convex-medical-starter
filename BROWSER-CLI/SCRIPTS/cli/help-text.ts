/**
 * Help Text Module
 * Provides comprehensive help documentation for all browser commands
 */

export function getHelpText(): string {
  return `Usage: browser-cmd <command> [args...]
       browser-cmd --interactive | -i    (REPL mode)

Navigation:
  start <url>              - Start browser and navigate
  navigate <url>           - Navigate to URL

Interaction:
  click <selector>         - Click element
    Supports: CSS selector, e123 (ref), role:button:Text (semantic)
  dblclick <selector>      - Double-click element
    Supports: CSS selector, e123 (ref), role:button:Text (semantic)
  type <selector> <text>   - Type text into input
    Supports: CSS selector, e123 (ref), role:textbox:Name (semantic)
  pressKey <key>           - Press keyboard key
  hover <selector>         - Hover over element
  drag <src> <target>      - Drag and drop
  selectOption <sel> <val> - Select dropdown option
  fillForm <json>          - Fill form fields (JSON object)
  uploadFile <sel> <path>  - Upload file

Waiting:
  wait <ms>                - Wait milliseconds
  waitForSelector <sel>    - Wait for element

Capture:
  snapshot [selector]      - Capture accessibility snapshot
    Phase 1: Shows [ref=e123] tags for elements + <changed> markers
    --incremental          - Show only changes since last snapshot
                             ([+] added, [-] removed, [~] changed)
  screenshot <path>        - Take screenshot

Phase 1 Features:
  - Element refs: snapshot adds [ref=e123] tags to interactive elements
  - Semantic selectors: role:button:Text, text:Submit, label:Email
  - Console auto-capture: click/type commands show console messages
  - State changes: <changed> markers show what changed after interactions

Phase 2 Features:
  exec "<cmds>"            - Execute multiple commands (&&-separated)
  snapshot --baseline=name - Save snapshot as baseline for comparison
  snapshot --compare=name  - Compare current with baseline
  saveState <name>         - Save full browser state (cookies, storage, URL)
  restoreState <name>      - Restore saved browser state
  listStates               - List all saved browser states
  deleteState <name>       - Delete saved browser state

Phase 3 Features:
  saveScreenshotBaseline <name> [path] - Save screenshot as baseline
  compareScreenshots <name> [path]     - Compare with screenshot baseline
  listScreenshotBaselines              - List screenshot baselines
  setupNetworkMocking                  - Enable network request mocking
  mockRoute <url> <method> <response>  - Mock a network route (JSON response)
  clearMocks                           - Clear all network mocks
  listMocks                            - List active network mocks
  capturePerformanceMetrics            - Capture performance metrics
  getPerformanceMetrics                - Get latest performance metrics

Tabs:
  tabs [action] [args]     - Unified tab management
    tabs list              - List all tabs (default)
    tabs new [url]         - Open new tab
    tabs switch <index>    - Switch to tab by index
    tabs close [index]     - Close tab (current if no index)

Device Emulation:
  setMobilePreset <device> - Set viewport to mobile device preset
    Examples: "iPhone 14 Pro", "Pixel 7", "iPad Pro 11"
  listMobilePresets        - List available mobile device presets
  resetMobilePreset        - Reset viewport to original size

Video Recording:
  startRecording [name]    - Start recording browser session as video
    Output: recordings/{name}.webm (default: recording-{timestamp})
  stopRecording            - Stop recording and save video file
  getRecordingStatus       - Check if recording is in progress
  listRecordings           - List all saved video recordings

HAR Export:
  startHAR                 - Start HAR capture (marks start time)
  exportHAR [filename]     - Export captured traffic to HAR 1.2 file
    Output: BROWSER-CLI/har-exports/{filename}.har
    Open in Chrome DevTools: Network > Import HAR
  getHARData               - Get current HAR data as JSON (use --json for full data)

Accessibility Audit:
  auditAccessibility       - Run accessibility audit on current page
    Options: --rules=wcag2aa|wcag21aa|best-practice
             --include=selector  (only audit within selector)
             --exclude=selector  (skip elements matching selector)
    Default: WCAG 2.0 AA rules
  getAccessibilityResults  - Get last audit results
    Options: --format=summary|detailed|json
    Default: summary (counts + critical issues)

Plugin System:
  loadPlugin <path>        - Load a plugin from file path
    Plugins add custom commands extending browser-cli functionality.
    Example: loadPlugin ./my-plugin.ts
  unloadPlugin <name>      - Unload a plugin by name
  listPlugins              - List all loaded plugins with their commands

Flaky Test Detection:
  runTestMultipleTimes <n> "<cmd>"  - Run command n times to detect flakiness
    Example: runTestMultipleTimes 5 "click e5 && snapshot"
    Runs the command n times and reports pass rate
  analyzeFlakiness         - Get detailed flakiness report for last run
    Options: --format=json|summary|detailed
    Default: summary

Test Orchestration:
  orchestrate "<pattern>" [options] - Run tests in parallel across instances
    Example: orchestrate "tests/*.txt" --instances=3
    Options:
      --instances=N          Number of parallel browser instances (default: 3)
      --timeout=ms           Timeout per test file (default: 60000)
      --basePort=N           Starting Browser-CLI port (default: 3456)
      --baseVitePort=N       Starting Vite server port (default: 5173)
      --verbose              Show detailed progress output
      --stopOnFailure        Stop all instances on first failure
    Each instance runs with BROWSER_INSTANCE and BROWSER_PORT env vars
  getOrchestrationStatus   - Get current or last orchestration status
    Options: --format=json|summary
    Shows progress if running, or last results if complete
  abortOrchestration       - Abort running orchestration

Utility:
  resize <width> <height>  - Resize viewport
  evaluate <code>          - Run JavaScript
  console                  - Get console messages
  network                  - Get network requests
  acceptDialog [text]      - Accept dialog (optional prompt text)
  dismissDialog            - Dismiss dialog
  status                   - Get status
  close                    - Close browser`;
}
