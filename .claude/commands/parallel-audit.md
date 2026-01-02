# Parallel Agent System Audit Command

## Purpose
Comprehensively analyze codebase and perform navigational/functional testing using SERENA and PLAYTEST agents in PARALLEL batches. ULTRATHINK

## Execution Steps

### Step 1: Read Configuration
- Read `/DOCUMENTS/PRD.md` for requirements and specifications
- Read `/.env.local` for environment configuration and API keys
- Extract all testable features and requirements
- Note environment-specific settings that affect functionality

### Step 2: Execute Parallel Agent Analysis
Use the Task tool to spawn SERENA and PLAYTEST agents IN PARALLEL BATCHES:

#### Batch 1 - Codebase Analysis (SERENA) + Navigation Testing (PLAYTEST)
**Execute simultaneously:**

**SERENA Agent Task:**
```
Comprehensively analyze the entire codebase with 100% coverage:
- Map complete code structure and architecture
- Analyze all components and their implementations
- Identify all placeholder vs real implementations
- Count actual vs mock functionality
- Map code coverage to PRD requirements
- Find all TODO/FIXME comments
- Analyze code quality and patterns
- Identify technical debt
```

**PLAYTEST Agent Task:**
```
Test all navigation and routing with 100% coverage:
- Test every route and page
- Verify all navigation links
- Check page load success
- Test responsive behavior
- Document any broken routes
- Capture screenshots of each page
```

#### Batch 2 - Code Dependencies (SERENA) + Feature Testing (PLAYTEST)
**Execute simultaneously after Batch 1 completes:**

**SERENA Agent Task:**
```
Analyze dependencies and integrations:
- Map all component dependencies
- Analyze API integrations
- Check database connections
- Verify external service integrations
- Analyze state management
- Check authentication implementation
- Review security implementations
```

**PLAYTEST Agent Task:**
```
Test all features extensively:
- Test every form and input
- Verify all buttons and interactions
- Check data operations (CRUD)
- Test error handling
- Validate business logic
- Test edge cases
- Verify data persistence
```

#### Batch 3 - Performance Analysis (SERENA) + Workflow Testing (PLAYTEST)
**Execute simultaneously after Batch 2 completes:**

**SERENA Agent Task:**
```
Analyze performance and optimization:
- Identify performance bottlenecks
- Check bundle sizes
- Analyze render patterns
- Review database queries
- Check caching implementations
- Identify memory leaks
- Review async operations
```

**PLAYTEST Agent Task:**
```
Test complete user workflows:
- Execute all user journeys from PRD
- Test role-based scenarios
- Verify end-to-end flows
- Test state persistence
- Check session management
- Validate workflow completions
- Test concurrent user scenarios
```

### Step 3: Synthesize All Insights
After all parallel batches complete:
- Compile findings from all SERENA agents
- Compile findings from all PLAYTEST agents
- Cross-reference code analysis with test results
- Calculate PRD compliance percentage
- Identify gaps between implementation and specification

### Step 4: Generate Comprehensive Audit Report
Create `/DOCUMENTS/Audit.md` with synthesized insights:

```markdown
# Comprehensive System Audit Report
Generated: [timestamp]
Environment: [from .env.local]
PRD Version: [from PRD.md]
Testing Method: Parallel SERENA + PLAYTEST Analysis

## Executive Summary
- Overall PRD Compliance: [X]%
- Code Coverage: [X]%
- Working Features: [X]/[Total]
- Critical Issues: [count]

## Codebase Analysis (SERENA Findings)

### Architecture Overview
[Complete architecture mapping]

### Implementation Coverage
| Component | PRD Requirement | Implementation Status | Real vs Placeholder |
|-----------|----------------|----------------------|---------------------|
| [name] | [requirement] | [percent complete] | [Real/Mock/Partial] |

### Code Quality Metrics
- Technical Debt Score: [X]
- Code Duplication: [X]%
- Test Coverage: [X]%
- Type Safety: [X]%

### Dependencies & Integrations
[Status of all external dependencies]

## Functional Testing Results (PLAYTEST Findings)

### Navigation Testing
- Total Routes: [X]
- Working Routes: [X]
- Broken Routes: [list]
- Load Performance: [metrics]

### Feature Testing
| Feature | Status | Works | Issues | PRD Match |
|---------|--------|--------|--------|-----------|
| [name] | ✅/⚠️/❌ | [Y/N] | [list] | [percent] |

### Workflow Testing
| Workflow | Completion | Blockers | Notes |
|----------|------------|----------|-------|
| [name] | [percent] | [list] | [details] |

## Cross-Analysis Insights
[Correlation between code analysis and test results]

## Gap Analysis vs PRD
### Missing Features
[List of features in PRD but not implemented]

### Partial Implementations
[Features that exist but don't meet PRD specs]

### Additional Features
[Features implemented but not in PRD]

## Critical Issues
1. [Issue]: [Description] - [Impact] - [Fix Priority]

## Performance Analysis
- Page Load Times: [metrics]
- API Response Times: [metrics]
- Memory Usage: [metrics]
- Bundle Sizes: [metrics]

## Recommendations
### Immediate (P0)
[Critical fixes needed]

### Short-term (P1)
[MVP requirements]

### Long-term (P2)
[Enhancements]

## Environment-Specific Findings
[Issues related to .env.local configuration]
```

## Important Notes
- **PARALLEL EXECUTION**: SERENA and PLAYTEST agents run simultaneously in batches
- **100% COVERAGE**: Every file, component, route, and feature must be analyzed/tested
- **COMPREHENSIVE**: Both code analysis AND functional testing with cross-referencing
- **SYNTHESIS**: Combine insights from both agent types for complete picture

## ULTRATHINK Mode
When ULTRATHINK is specified:
- Deeper code pattern analysis
- More edge case testing
- Performance profiling under load
- Security vulnerability scanning
- Accessibility compliance checking
- Browser compatibility testing
- Memory leak detection
- Race condition identification
- Database query optimization analysis
- Caching strategy evaluation
- Error boundary testing
- State management validation
- API contract verification
- Integration point stress testing
- Concurrent user simulation