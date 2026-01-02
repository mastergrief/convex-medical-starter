# Feature Implementation & Testing Command

## Purpose
Execute feature improvements from blueprint, implement with direct code changes, test extensively with playwright, and document achievements. NO AGENTS. ULTRATHINK

## Execution Steps

### Step 1: Gather Context
Read and analyze three critical sources:

#### 1.1 Serena Memories
```python
# Read /.serena/memories
- Extract code patterns and conventions
- Note technical decisions and warnings
- Identify reusable components
- Gather architectural insights
```

#### 1.2 PRD Specification
```python
# Read /DOCUMENTS/PRD.md
- Map feature requirements
- Extract acceptance criteria
- Identify success metrics
- Note user stories
```

#### 1.3 Feature Blueprint
```python
# Read /DOCUMENTS/FEATURE.md
- Review testing results
- Extract improvement priorities (P0→P1→P2)
- Identify implementation fixes
- Note risk assessments
```

### Step 2: Create Detailed Implementation Plan
Based on gathered context, structure the improvement plan:

#### 2.1 Prioritized Task List
```yaml
Immediate_Fixes_P0:
  - Issue: [from FEATURE.md]
    Current: [broken behavior]
    Target: [fixed behavior]
    Approach: [technical solution]
    Files: [files to modify]
    Risk: [low/medium/high]
    
Major_Improvements_P1:
  - Enhancement: [description]
    Rationale: [why needed]
    Implementation: [how to build]
    Dependencies: [what's required]
    Testing: [verification approach]
    
Minor_Enhancements_P2:
  - Optimization: [description]
    Benefit: [expected improvement]
    Effort: [time estimate]
```

#### 2.2 Implementation Sequence
```yaml
Order:
  1. Critical fixes that unblock functionality
  2. Dependencies for other improvements
  3. High-impact quick wins
  4. Major enhancements
  5. Polish and optimizations
  
Checkpoints:
  - After each P0 fix: Test immediately
  - After P1 completion: Full feature test
  - After P2: Performance validation
```

### Step 3: Direct Implementation (NO AGENTS)
Execute improvements using Serena MCP tools directly:

#### 3.1 Code Analysis
```python
# Understand current implementation
mcp__serena__get_symbols_overview(feature_file)
mcp__serena__find_symbol(component_name, include_body=True)
mcp__serena__find_referencing_symbols(component_name, file)
```

#### 3.2 Apply Fixes from Blueprint
```python
# P0 Critical Fixes
for fix in critical_fixes:
    # Locate the problematic code
    mcp__serena__find_symbol(fix.symbol_path)
    
    # Apply the fix from blueprint
    mcp__serena__replace_symbol_body(
        name_path=fix.symbol_path,
        relative_path=fix.file,
        body=fix.recommended_code
    )
    
    # Run validation
    npm run typecheck
```

#### 3.3 Implement Enhancements
```python
# P1 Major Improvements
for enhancement in major_improvements:
    # Add new functionality
    mcp__serena__insert_after_symbol(
        name_path=enhancement.anchor,
        relative_path=enhancement.file,
        body=enhancement.new_code
    )
    
    # Update imports if needed
    mcp__serena__insert_before_symbol(
        name_path="first_symbol",
        relative_path=enhancement.file,
        body=enhancement.imports
    )
```

#### 3.4 Apply Optimizations
```python
# P2 Performance & UX improvements
for optimization in minor_enhancements:
    mcp__serena__replace_symbol_body(
        name_path=optimization.target,
        relative_path=optimization.file,
        body=optimization.optimized_code
    )
```

### Step 4: Extensive Playwright Testing
Test all implemented improvements thoroughly:

#### 4.1 Setup Testing Environment
```python
# Initialize browser
mcp__playwright__browser_navigate(feature_url)
mcp__playwright__browser_resize(1920, 1080)
mcp__playwright__browser_snapshot()  # Before state
```

#### 4.2 Test P0 Fixes
```python
# Verify each critical fix
for fix in implemented_fixes:
    # Navigate to affected area
    mcp__playwright__browser_navigate(fix.test_url)
    
    # Test the fix works
    mcp__playwright__browser_click(fix.element)
    mcp__playwright__browser_wait_for(fix.expected_result)
    
    # Verify no regressions
    mcp__playwright__browser_evaluate(fix.validation_script)
    mcp__playwright__browser_take_screenshot(f"fix_{fix.id}.png")
    
    # Check error handling
    mcp__playwright__browser_console_messages()  # No errors
```

#### 4.3 Test P1 Enhancements
```python
# Test new functionality
for enhancement in implemented_enhancements:
    # Test happy path
    mcp__playwright__browser_fill_form(enhancement.test_data)
    mcp__playwright__browser_click(enhancement.submit)
    mcp__playwright__browser_wait_for(enhancement.success)
    
    # Test edge cases
    mcp__playwright__browser_fill_form(enhancement.edge_data)
    mcp__playwright__browser_evaluate(enhancement.validation)
    
    # Test error scenarios
    mcp__playwright__browser_fill_form(enhancement.invalid_data)
    mcp__playwright__browser_handle_dialog(accept=False)
```

#### 4.4 Performance Validation
```python
# Measure improvements
performance_metrics = {
    'before': [],
    'after': []
}

# Test load times
start_time = Date.now()
mcp__playwright__browser_navigate(feature_url)
mcp__playwright__browser_wait_for('networkidle')
load_time = Date.now() - start_time

# Check render performance
mcp__playwright__browser_evaluate("""
    performance.measure('render', 'navigationStart', 'loadEventEnd')
    return performance.getEntriesByType('measure')
""")

# Monitor API calls
mcp__playwright__browser_network_requests()  # Check response times
```

#### 4.5 Regression Testing
```python
# Test existing functionality still works
for existing_feature in feature_tests:
    mcp__playwright__browser_navigate(existing_feature.url)
    mcp__playwright__browser_click(existing_feature.element)
    mcp__playwright__browser_wait_for(existing_feature.expected)
    mcp__playwright__browser_snapshot()  # Visual regression
```

#### 4.6 Accessibility Validation
```python
# Keyboard navigation
mcp__playwright__browser_press_key('Tab')  # Through all elements
mcp__playwright__browser_press_key('Enter')  # Activate

# Screen reader testing
mcp__playwright__browser_evaluate("""
    // Check ARIA labels
    document.querySelectorAll('[aria-label]').length > 0
""")
```

### Step 5: Update FEATURE.md
Document achievements and next steps in `/DOCUMENTS/FEATURE.md`:

#### 5.1 Update Structure
```markdown
# Feature Blueprint: [Feature Name]
[Original content above...]

---

## Implementation Report
**Executed**: [timestamp]
**Implementation Method**: Direct code changes with Playwright validation

### Achievements ✅

#### P0 Critical Fixes Completed
1. **[Fixed Issue Name]**
   - Previous State: [what was broken]
   - Current State: [now working]
   - Implementation: [brief description]
   - Files Modified: `[file:line]`
   - Test Result: PASS ✅
   - Evidence: ![Screenshot](fix_1.png)

2. **[Another Fixed Issue]**
   - [Similar structure...]

#### P1 Enhancements Implemented
1. **[Enhancement Name]**
   - Feature Added: [description]
   - User Benefit: [impact]
   - Technical Approach: [summary]
   - Test Coverage: [X]%
   - Performance Impact: [metrics]

#### P2 Optimizations Applied
1. **[Optimization Name]**
   - Improvement: [what changed]
   - Measured Benefit: [metrics]

### Test Results Summary
| Test Category | Pass | Fail | Coverage |
|--------------|------|------|----------|
| Functional | [X] | [Y] | [Z]% |
| Performance | [X] | [Y] | [Z]% |
| Accessibility | [X] | [Y] | [Z]% |
| Regression | [X] | [Y] | [Z]% |

### Performance Improvements
| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Load Time | [X]ms | [Y]ms | -[Z]% |
| API Response | [X]ms | [Y]ms | -[Z]% |
| Memory Usage | [X]MB | [Y]MB | -[Z]% |

### Known Issues Remaining 🔧
1. **[Unresolved Issue]**
   - Reason: [why not fixed yet]
   - Workaround: [temporary solution if any]
   - Planned Fix: [when/how]

### Next Steps 📋

#### Immediate (Next 2-3 days)
1. Fix [remaining P0 issue]
2. Complete [partial implementation]
3. Add [missing test coverage]

#### Short-term (Next week)
1. Implement [next P1 feature]
2. Optimize [performance bottleneck]
3. Enhance [UX element]

#### Long-term (Future sprints)
1. Refactor [technical debt]
2. Add [advanced feature]
3. Migrate [legacy component]

### Technical Debt Tracker
- **Added**: [new debt introduced]
- **Resolved**: [debt eliminated]
- **Balance**: [current debt level]

### Lessons Learned
1. [Technical insight gained]
2. [Pattern discovered]
3. [Tool/library evaluation]

### Dependencies Updated
- [Library]: [old version] → [new version]
- [API]: [change made]

### Documentation Needs
- [ ] Update API documentation for [changes]
- [ ] Create user guide for [new feature]
- [ ] Document [configuration changes]
```

## Important Notes
- **NO AGENTS**: Direct implementation via Serena MCP tools
- **BLUEPRINT DRIVEN**: Follow fixes from FEATURE.md
- **EXTENSIVE TESTING**: Every change must be validated
- **INCREMENTAL**: Test after each fix, not all at once
- **DOCUMENTATION**: Update FEATURE.md comprehensively

## ULTRATHINK Mode
When ULTRATHINK is specified:

### Deep Implementation Analysis
- Analyze side effects of each change
- Consider cross-browser compatibility
- Evaluate security implications
- Check memory leak potential
- Assess database query optimization
- Review caching strategies
- Validate error boundaries
- Check race condition handling

### Advanced Testing Strategy
- Test with production data volumes
- Simulate slow network (3G/4G)
- Test with CPU throttling
- Verify with multiple user sessions
- Test state recovery after errors
- Validate data migration paths
- Test rollback scenarios
- Check monitoring integration

### Comprehensive Documentation
- Document architectural decisions
- Create troubleshooting guides
- Document rollback procedures
- Define monitoring alerts
- Create runbooks for issues
- Document performance benchmarks
- Create integration guides
- Define success metrics

### Risk Mitigation
- Identify potential failure points
- Create fallback strategies
- Plan gradual rollout
- Define feature flags
- Create A/B test variants
- Plan database migrations
- Define rollback triggers
- Create incident response plan

### Future Planning
- Identify next optimization opportunities
- Plan technical debt reduction
- Define scalability improvements
- Identify refactoring candidates
- Plan test coverage expansion
- Define monitoring enhancements
- Plan documentation updates
- Identify training needs

## Success Criteria
✅ All P0 issues resolved and tested
✅ P1 enhancements working as designed
✅ No regressions introduced
✅ Performance targets met or exceeded
✅ Test coverage increased
✅ Documentation updated
✅ Accessibility compliance maintained
✅ Security posture improved or maintained