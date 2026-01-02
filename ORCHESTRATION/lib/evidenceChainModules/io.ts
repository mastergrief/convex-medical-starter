/**
 * EVIDENCE CHAIN I/O
 * File operations for loading and saving evidence chains
 */

import * as fs from "fs";
import * as path from "path";
import { EvidenceChainBuilder } from "./builder.js";

// =============================================================================
// FILE OPERATIONS
// =============================================================================

/**
 * Load an evidence chain from a file
 */
export function loadEvidenceChain(filePath: string): EvidenceChainBuilder {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Evidence chain file not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf-8");
  return EvidenceChainBuilder.fromJSON(content);
}

/**
 * Save an evidence chain to a file
 */
export function saveEvidenceChain(
  chain: EvidenceChainBuilder,
  filePath: string
): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, chain.toJSON(), "utf-8");
}

/**
 * List all evidence chain files in a directory
 */
export function listEvidenceChains(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs
    .readdirSync(dirPath)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(dirPath, file));
}
