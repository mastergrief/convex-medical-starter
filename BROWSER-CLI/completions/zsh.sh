#compdef browser-cmd
# Browser-CLI Zsh completion
# Installation: npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts --completion zsh >> ~/.zshrc
# Then: source ~/.zshrc

_browser_cmd() {
    local -a commands flags

    commands=(
        'start:start command'
        'navigate:navigate command'
        'click:click command'
        'clickByRef:clickByRef command'
        'clickBySemantic:clickBySemantic command'
        'dblclick:dblclick command'
        'dblclickByRef:dblclickByRef command'
        'dblclickBySemantic:dblclickBySemantic command'
        'type:type command'
        'typeByRef:typeByRef command'
        'typeBySemantic:typeBySemantic command'
        'pressKey:pressKey command'
        'pressKeyCombo:pressKeyCombo command'
        'holdKey:holdKey command'
        'tapKey:tapKey command'
        'hover:hover command'
        'hoverByRef:hoverByRef command'
        'hoverBySemantic:hoverBySemantic command'
        'drag:drag command'
        'dragByRef:dragByRef command'
        'dragByCSS:dragByCSS command'
        'selectOption:selectOption command'
        'fillForm:fillForm command'
        'uploadFile:uploadFile command'
        'wait:wait command'
        'waitForSelector:waitForSelector command'
        'waitForSelectorByRef:waitForSelectorByRef command'
        'waitForSelectorBySemantic:waitForSelectorBySemantic command'
        'snapshot:snapshot command'
        'changes:changes command'
        'screenshot:screenshot command'
        'clearConsole:clearConsole command'
        'listBaselines:listBaselines command'
        'tabs:tabs command'
        'newTab:newTab command'
        'switchTab:switchTab command'
        'closeTab:closeTab command'
        'resize:resize command'
        'evaluate:evaluate command'
        'console:console command'
        'network:network command'
        'networkClear:networkClear command'
        'handleDialog:handleDialog command'
        'status:status command'
        'close:close command'
        'exec:exec command'
        'saveState:saveState command'
        'restoreState:restoreState command'
        'listStates:listStates command'
        'deleteState:deleteState command'
        'saveBrowserState:saveBrowserState command'
        'restoreBrowserState:restoreBrowserState command'
        'listBrowserStates:listBrowserStates command'
        'deleteBrowserState:deleteBrowserState command'
        'saveSnapshotBaseline:saveSnapshotBaseline command'
        'compareSnapshots:compareSnapshots command'
        'saveScreenshotBaseline:saveScreenshotBaseline command'
        'compareScreenshots:compareScreenshots command'
        'listScreenshotBaselines:listScreenshotBaselines command'
        'setupNetworkMocking:setupNetworkMocking command'
        'mockRoute:mockRoute command'
        'clearMocks:clearMocks command'
        'listMocks:listMocks command'
        'listSchemas:listSchemas command'
        'validateMock:validateMock command'
        'loadSchema:loadSchema command'
        'capturePerformanceMetrics:capturePerformanceMetrics command'
        'getPerformanceMetrics:getPerformanceMetrics command'
        'abortRoute:abortRoute command'
        'modifyRequestHeaders:modifyRequestHeaders command'
        'modifyResponseHeaders:modifyResponseHeaders command'
        'blockByPattern:blockByPattern command'
        'listAborts:listAborts command'
        'getMockHistory:getMockHistory command'
        'disableMock:disableMock command'
        'enableMock:enableMock command'
        'getPageHTML:getPageHTML command'
        'getPageText:getPageText command'
        'getElementHTML:getElementHTML command'
        'getElementText:getElementText command'
        'getEventLog:getEventLog command'
        'clearEventLog:clearEventLog command'
        'waitForEvent:waitForEvent command'
        'dismissDialog:dismissDialog command'
        'acceptDialog:acceptDialog command'
        'getComputedStyle:getComputedStyle command'
        'getElementVisibility:getElementVisibility command'
        'getOverlayingElements:getOverlayingElements command'
        'countElements:countElements command'
        'getConsoleBufferStats:getConsoleBufferStats command'
        'setConsoleBufferCapacity:setConsoleBufferCapacity command'
        'getNetworkBufferStats:getNetworkBufferStats command'
        'setNetworkBufferCapacity:setNetworkBufferCapacity command'
        'getEventBufferStats:getEventBufferStats command'
        'setEventBufferCapacity:setEventBufferCapacity command'
        'assert:assert command'
        'assertCount:assertCount command'
        'assertConsole:assertConsole command'
        'assertNetwork:assertNetwork command'
        'assertPerformance:assertPerformance command'
        'getAssertionResults:getAssertionResults command'
        'clearAssertionResults:clearAssertionResults command'
        'setHeadless:setHeadless command'
        'help:help command'
    )

    flags=(
        '--quiet[Suppress emojis and headers]'
        '-q[Suppress emojis and headers]'
        '--json[Force JSON output]'
        '--raw[No formatting]'
        '--fail-fast[Stop on first failure]'
        '--trace[Enable execution tracing]'
        '--help[Show help]'
        '-h[Show help]'
        '--list[List commands]'
        '--interactive[Start REPL mode]'
        '-i[Start REPL mode]'
        '--completion[Generate shell completion script]'
        '--reporter[Set reporter type]'
        '--junit-output[JUnit output file path]'
        '--log-format[Set log format]:format:(text json silent)'
        '--completion[Generate shell completion]:shell:(bash zsh fish)'
        '--reporter[Set reporter type]:reporter:(junit)'
        '--junit-output[JUnit output file]:file:_files'
    )

    _arguments -s \
        '1:command:->command' \
        '*:argument:->args' \
        ${flags[@]}

    case $state in
        command)
            _describe 'command' commands
            ;;
        args)
            case $words[2] in
                navigate|start)
                    _urls
                    ;;
                setHeadless)
                    _values 'boolean' true false
                    ;;
                screenshot|saveScreenshotBaseline)
                    _files
                    ;;
                help)
                    _values 'topic' ${commands[@]%%:*} selectors assertions
                    ;;
                restoreState|deleteState|restoreBrowserState|deleteBrowserState)
                    # Would need runtime state lookup
                    ;;
                *)
                    _files
                    ;;
            esac
            ;;
    esac
}

compdef _browser_cmd browser-cmd

