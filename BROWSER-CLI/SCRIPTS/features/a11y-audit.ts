/**
 * Accessibility Audit Feature - Phase 3.4 Browser-CLI Improvement
 *
 * Runs accessibility audits using @axe-core/playwright.
 * Commands:
 * - auditAccessibility: Run axe-core audit on current page
 * - getAccessibilityResults: Retrieve last audit results in various formats
 */

import AxeBuilder from '@axe-core/playwright';
import { BaseFeature } from './base-feature';
import { CommandHandler, CommandResponse } from '../core/types';

/**
 * Represents a single accessibility violation node
 */
interface A11yViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
}

/**
 * Represents a single accessibility violation
 */
interface A11yViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor' | null;
  description: string;
  help: string;
  helpUrl: string;
  nodes: A11yViolationNode[];
}

/**
 * Accessibility audit results
 */
interface A11yResults {
  violations: A11yViolation[];
  passes: number;
  incomplete: number;
  timestamp: string;
  url: string;
}

/**
 * Audit command arguments
 */
interface AuditArgs {
  rules?: string;
  include?: string;
  exclude?: string;
}

/**
 * Get results command arguments
 */
interface GetResultsArgs {
  format?: 'json' | 'summary' | 'detailed';
}

/**
 * A11yAuditFeature provides accessibility auditing via axe-core
 */
export class A11yAuditFeature extends BaseFeature {
  public readonly name = 'A11yAudit';
  private lastResults: A11yResults | null = null;

  getCommandHandlers(): Map<string, CommandHandler> {
    return new Map([
      ['auditAccessibility', this.audit.bind(this)],
      ['getAccessibilityResults', this.getResults.bind(this)],
    ]);
  }

  /**
   * Run accessibility audit on the current page
   */
  private async audit(args: AuditArgs): Promise<CommandResponse> {
    try {
      const url = this.page.url();

      // Build axe configuration
      let axeBuilder = new AxeBuilder({ page: this.page });

      // Apply rules/tags (wcag2aa, wcag21aa, best-practice)
      if (args.rules) {
        const ruleSet = args.rules.toLowerCase();
        if (ruleSet === 'best-practice') {
          axeBuilder = axeBuilder.withTags(['best-practice']);
        } else if (ruleSet === 'wcag21aa') {
          axeBuilder = axeBuilder.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
        } else {
          // Default: wcag2aa
          axeBuilder = axeBuilder.withTags(['wcag2a', 'wcag2aa']);
        }
      } else {
        // Default to WCAG 2.0 AA
        axeBuilder = axeBuilder.withTags(['wcag2a', 'wcag2aa']);
      }

      // Apply include selector
      if (args.include) {
        axeBuilder = axeBuilder.include(args.include);
      }

      // Apply exclude selector
      if (args.exclude) {
        axeBuilder = axeBuilder.exclude(args.exclude);
      }

      // Run the audit
      const results = await axeBuilder.analyze();

      // Transform to our format
      const violations: A11yViolation[] = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact as A11yViolation['impact'],
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({
          html: n.html,
          target: n.target as string[],
          failureSummary: n.failureSummary || '',
        })),
      }));

      this.lastResults = {
        violations,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        timestamp: new Date().toISOString(),
        url,
      };

      // Build summary
      const summary = {
        totalViolations: violations.length,
        critical: violations.filter((v) => v.impact === 'critical').length,
        serious: violations.filter((v) => v.impact === 'serious').length,
        moderate: violations.filter((v) => v.impact === 'moderate').length,
        minor: violations.filter((v) => v.impact === 'minor').length,
        passes: results.passes.length,
        incomplete: results.incomplete.length,
        url,
        timestamp: this.lastResults.timestamp,
      };

      this.log(`Audit complete: ${violations.length} violations found`);

      return {
        status: 'ok',
        data: {
          summary,
          criticalIssues: violations.filter((v) => v.impact === 'critical' || v.impact === 'serious'),
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        status: 'error',
        message: `Accessibility audit failed: ${message}`,
      };
    }
  }

  /**
   * Get the last accessibility audit results
   */
  private async getResults(args: GetResultsArgs): Promise<CommandResponse> {
    if (!this.lastResults) {
      return {
        status: 'error',
        message: 'No accessibility results available. Run auditAccessibility first.',
      };
    }

    const format = args.format || 'summary';

    if (format === 'json') {
      return {
        status: 'ok',
        data: this.lastResults,
      };
    }

    if (format === 'detailed') {
      return {
        status: 'ok',
        data: {
          url: this.lastResults.url,
          timestamp: this.lastResults.timestamp,
          summary: {
            totalViolations: this.lastResults.violations.length,
            passes: this.lastResults.passes,
            incomplete: this.lastResults.incomplete,
          },
          violations: this.lastResults.violations,
        },
      };
    }

    // Default: summary format
    const violations = this.lastResults.violations;
    return {
      status: 'ok',
      data: {
        url: this.lastResults.url,
        timestamp: this.lastResults.timestamp,
        summary: {
          totalViolations: violations.length,
          critical: violations.filter((v) => v.impact === 'critical').length,
          serious: violations.filter((v) => v.impact === 'serious').length,
          moderate: violations.filter((v) => v.impact === 'moderate').length,
          minor: violations.filter((v) => v.impact === 'minor').length,
          passes: this.lastResults.passes,
          incomplete: this.lastResults.incomplete,
        },
        criticalIssues: violations
          .filter((v) => v.impact === 'critical' || v.impact === 'serious')
          .map((v) => ({
            id: v.id,
            impact: v.impact,
            help: v.help,
            helpUrl: v.helpUrl,
            affectedElements: v.nodes.length,
          })),
      },
    };
  }
}
