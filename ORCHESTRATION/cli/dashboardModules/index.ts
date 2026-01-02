/**
 * Dashboard modules barrel file - re-exports all dashboard components.
 */

// Constants
export { BOX, COLORS, PROGRESS } from "./constants.js";

// Formatters
export {
  createProgressBar,
  createSectionHeader,
  formatAgentLine,
  formatElapsedTime,
  formatEventLine,
  formatNumber,
  getStatusColor
} from "./formatters.js";

// Renderer
export {
  renderAgentList,
  renderDashboard,
  renderEventLog,
  renderHeader,
  renderHelpBar,
  renderPhaseProgress,
  renderTokenBudget
} from "./renderer.js";

// Dashboard class
export { OrchestrationDashboard } from "./dashboard-class.js";
