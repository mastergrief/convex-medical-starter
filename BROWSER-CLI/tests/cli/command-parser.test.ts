/**
 * Command Parser Unit Tests
 * Tests for /home/gabe/projects/zenith-fitness/BROWSER-CLI/SCRIPTS/cli/command-parser.ts
 */

import { describe, it, expect } from 'vitest';
import { parseCommand } from '../../SCRIPTS/cli/commandParserModules';

describe('command-parser', () => {
  // ==========================================================================
  // Navigation Commands (4 tests)
  // ==========================================================================
  describe('navigation commands', () => {
    it('parses start command with URL', () => {
      const result = parseCommand(['start', 'http://localhost:5173']);
      expect(result.command).toBe('start');
      expect(result.args.url).toBe('http://localhost:5173');
    });

    it('parses navigate command with URL', () => {
      const result = parseCommand(['navigate', 'https://example.com']);
      expect(result.command).toBe('navigate');
      expect(result.args.url).toBe('https://example.com');
    });

    it('throws when start missing URL', () => {
      expect(() => parseCommand(['start'])).toThrow('requires a URL');
    });

    it('throws when navigate missing URL', () => {
      expect(() => parseCommand(['navigate'])).toThrow('requires a URL');
    });
  });

  // ==========================================================================
  // Interaction Commands - Ref Detection (6 tests)
  // ==========================================================================
  describe('ref detection', () => {
    it('routes click with ref to clickByRef', () => {
      const result = parseCommand(['click', 'e42']);
      expect(result.command).toBe('clickByRef');
      expect(result.args.ref).toBe('e42');
    });

    it('keeps click with CSS selector as click', () => {
      const result = parseCommand(['click', '.button']);
      expect(result.command).toBe('click');
      expect(result.args.selector).toBe('.button');
    });

    it('routes type with ref to typeByRef', () => {
      const result = parseCommand(['type', 'e15', 'hello']);
      expect(result.command).toBe('typeByRef');
      expect(result.args.ref).toBe('e15');
      expect(result.args.text).toBe('hello');
    });

    it('routes dblclick with ref to dblclickByRef', () => {
      const result = parseCommand(['dblclick', 'e5']);
      expect(result.command).toBe('dblclickByRef');
      expect(result.args.ref).toBe('e5');
    });

    it('routes hover with ref to hoverByRef', () => {
      const result = parseCommand(['hover', 'e3']);
      expect(result.command).toBe('hoverByRef');
      expect(result.args.ref).toBe('e3');
    });

    it('routes waitForSelector with ref to waitForSelectorByRef', () => {
      const result = parseCommand(['waitForSelector', 'e10']);
      expect(result.command).toBe('waitForSelectorByRef');
      expect(result.args.ref).toBe('e10');
    });
  });

  // ==========================================================================
  // Interaction Commands - Semantic Detection (4 tests)
  // ==========================================================================
  describe('semantic detection', () => {
    it('routes click with role selector to clickBySemantic', () => {
      const result = parseCommand(['click', 'role:button:Submit']);
      expect(result.command).toBe('clickBySemantic');
      expect(result.args.selector).toBe('role:button:Submit');
    });

    it('routes type with label selector to typeBySemantic', () => {
      const result = parseCommand(['type', 'label:Email', 'test@test.com']);
      expect(result.command).toBe('typeBySemantic');
      expect(result.args.selector).toBe('label:Email');
      expect(result.args.text).toBe('test@test.com');
    });

    it('routes click with text selector to clickBySemantic', () => {
      const result = parseCommand(['click', 'text:Learn More']);
      expect(result.command).toBe('clickBySemantic');
      expect(result.args.selector).toBe('text:Learn More');
    });

    it('routes hover with placeholder selector to hoverBySemantic', () => {
      const result = parseCommand(['hover', 'placeholder:Search']);
      expect(result.command).toBe('hoverBySemantic');
      expect(result.args.selector).toBe('placeholder:Search');
    });
  });

  // ==========================================================================
  // Drag Commands (4 tests)
  // ==========================================================================
  describe('drag commands', () => {
    it('routes drag with both refs to dragByRef', () => {
      const result = parseCommand(['drag', 'e1', 'e2']);
      expect(result.command).toBe('dragByRef');
      expect(result.args.sourceRef).toBe('e1');
      expect(result.args.targetRef).toBe('e2');
    });

    it('keeps drag with CSS selectors as drag', () => {
      const result = parseCommand(['drag', '.src', '.dst']);
      expect(result.command).toBe('drag');
      expect(result.args.source).toBe('.src');
      expect(result.args.target).toBe('.dst');
    });

    it('routes drag with --cdp flag to dragByCSS', () => {
      const result = parseCommand(['drag', '.src', '.dst', '--cdp']);
      expect(result.command).toBe('dragByCSS');
      expect(result.args.sourceSelector).toBe('.src');
      expect(result.args.targetSelector).toBe('.dst');
    });

    it('throws when drag has mixed ref and CSS selector', () => {
      expect(() => parseCommand(['drag', 'e1', '.dst'])).toThrow(
        'both selectors to be refs'
      );
    });
  });

  // ==========================================================================
  // Flag Parsing (4 tests)
  // ==========================================================================
  describe('flag parsing', () => {
    it('parses --verbose flag for status command', () => {
      const result = parseCommand(['status', '--verbose']);
      expect(result.args.verbose).toBe(true);
    });

    it('parses --file= flag for snapshot command', () => {
      const result = parseCommand(['snapshot', '--file=output.txt']);
      expect(result.args.filename).toBe('output.txt');
    });

    it('parses multiple flags for network command', () => {
      const result = parseCommand(['network', '--filter=api', '--limit=10']);
      expect(result.args.filter).toBe('api');
      expect(result.args.limit).toBe(10);
    });

    it('parses --threshold flag for compareScreenshots', () => {
      const result = parseCommand([
        'compareScreenshots',
        'baseline',
        '--threshold=0.05',
      ]);
      expect(result.args.name).toBe('baseline');
      expect(result.args.threshold).toBe(0.05);
    });
  });

  // ==========================================================================
  // Error Cases (4 tests)
  // ==========================================================================
  describe('error cases', () => {
    it('throws NO_COMMAND when args empty', () => {
      expect(() => parseCommand([])).toThrow('NO_COMMAND');
    });

    it('throws for unknown command', () => {
      expect(() => parseCommand(['unknown'])).toThrow('Unknown command');
    });

    it('throws for invalid JSON in fillForm', () => {
      expect(() => parseCommand(['fillForm', 'invalid-json'])).toThrow(
        'must be valid JSON'
      );
    });

    it('throws when type missing text argument', () => {
      expect(() => parseCommand(['type', 'e5'])).toThrow(
        'requires selector and text'
      );
    });
  });

  // ==========================================================================
  // Additional Ref Format Tests
  // ==========================================================================
  describe('ref format variations', () => {
    it('parses --ref= prefix format for click', () => {
      const result = parseCommand(['click', '--ref=e123']);
      expect(result.command).toBe('clickByRef');
      expect(result.args.ref).toBe('e123');
    });

    it('parses --ref= prefix format for dblclick', () => {
      const result = parseCommand(['dblclick', '--ref=e99']);
      expect(result.command).toBe('dblclickByRef');
      expect(result.args.ref).toBe('e99');
    });

    it('handles multi-digit refs correctly', () => {
      const result = parseCommand(['click', 'e12345']);
      expect(result.command).toBe('clickByRef');
      expect(result.args.ref).toBe('e12345');
    });
  });

  // ==========================================================================
  // Backend Command Mapping
  // ==========================================================================
  describe('backend command mapping', () => {
    it('maps saveState to saveBrowserState', () => {
      const result = parseCommand(['saveState', 'authenticated']);
      expect(result.command).toBe('saveState');
      expect(result.backendCommand).toBe('saveBrowserState');
      expect(result.args.name).toBe('authenticated');
    });

    it('maps restoreState to restoreBrowserState', () => {
      const result = parseCommand(['restoreState', 'authenticated']);
      expect(result.command).toBe('restoreState');
      expect(result.backendCommand).toBe('restoreBrowserState');
      expect(result.args.name).toBe('authenticated');
    });

    it('maps listStates to listBrowserStates', () => {
      const result = parseCommand(['listStates']);
      expect(result.command).toBe('listStates');
      expect(result.backendCommand).toBe('listBrowserStates');
    });

    it('maps deleteState to deleteBrowserState', () => {
      const result = parseCommand(['deleteState', 'oldstate']);
      expect(result.command).toBe('deleteState');
      expect(result.backendCommand).toBe('deleteBrowserState');
      expect(result.args.name).toBe('oldstate');
    });
  });

  // ==========================================================================
  // Snapshot Command Variations
  // ==========================================================================
  describe('snapshot command', () => {
    it('sets full=true by default (enhanced mode)', () => {
      const result = parseCommand(['snapshot']);
      expect(result.args.full).toBe(true);
    });

    it('sets minimal=true when --minimal flag provided', () => {
      const result = parseCommand(['snapshot', '--minimal']);
      expect(result.args.minimal).toBe(true);
    });

    it('parses --forms flag', () => {
      const result = parseCommand(['snapshot', '--forms']);
      expect(result.args.forms).toBe(true);
    });

    it('parses --quiet flag', () => {
      const result = parseCommand(['snapshot', '--quiet']);
      expect(result.args.quiet).toBe(true);
    });

    it('parses --baseline= flag', () => {
      const result = parseCommand(['snapshot', '--baseline=homepage']);
      expect(result.args.saveBaseline).toBe('homepage');
    });

    it('parses --compare= flag', () => {
      const result = parseCommand(['snapshot', '--compare=homepage']);
      expect(result.args.compareName).toBe('homepage');
    });

    it('parses selector after flags', () => {
      const result = parseCommand(['snapshot', '#main', '--full']);
      expect(result.args.selector).toBe('#main');
    });

    it('handles snapshot+ alias for full mode', () => {
      const result = parseCommand(['snapshot+']);
      expect(result.command).toBe('snapshot');
      expect(result.args.full).toBe(true);
    });
  });

  // ==========================================================================
  // Type Command with Multi-Word Text
  // ==========================================================================
  describe('type command with spaces', () => {
    it('joins multiple text arguments', () => {
      const result = parseCommand(['type', 'e5', 'hello', 'world', 'test']);
      expect(result.args.text).toBe('hello world test');
    });

    it('handles CSS selector with multi-word text', () => {
      const result = parseCommand([
        'type',
        '#email',
        'test@example.com',
        'extra',
      ]);
      expect(result.command).toBe('type');
      expect(result.args.selector).toBe('#email');
      expect(result.args.text).toBe('test@example.com extra');
    });
  });

  // ==========================================================================
  // Network Command Flags
  // ==========================================================================
  describe('network command flags', () => {
    it('parses --method flag', () => {
      const result = parseCommand(['network', '--method=POST']);
      expect(result.args.method).toBe('POST');
    });

    it('parses --status flag as integer', () => {
      const result = parseCommand(['network', '--status=404']);
      expect(result.args.status).toBe(404);
    });

    it('parses all network flags together', () => {
      const result = parseCommand([
        'network',
        '--filter=convex',
        '--method=GET',
        '--status=200',
        '--limit=50',
      ]);
      expect(result.args.filter).toBe('convex');
      expect(result.args.method).toBe('GET');
      expect(result.args.status).toBe(200);
      expect(result.args.limit).toBe(50);
    });
  });

  // ==========================================================================
  // Evaluate Command
  // ==========================================================================
  describe('evaluate command', () => {
    it('parses code argument', () => {
      const result = parseCommand(['evaluate', 'document.title']);
      expect(result.args.code).toBe('document.title');
    });

    it('joins multi-word code', () => {
      const result = parseCommand([
        'evaluate',
        'document.querySelector(".btn").click()',
      ]);
      expect(result.args.code).toBe('document.querySelector(".btn").click()');
    });

    it('parses --ref flag', () => {
      const result = parseCommand(['evaluate', '--ref=e5', 'el.textContent']);
      expect(result.args.ref).toBe('e5');
      expect(result.args.code).toBe('el.textContent');
    });

    it('parses --element flag and removes quotes', () => {
      const result = parseCommand([
        'evaluate',
        '--element="Button"',
        'el.click()',
      ]);
      expect(result.args.element).toBe('Button');
    });

    it('throws when code missing', () => {
      expect(() => parseCommand(['evaluate'])).toThrow(
        'requires JavaScript code'
      );
    });
  });

  // ==========================================================================
  // Tabs Command
  // ==========================================================================
  describe('tabs command', () => {
    it('defaults to list action', () => {
      const result = parseCommand(['tabs']);
      expect(result.args.action).toBe('list');
    });

    it('parses tabs list action', () => {
      const result = parseCommand(['tabs', 'list']);
      expect(result.args.action).toBe('list');
    });

    it('parses tabs new action with optional URL', () => {
      const result = parseCommand(['tabs', 'new', 'https://example.com']);
      expect(result.args.action).toBe('new');
      expect(result.args.url).toBe('https://example.com');
    });

    it('parses tabs switch action', () => {
      const result = parseCommand(['tabs', 'switch', '2']);
      expect(result.args.action).toBe('switch');
      expect(result.args.index).toBe(2);
    });

    it('parses tabs close action', () => {
      const result = parseCommand(['tabs', 'close']);
      expect(result.args.action).toBe('close');
    });

    it('throws for unknown tabs action', () => {
      expect(() => parseCommand(['tabs', 'invalid'])).toThrow(
        'Unknown tabs action'
      );
    });

    it('throws when tabs switch missing index', () => {
      expect(() => parseCommand(['tabs', 'switch'])).toThrow(
        'requires a tab index'
      );
    });
  });

  // ==========================================================================
  // Mock Route Command
  // ==========================================================================
  describe('mockRoute command', () => {
    it('parses url, method, and response', () => {
      const result = parseCommand([
        'mockRoute',
        '/api/users',
        'GET',
        '{"users":[]}',
      ]);
      expect(result.args.url).toBe('/api/users');
      expect(result.args.method).toBe('GET');
      expect(result.args.response).toEqual({ users: [] });
    });

    it('parses optional status code', () => {
      const result = parseCommand([
        'mockRoute',
        '/api/users',
        'POST',
        '{"id":1}',
        '201',
      ]);
      expect(result.args.status).toBe(201);
    });

    it('parses --schema flag', () => {
      const result = parseCommand([
        'mockRoute',
        '/api/users',
        'GET',
        '{}',
        '--schema=user-response',
      ]);
      expect(result.args.schema).toBe('user-response');
    });

    it('throws for invalid JSON response', () => {
      expect(() =>
        parseCommand(['mockRoute', '/api/users', 'GET', 'invalid'])
      ).toThrow('must be valid JSON');
    });

    it('throws when missing required args', () => {
      expect(() => parseCommand(['mockRoute', '/api/users'])).toThrow(
        'requires url, method, and response'
      );
    });
  });

  // ==========================================================================
  // Other Commands
  // ==========================================================================
  describe('other commands', () => {
    it('parses pressKey command', () => {
      const result = parseCommand(['pressKey', 'Enter']);
      expect(result.args.key).toBe('Enter');
    });

    it('throws when pressKey missing key', () => {
      expect(() => parseCommand(['pressKey'])).toThrow('requires a key name');
    });

    it('parses selectOption command', () => {
      const result = parseCommand(['selectOption', '#dropdown', 'option1']);
      expect(result.args.selector).toBe('#dropdown');
      expect(result.args.value).toBe('option1');
    });

    it('parses uploadFile command', () => {
      const result = parseCommand([
        'uploadFile',
        '#fileInput',
        '/path/to/file.pdf',
      ]);
      expect(result.args.selector).toBe('#fileInput');
      expect(result.args.path).toBe('/path/to/file.pdf');
    });

    it('parses resize command', () => {
      const result = parseCommand(['resize', '1920', '1080']);
      expect(result.args.width).toBe(1920);
      expect(result.args.height).toBe(1080);
    });

    it('parses wait command', () => {
      const result = parseCommand(['wait', '1000']);
      expect(result.args.ms).toBe(1000);
    });

    it('parses screenshot command', () => {
      const result = parseCommand(['screenshot', '/tmp/screen.png']);
      expect(result.args.path).toBe('/tmp/screen.png');
    });

    it('parses exec command', () => {
      const result = parseCommand(['exec', 'click e1 && wait 500']);
      expect(result.args.commands).toBe('click e1 && wait 500');
    });

    it('parses handleDialog command', () => {
      const result = parseCommand(['handleDialog', 'accept', 'test input']);
      expect(result.args.action).toBe('accept');
      expect(result.args.promptText).toBe('test input');
    });

    it('parses fillForm with valid JSON', () => {
      const result = parseCommand([
        'fillForm',
        '{"#email":"test@test.com","#password":"secret"}',
      ]);
      expect(result.args.fields).toEqual({
        '#email': 'test@test.com',
        '#password': 'secret',
      });
    });

    it('parses saveScreenshotBaseline command', () => {
      const result = parseCommand([
        'saveScreenshotBaseline',
        'homepage',
        '/tmp/baseline.png',
      ]);
      expect(result.args.name).toBe('homepage');
      expect(result.args.path).toBe('/tmp/baseline.png');
    });

    it('parses validateMock command', () => {
      const result = parseCommand([
        'validateMock',
        'user-response',
        '{"id":1,"name":"Test"}',
      ]);
      expect(result.args.schema).toBe('user-response');
      expect(result.args.response).toEqual({ id: 1, name: 'Test' });
    });

    it('parses loadSchema command', () => {
      const result = parseCommand([
        'loadSchema',
        'custom-schema',
        '/path/to/schema.json',
      ]);
      expect(result.args.name).toBe('custom-schema');
      expect(result.args.path).toBe('/path/to/schema.json');
    });
  });

  // ==========================================================================
  // Commands with No Arguments
  // ==========================================================================
  describe('commands with no arguments', () => {
    it('parses close command', () => {
      const result = parseCommand(['close']);
      expect(result.command).toBe('close');
    });

    it('parses console command', () => {
      const result = parseCommand(['console']);
      expect(result.command).toBe('console');
    });

    it('parses clearConsole command', () => {
      const result = parseCommand(['clearConsole']);
      expect(result.command).toBe('clearConsole');
    });

    it('parses networkClear command', () => {
      const result = parseCommand(['networkClear']);
      expect(result.command).toBe('networkClear');
    });

    it('parses changes command', () => {
      const result = parseCommand(['changes']);
      expect(result.command).toBe('changes');
    });

    it('parses listBaselines command', () => {
      const result = parseCommand(['listBaselines']);
      expect(result.command).toBe('listBaselines');
    });

    it('parses setupNetworkMocking command', () => {
      const result = parseCommand(['setupNetworkMocking']);
      expect(result.command).toBe('setupNetworkMocking');
    });

    it('parses clearMocks command', () => {
      const result = parseCommand(['clearMocks']);
      expect(result.command).toBe('clearMocks');
    });

    it('parses listMocks command', () => {
      const result = parseCommand(['listMocks']);
      expect(result.command).toBe('listMocks');
    });

    it('parses listSchemas command', () => {
      const result = parseCommand(['listSchemas']);
      expect(result.command).toBe('listSchemas');
    });

    it('parses capturePerformanceMetrics command', () => {
      const result = parseCommand(['capturePerformanceMetrics']);
      expect(result.command).toBe('capturePerformanceMetrics');
    });

    it('parses getPerformanceMetrics command', () => {
      const result = parseCommand(['getPerformanceMetrics']);
      expect(result.command).toBe('getPerformanceMetrics');
    });

    it('parses listScreenshotBaselines command', () => {
      const result = parseCommand(['listScreenshotBaselines']);
      expect(result.command).toBe('listScreenshotBaselines');
    });
  });

  // ==========================================================================
  // Drag Command Edge Cases
  // ==========================================================================
  describe('drag command edge cases', () => {
    it('throws when drag missing target', () => {
      expect(() => parseCommand(['drag', 'e1'])).toThrow(
        'requires source and target'
      );
    });

    it('parses --method flag for dragByRef', () => {
      const result = parseCommand(['drag', 'e1', 'e2', '--method=pointer']);
      expect(result.command).toBe('dragByRef');
      expect(result.args.method).toBe('pointer');
    });

    it('throws for invalid --method value', () => {
      expect(() =>
        parseCommand(['drag', 'e1', 'e2', '--method=invalid'])
      ).toThrow('--method must be one of');
    });

    it('defaults to cdp method for refs', () => {
      const result = parseCommand(['drag', 'e1', 'e2']);
      expect(result.args.method).toBe('cdp');
    });
  });

  // ==========================================================================
  // Dblclick Command Variations
  // ==========================================================================
  describe('dblclick command variations', () => {
    it('parses CSS selector', () => {
      const result = parseCommand(['dblclick', '.workout-card']);
      expect(result.command).toBe('dblclick');
      expect(result.args.selector).toBe('.workout-card');
    });

    it('parses semantic selector', () => {
      const result = parseCommand(['dblclick', 'role:button:Edit']);
      expect(result.command).toBe('dblclickBySemantic');
      expect(result.args.selector).toBe('role:button:Edit');
    });

    it('parses --button flag', () => {
      const result = parseCommand(['dblclick', 'e5', '--button=right']);
      expect(result.args.button).toBe('right');
    });

    it('throws when selector missing', () => {
      expect(() => parseCommand(['dblclick'])).toThrow('requires a selector');
    });
  });

  // ==========================================================================
  // WaitForSelector Semantic Detection
  // ==========================================================================
  describe('waitForSelector semantic detection', () => {
    it('routes role selector to waitForSelectorBySemantic', () => {
      const result = parseCommand(['waitForSelector', 'role:dialog']);
      expect(result.command).toBe('waitForSelectorBySemantic');
      expect(result.args.selector).toBe('role:dialog');
    });

    it('keeps CSS selector as waitForSelector', () => {
      const result = parseCommand(['waitForSelector', '.modal']);
      expect(result.command).toBe('waitForSelector');
      expect(result.args.selector).toBe('.modal');
    });

    it('throws when selector missing', () => {
      expect(() => parseCommand(['waitForSelector'])).toThrow(
        'requires a selector'
      );
    });
  });
});
