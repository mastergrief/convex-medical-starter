/**
 * Internal routing command help texts
 * Commands: *ByRef, *BySemantic variants (12 commands)
 * These are internal commands that route to base commands based on selector type
 */

import type { CommandHelpRecord } from './types';

export const internalRoutingHelp: CommandHelpRecord = {
  clickByRef: `Usage: browser-cmd click <ref>

Click element by reference (internal routing)

This command is automatically used when you provide an element ref (e.g., e5).
You don't need to call clickByRef directly.

Examples:
  browser-cmd click e5    # Routes to clickByRef internally`,

  clickBySemantic: `Usage: browser-cmd click "<semantic>"

Click element by semantic selector (internal routing)

This command is automatically used when you provide a semantic selector.
You don't need to call clickBySemantic directly.

Semantic Formats:
  - role:button:Submit
  - text:Click here
  - label:Email

Examples:
  browser-cmd click "role:button:Submit"    # Routes to clickBySemantic internally`,

  typeByRef: `Usage: browser-cmd type <ref> <text>

Type into element by reference (internal routing)

This command is automatically used when you provide an element ref.

Examples:
  browser-cmd type e15 "hello"    # Routes to typeByRef internally`,

  typeBySemantic: `Usage: browser-cmd type "<semantic>" <text>

Type into element by semantic selector (internal routing)

This command is automatically used when you provide a semantic selector.

Examples:
  browser-cmd type "label:Email" "user@test.com"    # Routes to typeBySemantic internally`,

  dblclickByRef: `Usage: browser-cmd dblclick <ref>

Double-click element by reference (internal routing)

Examples:
  browser-cmd dblclick e5    # Routes to dblclickByRef internally`,

  dblclickBySemantic: `Usage: browser-cmd dblclick "<semantic>"

Double-click element by semantic selector (internal routing)

Examples:
  browser-cmd dblclick "role:button:Edit"    # Routes to dblclickBySemantic internally`,

  dragByRef: `Usage: browser-cmd drag <sourceRef> <targetRef>

Drag element by reference using CDP (internal routing)

Uses Chrome DevTools Protocol for reliable dnd-kit compatibility.
Includes grip icon detection and 20-step interpolated movement.

Examples:
  browser-cmd drag e1 e2    # Routes to dragByRef internally`,

  hoverByRef: `Usage: browser-cmd hover <ref>

Hover over element by reference (internal routing)

Examples:
  browser-cmd hover e5    # Routes to hoverByRef internally`,

  hoverBySemantic: `Usage: browser-cmd hover "<semantic>"

Hover over element by semantic selector (internal routing)

Examples:
  browser-cmd hover "role:button:Options"    # Routes to hoverBySemantic internally`,

  waitForSelectorByRef: `Usage: browser-cmd waitForSelector <ref>

Wait for element by reference (internal routing)

Examples:
  browser-cmd waitForSelector e5    # Routes to waitForSelectorByRef internally`,

  waitForSelectorBySemantic: `Usage: browser-cmd waitForSelector "<semantic>"

Wait for element by semantic selector (internal routing)

Examples:
  browser-cmd waitForSelector "role:dialog:Confirm"    # Routes to waitForSelectorBySemantic internally`,
};
