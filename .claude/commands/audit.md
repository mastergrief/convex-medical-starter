# AUDIT

## META-PROMPT
[Read .env.local and DOCUMENTS/PRD.md then spawn in PARALLEL with task tool the SERENA and PLAYTEST agents in SERIAL batches using the task tool, comprehensively analyse (100% coverage & content) the codebase and perform navigational + functional testing (Extensively test everything, all pages, all features, what works, all workflows, what doesn't and how close we are to PRD specs). Upon completion synthesise all gathered insights into a markdown file called Audit.md in /DOCUMENTS. Be comprehensive, 100% coverage and content. ULTRATHINK]

## EXECUTION STEPS

### 1. Read relevant files
- Read .env.local
- Read DOCUMENTS/PRD.md

### 2. Create detailed plan for audit
- **ENGAGE ULTRATHINK FOR MAXIMUM REASONING**

### 3. Spawn SERENA and PLAYTEST agents in PARALLEL within SERIAL batches
- Use task tool to keep spawning the parallel batches until complete
- Achieve 100% coverage of codebase and content analysis
- Perform extensive navigational & functional testing of everything with playwright mcp tools

### 4. Synthesis findings into DOCUMENTS/AUDIT.md
- Overall PRD compliance
- What works and what doesn't
- What is missing
- Critical issues

## REMEMBER
**PARALLEL SPAWNING IN SERIAL BATCHES, TEST/DOCUMENT EVERYTHING, 100% COVERAGE & CONTENT!**

## DETAILED EXECUTION

### PARALLEL SPAWNING IN SERIAL BATCHES PATTERN

**SERIAL BATCH 1: Foundation Analysis**
```javascript
await Promise.all([
  Task("SERENA: Comprehensive foundation analysis", {
    subagent_type: "serena",
    prompt: "Analyze ALL project structure, routing, authentication, core components. Achieve 100% coverage of foundation code."
  }),
  Task("PLAYTEST: Extensive navigation testing", {
    subagent_type: "playtest",
    prompt: "Test EVERY route, ALL login flows, COMPLETE navigation. Use playwright mcp tools for extensive testing."
  })
]);
```

**SERIAL BATCH 2: Feature Analysis**
```javascript
await Promise.all([
  Task("SERENA: Complete feature analysis", {
    subagent_type: "serena",
    prompt: "Analyze ALL features, EVERY data model, ALL business logic. 100% coverage required."
  }),
  Task("PLAYTEST: Exhaustive feature testing", {
    subagent_type: "playtest",
    prompt: "Test ALL forms, EVERY button, ALL features, COMPLETE interactions. Extensive playwright testing."
  })
]);
```

**SERIAL BATCH 3: Integration & Workflows**
```javascript
await Promise.all([
  Task("SERENA: Full integration analysis", {
    subagent_type: "serena",
    prompt: "Analyze ALL API integrations, COMPLETE state management, EVERY data flow. 100% coverage."
  }),
  Task("PLAYTEST: Complete workflow testing", {
    subagent_type: "playtest",
    prompt: "Test ALL workflows end-to-end, EVERY real-time update, ALL data operations. Extensive playwright mcp tools."
  })
]);
```

**SERIAL BATCH 4: PRD Compliance**
```javascript
await Promise.all([
  Task("SERENA: PRD compliance mapping", {
    subagent_type: "serena",
    prompt: "Map ALL implementations to PRD, identify EVERY gap, verify 100% coverage achieved."
  }),
  Task("PLAYTEST: PRD validation testing", {
    subagent_type: "playtest",
    prompt: "Validate ALL PRD requirements, measure EXACT completion percentage, ensure 100% tested."
  })
]);
```

**CONTINUE SPAWNING BATCHES UNTIL 100% COVERAGE CONFIRMED!**

### AUDIT.md STRUCTURE

```markdown
# Comprehensive System Audit
Date: [timestamp]
Coverage: 100% codebase analysis, 100% functional testing
Method: PARALLEL SPAWNING IN SERIAL BATCHES

## Executive Summary
- Overall PRD Compliance: [X]%
- What Works: [list]
- What Doesn't Work: [list]
- What's Missing: [list]
- Critical Issues: [count]

## SERENA Analysis (100% Coverage)

### Codebase Metrics
- Total Files Analyzed: [ALL]
- Components: [complete inventory]
- Routes: [complete mapping]
- Backend Functions: [complete list]
- Database Schema: [complete structure]

### Implementation Status
- Real Components: [count]
- Placeholder Components: [count]
- Implementation Percentage: [X]%
- Portal Status:
  - Admin: [X]%
  - Doctor: [X]%
  - Employer: [X]%
  - Employee: [X]%

## PLAYTEST Results (100% Testing)

### What Works ✅
[Complete list of all working features]
- Feature: [status] - PRD Compliance: [yes/no]

### What Doesn't Work ❌
[Complete list of all broken features]
- Feature: [error] - Impact: [severity]

### What's Missing ❓
[Complete list from PRD not implemented]
- PRD Requirement: [status]

### Navigation & Routes
- Total Routes Tested: [ALL]
- Working: [count]
- Broken: [count]
- Missing: [count]

## PRD Compliance Analysis

### Requirements Matrix
| PRD Requirement | Implementation | Testing | Status |
|-----------------|---------------|---------|--------|
| [ALL requirements mapped] |

### Gap Analysis
- Missing Features: [complete list]
- Partial Implementations: [complete list]
- Deviations from PRD: [complete list]

## Critical Issues

### P0 - Blocking
[All system-breaking issues]

### P1 - High Priority
[All major issues]

### P2 - Medium Priority
[All moderate issues]

### P3 - Low Priority
[All minor issues]

## Recommendations

### Immediate Actions
- [Critical fixes required]

### Short-term Improvements
- [Important enhancements]

### Long-term Strategic Items
- [Architecture improvements]

## Metrics Summary
- Files Analyzed: 100%
- Routes Tested: 100%
- Features Tested: 100%
- Workflows Tested: 100%
- PRD Requirements Covered: 100%
- Overall System Completion: [X]%
```

## ULTRATHINK MODE ACTIVATION

### Deep Reasoning Areas

1. **Coverage Strategy**
   - Systematic approach for 100% coverage
   - No blind spots allowed
   - Cross-validation between agents
   - Verification of completeness

2. **Parallel Execution Optimization**
   - Efficient batch distribution
   - Minimize redundancy
   - Maximize parallelization
   - Ensure serial progression

3. **PRD Compliance Assessment**
   - Exact requirement mapping
   - Gap severity analysis
   - Implementation quality metrics
   - User impact evaluation

4. **Critical Issue Identification**
   - Root cause analysis
   - Dependency chain impacts
   - Risk assessment
   - Priority assignment

5. **Synthesis Quality**
   - Complete documentation
   - Actionable insights
   - Clear prioritization
   - Strategic recommendations

## EXECUTION PATTERN

```
REPEAT {
  1. Spawn SERENA + PLAYTEST in PARALLEL (batch)
  2. Wait for batch completion
  3. Check coverage percentage
  4. If coverage < 100%:
     - Identify gaps
     - Create next batch targeting gaps
     - Continue
  5. If coverage == 100%:
     - Proceed to synthesis
}
```

## CRITICAL REQUIREMENTS

- **PARALLEL SPAWNING IN SERIAL BATCHES** - Core execution pattern
- **100% COVERAGE & CONTENT** - No exceptions
- **TEST/DOCUMENT EVERYTHING** - Complete analysis
- **EXTENSIVE PLAYWRIGHT TESTING** - All functional testing
- **ULTRATHINK** - Maximum reasoning throughout

## FINAL REMINDERS

- **PARALLEL SPAWNING IN SERIAL BATCHES** - This is THE pattern
- **TEST/DOCUMENT EVERYTHING** - Leave nothing untested
- **100% COVERAGE & CONTENT!** - Absolutely mandatory
- **ULTRATHINK** - Engage maximum reasoning
- **SYNTHESIZE TO AUDIT.MD** - Complete documentation

---
*Command executes comprehensive audit using PARALLEL SPAWNING IN SERIAL BATCHES with SERENA and PLAYTEST agents to achieve 100% coverage with ULTRATHINK reasoning.*