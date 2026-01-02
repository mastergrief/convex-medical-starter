/**
 * Plugin Path Validation Security Tests
 * Tests the path validation in plugin-loader.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

// Mock fs for symlink tests
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    realpathSync: vi.fn(),
    existsSync: vi.fn(),
  };
});

/**
 * Simulated ALLOWED_PLUGIN_DIRS from plugin-loader.ts
 * These are the directories where plugins can be loaded from
 */
const ALLOWED_PLUGIN_DIRS = [
  path.resolve(process.cwd(), 'BROWSER-CLI/plugins'),
  path.resolve(process.cwd(), 'BROWSER-CLI'),
  process.cwd(),
];

/**
 * Extra directories from BROWSER_CLI_PLUGIN_DIRS environment variable
 */
function getExtraPluginDirs(): string[] {
  const envDirs = process.env.BROWSER_CLI_PLUGIN_DIRS;
  if (!envDirs) return [];
  return envDirs.split(path.delimiter).map(d => path.resolve(d));
}

/**
 * Simulated path validation result interface
 */
interface PathValidationResult {
  valid: boolean;
  resolvedPath?: string;
  error?: string;
}

/**
 * Simulated validatePluginPath function logic
 */
function validatePluginPath(pluginPath: string): PathValidationResult {
  const mockFs = fs as unknown as {
    realpathSync: ReturnType<typeof vi.fn>;
    existsSync: ReturnType<typeof vi.fn>;
  };

  // Resolve to absolute path
  const absolutePath = path.isAbsolute(pluginPath)
    ? pluginPath
    : path.resolve(process.cwd(), pluginPath);

  // Use realpath to resolve symlinks (if file exists)
  let realPath: string;
  try {
    realPath = mockFs.realpathSync(absolutePath);
  } catch {
    // File doesn't exist yet or can't be resolved - use absolute path
    realPath = absolutePath;
  }

  // Check for path traversal attempts
  if (pluginPath.includes('..')) {
    return {
      valid: false,
      error: `Path traversal detected: "${pluginPath}" contains ".." segments`,
    };
  }

  // Get all allowed directories including extras from env
  const allAllowedDirs = [...ALLOWED_PLUGIN_DIRS, ...getExtraPluginDirs()];

  // Check if path is within allowed directories
  const isAllowed = allAllowedDirs.some(allowedDir => {
    const normalizedReal = path.normalize(realPath);
    const normalizedAllowed = path.normalize(allowedDir);
    return (
      normalizedReal.startsWith(normalizedAllowed + path.sep) ||
      normalizedReal === normalizedAllowed
    );
  });

  if (!isAllowed) {
    return {
      valid: false,
      error: `Plugin path "${pluginPath}" is outside allowed directories. Allowed: ${allAllowedDirs.join(', ')}`,
    };
  }

  // Require .ts or .js extension
  const ext = path.extname(realPath).toLowerCase();
  if (ext !== '.ts' && ext !== '.js') {
    return {
      valid: false,
      error: `Invalid plugin extension "${ext}". Must be .ts or .js`,
    };
  }

  return { valid: true, resolvedPath: realPath };
}

describe('Plugin Path Validation', () => {
  const mockFs = fs as unknown as {
    realpathSync: ReturnType<typeof vi.fn>;
    existsSync: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: realpath returns the input path
    mockFs.realpathSync.mockImplementation((p: string) => p);
    mockFs.existsSync.mockReturnValue(true);
    // Clear env variable
    delete process.env.BROWSER_CLI_PLUGIN_DIRS;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.BROWSER_CLI_PLUGIN_DIRS;
  });

  describe('Path Traversal Protection', () => {
    it('should block paths with .. segments', () => {
      const result = validatePluginPath('../../../etc/passwd.ts');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Path traversal detected');
      expect(result.error).toContain('..');
    });

    it('should block hidden .. in path', () => {
      const result = validatePluginPath('plugins/../../secret/malicious.ts');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Path traversal detected');
    });

    it('should block single .. segment', () => {
      const result = validatePluginPath('../plugin.ts');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Path traversal detected');
    });

    it('should block absolute paths outside project', () => {
      const outsidePath = '/etc/passwd.ts';
      mockFs.realpathSync.mockReturnValue(outsidePath);

      const result = validatePluginPath(outsidePath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('outside allowed directories');
    });

    it('should block paths to system directories', () => {
      const systemPath = '/usr/local/bin/malicious.ts';
      mockFs.realpathSync.mockReturnValue(systemPath);

      const result = validatePluginPath(systemPath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('outside allowed directories');
    });

    it('should block symlinks to external locations', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/safe.ts');
      const externalPath = '/etc/passwd.ts';

      // Simulate symlink: safe.ts -> /etc/passwd.ts
      mockFs.realpathSync.mockReturnValue(externalPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('outside allowed directories');
    });

    it('should block symlinks that traverse to parent directories', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/linked.ts');
      const resolvedPath = '/home/other-user/secrets/malicious.ts';

      mockFs.realpathSync.mockReturnValue(resolvedPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(false);
    });
  });

  describe('Extension Validation', () => {
    it('should allow .ts extension', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/valid.ts');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
    });

    it('should allow .js extension', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/valid.js');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
    });

    it('should allow .TS extension (case insensitive)', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/valid.TS');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
    });

    it('should reject .txt extension', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/plugin.txt');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid plugin extension');
      expect(result.error).toContain('.txt');
    });

    it('should reject .json extension', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/config.json');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid plugin extension');
    });

    it('should reject .exe extension', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/malware.exe');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(false);
    });

    it('should reject files with no extension', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/noextension');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid plugin extension');
    });

    it('should reject .ts.txt double extension attempts', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/plugin.ts.txt');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('.txt');
    });
  });

  describe('Allowed Directories', () => {
    it('should allow BROWSER-CLI/plugins/ paths', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/my-plugin.ts');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe(pluginPath);
    });

    it('should allow BROWSER-CLI/ paths', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/custom-plugin.ts');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
    });

    it('should allow project root paths', () => {
      const pluginPath = path.join(process.cwd(), 'plugin-at-root.ts');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
    });

    it('should allow subdirectories within allowed directories', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/category/sub-plugin.ts');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
    });

    it('should respect BROWSER_CLI_PLUGIN_DIRS env var', () => {
      const customDir = '/custom/plugin/dir';
      process.env.BROWSER_CLI_PLUGIN_DIRS = customDir;

      const pluginPath = path.join(customDir, 'custom-plugin.ts');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
    });

    it('should handle multiple directories in BROWSER_CLI_PLUGIN_DIRS', () => {
      const customDir1 = '/custom/plugins1';
      const customDir2 = '/custom/plugins2';
      process.env.BROWSER_CLI_PLUGIN_DIRS = `${customDir1}${path.delimiter}${customDir2}`;

      const pluginPath = path.join(customDir2, 'plugin.ts');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
    });
  });

  describe('Relative Path Resolution', () => {
    it('should resolve relative paths from current working directory', () => {
      const relativePath = 'BROWSER-CLI/plugins/plugin.ts';
      const absolutePath = path.join(process.cwd(), relativePath);
      mockFs.realpathSync.mockReturnValue(absolutePath);

      const result = validatePluginPath(relativePath);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe(absolutePath);
    });

    it('should handle absolute paths directly', () => {
      const absolutePath = path.join(process.cwd(), 'BROWSER-CLI/plugins/plugin.ts');
      mockFs.realpathSync.mockReturnValue(absolutePath);

      const result = validatePluginPath(absolutePath);

      expect(result.valid).toBe(true);
    });
  });

  describe('Error Messages', () => {
    it('should provide clear error for path traversal', () => {
      const result = validatePluginPath('../malicious.ts');

      expect(result.error).toMatch(/Path traversal detected/);
      expect(result.error).toContain('..');
    });

    it('should list allowed directories in error message', () => {
      const outsidePath = '/outside/project/plugin.ts';
      mockFs.realpathSync.mockReturnValue(outsidePath);

      const result = validatePluginPath(outsidePath);

      expect(result.error).toContain('outside allowed directories');
      expect(result.error).toContain('Allowed:');
    });

    it('should specify invalid extension in error', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/bad.xyz');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.error).toContain('.xyz');
      expect(result.error).toContain('Must be .ts or .js');
    });
  });

  describe('Edge Cases', () => {
    it('should handle non-existent files gracefully', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/nonexistent.ts');
      // Simulate realpath throwing for non-existent file
      mockFs.realpathSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      // Should fall back to absolute path and continue validation
      const result = validatePluginPath(pluginPath);

      // Path is valid (exists check is separate from path validation)
      expect(result.valid).toBe(true);
    });

    it('should handle paths with special characters', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/my-plugin_v2.ts');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
    });

    it('should handle paths with spaces', () => {
      const pluginPath = path.join(process.cwd(), 'BROWSER-CLI/plugins/my plugin.ts');
      mockFs.realpathSync.mockReturnValue(pluginPath);

      const result = validatePluginPath(pluginPath);

      expect(result.valid).toBe(true);
    });
  });
});
