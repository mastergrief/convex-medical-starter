/**
 * TCP Server Module
 * Handles TCP socket communication for browser command server
 */

import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { Logger } from '../utils/logger';
import { TOKEN_FILE } from './constants';

export type CommandHandler = (data: any) => Promise<any>;

export interface ServerOptions {
  port: number;
  host?: string;
  pidFile?: string;
  portFile?: string;
  logger?: Logger;
}

/**
 * TCP server for handling browser commands
 */
export class CommandServer {
  private server: net.Server | null = null;
  private port: number;
  private host: string;
  private pidFile?: string;
  private portFile?: string;
  private logger: Logger;
  private commandHandler: CommandHandler;

  constructor(options: ServerOptions, commandHandler: CommandHandler) {
    this.port = options.port;
    this.host = options.host || '127.0.0.1';
    this.pidFile = options.pidFile;
    this.portFile = options.portFile;
    this.logger = options.logger || new Logger('CommandServer');
    this.commandHandler = commandHandler;
  }

  /**
   * Start the TCP server
   */
  async start(): Promise<void> {
    this.server = net.createServer((socket) => {
      let buffer = '';

      socket.on('data', async (data) => {
        buffer += data.toString();

        // Check if we have a complete JSON message (ends with newline)
        if (buffer.includes('\n')) {
          const messages = buffer.split('\n');
          buffer = messages.pop() || '';

          for (const message of messages) {
            if (!message.trim()) continue;

            try {
              const request = JSON.parse(message);

              // Validate session token before processing command
              const expectedToken = fs.existsSync(TOKEN_FILE)
                ? fs.readFileSync(TOKEN_FILE, 'utf-8').trim()
                : '';
              if (!expectedToken || request.token !== expectedToken) {
                const unauthorizedResponse = {
                  status: 'error',
                  message: 'Unauthorized - invalid or missing token',
                };
                socket.write(JSON.stringify(unauthorizedResponse) + '\n');
                return;
              }

              const response = await this.commandHandler(request);
              socket.write(JSON.stringify(response) + '\n');
            } catch (error) {
              const errorResponse = {
                status: 'error',
                message: error instanceof Error ? error.message : String(error),
              };
              socket.write(JSON.stringify(errorResponse) + '\n');
            }
          }
        }
      });

      socket.on('error', (error) => {
        this.logger.error(`Socket error: ${error.message}`);
      });
    });

    await new Promise<void>((resolve) => {
      this.server!.listen(this.port, this.host, () => {
        this.logger.info(`Server listening on ${this.host}:${this.port}`);
        resolve();
      });
    });

    // Save PID and port files
    this.savePidAndPort();
  }

  /**
   * Save PID and port to files for client discovery
   */
  private savePidAndPort(): void {
    if (this.pidFile) {
      const dir = path.dirname(this.pidFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.pidFile, process.pid.toString());
    }

    if (this.portFile) {
      const dir = path.dirname(this.portFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.portFile, this.port.toString());
    }
  }

  /**
   * Stop the TCP server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }

    // Clean up PID and port files
    if (this.pidFile && fs.existsSync(this.pidFile)) {
      fs.unlinkSync(this.pidFile);
    }
    if (this.portFile && fs.existsSync(this.portFile)) {
      fs.unlinkSync(this.portFile);
    }

    this.logger.info('Server stopped');
  }

  /**
   * Check if server is running
   */
  isRunning(): boolean {
    return this.server !== null;
  }

  /**
   * Get the server port
   */
  getPort(): number {
    return this.port;
  }
}

/**
 * Create and start a command server
 */
export async function createCommandServer(
  options: ServerOptions,
  commandHandler: CommandHandler
): Promise<CommandServer> {
  const server = new CommandServer(options, commandHandler);
  await server.start();
  return server;
}
