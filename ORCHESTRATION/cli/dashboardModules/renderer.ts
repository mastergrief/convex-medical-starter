/**
 * Dashboard render functions - standalone rendering functions that take state as parameter.
 */

import type { DashboardState } from "../../lib/dashboard-data.js";
import type { DashboardConfig } from "../../lib/dashboard-types.js";
import { BOX, COLORS } from "./constants.js";
import {
  createProgressBar,
  createSectionHeader,
  formatAgentLine,
  formatEventLine,
  formatNumber
} from "./formatters.js";

// ===========================================================================
// HEADER RENDERING
// ===========================================================================

/**
 * Render the header section with session info
 */
export function renderHeader(state: DashboardState): string {
  const width = 60;
  const innerWidth = width - 4; // Account for borders and padding

  const title = "ORCHESTRATION DASHBOARD";
  const sessionLine = `Session: ${state.session.id}`;
  const timeLine = `Last Update: ${state.session.lastModified}`;

  const lines = [
    BOX.doubleTopLeft +
      BOX.doubleHorizontal.repeat(width - 2) +
      BOX.doubleTopRight,
    BOX.doubleVertical +
      "  " +
      COLORS.bold +
      title.padEnd(innerWidth) +
      COLORS.reset +
      BOX.doubleVertical,
    BOX.doubleVertical +
      "  " +
      COLORS.dim +
      sessionLine.slice(0, innerWidth).padEnd(innerWidth) +
      COLORS.reset +
      BOX.doubleVertical,
    BOX.doubleVertical +
      "  " +
      COLORS.dim +
      timeLine.slice(0, innerWidth).padEnd(innerWidth) +
      COLORS.reset +
      BOX.doubleVertical,
    BOX.doubleBottomLeft +
      BOX.doubleHorizontal.repeat(width - 2) +
      BOX.doubleBottomRight
  ];

  return lines.join("\n");
}

// ===========================================================================
// PHASE PROGRESS RENDERING
// ===========================================================================

/**
 * Render the phase progress section
 */
export function renderPhaseProgress(state: DashboardState): string {
  const width = 60;
  const innerWidth = width - 4;

  const sectionTitle = " Current Phase ";
  const titleLine = createSectionHeader(sectionTitle, width);

  let phaseInfo: string;
  let progressBar: string;

  if (state.currentPhase) {
    const phase = state.currentPhase;
    phaseInfo = `Phase: ${phase.id} (${phase.name})`;
    progressBar = createProgressBar(phase.progress, 30);
    progressBar = `Progress: ${progressBar} ${phase.progress}%`;
  } else {
    phaseInfo = "Phase: (none active)";
    progressBar = "Progress: (no plan loaded)";
  }

  const lines = [
    titleLine,
    BOX.vertical +
      "  " +
      phaseInfo.slice(0, innerWidth).padEnd(innerWidth) +
      BOX.vertical,
    BOX.vertical +
      "  " +
      progressBar.slice(0, innerWidth).padEnd(innerWidth) +
      BOX.vertical,
    BOX.bottomLeft + BOX.horizontal.repeat(width - 2) + BOX.bottomRight
  ];

  return lines.join("\n");
}

// ===========================================================================
// AGENT LIST RENDERING
// ===========================================================================

/**
 * Render the agent list section with status colors
 */
export function renderAgentList(state: DashboardState): string {
  const width = 60;
  const innerWidth = width - 4;

  const agentCount = state.agents.length;
  const sectionTitle = ` Active Agents (${agentCount}) `;
  const titleLine = createSectionHeader(sectionTitle, width);

  const lines: string[] = [titleLine];

  if (state.agents.length === 0) {
    const emptyMsg = "(no active agents)";
    lines.push(
      BOX.vertical + "  " + emptyMsg.padEnd(innerWidth) + BOX.vertical
    );
  } else {
    for (const agent of state.agents) {
      const agentLine = formatAgentLine(agent, innerWidth);
      lines.push(BOX.vertical + "  " + agentLine + BOX.vertical);
    }
  }

  lines.push(
    BOX.bottomLeft + BOX.horizontal.repeat(width - 2) + BOX.bottomRight
  );

  return lines.join("\n");
}

// ===========================================================================
// TOKEN BUDGET RENDERING
// ===========================================================================

/**
 * Render the token budget section
 */
export function renderTokenBudget(state: DashboardState): string {
  const width = 60;
  const innerWidth = width - 4;

  const sectionTitle = " Token Budget ";
  const titleLine = createSectionHeader(sectionTitle, width);

  const { limit, consumed, remaining, percentage } = state.tokenBudget;

  const consumedLine = `Consumed:  ${formatNumber(consumed)} / ${formatNumber(limit)}  (${Math.round(percentage)}%)`;
  const remainingLine = `Remaining: ${formatNumber(remaining)}`;
  const progressBar = createProgressBar(percentage, 45);
  const progressLine = `${progressBar} ${Math.round(percentage)}%`;

  const lines = [
    titleLine,
    BOX.vertical +
      "  " +
      consumedLine.slice(0, innerWidth).padEnd(innerWidth) +
      BOX.vertical,
    BOX.vertical +
      "  " +
      remainingLine.slice(0, innerWidth).padEnd(innerWidth) +
      BOX.vertical,
    BOX.vertical +
      "  " +
      progressLine.slice(0, innerWidth).padEnd(innerWidth) +
      BOX.vertical,
    BOX.bottomLeft + BOX.horizontal.repeat(width - 2) + BOX.bottomRight
  ];

  return lines.join("\n");
}

// ===========================================================================
// EVENT LOG RENDERING
// ===========================================================================

/**
 * Render the event log section
 */
export function renderEventLog(
  state: DashboardState,
  config: DashboardConfig
): string {
  const width = 60;
  const innerWidth = width - 4;

  const sectionTitle = " Recent Events ";
  const titleLine = createSectionHeader(sectionTitle, width);

  const lines: string[] = [titleLine];

  // Limit events to config maxEvents
  const events = state.recentEvents.slice(-config.maxEvents);

  if (events.length === 0) {
    const emptyMsg = "(no events)";
    lines.push(
      BOX.vertical + "  " + emptyMsg.padEnd(innerWidth) + BOX.vertical
    );
  } else {
    for (const event of events) {
      const eventLine = formatEventLine(event, innerWidth);
      lines.push(BOX.vertical + "  " + eventLine + BOX.vertical);
    }
  }

  lines.push(
    BOX.bottomLeft + BOX.horizontal.repeat(width - 2) + BOX.bottomRight
  );

  return lines.join("\n");
}

// ===========================================================================
// HELP BAR RENDERING
// ===========================================================================

/**
 * Render the help bar at the bottom
 */
export function renderHelpBar(): string {
  return COLORS.dim + "  [q] Quit  [r] Refresh" + COLORS.reset;
}

// ===========================================================================
// FULL DASHBOARD RENDER
// ===========================================================================

/**
 * Main render function - builds and returns the full dashboard output
 */
export function renderDashboard(
  state: DashboardState,
  config: DashboardConfig
): string {
  return [
    renderHeader(state),
    "",
    renderPhaseProgress(state),
    "",
    renderAgentList(state),
    "",
    renderTokenBudget(state),
    "",
    renderEventLog(state, config),
    "",
    renderHelpBar()
  ].join("\n");
}
