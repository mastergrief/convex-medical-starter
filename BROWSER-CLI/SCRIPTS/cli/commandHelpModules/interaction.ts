/**
 * Interaction command help texts
 * Commands: click, dblclick, type, hover, drag, pressKey, fillForm, selectOption, uploadFile
 */

import type { CommandHelpRecord } from './types';

export const interactionHelp: CommandHelpRecord = {
  click: `Usage: browser-cmd click <selector>

Click an element

Aliases: clickByRef, clickBySemantic (auto-detected from selector format)

Arguments:
  <selector>    Element selector (ref, semantic, or CSS)

Selector Auto-Detection:
  - e42 patterns       → uses clickByRef (element refs)
  - role:/text:/label: → uses clickBySemantic (accessibility selectors)
  - Other patterns     → CSS selector

Examples:
  click e42                    # Element ref → clickByRef
  click "role:button:Submit"   # Semantic → clickBySemantic
  click .submit-btn            # CSS selector (avoid if possible)

Best Practice: Use 'snapshot' first to get element refs, then use refs for clicks.`,

  dblclick: `Usage: browser-cmd dblclick <selector>

Double-click an element

Aliases: dblclickByRef, dblclickBySemantic (auto-detected from selector format)

Arguments:
  <selector>    Element selector (ref, semantic, or CSS)

Selector Auto-Detection:
  - e42 patterns       → uses dblclickByRef (element refs)
  - role:/text:/label: → uses dblclickBySemantic (accessibility selectors)
  - Other patterns     → CSS selector

Use Cases:
  - Open edit modals on workout cards
  - Select text in editors
  - Trigger double-click handlers

Examples:
  dblclick e42                  # Element ref → dblclickByRef
  dblclick "role:button:Edit"   # Semantic → dblclickBySemantic
  dblclick .workout-card        # CSS selector (avoid if possible)

Best Practice: Use 'snapshot' first to get element refs, then use refs for double-clicks.`,

  type: `Usage: browser-cmd type <selector> <text>

Type text into an input element

Aliases: typeByRef, typeBySemantic (auto-detected from selector format)

Arguments:
  <selector>    Element selector (ref, semantic, or CSS)
  <text>        Text to type (required)

Selector Auto-Detection:
  - e15 patterns       → uses typeByRef (element refs)
  - role:/text:/label: → uses typeBySemantic (accessibility selectors)
  - Other patterns     → CSS selector

Examples:
  type e15 "password123"              # Element ref → typeByRef
  type "role:textbox:Email" "a@b.c"   # Semantic → typeBySemantic
  type "label:Password" "secret"      # Semantic → typeBySemantic
  type #email "user@example.com"      # CSS selector (avoid if possible)

Best Practice: Use 'snapshot' first to get element refs, then use refs for typing.`,

  hover: `Usage: browser-cmd hover <selector>

Hover over an element

Aliases: hoverByRef, hoverBySemantic (auto-detected from selector format)

Arguments:
  <selector>    Element selector (ref, semantic, or CSS)

Selector Auto-Detection:
  - e42 patterns       → uses hoverByRef (element refs)
  - role:/text:/label: → uses hoverBySemantic (accessibility selectors)
  - Other patterns     → CSS selector

Examples:
  hover e42                      # Element ref → hoverByRef
  hover "role:button:Options"    # Semantic → hoverBySemantic
  hover "text:Learn More"        # Semantic → hoverBySemantic
  hover .dropdown                # CSS selector (avoid if possible)

Best Practice: Use 'snapshot' first to get element refs, then use refs for hovers.`,

  drag: `Usage: browser-cmd drag <source> <target>

Drag element from source to target

Aliases: dragByRef (auto-detected when both selectors are refs)

Arguments:
  <source>    Source element selector (required)
  <target>    Target element selector (required)

Selector Auto-Detection:
  - e10 e20 patterns   → uses dragByRef (CDP-based for dnd-kit compatibility)
  - CSS selectors      → uses --cdp flag approach

Features:
  - CDP-based drag for dnd-kit compatibility
  - Grip icon detection (SVG/IMG)
  - 20 interpolated steps for smooth movement
  - CSS selector fallback for unnamed elements

Examples:
  drag e10 e20                   # Element refs → dragByRef
  drag --cdp ".item" ".target"   # CSS selectors with CDP

Best Practice: Use 'snapshot' first to get element refs, then use refs for drags.`,

  pressKey: `Usage: browser-cmd pressKey <key>

Press a keyboard key

Arguments:
  <key>    Key name (e.g., Enter, Tab, Escape, ArrowDown)

Examples:
  browser-cmd pressKey Enter
  browser-cmd pressKey Tab
  browser-cmd pressKey Escape`,

  pressKeyCombo: `Usage: browser-cmd pressKeyCombo <combo>

Press a key combination with modifiers

Arguments:
  <combo>    Key combination with + separator (e.g., Control+S)

Supported Modifiers:
  - Control, Shift, Alt, Meta (Command on Mac)

Examples:
  browser-cmd pressKeyCombo Control+A
  browser-cmd pressKeyCombo Control+Shift+S
  browser-cmd pressKeyCombo Alt+F4
  browser-cmd pressKeyCombo Meta+Z`,

  holdKey: `Usage: browser-cmd holdKey <key> <duration>

Hold a key down for specified duration

Arguments:
  <key>       Key name (e.g., Shift, Control)
  <duration>  Duration in milliseconds

Examples:
  browser-cmd holdKey Shift 500
  browser-cmd holdKey Control 1000`,

  tapKey: `Usage: browser-cmd tapKey <key> <count> [delay]

Tap a key repeatedly

Arguments:
  <key>    Key name (e.g., Tab, ArrowDown)
  <count>  Number of times to tap
  [delay]  Optional delay between taps in ms (default: 50)

Examples:
  browser-cmd tapKey Tab 3
  browser-cmd tapKey ArrowDown 5
  browser-cmd tapKey Tab 3 100`,

  selectOption: `Usage: browser-cmd selectOption <selector> <value>

Select option from dropdown/select element

Arguments:
  <selector>    Select element selector
  <value>       Option value to select

Examples:
  browser-cmd selectOption e5 "option1"
  browser-cmd selectOption "#country" "USA"
  browser-cmd selectOption "label:Status" "active"`,

  fillForm: `Usage: browser-cmd fillForm <json>

Fill multiple form fields at once

Arguments:
  <json>    JSON object mapping selectors to values

Examples:
  browser-cmd fillForm '{"#email":"user@test.com","#password":"pass123"}'
  browser-cmd fillForm '{"[name=firstName]":"John","[name=lastName]":"Doe"}'`,

  uploadFile: `Usage: browser-cmd uploadFile <selector> <path>

Upload file(s) to an input element

Arguments:
  <selector>    File input selector
  <path>        Path to file (or JSON array for multiple files)

Examples:
  browser-cmd uploadFile e5 /path/to/file.pdf
  browser-cmd uploadFile "input[type='file']" ./document.pdf
  browser-cmd uploadFile "#avatar" '["./photo1.jpg","./photo2.jpg"]'`,
};
