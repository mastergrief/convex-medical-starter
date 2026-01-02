# Browser-CLI Bash completion
# Installation: npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts --completion bash >> ~/.bashrc
# Then: source ~/.bashrc

_browser_cmd_completions() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    local prev="${COMP_WORDS[COMP_CWORD-1]}"

    local commands="start navigate click clickByRef clickBySemantic dblclick dblclickByRef dblclickBySemantic type typeByRef typeBySemantic pressKey pressKeyCombo holdKey tapKey hover hoverByRef hoverBySemantic drag dragByRef dragByCSS selectOption fillForm uploadFile wait waitForSelector waitForSelectorByRef waitForSelectorBySemantic snapshot changes screenshot clearConsole listBaselines tabs newTab switchTab closeTab resize evaluate console network networkClear handleDialog status close exec saveState restoreState listStates deleteState saveBrowserState restoreBrowserState listBrowserStates deleteBrowserState saveSnapshotBaseline compareSnapshots saveScreenshotBaseline compareScreenshots listScreenshotBaselines setupNetworkMocking mockRoute clearMocks listMocks listSchemas validateMock loadSchema capturePerformanceMetrics getPerformanceMetrics abortRoute modifyRequestHeaders modifyResponseHeaders blockByPattern listAborts getMockHistory disableMock enableMock getPageHTML getPageText getElementHTML getElementText getEventLog clearEventLog waitForEvent dismissDialog acceptDialog getComputedStyle getElementVisibility getOverlayingElements countElements getConsoleBufferStats setConsoleBufferCapacity getNetworkBufferStats setNetworkBufferCapacity getEventBufferStats setEventBufferCapacity assert assertCount assertConsole assertNetwork assertPerformance getAssertionResults clearAssertionResults setHeadless help"
    local flags="--quiet -q --json --raw --fail-fast --trace --help -h --list --interactive -i --completion --reporter --junit-output"

    # Flag completion
    if [[ "${cur}" == -* ]]; then
        COMPREPLY=( $(compgen -W "${flags}" -- "${cur}") )
        return 0
    fi

    # Command completion (first word after browser-cmd.ts)
    if [[ ${COMP_CWORD} -eq 1 ]]; then
        COMPREPLY=( $(compgen -W "${commands}" -- "${cur}") )
        return 0
    fi

    # Context-specific completion
    case "${prev}" in
        navigate|start)
            COMPREPLY=( $(compgen -W "http:// https:// localhost" -- "${cur}") )
            ;;
        --log-format)
            COMPREPLY=( $(compgen -W "text json silent" -- "${cur}") )
            ;;
        --completion)
            COMPREPLY=( $(compgen -W "bash zsh fish" -- "${cur}") )
            ;;
        --reporter)
            COMPREPLY=( $(compgen -W "junit" -- "${cur}") )
            ;;
        restoreState|deleteState|restoreBrowserState|deleteBrowserState)
            # State names would require runtime lookup
            ;;
        setHeadless)
            COMPREPLY=( $(compgen -W "true false" -- "${cur}") )
            ;;
        screenshot|saveScreenshotBaseline)
            # File path completion
            COMPREPLY=( $(compgen -f -- "${cur}") )
            ;;
        help)
            COMPREPLY=( $(compgen -W "${commands} selectors assertions" -- "${cur}") )
            ;;
        *)
            COMPREPLY=( $(compgen -W "${commands}" -- "${cur}") )
            ;;
    esac
}

complete -F _browser_cmd_completions browser-cmd
complete -F _browser_cmd_completions "npx tsx BROWSER-CLI/SCRIPTS/browser-cmd.ts"

