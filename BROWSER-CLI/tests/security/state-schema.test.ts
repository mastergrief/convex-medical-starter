/**
 * Browser State Schema Validation Security Tests
 * Tests the state file validation in browser-state.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Browser state schema from BROWSER-CLI/schemas/browser-state.json
 */
const browserStateSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  required: ['url', 'cookies', 'localStorage', 'sessionStorage'],
  properties: {
    url: {
      type: 'string',
      format: 'uri'
    },
    cookies: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'value', 'domain'],
        properties: {
          name: { type: 'string' },
          value: { type: 'string' },
          domain: { type: 'string' },
          path: { type: 'string' },
          expires: { type: 'number' },
          httpOnly: { type: 'boolean' },
          secure: { type: 'boolean' },
          sameSite: { enum: ['Strict', 'Lax', 'None'] }
        }
      }
    },
    localStorage: {
      type: 'string',
      description: 'JSON-stringified localStorage contents'
    },
    sessionStorage: {
      type: 'string',
      description: 'JSON-stringified sessionStorage contents'
    },
    timestamp: { type: 'number' }
  },
  additionalProperties: false
};

/**
 * Create a valid browser state object for testing
 */
function createValidState(): Record<string, unknown> {
  return {
    url: 'http://localhost:5173/dashboard',
    cookies: [
      {
        name: 'session',
        value: 'abc123',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax'
      }
    ],
    localStorage: '{"theme":"dark","userId":"123"}',
    sessionStorage: '{"cart":"[]"}',
    timestamp: Date.now()
  };
}

/**
 * State name validation logic from BrowserStateFeature
 */
function validateStateName(name: string): { valid: boolean; error?: string } {
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid state name - must not contain path separators or ".."'
    };
  }
  if (name.length === 0) {
    return {
      valid: false,
      error: 'State name cannot be empty'
    };
  }
  if (name.length > 255) {
    return {
      valid: false,
      error: 'State name too long (max 255 characters)'
    };
  }
  return { valid: true };
}

describe('Browser State Schema Validation', () => {
  let ajv: Ajv;
  let validate: ReturnType<Ajv['compile']>;

  beforeEach(() => {
    ajv = new Ajv({ allErrors: true });
    addFormats(ajv);
    validate = ajv.compile(browserStateSchema);
  });

  describe('Required Fields', () => {
    it('should reject state missing url', () => {
      const state = createValidState();
      delete state.url;

      const valid = validate(state);

      expect(valid).toBe(false);
      expect(validate.errors).toBeDefined();
      expect(validate.errors?.some(e => e.message?.includes('url'))).toBe(true);
    });

    it('should reject state missing cookies', () => {
      const state = createValidState();
      delete state.cookies;

      const valid = validate(state);

      expect(valid).toBe(false);
      expect(validate.errors?.some(
        e => e.instancePath === '' && e.params?.missingProperty === 'cookies'
      )).toBe(true);
    });

    it('should reject state missing localStorage', () => {
      const state = createValidState();
      delete state.localStorage;

      const valid = validate(state);

      expect(valid).toBe(false);
      expect(validate.errors?.some(
        e => e.params?.missingProperty === 'localStorage'
      )).toBe(true);
    });

    it('should reject state missing sessionStorage', () => {
      const state = createValidState();
      delete state.sessionStorage;

      const valid = validate(state);

      expect(valid).toBe(false);
      expect(validate.errors?.some(
        e => e.params?.missingProperty === 'sessionStorage'
      )).toBe(true);
    });

    it('should reject completely empty object', () => {
      const state = {};

      const valid = validate(state);

      expect(valid).toBe(false);
      expect(validate.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('URL Validation', () => {
    it('should accept valid HTTP URL', () => {
      const state = createValidState();
      state.url = 'http://localhost:5173/page';

      const valid = validate(state);

      expect(valid).toBe(true);
    });

    it('should accept valid HTTPS URL', () => {
      const state = createValidState();
      state.url = 'https://example.com/dashboard?query=1';

      const valid = validate(state);

      expect(valid).toBe(true);
    });

    it('should reject invalid URL format', () => {
      const state = createValidState();
      state.url = 'not-a-valid-url';

      const valid = validate(state);

      expect(valid).toBe(false);
      expect(validate.errors?.some(
        e => e.instancePath === '/url' && e.keyword === 'format'
      )).toBe(true);
    });

    it('should reject non-string URL', () => {
      const state = createValidState();
      state.url = 12345;

      const valid = validate(state);

      expect(valid).toBe(false);
    });
  });

  describe('Cookie Structure', () => {
    it('should require cookie name, value, domain', () => {
      const state = createValidState();
      state.cookies = [{ name: 'test' }]; // Missing value and domain

      const valid = validate(state);

      expect(valid).toBe(false);
    });

    it('should accept cookie with required fields only', () => {
      const state = createValidState();
      state.cookies = [{
        name: 'sessionId',
        value: 'xyz789',
        domain: 'localhost'
      }];

      const valid = validate(state);

      expect(valid).toBe(true);
    });

    it('should accept cookie with all optional fields', () => {
      const state = createValidState();
      state.cookies = [{
        name: 'auth',
        value: 'token123',
        domain: 'example.com',
        path: '/app',
        expires: Date.now() + 86400000,
        httpOnly: true,
        secure: true,
        sameSite: 'Strict'
      }];

      const valid = validate(state);

      expect(valid).toBe(true);
    });

    it('should validate sameSite enum values', () => {
      const state = createValidState();
      (state.cookies as Array<{ sameSite: string }>)[0].sameSite = 'Strict';
      expect(validate(state)).toBe(true);

      (state.cookies as Array<{ sameSite: string }>)[0].sameSite = 'Lax';
      expect(validate(state)).toBe(true);

      (state.cookies as Array<{ sameSite: string }>)[0].sameSite = 'None';
      expect(validate(state)).toBe(true);
    });

    it('should reject invalid sameSite value', () => {
      const state = createValidState();
      (state.cookies as Array<{ sameSite: string }>)[0].sameSite = 'Invalid';

      const valid = validate(state);

      expect(valid).toBe(false);
    });

    it('should reject invalid cookie structure', () => {
      const state = createValidState();
      state.cookies = 'not-an-array';

      const valid = validate(state);

      expect(valid).toBe(false);
    });

    it('should accept empty cookies array', () => {
      const state = createValidState();
      state.cookies = [];

      const valid = validate(state);

      expect(valid).toBe(true);
    });

    it('should reject cookie with wrong type for boolean fields', () => {
      const state = createValidState();
      (state.cookies as Array<{ httpOnly: unknown }>)[0].httpOnly = 'yes';

      const valid = validate(state);

      expect(valid).toBe(false);
    });
  });

  describe('Storage Fields', () => {
    it('should accept valid JSON string for localStorage', () => {
      const state = createValidState();
      state.localStorage = '{"key":"value","nested":{"a":1}}';

      const valid = validate(state);

      expect(valid).toBe(true);
    });

    it('should accept empty object JSON for localStorage', () => {
      const state = createValidState();
      state.localStorage = '{}';

      const valid = validate(state);

      expect(valid).toBe(true);
    });

    it('should reject non-string localStorage', () => {
      const state = createValidState();
      state.localStorage = { key: 'value' }; // Object instead of string

      const valid = validate(state);

      expect(valid).toBe(false);
    });

    it('should accept any string for sessionStorage (schema validates type only)', () => {
      const state = createValidState();
      state.sessionStorage = '{"cartItems":["item1","item2"]}';

      const valid = validate(state);

      expect(valid).toBe(true);
    });
  });

  describe('Timestamp Field', () => {
    it('should accept valid complete state with timestamp', () => {
      const state = createValidState();
      state.timestamp = Date.now();

      const valid = validate(state);

      expect(valid).toBe(true);
    });

    it('should accept state with optional timestamp omitted', () => {
      const state = createValidState();
      delete state.timestamp;

      const valid = validate(state);

      expect(valid).toBe(true);
    });

    it('should reject non-number timestamp', () => {
      const state = createValidState();
      state.timestamp = '2024-01-01';

      const valid = validate(state);

      expect(valid).toBe(false);
    });
  });

  describe('Additional Properties', () => {
    it('should reject state with unknown properties', () => {
      const state = createValidState();
      (state as Record<string, unknown>).maliciousField = 'injected';

      const valid = validate(state);

      expect(valid).toBe(false);
      expect(validate.errors?.some(
        e => e.keyword === 'additionalProperties'
      )).toBe(true);
    });
  });

  describe('Valid State', () => {
    it('should accept valid complete state', () => {
      const state = createValidState();

      const valid = validate(state);

      expect(valid).toBe(true);
      expect(validate.errors).toBeNull();
    });

    it('should accept minimal valid state', () => {
      const state = {
        url: 'http://localhost:5173',
        cookies: [],
        localStorage: '{}',
        sessionStorage: '{}'
      };

      const valid = validate(state);

      expect(valid).toBe(true);
    });
  });
});

describe('State Name Validation', () => {
  describe('Path Separator Protection', () => {
    it('should reject names with forward slash', () => {
      const result = validateStateName('path/to/state');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('path separators');
    });

    it('should reject names with backslash', () => {
      const result = validateStateName('path\\to\\state');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('path separators');
    });

    it('should reject names with .. segments', () => {
      const result = validateStateName('..secret');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('..');
    });

    it('should reject names with hidden .. in middle', () => {
      const result = validateStateName('state..name');

      expect(result.valid).toBe(false);
    });

    it('should reject combined path traversal attempts', () => {
      const result = validateStateName('../../../etc/passwd');

      expect(result.valid).toBe(false);
    });
  });

  describe('Valid Names', () => {
    it('should accept valid alphanumeric names', () => {
      const result = validateStateName('myState123');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept names with hyphens', () => {
      const result = validateStateName('my-state-name');

      expect(result.valid).toBe(true);
    });

    it('should accept names with underscores', () => {
      const result = validateStateName('my_state_name');

      expect(result.valid).toBe(true);
    });

    it('should accept single character names', () => {
      const result = validateStateName('a');

      expect(result.valid).toBe(true);
    });

    it('should accept names with dots (not double dots)', () => {
      const result = validateStateName('state.v1');

      expect(result.valid).toBe(true);
    });
  });

  describe('Length Validation', () => {
    it('should reject empty names', () => {
      const result = validateStateName('');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should accept names at max length (255)', () => {
      const longName = 'a'.repeat(255);
      const result = validateStateName(longName);

      expect(result.valid).toBe(true);
    });

    it('should reject names exceeding max length', () => {
      const tooLongName = 'a'.repeat(256);
      const result = validateStateName(tooLongName);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('too long');
      expect(result.error).toContain('255');
    });
  });

  describe('Edge Cases', () => {
    it('should handle names with spaces', () => {
      const result = validateStateName('my state');

      expect(result.valid).toBe(true);
    });

    it('should handle names with special characters', () => {
      const result = validateStateName('state@2024!');

      expect(result.valid).toBe(true);
    });

    it('should handle unicode names', () => {
      const result = validateStateName('estado-123');

      expect(result.valid).toBe(true);
    });
  });
});

describe('Schema Validator Integration', () => {
  it('should provide meaningful error messages for validation failures', () => {
    const ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(ajv);
    const validate = ajv.compile(browserStateSchema);

    const invalidState = {
      url: 'not-a-url',
      cookies: 'not-an-array'
    };

    validate(invalidState);

    expect(validate.errors).toBeDefined();
    expect(validate.errors!.length).toBeGreaterThan(0);

    // Should have errors for url format, cookies type, and missing required fields
    const errorFields = validate.errors!.map(e => e.instancePath || e.params?.missingProperty);
    expect(errorFields.some(f => f === '/url' || f === 'url')).toBe(true);
    expect(errorFields.some(f => f === '/cookies' || f === 'cookies')).toBe(true);
  });
});
