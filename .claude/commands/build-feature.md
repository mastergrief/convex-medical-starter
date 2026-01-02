# BUILD-FEATURE

## META-PROMPT
[Read /DOCUMENTS/FEATURE-PLAN.md then implement the planned feature using SERENA tools for all code operations and SHADCN tools for all UI components. Follow the implementation plan exactly, ensuring 100% TypeScript compliance, complete Convex integration, and full test coverage. Use Playwright tools for functional testing. Upon completion update FEATURE-PLAN.md with implementation results and write comprehensive summary to Serena memory. NO AGENTS. ULTRATHINK]

## EXECUTION STEPS

### Step 1: Read feature plan
- Read /DOCUMENTS/FEATURE-PLAN.md
- Extract implementation phases
- Identify components to build
- Note testing requirements
- Review integration points

### Step 2: Implement backend with SERENA tools
- **ENGAGE ULTRATHINK FOR MAXIMUM REASONING**
- Follow Phase 1 from FEATURE-PLAN.md exactly

#### Convex Implementation
Using SERENA tools for all operations:
```javascript
// Schema creation
mcp__serena__insert_after_symbol(lastSchema, newSchemaDefinition)

// Query implementation  
mcp__serena__insert_after_symbol(lastFunction, queryImplementation)

// Mutation implementation
mcp__serena__insert_after_symbol(lastMutation, mutationImplementation)

// Validators
mcp__serena__insert_before_symbol(firstFunction, validatorImports)
```

**Run `npm run typecheck` after EVERY modification**

### Step 3: Build frontend components with SHADCN tools
- Follow Phase 2 from FEATURE-PLAN.md exactly
- **ALL UI components must use shadcn/ui**

#### Component Building Protocol
```javascript
// 1. Get shadcn component
mcp__shadcn-react__get_component(componentName)

// 2. Get implementation pattern
mcp__shadcn-react__get_component_demo(componentName)

// 3. Create component with SERENA
mcp__serena__insert_after_symbol(lastComponent, newComponent)

// 4. Add imports
mcp__serena__insert_before_symbol(firstImport, shadcnImports)
```

Component requirements:
- [ ] TypeScript props fully typed
- [ ] shadcn/ui patterns followed
- [ ] Responsive design implemented
- [ ] Accessibility standards met
- [ ] Error states handled

### Step 4: Wire up integration
- Follow Phase 3 from FEATURE-PLAN.md exactly
- Connect frontend to backend
- Implement real-time subscriptions
- Add loading and error states

#### Integration Checklist
- [ ] API connections established
- [ ] Data flow working
- [ ] State management connected
- [ ] Real-time updates functional
- [ ] Error boundaries in place

### Step 5: Implement tests
- Follow Phase 4 from FEATURE-PLAN.md exactly
- Write tests as specified in plan
- Achieve coverage targets

#### Testing Implementation
```javascript
// Unit tests
- Test components per plan
- Test functions per plan
- Validate type safety

// Integration tests
- Test API connections
- Validate data persistence
- Check state updates

// E2E with Playwright
mcp__playwright__browser_navigate(featureUrl)
mcp__playwright__browser_click(element)
mcp__playwright__browser_fill_form(testData)
mcp__playwright__browser_snapshot()
```

### Step 6: Functional testing with Playwright tools
**EXTENSIVE testing of implemented feature**

#### Playwright Testing Protocol
1. **Feature Navigation**
   ```javascript
   mcp__playwright__browser_navigate(featureRoute)
   mcp__playwright__browser_snapshot()
   ```

2. **Interaction Testing**
   ```javascript
   mcp__playwright__browser_click(button)
   mcp__playwright__browser_fill_form(formData)
   mcp__playwright__browser_select_option(dropdown, option)
   ```

3. **Workflow Validation**
   - Complete user journey per plan
   - Test all edge cases
   - Validate error handling
   - Check responsive behavior

4. **Screenshot Documentation**
   ```javascript
   mcp__playwright__browser_take_screenshot(`feature-${state}.png`)
   ```

### Step 7: Update documentation
**Update FEATURE-PLAN.md with implementation results**

Add to FEATURE-PLAN.md:
```markdown
## Implementation Results
Date Completed: [timestamp]
Actual Effort: [hours]

### Completed Items
- [x] Backend implementation
- [x] Frontend components
- [x] Integration complete
- [x] Tests passing

### Test Results
- Unit Test Coverage: [X]%
- Integration Tests: [X/Y] passing
- E2E Tests: [X/Y] passing
- Playwright Testing: [results]

### Deviations from Plan
- [Any changes made during implementation]

### Issues Encountered
- [Issue]: [Resolution]

### Performance Metrics
- Load time: [Xms]
- Bundle size impact: [+XKB]
- Query performance: [Xms]

### Next Steps
- [Any follow-up needed]
```

### Step 8: Write to Serena memory
**Write comprehensive summary to Serena memory**

```javascript
mcp__serena__write_memory(
  `feature_${featureName}_implemented_${timestamp}`,
  JSON.stringify({
    feature: "Feature Name",
    plan_reference: "FEATURE-PLAN.md",
    completed_at: timestamp,
    implementation: {
      backend: {
        schemas_created: [...],
        functions_added: [...],
        validators_implemented: [...]
      },
      frontend: {
        components_created: [...],
        shadcn_components_used: [...],
        routes_added: [...]
      },
      integration: {
        api_connections: [...],
        state_management: "approach",
        real_time_features: [...]
      }
    },
    testing: {
      unit_coverage: "X%",
      integration_tests: X,
      e2e_tests: X,
      playwright_results: "summary"
    },
    performance: {
      load_time: "Xms",
      bundle_impact: "+XKB",
      query_performance: "Xms"
    },
    issues_resolved: [...],
    lessons_learned: [...],
    follow_up_needed: [...]
  })
)
```

## ULTRATHINK MODE ACTIVATION
**ENGAGE DEEP REASONING FOR:**

1. **Implementation Fidelity**
   - Follow plan exactly
   - Validate each step
   - Track deviations
   - Document changes

2. **Code Quality**
   - TypeScript strictness
   - Error handling completeness
   - Performance optimization
   - Security implementation

3. **Testing Thoroughness**
   - Edge case coverage
   - Error state validation
   - Performance testing
   - User journey verification

4. **Integration Robustness**
   - Data flow validation
   - State consistency
   - Real-time reliability
   - Error recovery

## IMPLEMENTATION REQUIREMENTS

### TypeScript Compliance
- **100% type safety required**
- No `any` types
- Strict mode enabled
- All props/returns typed

### Convex Integration
- Proper schema definitions
- Optimized queries
- Efficient subscriptions
- Complete error handling

### UI Standards
- **ALL components from shadcn/ui**
- Consistent styling
- Full accessibility
- Mobile responsive

### Testing Coverage
- Minimum per FEATURE-PLAN.md
- All critical paths tested
- Edge cases covered
- Performance validated

## EXECUTION CHECKLIST

### Pre-Implementation
- [ ] FEATURE-PLAN.md read and understood
- [ ] All dependencies available
- [ ] Environment ready
- [ ] TypeScript strict mode on

### During Implementation
- [ ] Following plan phases exactly
- [ ] Using SERENA tools exclusively
- [ ] Using SHADCN components only
- [ ] Running typecheck after changes
- [ ] Testing as building

### Post-Implementation
- [ ] All tests passing
- [ ] Playwright testing complete
- [ ] FEATURE-PLAN.md updated
- [ ] Serena memory written
- [ ] Screenshots captured

## REMEMBER: CRITICAL CONSTRAINTS
- **NO AGENTS** - Direct implementation only
- **FOLLOW PLAN** - Execute FEATURE-PLAN.md exactly
- **SERENA TOOLS** - All code operations
- **SHADCN ONLY** - All UI components
- **TEST EVERYTHING** - Full coverage required

## FINAL REMINDERS
- **NO AGENTS** - Direct implementation only
- **ULTRATHINK** - Maximum reasoning throughout
- **SERENA TOOLS** - Exclusive for code operations
- **SHADCN COMPONENTS** - Exclusive for UI
- **FOLLOW THE PLAN** - FEATURE-PLAN.md is the blueprint
- **TEST EXTENSIVELY** - Playwright for validation
- **DOCUMENT RESULTS** - Update plan and memory

---
*Command executes feature implementation from FEATURE-PLAN.md using SERENA and SHADCN tools with ULTRATHINK reasoning for high-quality implementation.*