import { spawn } from 'child_process';

export interface SpawnResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export interface SpawnOptions {
  timeout: number;
  cwd?: string;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

/**
 * Async subprocess execution with streaming output and timeout support.
 * Uses spawn for non-blocking execution with real-time output callbacks.
 *
 * @param command - The command to run (e.g., 'npm')
 * @param args - Command arguments (e.g., ['run', 'typecheck'])
 * @param options - Timeout, cwd, and optional streaming callbacks
 * @returns Promise<SpawnResult> - stdout, stderr, exitCode, timedOut flag
 *
 * @example
 * const result = await asyncSpawn('npm', ['run', 'typecheck'], {
 *   timeout: 60000,
 *   onStderr: (data) => console.log('Progress:', data.trim())
 * });
 * if (result.timedOut) console.log('Command timed out');
 * if (result.exitCode === 0) console.log('Success!');
 */
export async function asyncSpawn(
  command: string,
  args: string[],
  options: SpawnOptions
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const proc = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'] // stdin ignored, stdout/stderr piped
    });

    const timeoutId = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
      // Give process 5s to terminate gracefully before SIGKILL
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
        }
      }, 5000);
    }, options.timeout);

    proc.stdout?.on('data', (data: Buffer) => {
      const str = data.toString();
      stdout += str;
      options.onStdout?.(str);
    });

    proc.stderr?.on('data', (data: Buffer) => {
      const str = data.toString();
      stderr += str;
      options.onStderr?.(str);
    });

    proc.on('close', (code: number | null) => {
      clearTimeout(timeoutId);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        timedOut
      });
    });

    proc.on('error', (err: Error) => {
      clearTimeout(timeoutId);
      reject(err);
    });
  });
}
