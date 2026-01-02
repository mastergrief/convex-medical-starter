/**
 * SemanticSelectorsFeature Tests
 * Tests for semantic selector parsing and element interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPage, MockPage } from '../setup';
import { SemanticSelectorsFeature } from '../../SCRIPTS/features/semantic-selectors';
import { Page } from 'playwright';

// Extended mock page with semantic selector methods
interface ExtendedMockPage extends MockPage {
  getByRole: ReturnType<typeof vi.fn>;
  getByText: ReturnType<typeof vi.fn>;
  getByLabel: ReturnType<typeof vi.fn>;
  getByPlaceholder: ReturnType<typeof vi.fn>;
}

function createMockLocator() {
  return {
    click: vi.fn().mockResolvedValue(undefined),
    dblclick: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    hover: vi.fn().mockResolvedValue(undefined),
    waitFor: vi.fn().mockResolvedValue(undefined),
  };
}

function createExtendedMockPage(): ExtendedMockPage {
  const baseMock = createMockPage();
  const mockLocator = createMockLocator();

  return {
    ...baseMock,
    getByRole: vi.fn().mockReturnValue(mockLocator),
    getByText: vi.fn().mockReturnValue(mockLocator),
    getByLabel: vi.fn().mockReturnValue(mockLocator),
    getByPlaceholder: vi.fn().mockReturnValue(mockLocator),
  };
}

describe('SemanticSelectorsFeature', () => {
  let mockPage: ExtendedMockPage;
  let feature: SemanticSelectorsFeature;

  beforeEach(() => {
    mockPage = createExtendedMockPage();
    feature = new SemanticSelectorsFeature(mockPage as unknown as Page);
  });

  describe('getCommandHandlers', () => {
    it('returns Map with 5 semantic handlers', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers).toBeInstanceOf(Map);
      expect(handlers.size).toBe(5);
    });

    it('registers clickBySemantic handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('clickBySemantic')).toBe(true);
    });

    it('registers dblclickBySemantic handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('dblclickBySemantic')).toBe(true);
    });

    it('registers typeBySemantic handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('typeBySemantic')).toBe(true);
    });

    it('registers hoverBySemantic handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('hoverBySemantic')).toBe(true);
    });

    it('registers waitForSelectorBySemantic handler', () => {
      const handlers = feature.getCommandHandlers();
      expect(handlers.has('waitForSelectorBySemantic')).toBe(true);
    });
  });

  describe('clickBySemantic', () => {
    it('parses role:button:Submit selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'role:button:Submit',
      });

      expect(mockPage.getByRole).toHaveBeenCalledWith('button', { name: 'Submit' });
      expect(mockLocator.click).toHaveBeenCalled();
      expect(result.status).toBe('ok');
      expect(result.data).toEqual({ selector: 'role:button:Submit' });
    });

    it('parses role:button without name', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'role:button',
      });

      expect(mockPage.getByRole).toHaveBeenCalledWith('button');
      expect(mockLocator.click).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('parses text:Learn More selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByText = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'text:Learn More',
      });

      expect(mockPage.getByText).toHaveBeenCalledWith('Learn More');
      expect(mockLocator.click).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('parses label:Email selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByLabel = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'label:Email',
      });

      expect(mockPage.getByLabel).toHaveBeenCalledWith('Email');
      expect(mockLocator.click).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('parses placeholder:Search selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByPlaceholder = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'placeholder:Search',
      });

      expect(mockPage.getByPlaceholder).toHaveBeenCalledWith('Search');
      expect(mockLocator.click).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('handles names with colons correctly', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'role:button:Save:Draft',
      });

      expect(mockPage.getByRole).toHaveBeenCalledWith('button', { name: 'Save:Draft' });
      expect(result.status).toBe('ok');
    });

    it('returns error for invalid format', async () => {
      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'invalid',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid semantic selector');
    });

    it('returns error for unknown selector type', async () => {
      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'unknown:element',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Unknown selector type');
    });

    it('generates correct Playwright code', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'role:button:Submit',
      });

      expect(result.code).toBe("await page.getByRole('button', { name: 'Submit' }).click();");
    });

    it('handles click errors gracefully', async () => {
      const mockLocator = createMockLocator();
      mockLocator.click = vi.fn().mockRejectedValue(new Error('Element not found'));
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'role:button:Submit',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Element not found');
    });
  });

  describe('dblclickBySemantic', () => {
    it('double-clicks via role selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('dblclickBySemantic')!({
        selector: 'role:button:Edit',
      });

      expect(mockPage.getByRole).toHaveBeenCalledWith('button', { name: 'Edit' });
      expect(mockLocator.dblclick).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('double-clicks via text selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByText = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('dblclickBySemantic')!({
        selector: 'text:Open Editor',
      });

      expect(mockPage.getByText).toHaveBeenCalledWith('Open Editor');
      expect(mockLocator.dblclick).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('returns error for invalid format', async () => {
      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('dblclickBySemantic')!({
        selector: 'invalid',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Invalid semantic selector');
    });
  });

  describe('typeBySemantic', () => {
    it('types into input via label selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByLabel = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('typeBySemantic')!({
        selector: 'label:Email',
        text: 'test@example.com',
      });

      expect(mockPage.getByLabel).toHaveBeenCalledWith('Email');
      expect(mockLocator.fill).toHaveBeenCalledWith('test@example.com');
      expect(result.status).toBe('ok');
      expect(result.data).toEqual({ selector: 'label:Email', text: 'test@example.com' });
    });

    it('types into input via placeholder selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByPlaceholder = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('typeBySemantic')!({
        selector: 'placeholder:Enter your name',
        text: 'John Doe',
      });

      expect(mockPage.getByPlaceholder).toHaveBeenCalledWith('Enter your name');
      expect(mockLocator.fill).toHaveBeenCalledWith('John Doe');
      expect(result.status).toBe('ok');
    });

    it('types into input via role selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('typeBySemantic')!({
        selector: 'role:textbox:Username',
        text: 'myuser',
      });

      expect(mockPage.getByRole).toHaveBeenCalledWith('textbox', { name: 'Username' });
      expect(mockLocator.fill).toHaveBeenCalledWith('myuser');
      expect(result.status).toBe('ok');
    });

    it('returns error for text selector (not supported for type)', async () => {
      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('typeBySemantic')!({
        selector: 'text:Some Text',
        text: 'input',
      });

      expect(result.status).toBe('error');
      expect(result.message).toContain('Unknown selector type');
    });

    it('generates correct Playwright code with text', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByLabel = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('typeBySemantic')!({
        selector: 'label:Password',
        text: 'secret123',
      });

      expect(result.code).toBe("await page.getByLabel('Password').fill('secret123');");
    });
  });

  describe('hoverBySemantic', () => {
    it('hovers element via role selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('hoverBySemantic')!({
        selector: 'role:button:Menu',
      });

      expect(mockPage.getByRole).toHaveBeenCalledWith('button', { name: 'Menu' });
      expect(mockLocator.hover).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('hovers element via text selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByText = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('hoverBySemantic')!({
        selector: 'text:Learn More',
      });

      expect(mockPage.getByText).toHaveBeenCalledWith('Learn More');
      expect(mockLocator.hover).toHaveBeenCalled();
      expect(result.status).toBe('ok');
    });

    it('returns error when element not found', async () => {
      const mockLocator = createMockLocator();
      mockLocator.hover = vi.fn().mockRejectedValue(new Error('Element not visible'));
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('hoverBySemantic')!({
        selector: 'role:button:Hidden',
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Element not visible');
    });

    it('generates correct Playwright code', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByText = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('hoverBySemantic')!({
        selector: 'text:Tooltip Trigger',
      });

      expect(result.code).toBe("await page.getByText('Tooltip Trigger').hover();");
    });
  });

  describe('waitForSelectorBySemantic', () => {
    it('waits for element via role selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('waitForSelectorBySemantic')!({
        selector: 'role:dialog:Confirm',
      });

      expect(mockPage.getByRole).toHaveBeenCalledWith('dialog', { name: 'Confirm' });
      expect(mockLocator.waitFor).toHaveBeenCalledWith({ state: undefined, timeout: undefined });
      expect(result.status).toBe('ok');
    });

    it('waits for element with state option', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('waitForSelectorBySemantic')!({
        selector: 'role:dialog:Modal',
        state: 'visible',
      });

      expect(mockLocator.waitFor).toHaveBeenCalledWith({ state: 'visible', timeout: undefined });
      expect(result.status).toBe('ok');
    });

    it('waits for element with timeout option', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('waitForSelectorBySemantic')!({
        selector: 'role:button:Submit',
        timeout: 5000,
      });

      expect(mockLocator.waitFor).toHaveBeenCalledWith({ state: undefined, timeout: 5000 });
      expect(result.status).toBe('ok');
    });

    it('waits for element via text selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByText = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('waitForSelectorBySemantic')!({
        selector: 'text:Loading Complete',
        state: 'attached',
      });

      expect(mockPage.getByText).toHaveBeenCalledWith('Loading Complete');
      expect(mockLocator.waitFor).toHaveBeenCalledWith({ state: 'attached', timeout: undefined });
      expect(result.status).toBe('ok');
    });

    it('returns error on timeout', async () => {
      const mockLocator = createMockLocator();
      mockLocator.waitFor = vi.fn().mockRejectedValue(new Error('Timeout waiting for element'));
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('waitForSelectorBySemantic')!({
        selector: 'role:dialog:Missing',
        timeout: 1000,
      });

      expect(result.status).toBe('error');
      expect(result.message).toBe('Timeout waiting for element');
    });

    it('generates correct Playwright code', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('waitForSelectorBySemantic')!({
        selector: 'role:dialog:Modal',
      });

      expect(result.code).toBe("await page.getByRole('dialog', { name: 'Modal' }).waitFor();");
    });
  });

  describe('code generation', () => {
    it('generates code for role selector without name', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByRole = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'role:navigation',
      });

      expect(result.code).toBe("await page.getByRole('navigation').click();");
    });

    it('generates code for label selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByLabel = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'label:Username',
      });

      expect(result.code).toBe("await page.getByLabel('Username').click();");
    });

    it('generates code for placeholder selector', async () => {
      const mockLocator = createMockLocator();
      mockPage.getByPlaceholder = vi.fn().mockReturnValue(mockLocator);

      const handlers = feature.getCommandHandlers();
      const result = await handlers.get('clickBySemantic')!({
        selector: 'placeholder:Search...',
      });

      expect(result.code).toBe("await page.getByPlaceholder('Search...').click();");
    });
  });
});
