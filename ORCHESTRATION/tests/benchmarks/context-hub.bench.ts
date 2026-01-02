import { describe, bench } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';
import { ContextHub } from '../../lib/context-hub.js';
import type { Prompt } from '../../schemas/schemaModules/contracts.js';

// Setup temp directory once for all benchmarks
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bench-context-hub-'));
const hubBasePath = path.join(tempDir, 'context-hub');

// Create base directories
fs.mkdirSync(path.join(hubBasePath, 'sessions'), { recursive: true });
fs.mkdirSync(path.join(hubBasePath, 'pending-plans'), { recursive: true });
fs.mkdirSync(path.join(hubBasePath, 'templates'), { recursive: true });

// Create some test sessions for listSessions benchmarks
const sessionsPath = path.join(hubBasePath, 'sessions');
for (let i = 0; i < 10; i++) {
  fs.mkdirSync(path.join(sessionsPath, `session-${i}`), { recursive: true });
}

// Pre-create a hub with proper session directory for artifact operations
const artifactHub = new ContextHub({ basePath: hubBasePath });
const artifactSessionId = artifactHub.getSessionId();
const sessionPath = artifactHub.getSessionPath();
fs.mkdirSync(sessionPath, { recursive: true });

// Helper to create valid Prompt objects
function createBenchPrompt(sessionId: string): Prompt {
  return {
    id: randomUUID(),
    type: 'prompt',
    metadata: {
      sessionId,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
    request: {
      description: 'Benchmark prompt for performance testing',
    },
  };
}

// Pre-write some prompts for read benchmarks
const preWrittenPromptIds: string[] = [];
for (let i = 0; i < 100; i++) {
  const prompt = createBenchPrompt(artifactSessionId);
  artifactHub.writePrompt(prompt);
  preWrittenPromptIds.push(prompt.id);
}
let readIndex = 0;

describe('ContextHub Performance', () => {
  describe('Creation', () => {
    bench('createContextHub without session', () => {
      const hub = new ContextHub({ basePath: hubBasePath });
      void hub.getSessionId();
    });

    bench('createContextHub with explicit session', () => {
      const hub = new ContextHub({
        basePath: hubBasePath,
        sessionId: `session-${randomUUID()}`,
      });
      void hub.getSessionId();
    });
  });

  describe('Session Operations', () => {
    bench('listSessions', () => {
      ContextHub.listSessions(hubBasePath);
    });
  });

  describe('Artifact Operations', () => {
    bench('writePrompt', () => {
      const prompt = createBenchPrompt(artifactSessionId);
      artifactHub.writePrompt(prompt);
    });

    bench('readPrompt', () => {
      // Cycle through pre-written prompts
      const promptId = preWrittenPromptIds[readIndex % preWrittenPromptIds.length];
      readIndex++;
      artifactHub.readPrompt(promptId);
    });

    bench('listPrompts', () => {
      artifactHub.listPrompts();
    });
  });
});
