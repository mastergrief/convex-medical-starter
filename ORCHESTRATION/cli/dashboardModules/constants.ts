/**
 * Dashboard UI constants - ANSI colors, box drawing, and progress bar characters.
 */

// ===========================================================================
// ANSI COLOR CODES
// ===========================================================================

export const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",

  // Status colors
  green: "\x1b[32m", // running
  yellow: "\x1b[33m", // pending
  blue: "\x1b[34m", // completed
  red: "\x1b[31m", // failed

  // UI colors
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  white: "\x1b[37m"
} as const;

// ===========================================================================
// BOX DRAWING CHARACTERS
// ===========================================================================

export const BOX = {
  // Double line (header)
  doubleTopLeft: "\u2554", // ╔
  doubleTopRight: "\u2557", // ╗
  doubleBottomLeft: "\u255A", // ╚
  doubleBottomRight: "\u255D", // ╝
  doubleHorizontal: "\u2550", // ═
  doubleVertical: "\u2551", // ║

  // Single line (sections)
  topLeft: "\u250C", // ┌
  topRight: "\u2510", // ┐
  bottomLeft: "\u2514", // └
  bottomRight: "\u2518", // ┘
  horizontal: "\u2500", // ─
  vertical: "\u2502" // │
} as const;

// ===========================================================================
// PROGRESS BAR CHARACTERS
// ===========================================================================

export const PROGRESS = {
  filled: "\u2588", // █
  empty: "\u2591" // ░
} as const;
