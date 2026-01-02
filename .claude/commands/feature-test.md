# Feature Testing & Blueprint Command

## Purpose
Extensively test a specific feature using playwright tools, analyze findings, and create comprehensive implementation blueprint. ULTRATHINK

## Execution Steps

### Step 1: Feature Identification
Identify the specific feature to test:
- Feature name (e.g., "Doctor Referrals", "User Authentication", "Report Generation")
- Feature boundaries (what's included/excluded)
- Related components and dependencies
- User roles affected

### Step 2: Extensive Playwright Testing
Use playwright MCP tools to thoroughly test the feature:

#### 2.1 Functional Testing
```python
# Core functionality tests
mcp__playwright__browser_navigate(feature_url)
mcp__playwright__browser_snapshot()  # Capture initial state

# Test all interactive elements
mcp__playwright__browser_click(each_button)
mcp__playwright__browser_fill_form(all_form_fields)
mcp__playwright__browser_type(input_fields, test_data)
mcp__playwright__browser_select_option(dropdowns, options)
```

#### 2.2 State Management Testing
```python
# Test data persistence
mcp__playwright__browser_evaluate(check_local_storage)
mcp__playwright__browser_evaluate(check_session_state)
mcp__playwright__browser_navigate_back()  # Test state retention
mcp__playwright__browser_navigate(feature_url)  # Return and verify
```

#### 2.3 User Flow Testing
```python
# Complete user journeys
# Happy path: Start → Action → Success
# Error paths: Invalid input → Error handling
# Edge cases: Boundary conditions → Behavior
mcp__playwright__browser_wait_for(expected_result)
mcp__playwright__browser_take_screenshot(evidence_file)
```

#### 2.4 Performance Testing
```python
# Measure response times
mcp__playwright__browser_network_requests()  # API performance
mcp__playwright__browser_evaluate(measure_render_time)
mcp__playwright__browser_console_messages()  # Performance warnings
```

#### 2.5 Error Handling Testing
```python
# Test failure scenarios
# Network failures
# Invalid data
# Permission errors
# Timeout scenarios
mcp__playwright__browser_handle_dialog(accept=false)
mcp__playwright__browser_console_messages()  # Capture errors
```

#### 2.6 Accessibility Testing
```python
# Keyboard navigation
mcp__playwright__browser_press_key("Tab")  # Tab through elements
mcp__playwright__browser_press_key("Enter")  # Activate with keyboard

# Screen reader compatibility
mcp__playwright__browser_evaluate(check_aria_labels)
mcp__playwright__browser_evaluate(check_focus_management)
```

#### 2.7 Responsive Testing
```python
# Test different viewports
viewport_sizes = [(320, 568), (768, 1024), (1920, 1080)]
for width, height in viewport_sizes:
    mcp__playwright__browser_resize(width, height)
    mcp__playwright__browser_snapshot()
    # Test functionality at each size
```

### Step 3: Analysis & Findings
Analyze test results to identify:

#### What Works Well ✅
- Fully functional components
- Good UX patterns
- Performance strengths
- Robust error handling
- Accessibility compliance

#### What Needs Improvement 🔧
- Broken functionality
- UX friction points
- Performance bottlenecks
- Missing error handling
- Accessibility issues

#### How to Fix/Improve 💡
- Specific code changes needed
- Architecture improvements
- UX enhancements
- Performance optimizations
- Security hardening

### Step 4: Generate FEATURE.md
Create comprehensive blueprint at `/DOCUMENTS/FEATURE.md`:

```markdown
# Feature Blueprint: [Feature Name]
Generated: [timestamp]
Testing Method: Extensive Playwright Analysis

## Executive Summary
- Feature Status: [Working/Partial/Broken]
- Completion Level: [X]%
- Critical Issues: [count]
- Improvement Opportunities: [count]

## Feature Overview
### Purpose
[What this feature does and why it exists]

### User Stories
[Who uses it and what they're trying to achieve]

### Technical Architecture
[Current implementation structure]

## Testing Results

### What Works Well ✅
1. **[Working Component]**
   - Functionality: [description]
   - Performance: [metrics]
   - User Experience: [observations]
   - Evidence: [screenshot/recording]

2. **[Another Working Part]**
   - [Similar structure...]

### What Needs Improvement 🔧

#### Critical Issues (P0)
1. **[Issue Name]**
   - Current Behavior: [what happens now]
   - Expected Behavior: [what should happen]
   - Impact: [who/what is affected]
   - Root Cause: [technical reason]
   - Evidence: [screenshot/error log]

#### Major Issues (P1)
1. **[Issue Name]**
   - [Similar structure...]

#### Minor Issues (P2)
1. **[Issue Name]**
   - [Simple description]

## Implementation Blueprint

### Immediate Fixes (1-2 days)
1. **Fix [Critical Issue]**
   ```typescript
   // Current problematic code
   [code snippet]
   
   // Recommended fix
   [improved code]
   ```
   - Files to modify: [list]
   - Testing required: [what to verify]
   - Risk assessment: [low/medium/high]

2. **Fix [Another Issue]**
   - [Similar structure...]

### Short-term Improvements (1 week)
1. **Enhance [Component]**
   - Objective: [what to achieve]
   - Approach: [how to implement]
   - Dependencies: [what's needed]
   - Success Criteria: [how to measure]

### Long-term Enhancements (2+ weeks)
1. **Refactor [System]**
   - Rationale: [why needed]
   - Architecture changes: [diagram/description]
   - Migration strategy: [how to transition]
   - Benefits: [expected improvements]

## Performance Metrics
| Metric | Current | Target | Priority |
|--------|---------|--------|----------|
| Load Time | [X]ms | [Y]ms | P[1-3] |
| API Response | [X]ms | [Y]ms | P[1-3] |
| Memory Usage | [X]MB | [Y]MB | P[1-3] |

## Accessibility Audit
- Keyboard Navigation: [Pass/Fail]
- Screen Reader: [Pass/Fail]
- Color Contrast: [Pass/Fail]
- Focus Management: [Pass/Fail]
- ARIA Labels: [Complete/Incomplete]

## Security Considerations
- Input Validation: [Status]
- Authorization Checks: [Status]
- Data Encryption: [Status]
- XSS Protection: [Status]
- CSRF Protection: [Status]

## Testing Coverage
- Unit Tests: [Exists/Needed]
- Integration Tests: [Exists/Needed]
- E2E Tests: [Exists/Needed]
- Coverage Percentage: [X]%

## Dependencies
### External Services
- [Service Name]: [Status/Issues]

### Libraries
- [Library Name]: [Version/Updates needed]

### APIs
- [API Endpoint]: [Status/Issues]

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk description] | Low/Med/High | Low/Med/High | [Strategy] |

## Implementation Plan
### Phase 1: Critical Fixes (Sprint 1)
- [ ] Fix [P0 issue]
- [ ] Fix [P0 issue]
- [ ] Basic testing

### Phase 2: Core Improvements (Sprint 2)
- [ ] Implement [P1 enhancement]
- [ ] Optimize [performance issue]
- [ ] Add error handling

### Phase 3: Polish (Sprint 3)
- [ ] Enhance UX
- [ ] Add accessibility features
- [ ] Complete test coverage

## Success Metrics
- All P0 issues resolved
- Performance targets met
- Accessibility compliant
- Test coverage > 80%
- Zero critical security issues

## Appendix
### A. Test Evidence
[Screenshots, logs, recordings]

### B. Code Samples
[Detailed code examples]

### C. References
[Documentation links, PRD sections]
```

## Important Notes
- **FEATURE FOCUS**: Test one feature deeply, not the whole system
- **PLAYWRIGHT ONLY**: Use playwright MCP tools directly
- **COMPREHENSIVE**: Test functionality, performance, accessibility, security
- **BLUEPRINT OUTPUT**: Create actionable implementation guide

## ULTRATHINK Mode
When ULTRATHINK is specified:

### Deep Testing Strategy
- Test with production-like data volumes
- Simulate concurrent users
- Test with network latency
- Verify memory leaks over time
- Test browser compatibility
- Check mobile device behavior
- Test offline capabilities
- Verify SEO compliance

### Advanced Analysis
- Analyze code coupling and cohesion
- Identify hidden dependencies
- Evaluate scalability limits
- Assess technical debt impact
- Review design patterns used
- Check for code smells
- Analyze cyclomatic complexity
- Evaluate maintainability index

### Comprehensive Recommendations
- Provide multiple solution options with trade-offs
- Include architectural diagrams
- Suggest design pattern improvements
- Recommend testing strategies
- Propose monitoring approaches
- Define rollout strategies
- Create rollback plans
- Document decision rationale

### Strategic Considerations
- Calculate ROI for each improvement
- Prioritize by user impact
- Consider team capabilities
- Evaluate third-party alternatives
- Assess build vs buy options
- Plan for future scalability
- Consider platform migrations
- Evaluate microservice extraction