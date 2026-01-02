/**
 * Async file system utilities with retry support and atomic operations.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface AsyncFsOptions {
  encoding?: BufferEncoding;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: Required<AsyncFsOptions> = {
  encoding: 'utf-8',
  retries: 3,
  retryDelay: 100,
};

/**
 * Read file with optional retry on transient errors.
 */
export async function readFileAsync(
  filepath: string,
  options?: AsyncFsOptions
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.retries; attempt++) {
    try {
      return await fs.readFile(filepath, { encoding: opts.encoding });
    } catch (error) {
      lastError = error as Error;
      if (attempt < opts.retries) {
        await delay(opts.retryDelay * (attempt + 1));
      }
    }
  }

  throw lastError;
}

/**
 * Write file atomically: write to .tmp then rename.
 * Ensures file is never left in a partial state.
 */
export async function writeFileAtomic(
  filepath: string,
  content: string,
  options?: AsyncFsOptions
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tmpPath = `${filepath}.tmp`;

  await ensureDirAsync(path.dirname(filepath));
  await fs.writeFile(tmpPath, content, { encoding: opts.encoding });
  await fs.rename(tmpPath, filepath);
}

/**
 * Read and parse JSON file.
 */
export async function readJsonAsync<T>(filepath: string): Promise<T> {
  const content = await readFileAsync(filepath);
  return JSON.parse(content) as T;
}

/**
 * Write JSON to file atomically with pretty-printing.
 */
export async function writeJsonAsync(
  filepath: string,
  data: unknown
): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await writeFileAtomic(filepath, content);
}

/**
 * Create directory recursively if it doesn't exist.
 */
export async function ensureDirAsync(dirpath: string): Promise<void> {
  try {
    await fs.mkdir(dirpath, { recursive: true });
  } catch (error) {
    // Ignore EEXIST - directory already exists
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw error;
    }
  }
}

/**
 * List directory contents. Returns empty array if directory doesn't exist.
 */
export async function listDirAsync(dirpath: string): Promise<string[]> {
  try {
    return await fs.readdir(dirpath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Check if a file exists.
 */
export async function fileExistsAsync(filepath: string): Promise<boolean> {
  try {
    await fs.access(filepath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Delete a file if it exists.
 */
export async function deleteFileAsync(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

// Internal helper
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
