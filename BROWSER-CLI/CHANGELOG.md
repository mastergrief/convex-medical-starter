# Browser-CLI Changelog

## [Unreleased] - 2025-12-30

### Fixed
- **CSS Selector Escape Bug**: Fixed invalid CSS selector generation for Tailwind patterns and special characters
  - Added CSS.escape() to `capture.ts` for 5 selector types:
    - data-testid attribute values
    - data-date attribute values
    - aria-label attribute values
    - ID selectors
    - Class name selectors (ALL classes now escaped)
  - Added CSS.escape() to `forms.ts` for 4 selector types:
    - Input field IDs
    - Input field names
    - Input field aria-labels
    - Submit button IDs
  - New `cssValidated` field tracks properly escaped selectors in RefData

### Patterns Now Supported
| Pattern | Example | Escaped Form |
|---------|---------|--------------|
| Peer modifiers | `peer/menu-button` | `peer\/menu-button` |
| Group modifiers | `group/sidebar-wrapper` | `group\/sidebar-wrapper` |
| Arbitrary values | `w-[var(--sidebar-width)]` | `w-\[var\(--sidebar-width\)\]` |
| Container queries | `@container/card-header` | `\@container\/card-header` |
| Group data | `group-data-[collapsible=icon]` | `group-data-\[collapsible\=icon\]` |

### Files Changed
- `BROWSER-CLI/SCRIPTS/features/snapshotModules/capture.ts` - CSS selector generation
- `BROWSER-CLI/SCRIPTS/features/snapshotModules/forms.ts` - Form field selectors
- `BROWSER-CLI/tests/features/css-selector-escape.test.ts` - New test file
- `BROWSER-CLI/tests/fixtures/css-selector-test-data.ts` - New test fixtures

### Tests Added
- 26 unit tests covering:
  - Tailwind pattern escaping (7 tests)
  - Attribute value escaping (4 tests)
  - ID selector escaping (2 tests)
  - Edge cases (4 tests)
  - Generated selector validity (5 tests)
  - Selector construction patterns (4 tests)
