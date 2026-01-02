/**
 * FACTORIES
 * Factory functions for creating schema instances
 */

import type { Prompt } from "./contracts.js";
import type { TokenUsage } from "./components.js";

// =============================================================================
// ID GENERATORS
// =============================================================================

export function createPromptId(): string {
  return crypto.randomUUID();
}

export function createSessionId(): string {
  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '_',
    String(now.getHours()).padStart(2, '0'),
    '-',
    String(now.getMinutes()).padStart(2, '0')
  ].join('');
  return `${timestamp}_${crypto.randomUUID()}`;
}

export function createTimestamp(): string {
  return new Date().toISOString();
}

// =============================================================================
// OBJECT FACTORIES
// =============================================================================

export function createEmptyPrompt(sessionId: string, description: string): Prompt {
  return {
    id: createPromptId(),
    type: "prompt",
    metadata: {
      sessionId,
      timestamp: createTimestamp(),
      version: "1.0.0"
    },
    request: {
      description
    }
  };
}

export function createTokenUsage(consumed: number, limit = 120000): TokenUsage {
  const remaining = Math.max(0, limit - consumed);
  const percentage = Math.round((consumed / limit) * 100);
  return { consumed, limit, remaining, percentage };
}
