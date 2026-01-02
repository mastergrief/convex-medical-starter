/**
 * Dashboard formatting utilities - number, time, agent, and event formatters.
 */

import type { DashboardState } from "../../lib/dashboard-data.js";
import { BOX, COLORS, PROGRESS } from "./constants.js";

// ===========================================================================
// NUMBER FORMATTING
// ===========================================================================

/**
 * Format a number with thousand separators
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

// ===========================================================================
// TIME FORMATTING
// ===========================================================================

/**
 * Format elapsed time from a start timestamp
 */
export function formatElapsedTime(startTime: string): string {
  try {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const elapsedMs = now - start;

    if (elapsedMs < 0) return "just now";

    const seconds = Math.floor(elapsedMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return `${seconds}s ago`;
    }
  } catch {
    return "unknown";
  }
}

// ===========================================================================
// STATUS FORMATTING
// ===========================================================================

/**
 * Get the ANSI color code for an agent status
 */
export function getStatusColor(
  status: "pending" | "running" | "completed" | "failed"
): string {
  switch (status) {
    case "running":
      return COLORS.green;
    case "pending":
      return COLORS.yellow;
    case "completed":
      return COLORS.blue;
    case "failed":
      return COLORS.red;
    default:
      return COLORS.reset;
  }
}

// ===========================================================================
// AGENT LINE FORMATTING
// ===========================================================================

/**
 * Format an agent line with status color
 */
export function formatAgentLine(
  agent: DashboardState["agents"][number],
  maxWidth: number
): string {
  const statusColor = getStatusColor(agent.status);
  const statusText = agent.status.toUpperCase().padEnd(9);

  // Format time info
  let timeInfo = "";
  if (agent.startTime && agent.status === "running") {
    const elapsed = formatElapsedTime(agent.startTime);
    timeInfo = `started ${elapsed}`;
  } else if (agent.status === "pending") {
    timeInfo = "waiting";
  } else if (agent.status === "completed") {
    timeInfo = "done";
  } else if (agent.status === "failed") {
    timeInfo = "error";
  }

  // Build the line: [type] taskId    STATUS   timeInfo
  const typePart = `[${agent.type}]`.padEnd(12);
  const taskPart = (agent.taskId || "-").padEnd(12);
  const statusPart = statusColor + statusText + COLORS.reset;
  const timePart = timeInfo;

  const line = `${typePart}${taskPart}${statusPart}${timePart}`;

  // Calculate visible length (excluding ANSI codes)
  const visibleLength =
    typePart.length + taskPart.length + statusText.length + timePart.length;

  // Pad to maxWidth (accounting for ANSI codes which don't take visible space)
  const padding = maxWidth - visibleLength;
  return line + " ".repeat(Math.max(0, padding));
}

// ===========================================================================
// EVENT LINE FORMATTING
// ===========================================================================

/**
 * Format an event line
 */
export function formatEventLine(
  event: DashboardState["recentEvents"][number],
  maxWidth: number
): string {
  // Extract time from ISO timestamp (HH:MM:SS)
  let timeStr: string;
  try {
    const date = new Date(event.timestamp);
    timeStr = date.toTimeString().slice(0, 8); // HH:MM:SS
  } catch {
    timeStr = event.timestamp.slice(11, 19);
  }

  // Truncate ID to fit
  const typeWidth = 12;
  const idWidth = maxWidth - timeStr.length - typeWidth - 4; // Spacing
  const truncatedId =
    event.id.length > idWidth
      ? event.id.slice(0, idWidth - 3) + "..."
      : event.id;

  const typePart = event.type.padEnd(typeWidth);
  const idPart = truncatedId.padEnd(idWidth);

  return `${COLORS.dim}${timeStr}${COLORS.reset}  ${typePart}${idPart}`;
}

// ===========================================================================
// PROGRESS BAR
// ===========================================================================

/**
 * Create a progress bar
 * @param percentage - Progress percentage (0-100)
 * @param barWidth - Width of the bar in characters
 */
export function createProgressBar(percentage: number, barWidth: number): string {
  const normalizedPercentage = Math.min(100, Math.max(0, percentage));
  const filledCount = Math.round((normalizedPercentage / 100) * barWidth);
  const emptyCount = barWidth - filledCount;

  return PROGRESS.filled.repeat(filledCount) + PROGRESS.empty.repeat(emptyCount);
}

// ===========================================================================
// SECTION HEADER
// ===========================================================================

/**
 * Create a section header with title centered in the border
 */
export function createSectionHeader(title: string, width: number): string {
  const leftPadding = 2;
  const rightWidth = width - 2 - leftPadding - title.length;

  return (
    BOX.topLeft +
    BOX.horizontal.repeat(leftPadding) +
    title +
    BOX.horizontal.repeat(Math.max(0, rightWidth)) +
    BOX.topRight
  );
}
