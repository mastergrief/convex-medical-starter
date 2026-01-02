/**
 * DOM inspection command help texts
 * Commands: getComputedStyle, getElementVisibility, getOverlayingElements, countElements
 */

import type { CommandHelpRecord } from './types';

export const domHelp: CommandHelpRecord = {
  getComputedStyle: `Usage: browser-cmd getComputedStyle <selector> [propsJSON]

Get CSS computed style values for an element

Arguments:
  <selector>    CSS selector for target element (required)
  [propsJSON]   JSON array of property names to retrieve (optional)
                If omitted, returns common properties: display, visibility, opacity,
                position, width, height, color, background-color, font-size, z-index

Examples:
  browser-cmd getComputedStyle "#header"
  browser-cmd getComputedStyle ".modal" '["display", "opacity", "z-index"]'
  browser-cmd getComputedStyle "button.primary" '["background-color", "color"]'`,

  getElementVisibility: `Usage: browser-cmd getElementVisibility <selector>

Analyze why an element is visible or hidden

Arguments:
  <selector>    CSS selector for target element (required)

Returns:
  - visible: boolean (overall visibility status)
  - reasons:
    - hasSize: element has width and height > 0
    - notHidden: visibility is not 'hidden'
    - notDisplayNone: display is not 'none'
    - opacity: opacity value (0-1)
    - inViewport: element is within viewport bounds

Examples:
  browser-cmd getElementVisibility "#modal"
  browser-cmd getElementVisibility ".error-message"
  browser-cmd getElementVisibility "button[disabled]"`,

  getOverlayingElements: `Usage: browser-cmd getOverlayingElements <selector>

Find elements that are overlaying (blocking) a target element

Arguments:
  <selector>    CSS selector for target element (required)

Returns:
  - elementAtPoint: what element is at the center of the target
  - overlayingElements: array of elements above the target
  - isBlocked: whether the target is blocked by overlays

Use Cases:
  - Debug click interception issues
  - Find modal overlays blocking buttons
  - Identify z-index stacking problems

Examples:
  browser-cmd getOverlayingElements "#submit-button"
  browser-cmd getOverlayingElements ".dropdown-menu"`,

  countElements: `Usage: browser-cmd countElements <selector>

Count elements matching a CSS selector

Arguments:
  <selector>    CSS selector to count matches (required)

Returns:
  - count: number of matching elements

Use Cases:
  - Verify list item counts
  - Check table row counts
  - Validate search result counts

Examples:
  browser-cmd countElements ".list-item"
  browser-cmd countElements "tr.data-row"
  browser-cmd countElements "[data-testid='card']"`,
};
