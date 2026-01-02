# IMPLEMENT-SPRINT

## META-PROMPT
[READ .serena/memories, .env.local, .claude/CLAUDE.md, DOCUMENTS/PRD.md & DOCUMENTS/SPRINT.md then create DETAILED plan for sprint, IMPLEMENT planned sprint with a MAXIMUM OF 1 DELIVERABLE TASK/FEATURE (backend + frontend + database persistence) ALL type errors are blocking! NO MOCK DATA, NO MOCK FEATURES, NO FAKE FUNCTIONALITY) Then use playwright tools for EXTENSIVE navigational and functional testing of implementation. REMEMBER: NO SUBAGENTS. NO E2E TESTS. 1 DELIVERABLE TASK/FEATURE MAX. TYPE ERRORS BLOCKING. NO MOCK DATA, NO MOCK FEATURES, JUST DELIVERABLE & WORKING FUNCTIONALITY WITH REAL BACKEND INTEGRATION & DATABASE PERSISTENCE.  Upon completion update markdown file called SPRINT.md in /DOCUMENTS documenting what has been achieved and what needs doing next. ULTRATHINK]

## EXECUTION STEPS

### Step 1: Read memory files and project documents
**Required Reading:**

- Read .serena/memories
- Read .env.local
- Read .claude/CLAUDE.md
- Read DOCUMENTS/PRD.md
- Read DOCUMENTS/SPRINT.md

### Step 2: Create a detailed plan for a sprint
- **ENGAGE ULTRATHINK FOR MAXIMUM REASONING**
- Analyze current project state from memories
- Identify highest priority features from SPRINT.md
- Map PRD requirements to sprint items
- Create implementation sequence based on dependencies
- Define success criteria for each item
- Plan testing strategy for implementations

### Step 3: Implement the planned sprint
**CRITICAL CONSTRAINTS:**
- **NO AGENTS**
- **NO TASK TOOL**
- **NO E2E TESTING, JUST PLAYWRIGHT MCP TOOLS!**
- Use Serena MCP tools as much as possible
- Use ShadCN MCP tools for all UI/UX implementations
- **ALL TypeScript errors are BLOCKING and must be fixed!**
- After each task write to memory with Serena MCP tools

**Implementation Protocol:**
- Use `mcp__serena__get_symbols_overview` before exploring files
- Use `mcp__serena__search_for_pattern` instead of grep/find
- Use `mcp__serena__find_symbol` for precise code location
- Use `mcp__serena__replace_symbol_body` for modifications
- Use `mcp__serena__insert_after_symbol` for new features
- Use `mcp__serena__insert_before_symbol` for imports
- Use `mcp__shadcn-react__` tools for all UI components
- Run `npm run typecheck` after EVERY modification
- Write progress to memory: `mcp__serena__write_memory`

### Step 4: Test the implementation with Playwright tools
**EXTENSIVE navigational and functional testing of implementation**
- Validate all implementations with EXTENSIVE browser navigation & testing. NO E2E TESTS!
- **BECOME THE USER!**

**Testing Protocol:**
1. **Setup & Navigation**
   - `mcp__playwright__browser_navigate(url)` - Visit each implemented route
   - `mcp__playwright__browser_snapshot()` - Capture accessibility tree
   - `mcp__playwright__browser_resize()` - Test responsive design

2. **Functional Testing**
   - `mcp__playwright__browser_click()` - Test all buttons/links
   - `mcp__playwright__browser_fill_form()` - Complete all forms
   - `mcp__playwright__browser_type()` - Input validation
   - `mcp__playwright__browser_select_option()` - Dropdown testing
   - `mcp__playwright__browser_wait_for()` - Async operations

3. **User Journey Validation**
   - Complete FULL user workflows
   - Login → Navigate → Perform Actions → Verify Results
   - Test error states and edge cases
   - Capture screenshots of key states
   - Check console for errors: `mcp__playwright__browser_console_messages()`

4. **Cross-browser & Mobile Testing**
   - Test different viewport sizes
   - Validate touch interactions
   - Check network requests: `mcp__playwright__browser_network_requests()`

### Step 5: Update SPRINT.md with results
**Document what has been achieved, what could be improved and what needs doing next**

Update `/DOCUMENTS/SPRINT.md` with comprehensive report including:

**ACHIEVED:**
- List all completed sprint items
- Document implementation details
- Include test results and evidence
- Reference screenshots from Playwright testing
- Note any features that exceeded expectations

**IMPROVEMENTS:**
- Identify areas that could be improved
- Document technical debt discovered
- List performance optimization opportunities
- Note UX/UI refinements needed
- Record security enhancements required

**NEXT STEPS:**
- Define immediate priorities for next sprint
- List blocked or partially complete items
- Identify dependencies for future work
- Suggest architectural improvements
- Recommend tooling or process changes

## REMEMBER: CRITICAL REQUIREMENTS
- **NO AGENTS** - Do NOT use Task tool or spawn any agents
- **NO TASK TOOL** - Execute everything directly
- **NO E2E TESTS** - these are not as agile as direct mcp tools
- **ULTRATHINK** - Engage maximum reasoning capacity throughout


## ULTRATHINK MODE ACTIVATION
**ENGAGE DEEP REASONING FOR:**

1. **Sprint Planning**
   - Deep analysis of dependencies and impacts
   - Optimal implementation sequence determination
   - Risk assessment and mitigation strategies
   - Performance implications evaluation

2. **Implementation Decisions**
   - Architecture pattern selection
   - Component composition strategies  
   - State management approaches
   - Security boundary enforcement
   - Error handling completeness

3. **Testing Strategy**
   - Edge case identification
   - User journey mapping
   - Performance bottleneck detection
   - Accessibility validation
   - Cross-browser compatibility analysis

4. **Documentation & Analysis**
   - Technical debt assessment
   - Scalability evaluation
   - Refactoring opportunity identification
   - Process improvement recommendations

## EXECUTION FLOW
```
1. Read memory files and project documents
   ↓
2. Create detailed plan for sprint [ULTRATHINK]
   ↓
3. Implement the planned sprint [NO AGENTS]
   ↓
4. Test with Playwright mcp tools [EXTENSIVE]
   ↓
5. Update SPRINT.md with results
```

## FINAL REMINDERS
- **NO AGENTS, NO TASK TOOL** - Direct implementation only
- **NO E2E TESTING, ONLY PLAYWRIGHT MCP TOOLS!**
- **ULTRATHINK** - Maximum reasoning throughout
- **Serena MCP tools** - Primary for all code operations
- **ShadCN MCP tools** - For all UI/UX implementations
- **TypeScript errors** - ALL are BLOCKING, must fix
- **Playwright nagational testing** - EXTENSIVE, become the user
- **Memory updates** - After each major task completion

---
*Command preserves original META-PROMPT structure with minimal changes while enforcing ULTRATHINK reasoning and NO AGENTS constraint.*