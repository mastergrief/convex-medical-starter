/**
 * CoreActionsFeature Unit Tests
 * Tests command handler registration and execution
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { CoreActionsFeature } from '../../SCRIPTS/features/core-actions';
import { Page } from 'playwright';

// Extended mock page with additional methods needed by CoreActionsFeature
interface ExtendedMockPage extends MockPage {
  selectOption: ReturnType<typeof vi.fn>;
  setInputFiles: ReturnType<typeof vi.fn>;
  context: ReturnType<typeof vi.fn>;
}

function createExtendedMockPage(overrides?: Partial<ExtendedMockPage>): ExtendedMockPage {
  const baseMock = createMockPage();

  // Add locator with more complete mock
  const mockLocator = {
    click: vi.fn().mockResolvedValue(undefined),
    dblclick: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    hover: vi.fn().mockResolvedValue(undefined),
    waitFor: vi.fn().mockResolvedValue(undefined),
    isVisible: vi.fn().mockResolvedValue(true),
    isEnabled: vi.fn().mockResolvedValue(true),
    textContent: vi.fn().mockResolvedValue('mock text'),
    getAttribute: vi.fn().mockResolvedValue(null),
    boundingBox: vi.fn().mockResolvedValue({ x: 0, y: 0, width: 100, height: 50 }),
    dragTo: vi.fn().mockResolvedValue(undefined),
    focus: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    pressSequentially: vi.fn().mockResolvedValue(undefined),
    evaluate: vi.fn().mockResolvedValue(undefined),
  };

  return {
    ...baseMock,
    locator: vi.fn().mockReturnValue(mockLocator),
    selectOption: vi.fn().mockResolvedValue(undefined),
    setInputFiles: vi.fn().mockResolvedValue(undefined),
    context: vi.fn().mockReturnValue({
      cookies: vi.fn().mockResolvedValue([]),
      addCookies: vi.fn().mockResolvedValue(undefined),
    }),
    ...overrides,
  };
}

describe('CoreActionsFeature', () => {
  let mockPage: ExtendedMockPage;
  let feature: CoreActionsFeature;

  beforeEach(() => {
    mockPage = createExtendedMockPage();
    feature = new CoreActionsFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 18 command handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(18);
    });

    it('registers navigate handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('navigate')).toBe(true);
      expect(typeof handlers.get('navigate')).toBe('function');
    });

    it('registers screenshot handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('screenshot')).toBe(true);
    });

    it('registers evaluate handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('evaluate')).toBe(true);
    });

    it('registers click handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('click')).toBe(true);
    });

    it('registers dblclick handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('dblclick')).toBe(true);
    });

    it('registers type handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('type')).toBe(true);
    });

    it('registers pressKey handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('pressKey')).toBe(true);
    });

    it('registers hover handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('hover')).toBe(true);
    });

    it('registers drag handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('drag')).toBe(true);
    });

    it('registers selectOption handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('selectOption')).toBe(true);
    });

    it('registers fillForm handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('fillForm')).toBe(true);
    });

    it('registers uploadFile handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('uploadFile')).toBe(true);
    });

    it('registers resize handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('resize')).toBe(true);
    });

    it('registers wait handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('wait')).toBe(true);
    });

    it('registers waitForSelector handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('waitForSelector')).toBe(true);
    });
  });

  describe('navigate command', () => {
    it('returns success response with URL', async () => {
      const handlers = feature.getCommandHandlers();
      const navigate = handlers.get('navigate')!;

      const result = await navigate({ url: 'http://localhost:5173' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('url');
      expect(result.code).toContain('page.goto');
    });

    it('calls page.goto with correct URL', async () => {
      const handlers = feature.getCommandHandlers();
      const navigate = handlers.get('navigate')!;

      await navigate({ url: 'http://example.com' });

      expect(mockPage.goto).toHaveBeenCalled();
    });

    it('returns error on navigation failure', async () => {
      mockPage.goto.mockRejectedValue(new Error('Navigation timeout'));
      const handlers = feature.getCommandHandlers();
      const navigate = handlers.get('navigate')!;

      const result = await navigate({ url: 'http://invalid' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Navigation timeout');
    });

    it('handles waitUntil option', async () => {
      const handlers = feature.getCommandHandlers();
      const navigate = handlers.get('navigate')!;

      const result = await navigate({ url: 'http://localhost:5173', waitUntil: 'networkidle' });

      expect(result.status).toBe('ok');
      expect(result.code).toContain('networkidle');
    });
  });

  describe('screenshot command', () => {
    it('returns success response with path', async () => {
      const handlers = feature.getCommandHandlers();
      const screenshot = handlers.get('screenshot')!;

      const result = await screenshot({ path: 'test.png' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('path', 'test.png');
      expect(result.code).toContain('page.screenshot');
    });

    it('calls page.screenshot with correct path', async () => {
      const handlers = feature.getCommandHandlers();
      const screenshot = handlers.get('screenshot')!;

      await screenshot({ path: '/tmp/screenshot.png' });

      expect(mockPage.screenshot).toHaveBeenCalledWith({ path: '/tmp/screenshot.png' });
    });

    it('returns error on screenshot failure', async () => {
      mockPage.screenshot.mockRejectedValue(new Error('Write permission denied'));
      const handlers = feature.getCommandHandlers();
      const screenshot = handlers.get('screenshot')!;

      const result = await screenshot({ path: '/readonly/test.png' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('permission denied');
    });
  });

  describe('evaluate command', () => {
    it('returns success response with result', async () => {
      mockPage.evaluate.mockResolvedValue({ foo: 'bar' });
      const handlers = feature.getCommandHandlers();
      const evaluate = handlers.get('evaluate')!;

      const result = await evaluate({ code: 'document.title' });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('result');
      expect(result.data).toHaveProperty('url');
      expect(result.data).toHaveProperty('title');
      expect(result.code).toContain('page.evaluate');
    });

    it('returns error on syntax error', async () => {
      mockPage.evaluate.mockRejectedValue(new Error('Syntax error'));
      const handlers = feature.getCommandHandlers();
      const evaluate = handlers.get('evaluate')!;

      const result = await evaluate({ code: 'invalid{{syntax' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Syntax error');
    });
  });

  describe('click command', () => {
    it('returns success response with code', async () => {
      const handlers = feature.getCommandHandlers();
      const click = handlers.get('click')!;

      const result = await click({ selector: '.button' });

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.click');
    });

    it('returns error when selector not found', async () => {
      mockPage.click.mockRejectedValue(new Error('Element not found'));
      const handlers = feature.getCommandHandlers();
      const click = handlers.get('click')!;

      const result = await click({ selector: '.nonexistent' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('not found');
    });
  });

  describe('dblclick command', () => {
    it('returns success response with code', async () => {
      const handlers = feature.getCommandHandlers();
      const dblclick = handlers.get('dblclick')!;

      const result = await dblclick({ selector: '.card' });

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.dblclick');
    });

    it('returns error when selector not found', async () => {
      mockPage.dblclick.mockRejectedValue(new Error('Element not visible'));
      const handlers = feature.getCommandHandlers();
      const dblclick = handlers.get('dblclick')!;

      const result = await dblclick({ selector: '.hidden' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('not visible');
    });
  });

  describe('type command', () => {
    it('returns success response with code', async () => {
      // Mock evaluate for element type detection
      mockPage.evaluate.mockResolvedValue({
        tagName: 'input',
        type: 'text',
        contentEditable: 'false',
        shadowRoot: false,
      });

      const handlers = feature.getCommandHandlers();
      const type = handlers.get('type')!;

      const result = await type({ selector: '#email', text: 'test@test.com' });

      expect(result.status).toBe('ok');
    });

    it('returns error when element not found', async () => {
      mockPage.evaluate.mockResolvedValue(null);
      const handlers = feature.getCommandHandlers();
      const type = handlers.get('type')!;

      const result = await type({ selector: '#nonexistent', text: 'test' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('not found');
    });
  });

  describe('pressKey command', () => {
    it('returns success response with code', async () => {
      const handlers = feature.getCommandHandlers();
      const pressKey = handlers.get('pressKey')!;

      const result = await pressKey({ key: 'Enter' });

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.keyboard.press');
      expect(result.code).toContain('Enter');
    });

    it('calls keyboard.press with correct key', async () => {
      const handlers = feature.getCommandHandlers();
      const pressKey = handlers.get('pressKey')!;

      await pressKey({ key: 'Tab' });

      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Tab');
    });
  });

  describe('hover command', () => {
    it('returns success response with code', async () => {
      const handlers = feature.getCommandHandlers();
      const hover = handlers.get('hover')!;

      const result = await hover({ selector: '.menu-item' });

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.hover');
    });

    it('returns error when element not found', async () => {
      mockPage.hover.mockRejectedValue(new Error('Element not attached'));
      const handlers = feature.getCommandHandlers();
      const hover = handlers.get('hover')!;

      const result = await hover({ selector: '.detached' });

      expect(result.status).toBe('error');
      expect(result.message).toContain('not attached');
    });
  });

  describe('drag command', () => {
    it('returns success response with code', async () => {
      const handlers = feature.getCommandHandlers();
      const drag = handlers.get('drag')!;

      const result = await drag({ source: '.source', target: '.target' });

      expect(result.status).toBe('ok');
      expect(result.code).toContain('dragTo');
    });
  });

  describe('selectOption command', () => {
    it('returns success response with code', async () => {
      const handlers = feature.getCommandHandlers();
      const selectOption = handlers.get('selectOption')!;

      const result = await selectOption({ selector: '#dropdown', value: 'option1' });

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.selectOption');
    });

    it('calls page.selectOption with correct args', async () => {
      const handlers = feature.getCommandHandlers();
      const selectOption = handlers.get('selectOption')!;

      await selectOption({ selector: '#country', value: 'US' });

      expect(mockPage.selectOption).toHaveBeenCalledWith('#country', 'US');
    });
  });

  describe('fillForm command', () => {
    it('returns success response with fieldsCount', async () => {
      const handlers = feature.getCommandHandlers();
      const fillForm = handlers.get('fillForm')!;

      const result = await fillForm({
        fields: {
          '#name': 'John',
          '#email': 'john@test.com',
          '#phone': '123-456-7890',
        },
      });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('fieldsCount', 3);
    });

    it('calls page.fill for each field', async () => {
      const handlers = feature.getCommandHandlers();
      const fillForm = handlers.get('fillForm')!;

      await fillForm({
        fields: {
          '#a': '1',
          '#b': '2',
        },
      });

      expect(mockPage.fill).toHaveBeenCalledTimes(2);
      expect(mockPage.fill).toHaveBeenCalledWith('#a', '1');
      expect(mockPage.fill).toHaveBeenCalledWith('#b', '2');
    });
  });

  describe('uploadFile command', () => {
    it('returns success response with code', async () => {
      const handlers = feature.getCommandHandlers();
      const uploadFile = handlers.get('uploadFile')!;

      const result = await uploadFile({ selector: '#file-input', filePath: '/tmp/test.pdf' });

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.setInputFiles');
    });

    it('handles array of files', async () => {
      const handlers = feature.getCommandHandlers();
      const uploadFile = handlers.get('uploadFile')!;

      await uploadFile({
        selector: '#multi-file',
        filePath: ['/tmp/a.pdf', '/tmp/b.pdf'],
      });

      expect(mockPage.setInputFiles).toHaveBeenCalledWith('#multi-file', ['/tmp/a.pdf', '/tmp/b.pdf']);
    });
  });

  describe('resize command', () => {
    it('returns success response with dimensions', async () => {
      const handlers = feature.getCommandHandlers();
      const resize = handlers.get('resize')!;

      const result = await resize({ width: 1920, height: 1080 });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('width', 1920);
      expect(result.data).toHaveProperty('height', 1080);
      expect(result.code).toContain('page.setViewportSize');
    });

    it('calls page.setViewportSize with correct dimensions', async () => {
      const handlers = feature.getCommandHandlers();
      const resize = handlers.get('resize')!;

      await resize({ width: 800, height: 600 });

      expect(mockPage.setViewportSize).toHaveBeenCalledWith({ width: 800, height: 600 });
    });
  });

  describe('wait command', () => {
    it('returns success response with ms', async () => {
      const handlers = feature.getCommandHandlers();
      const wait = handlers.get('wait')!;

      const result = await wait({ ms: 1000 });

      expect(result.status).toBe('ok');
      expect(result.data).toHaveProperty('ms', 1000);
      expect(result.code).toContain('page.waitForTimeout');
    });

    it('calls page.waitForTimeout with correct duration', async () => {
      const handlers = feature.getCommandHandlers();
      const wait = handlers.get('wait')!;

      await wait({ ms: 500 });

      expect(mockPage.waitForTimeout).toHaveBeenCalledWith(500);
    });
  });

  describe('waitForSelector command', () => {
    it('returns success response with code', async () => {
      const handlers = feature.getCommandHandlers();
      const waitForSelector = handlers.get('waitForSelector')!;

      const result = await waitForSelector({ selector: '.modal' });

      expect(result.status).toBe('ok');
      expect(result.code).toContain('page.waitForSelector');
    });

    it('handles state and timeout options', async () => {
      const handlers = feature.getCommandHandlers();
      const waitForSelector = handlers.get('waitForSelector')!;

      const result = await waitForSelector({
        selector: '.loading',
        state: 'hidden',
        timeout: 5000,
      });

      expect(result.status).toBe('ok');
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.loading', {
        state: 'hidden',
        timeout: 5000,
      });
    });

    it('returns error on timeout', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout waiting for selector'));
      const handlers = feature.getCommandHandlers();
      const waitForSelector = handlers.get('waitForSelector')!;

      const result = await waitForSelector({ selector: '.never-appears', timeout: 100 });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Timeout');
    });
  });
});
