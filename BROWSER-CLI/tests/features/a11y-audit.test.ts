/**
 * A11yAuditFeature Unit Tests
 * Tests accessibility auditing via axe-core
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { Page } from 'playwright';

// Use vi.hoisted to create mock functions that are available during hoisting
const { mockAnalyze, mockWithTags, mockInclude, mockExclude, MockAxeBuilder } = vi.hoisted(() => {
  const analyze = vi.fn();
  const withTags = vi.fn();
  const include = vi.fn();
  const exclude = vi.fn();

  // Create the mock AxeBuilder class
  class MockAxeBuilderClass {
    private _page: unknown;

    constructor(options: { page: unknown }) {
      this._page = options.page;
    }

    withTags(tags: string[]) {
      withTags(tags);
      return this;
    }

    include(selector: string) {
      include(selector);
      return this;
    }

    exclude(selector: string) {
      exclude(selector);
      return this;
    }

    analyze() {
      return analyze();
    }
  }

  return {
    mockAnalyze: analyze,
    mockWithTags: withTags,
    mockInclude: include,
    mockExclude: exclude,
    MockAxeBuilder: MockAxeBuilderClass,
  };
});

// Mock @axe-core/playwright with the hoisted class
vi.mock('@axe-core/playwright', () => {
  return { default: MockAxeBuilder };
});

// Import after mocking
import { A11yAuditFeature } from '../../SCRIPTS/features/a11y-audit';

/**
 * Create mock axe-core results
 */
function createMockAxeResults(options?: {
  violations?: Array<{
    id: string;
    impact: 'critical' | 'serious' | 'moderate' | 'minor' | null;
    description: string;
    help: string;
    helpUrl: string;
    nodes: Array<{ html: string; target: string[]; failureSummary?: string }>;
  }>;
  passes?: Array<{ id: string }>;
  incomplete?: Array<{ id: string }>;
}) {
  return {
    violations: options?.violations ?? [
      {
        id: 'color-contrast',
        impact: 'serious' as const,
        description: 'Elements must have sufficient color contrast',
        help: 'Color contrast between foreground and background is insufficient',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/color-contrast',
        nodes: [
          {
            html: '<div class="low-contrast">Text</div>',
            target: ['.low-contrast'],
            failureSummary: 'Fix any of the following: Element has insufficient color contrast',
          },
        ],
      },
    ],
    passes: options?.passes ?? [{ id: 'html-has-lang' }, { id: 'valid-lang' }],
    incomplete: options?.incomplete ?? [],
  };
}

describe('A11yAuditFeature', () => {
  let mockPage: MockPage;
  let feature: A11yAuditFeature;

  beforeEach(() => {
    vi.clearAllMocks();
    mockPage = createMockPage();
    mockPage.url = vi.fn().mockReturnValue('http://localhost:5173/test');
    feature = new A11yAuditFeature(mockPage as unknown as Page);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 2 command handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(2);
      expect(handlers.has('auditAccessibility')).toBe(true);
      expect(handlers.has('getAccessibilityResults')).toBe(true);
    });
  });

  describe('feature name', () => {
    it('has correct name property', () => {
      expect(feature.name).toBe('A11yAudit');
    });
  });

  describe('auditAccessibility', () => {
    it('runs audit and stores results', async () => {
      const axeResults = createMockAxeResults();
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      const auditHandler = handlers.get('auditAccessibility')!;

      const result = await auditHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.summary).toBeDefined();
      expect(result.data?.summary.totalViolations).toBe(1);
      expect(result.data?.summary.passes).toBe(2);
      expect(result.data?.summary.url).toBe('http://localhost:5173/test');
    });

    it('filters by included selector', async () => {
      const axeResults = createMockAxeResults();
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      const auditHandler = handlers.get('auditAccessibility')!;

      await auditHandler({ include: '.main-content' });

      expect(mockInclude).toHaveBeenCalledWith('.main-content');
    });

    it('filters by excluded selector', async () => {
      const axeResults = createMockAxeResults();
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      const auditHandler = handlers.get('auditAccessibility')!;

      await auditHandler({ exclude: '.skip-a11y' });

      expect(mockExclude).toHaveBeenCalledWith('.skip-a11y');
    });

    it('applies wcag21aa rule set', async () => {
      const axeResults = createMockAxeResults();
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      const auditHandler = handlers.get('auditAccessibility')!;

      await auditHandler({ rules: 'wcag21aa' });

      expect(mockWithTags).toHaveBeenCalledWith(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
    });

    it('applies best-practice rule set', async () => {
      const axeResults = createMockAxeResults();
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      const auditHandler = handlers.get('auditAccessibility')!;

      await auditHandler({ rules: 'best-practice' });

      expect(mockWithTags).toHaveBeenCalledWith(['best-practice']);
    });

    it('applies default wcag2aa rule set', async () => {
      const axeResults = createMockAxeResults();
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      const auditHandler = handlers.get('auditAccessibility')!;

      await auditHandler({});

      expect(mockWithTags).toHaveBeenCalledWith(['wcag2a', 'wcag2aa']);
    });

    it('categorizes violations by impact level', async () => {
      const axeResults = createMockAxeResults({
        violations: [
          {
            id: 'critical-issue',
            impact: 'critical',
            description: 'Critical issue',
            help: 'Fix critical',
            helpUrl: 'https://example.com/critical',
            nodes: [{ html: '<div>...</div>', target: ['.critical'] }],
          },
          {
            id: 'serious-issue',
            impact: 'serious',
            description: 'Serious issue',
            help: 'Fix serious',
            helpUrl: 'https://example.com/serious',
            nodes: [{ html: '<div>...</div>', target: ['.serious'] }],
          },
          {
            id: 'moderate-issue',
            impact: 'moderate',
            description: 'Moderate issue',
            help: 'Fix moderate',
            helpUrl: 'https://example.com/moderate',
            nodes: [{ html: '<div>...</div>', target: ['.moderate'] }],
          },
          {
            id: 'minor-issue',
            impact: 'minor',
            description: 'Minor issue',
            help: 'Fix minor',
            helpUrl: 'https://example.com/minor',
            nodes: [{ html: '<div>...</div>', target: ['.minor'] }],
          },
        ],
        passes: [],
        incomplete: [],
      });
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      const auditHandler = handlers.get('auditAccessibility')!;

      const result = await auditHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.summary.totalViolations).toBe(4);
      expect(result.data?.summary.critical).toBe(1);
      expect(result.data?.summary.serious).toBe(1);
      expect(result.data?.summary.moderate).toBe(1);
      expect(result.data?.summary.minor).toBe(1);
    });

    it('returns critical issues in response', async () => {
      const axeResults = createMockAxeResults({
        violations: [
          {
            id: 'critical-issue',
            impact: 'critical',
            description: 'Critical issue',
            help: 'Fix critical',
            helpUrl: 'https://example.com/critical',
            nodes: [{ html: '<div>...</div>', target: ['.critical'] }],
          },
          {
            id: 'minor-issue',
            impact: 'minor',
            description: 'Minor issue',
            help: 'Fix minor',
            helpUrl: 'https://example.com/minor',
            nodes: [{ html: '<div>...</div>', target: ['.minor'] }],
          },
        ],
        passes: [],
        incomplete: [],
      });
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      const auditHandler = handlers.get('auditAccessibility')!;

      const result = await auditHandler({});

      expect(result.status).toBe('ok');
      // criticalIssues includes critical and serious only
      expect(result.data?.criticalIssues).toHaveLength(1);
      expect(result.data?.criticalIssues[0].id).toBe('critical-issue');
    });

    it('handles audit errors gracefully', async () => {
      mockAnalyze.mockRejectedValue(new Error('axe-core failed'));

      const handlers = feature.getCommandHandlers();
      const auditHandler = handlers.get('auditAccessibility')!;

      const result = await auditHandler({});

      expect(result.status).toBe('error');
      expect(result.message).toContain('Accessibility audit failed');
      expect(result.message).toContain('axe-core failed');
    });
  });

  describe('getAccessibilityResults', () => {
    it('returns error when no audit has run', async () => {
      const handlers = feature.getCommandHandlers();
      const getResultsHandler = handlers.get('getAccessibilityResults')!;

      const result = await getResultsHandler({});

      expect(result.status).toBe('error');
      expect(result.message).toBe('No accessibility results available. Run auditAccessibility first.');
    });

    it('returns summary format by default', async () => {
      // Run an audit first
      const axeResults = createMockAxeResults({
        violations: [
          {
            id: 'serious-issue',
            impact: 'serious',
            description: 'Serious issue',
            help: 'Fix serious',
            helpUrl: 'https://example.com/serious',
            nodes: [{ html: '<div>...</div>', target: ['.serious'] }],
          },
        ],
        passes: [{ id: 'pass1' }, { id: 'pass2' }, { id: 'pass3' }],
        incomplete: [{ id: 'incomplete1' }],
      });
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      await handlers.get('auditAccessibility')!({});

      const getResultsHandler = handlers.get('getAccessibilityResults')!;
      const result = await getResultsHandler({});

      expect(result.status).toBe('ok');
      expect(result.data?.summary).toBeDefined();
      expect(result.data?.summary.totalViolations).toBe(1);
      expect(result.data?.summary.serious).toBe(1);
      expect(result.data?.summary.passes).toBe(3);
      expect(result.data?.summary.incomplete).toBe(1);
      expect(result.data?.criticalIssues).toBeDefined();
    });

    it('returns JSON format when requested', async () => {
      // Run an audit first
      const axeResults = createMockAxeResults();
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      await handlers.get('auditAccessibility')!({});

      const getResultsHandler = handlers.get('getAccessibilityResults')!;
      const result = await getResultsHandler({ format: 'json' });

      expect(result.status).toBe('ok');
      // JSON format returns raw results directly
      expect(result.data?.violations).toBeDefined();
      expect(result.data?.passes).toBe(2);
      expect(result.data?.timestamp).toBeDefined();
      expect(result.data?.url).toBeDefined();
    });

    it('returns detailed format when requested', async () => {
      // Run an audit first
      const axeResults = createMockAxeResults({
        violations: [
          {
            id: 'color-contrast',
            impact: 'serious',
            description: 'Insufficient contrast',
            help: 'Increase contrast',
            helpUrl: 'https://example.com/contrast',
            nodes: [
              { html: '<div>...</div>', target: ['.low-contrast'], failureSummary: 'Fix contrast' },
            ],
          },
        ],
        passes: [{ id: 'pass1' }],
        incomplete: [],
      });
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      await handlers.get('auditAccessibility')!({});

      const getResultsHandler = handlers.get('getAccessibilityResults')!;
      const result = await getResultsHandler({ format: 'detailed' });

      expect(result.status).toBe('ok');
      expect(result.data?.url).toBeDefined();
      expect(result.data?.timestamp).toBeDefined();
      expect(result.data?.summary.totalViolations).toBe(1);
      expect(result.data?.violations).toHaveLength(1);
      expect(result.data?.violations[0].id).toBe('color-contrast');
      expect(result.data?.violations[0].nodes).toHaveLength(1);
    });

    it('includes violation counts by impact level in summary', async () => {
      // Run an audit with various impact levels
      const axeResults = createMockAxeResults({
        violations: [
          {
            id: 'critical-1',
            impact: 'critical',
            description: 'Critical',
            help: 'Fix',
            helpUrl: 'https://example.com',
            nodes: [{ html: '<div>...</div>', target: ['.c1'] }],
          },
          {
            id: 'critical-2',
            impact: 'critical',
            description: 'Critical 2',
            help: 'Fix',
            helpUrl: 'https://example.com',
            nodes: [{ html: '<div>...</div>', target: ['.c2'] }],
          },
          {
            id: 'serious-1',
            impact: 'serious',
            description: 'Serious',
            help: 'Fix',
            helpUrl: 'https://example.com',
            nodes: [{ html: '<div>...</div>', target: ['.s1'] }],
          },
          {
            id: 'moderate-1',
            impact: 'moderate',
            description: 'Moderate',
            help: 'Fix',
            helpUrl: 'https://example.com',
            nodes: [{ html: '<div>...</div>', target: ['.m1'] }],
          },
        ],
        passes: [],
        incomplete: [],
      });
      mockAnalyze.mockResolvedValue(axeResults);

      const handlers = feature.getCommandHandlers();
      await handlers.get('auditAccessibility')!({});

      const getResultsHandler = handlers.get('getAccessibilityResults')!;
      const result = await getResultsHandler({ format: 'summary' });

      expect(result.status).toBe('ok');
      expect(result.data?.summary.critical).toBe(2);
      expect(result.data?.summary.serious).toBe(1);
      expect(result.data?.summary.moderate).toBe(1);
      expect(result.data?.summary.minor).toBe(0);
    });
  });
});
