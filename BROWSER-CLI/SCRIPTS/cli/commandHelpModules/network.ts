/**
 * Network command help texts
 * Commands: network, networkClear, setupNetworkMocking, mockRoute, clearMocks,
 *           listMocks, listSchemas, validateMock, loadSchema
 */

import type { CommandHelpRecord } from './types';

export const networkHelp: CommandHelpRecord = {
  network: `Usage: browser-cmd network [options]

Get network requests from the browser

Options:
  --filter=<pattern>    Filter by URL pattern
  --method=<method>     Filter by HTTP method (GET, POST, etc.)
  --status=<code>       Filter by status code
  --limit=<n>           Limit results to last N requests

Examples:
  browser-cmd network
  browser-cmd network --filter="convex.cloud"
  browser-cmd network --method=POST
  browser-cmd network --status=404
  browser-cmd network --method=GET --filter="api" --limit=20`,

  networkClear: `Usage: browser-cmd networkClear

Clear all captured network requests from buffer

Use Case: Clear baseline network state before testing specific action

Examples:
  browser-cmd networkClear`,

  setupNetworkMocking: `Usage: browser-cmd setupNetworkMocking

Enable network request interception

Must be called before mockRoute commands.
Intercepts all requests and allows mocking specific routes.

Examples:
  browser-cmd setupNetworkMocking`,

  mockRoute: `Usage: browser-cmd mockRoute <url> <method> <response> [status] [--schema=<name>]

Mock a network route with custom response and optional schema validation

Arguments:
  <url>         URL pattern to mock (supports wildcards)
  <method>      HTTP method (GET, POST, PUT, DELETE, etc.)
  <response>    JSON response body
  [status]      Optional HTTP status code (default: 200)
  --schema=<name>     Validate response against JSON schema
  --skip-validation   Skip schema validation

Available Schemas:
  - user-response
  - workout-response
  - error-response

Examples:
  # Basic mock without validation
  browser-cmd mockRoute "*/api/users" "GET" '{"users":[]}'

  # Mock with schema validation
  browser-cmd mockRoute "*/api/user/123" "GET" '{"id":"507f1f77bcf86cd799439011","email":"test@test.com","name":"Test","role":"coach"}' 200 --schema=user-response

  # Mock error response
  browser-cmd mockRoute "*/api/login" "POST" '{"error":"Unauthorized","code":"AUTH_FAILED"}' 401 --schema=error-response

  # Skip validation (for custom responses)
  browser-cmd mockRoute "*/api/custom" "GET" '{"data":"anything"}' --skip-validation`,

  clearMocks: `Usage: browser-cmd clearMocks

Clear all network mocks

Removes all mock definitions but keeps interception enabled.

Examples:
  browser-cmd clearMocks`,

  listMocks: `Usage: browser-cmd listMocks

List all active network mocks

Returns: Array of mocked routes with URL, method, status

Examples:
  browser-cmd listMocks`,

  listSchemas: `Usage: browser-cmd listSchemas

List all available JSON schemas for mock validation

Examples:
  browser-cmd listSchemas`,

  validateMock: `Usage: browser-cmd validateMock <schema> <response>

Validate a mock response against a schema without creating a mock

Arguments:
  <schema>      Schema name to validate against
  <response>    JSON response to validate

Examples:
  browser-cmd validateMock user-response '{"id":"507f1f77bcf86cd799439011","email":"test@test.com","name":"Test","role":"coach"}'`,

  loadSchema: `Usage: browser-cmd loadSchema <name> <path>

Load a custom JSON schema from file

Arguments:
  <name>        Name to register the schema as
  <path>        Path to JSON schema file

Examples:
  browser-cmd loadSchema custom-response ./schemas/custom.json`,

  abortRoute: `Usage: browser-cmd abortRoute <urlPattern> [errorCode]

Abort/block requests matching URL pattern

Arguments:
  <urlPattern>  URL pattern to abort (supports wildcards)
  [errorCode]   Optional error code (default: blockedbyclient)
                Valid codes: blockedbyclient, connectionfailed, etc.

Examples:
  browser-cmd abortRoute "*/api/analytics*"
  browser-cmd abortRoute "*/ads/*" connectionfailed`,

  modifyRequestHeaders: `Usage: browser-cmd modifyRequestHeaders <urlPattern> <headers>

Modify request headers for matching pattern

Arguments:
  <urlPattern>  URL pattern to intercept
  <headers>     JSON object with header name:value pairs

Examples:
  browser-cmd modifyRequestHeaders "*/api/*" '{"Authorization":"Bearer test-token"}'
  browser-cmd modifyRequestHeaders "*" '{"X-Custom-Header":"test"}'`,

  modifyResponseHeaders: `Usage: browser-cmd modifyResponseHeaders <urlPattern> <headers>

Modify response headers for matching pattern

Arguments:
  <urlPattern>  URL pattern to intercept
  <headers>     JSON object with header name:value pairs

Examples:
  browser-cmd modifyResponseHeaders "*/api/*" '{"Cache-Control":"no-cache"}'
  browser-cmd modifyResponseHeaders "*" '{"X-Frame-Options":"DENY"}'`,

  blockByPattern: `Usage: browser-cmd blockByPattern <pattern(s)> [errorCode]

Block URL pattern(s) - single string or JSON array

Arguments:
  <pattern(s)>  Single pattern string OR JSON array of patterns
  [errorCode]   Optional error code (default: blockedbyclient)

Examples:
  # Single pattern (string)
  browser-cmd blockByPattern "*/analytics/*"
  browser-cmd blockByPattern "*/ads/*" connectionfailed

  # Multiple patterns (JSON array)
  browser-cmd blockByPattern '["*/analytics/*","*/tracking/*","*/ads/*"]'
  browser-cmd blockByPattern '["*/cdn.example.com/*"]' connectionfailed`,

  listAborts: `Usage: browser-cmd listAborts

List all active abort/block patterns

Returns: Array of patterns with their error codes

Examples:
  browser-cmd listAborts`,

  getMockHistory: `Usage: browser-cmd getMockHistory

Get the history of mock operations (create, overwrite, clear, enable, disable)

Returns:
  history     Array of mock operations with timestamps
  count       Total number of history entries

Each history entry contains:
  action      'create' | 'overwrite' | 'clear' | 'enable' | 'disable'
  timestamp   Unix timestamp of the operation
  key         Mock key (METHOD:URL) for create/overwrite/enable/disable
  mock        New mock details for create operations
  previousMock    Previous mock details for overwrite operations
  clearedCount    Number of mocks cleared for clear operations

Use Case: Debug mock conflicts and track mock lifecycle

Examples:
  browser-cmd getMockHistory`,

  disableMock: `Usage: browser-cmd disableMock <key>

Temporarily disable a network mock without clearing it

Arguments:
  <key>       Mock key in format "METHOD:URL" (e.g., "GET:https://api.example.com/users")

Behavior:
  - Sets enabled=false on the mock
  - Route handler will call route.continue() (real request) instead of fulfilling with mock
  - Mock remains in mockRoutes and can be re-enabled later
  - Logs disable event to mock history

Examples:
  browser-cmd disableMock "GET:https://api.example.com/users"
  browser-cmd disableMock "POST:https://api.example.com/login"`,

  enableMock: `Usage: browser-cmd enableMock <key>

Re-enable a previously disabled network mock

Arguments:
  <key>       Mock key in format "METHOD:URL" (e.g., "GET:https://api.example.com/users")

Behavior:
  - Sets enabled=true on the mock
  - Route handler will fulfill with mock response again
  - Logs enable event to mock history

Examples:
  browser-cmd enableMock "GET:https://api.example.com/users"
  browser-cmd enableMock "POST:https://api.example.com/login"`,
};
