/**
 * Content command help texts
 * Commands: getPageHTML, getPageText, getElementHTML, getElementText
 */

import type { CommandHelpRecord } from './types';

export const contentHelp: CommandHelpRecord = {
  getPageHTML: `Usage: browser-cmd getPageHTML

Get full page HTML content

Returns the complete HTML of the current page including DOCTYPE and all elements.
The response includes the total length and a preview of the first 500 characters.

Examples:
  browser-cmd getPageHTML`,

  getPageText: `Usage: browser-cmd getPageText

Get visible page text (body innerText)

Returns the visible text content of the page body, excluding hidden elements,
scripts, and styles. Useful for extracting readable content.

Examples:
  browser-cmd getPageText`,

  getElementHTML: `Usage: browser-cmd getElementHTML <selector>

Get element outerHTML

Returns the full HTML of the matched element including the element itself.

Arguments:
  selector  CSS selector, element ref, or semantic selector

Examples:
  browser-cmd getElementHTML "#main-content"
  browser-cmd getElementHTML ".article-body"
  browser-cmd getElementHTML "role:main"`,

  getElementText: `Usage: browser-cmd getElementText <selector>

Get element innerText

Returns the visible text content of the matched element.

Arguments:
  selector  CSS selector, element ref, or semantic selector

Examples:
  browser-cmd getElementText "#main-content"
  browser-cmd getElementText ".article-body"
  browser-cmd getElementText "role:heading"`,
};
