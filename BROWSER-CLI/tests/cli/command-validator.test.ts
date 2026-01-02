import { describe, it, expect } from 'vitest';
import { isValidCommand, validateCommand } from '../../SCRIPTS/cli/command-validator';

describe('command-validator', () => {
  describe('valid commands - navigation', () => {
    it('recognizes start command', () => {
      expect(isValidCommand('start')).toBe(true);
    });

    it('recognizes navigate command', () => {
      expect(isValidCommand('navigate')).toBe(true);
    });
  });

  describe('valid commands - interaction', () => {
    it('recognizes click command', () => {
      expect(isValidCommand('click')).toBe(true);
    });

    it('recognizes type command', () => {
      expect(isValidCommand('type')).toBe(true);
    });

    it('recognizes dblclick command', () => {
      expect(isValidCommand('dblclick')).toBe(true);
    });

    it('recognizes hover command', () => {
      expect(isValidCommand('hover')).toBe(true);
    });

    it('recognizes drag command', () => {
      expect(isValidCommand('drag')).toBe(true);
    });

    it('recognizes selectOption command', () => {
      expect(isValidCommand('selectOption')).toBe(true);
    });

    it('recognizes fillForm command', () => {
      expect(isValidCommand('fillForm')).toBe(true);
    });

    it('recognizes uploadFile command', () => {
      expect(isValidCommand('uploadFile')).toBe(true);
    });

    it('recognizes pressKey command', () => {
      expect(isValidCommand('pressKey')).toBe(true);
    });
  });

  describe('valid commands - snapshot/capture', () => {
    it('recognizes snapshot command', () => {
      expect(isValidCommand('snapshot')).toBe(true);
    });

    it('recognizes screenshot command', () => {
      expect(isValidCommand('screenshot')).toBe(true);
    });

    it('recognizes changes command', () => {
      expect(isValidCommand('changes')).toBe(true);
    });

    it('recognizes console command', () => {
      expect(isValidCommand('console')).toBe(true);
    });

    it('recognizes clearConsole command', () => {
      expect(isValidCommand('clearConsole')).toBe(true);
    });
  });

  describe('valid commands - state management', () => {
    it('recognizes saveState command', () => {
      expect(isValidCommand('saveState')).toBe(true);
    });

    it('recognizes restoreState command', () => {
      expect(isValidCommand('restoreState')).toBe(true);
    });

    it('recognizes listStates command', () => {
      expect(isValidCommand('listStates')).toBe(true);
    });

    it('recognizes deleteState command', () => {
      expect(isValidCommand('deleteState')).toBe(true);
    });

    it('recognizes saveBrowserState command', () => {
      expect(isValidCommand('saveBrowserState')).toBe(true);
    });

    it('recognizes restoreBrowserState command', () => {
      expect(isValidCommand('restoreBrowserState')).toBe(true);
    });
  });

  describe('valid commands - network', () => {
    it('recognizes network command', () => {
      expect(isValidCommand('network')).toBe(true);
    });

    it('recognizes networkClear command', () => {
      expect(isValidCommand('networkClear')).toBe(true);
    });

    it('recognizes mockRoute command', () => {
      expect(isValidCommand('mockRoute')).toBe(true);
    });

    it('recognizes setupNetworkMocking command', () => {
      expect(isValidCommand('setupNetworkMocking')).toBe(true);
    });

    it('recognizes clearMocks command', () => {
      expect(isValidCommand('clearMocks')).toBe(true);
    });

    it('recognizes listMocks command', () => {
      expect(isValidCommand('listMocks')).toBe(true);
    });
  });

  describe('valid commands - tabs', () => {
    it('recognizes tabs command', () => {
      expect(isValidCommand('tabs')).toBe(true);
    });

    it('recognizes newTab command', () => {
      expect(isValidCommand('newTab')).toBe(true);
    });

    it('recognizes switchTab command', () => {
      expect(isValidCommand('switchTab')).toBe(true);
    });

    it('recognizes closeTab command', () => {
      expect(isValidCommand('closeTab')).toBe(true);
    });
  });

  describe('valid commands - utility', () => {
    it('recognizes resize command', () => {
      expect(isValidCommand('resize')).toBe(true);
    });

    it('recognizes evaluate command', () => {
      expect(isValidCommand('evaluate')).toBe(true);
    });

    it('recognizes wait command', () => {
      expect(isValidCommand('wait')).toBe(true);
    });

    it('recognizes waitForSelector command', () => {
      expect(isValidCommand('waitForSelector')).toBe(true);
    });

    it('recognizes status command', () => {
      expect(isValidCommand('status')).toBe(true);
    });

    it('recognizes close command', () => {
      expect(isValidCommand('close')).toBe(true);
    });

    it('recognizes exec command', () => {
      expect(isValidCommand('exec')).toBe(true);
    });

    it('recognizes handleDialog command', () => {
      expect(isValidCommand('handleDialog')).toBe(true);
    });
  });

  describe('valid commands - baselines', () => {
    it('recognizes listBaselines command', () => {
      expect(isValidCommand('listBaselines')).toBe(true);
    });

    it('recognizes saveSnapshotBaseline command', () => {
      expect(isValidCommand('saveSnapshotBaseline')).toBe(true);
    });

    it('recognizes compareSnapshots command', () => {
      expect(isValidCommand('compareSnapshots')).toBe(true);
    });

    it('recognizes saveScreenshotBaseline command', () => {
      expect(isValidCommand('saveScreenshotBaseline')).toBe(true);
    });

    it('recognizes compareScreenshots command', () => {
      expect(isValidCommand('compareScreenshots')).toBe(true);
    });

    it('recognizes listScreenshotBaselines command', () => {
      expect(isValidCommand('listScreenshotBaselines')).toBe(true);
    });
  });

  describe('valid commands - schemas', () => {
    it('recognizes listSchemas command', () => {
      expect(isValidCommand('listSchemas')).toBe(true);
    });

    it('recognizes validateMock command', () => {
      expect(isValidCommand('validateMock')).toBe(true);
    });

    it('recognizes loadSchema command', () => {
      expect(isValidCommand('loadSchema')).toBe(true);
    });
  });

  describe('valid commands - performance', () => {
    it('recognizes capturePerformanceMetrics command', () => {
      expect(isValidCommand('capturePerformanceMetrics')).toBe(true);
    });

    it('recognizes getPerformanceMetrics command', () => {
      expect(isValidCommand('getPerformanceMetrics')).toBe(true);
    });
  });

  describe('invalid commands', () => {
    it('rejects unknown commands', () => {
      expect(isValidCommand('unknown')).toBe(false);
    });

    it('rejects empty string', () => {
      expect(isValidCommand('')).toBe(false);
    });

    it('rejects typo variants', () => {
      expect(isValidCommand('snapshott')).toBe(false);
      expect(isValidCommand('clck')).toBe(false);
      expect(isValidCommand('navigat')).toBe(false);
    });

    it('rejects case-sensitive variants', () => {
      expect(isValidCommand('CLICK')).toBe(false);
      expect(isValidCommand('Navigate')).toBe(false);
      expect(isValidCommand('SNAPSHOT')).toBe(false);
    });

    it('rejects commands with extra characters', () => {
      expect(isValidCommand('click!')).toBe(false);
      expect(isValidCommand('navigate ')).toBe(false);
      expect(isValidCommand(' snapshot')).toBe(false);
    });
  });

  describe('internal routing variants', () => {
    it('recognizes clickByRef as valid internal command', () => {
      expect(isValidCommand('clickByRef')).toBe(true);
    });

    it('recognizes clickBySemantic as valid internal command', () => {
      expect(isValidCommand('clickBySemantic')).toBe(true);
    });

    it('recognizes typeByRef as valid internal command', () => {
      expect(isValidCommand('typeByRef')).toBe(true);
    });

    it('recognizes typeBySemantic as valid internal command', () => {
      expect(isValidCommand('typeBySemantic')).toBe(true);
    });

    it('recognizes dblclickByRef as valid internal command', () => {
      expect(isValidCommand('dblclickByRef')).toBe(true);
    });

    it('recognizes dblclickBySemantic as valid internal command', () => {
      expect(isValidCommand('dblclickBySemantic')).toBe(true);
    });

    it('recognizes hoverByRef as valid internal command', () => {
      expect(isValidCommand('hoverByRef')).toBe(true);
    });

    it('recognizes hoverBySemantic as valid internal command', () => {
      expect(isValidCommand('hoverBySemantic')).toBe(true);
    });

    it('recognizes dragByRef as valid internal command', () => {
      expect(isValidCommand('dragByRef')).toBe(true);
    });

    it('recognizes dragByCSS as valid internal command', () => {
      expect(isValidCommand('dragByCSS')).toBe(true);
    });

    it('recognizes waitForSelectorByRef as valid internal command', () => {
      expect(isValidCommand('waitForSelectorByRef')).toBe(true);
    });

    it('recognizes waitForSelectorBySemantic as valid internal command', () => {
      expect(isValidCommand('waitForSelectorBySemantic')).toBe(true);
    });
  });

  describe('validateCommand function', () => {
    it('does not throw for valid commands', () => {
      expect(() => validateCommand({ command: 'click', args: ['e5'] })).not.toThrow();
    });

    it('throws for unknown commands', () => {
      expect(() => validateCommand({ command: 'unknownCmd', args: [] })).toThrow('Unknown command: unknownCmd');
    });

    it('validates backendCommand if present', () => {
      // When backendCommand is set, it validates that instead
      expect(() => validateCommand({
        command: 'click',
        backendCommand: 'clickByRef',
        args: ['e5']
      })).not.toThrow();
    });

    it('throws when backendCommand is invalid', () => {
      expect(() => validateCommand({
        command: 'click',
        backendCommand: 'invalidBackend',
        args: ['e5']
      })).toThrow('Unknown command: click');
    });

    it('accepts commands with empty args array', () => {
      expect(() => validateCommand({ command: 'snapshot', args: [] })).not.toThrow();
    });

    it('accepts commands with multiple args', () => {
      expect(() => validateCommand({
        command: 'type',
        args: ['e5', 'hello world']
      })).not.toThrow();
    });
  });
});
