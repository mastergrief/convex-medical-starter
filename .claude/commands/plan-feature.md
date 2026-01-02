# PLAN-FEATURE

## META-PROMPT
[Read feature requirements then using CONTEXT7 tools for documentation, BRAVE SEARCH tools for best practices, SERENA tools for codebase analysis, and SHADCN tools for UI patterns, comprehensively research and create detailed implementation plan for feature. Plan must include architecture design, component structure, API design, testing strategy, and integration approach. Upon completion write comprehensive feature plan to markdown file called FEATURE-PLAN.md in /DOCUMENTS with all technical specifications. ULTRATHINK]

## EXECUTION STEPS

### Step 1: Gather feature requirements
- Read feature description and requirements
- Identify core functionality needed
- Define success criteria
- Map user stories and acceptance criteria

### Step 2: Research with CONTEXT7 and BRAVE SEARCH tools
- **ENGAGE ULTRATHINK FOR MAXIMUM REASONING**

#### CONTEXT7 Documentation Research
- Fetch relevant framework documentation
- Get best practice patterns
- Find implementation examples
- Retrieve API references
- Gather testing strategies

#### BRAVE SEARCH Best Practices
- Search for similar implementations
- Find industry standards
- Research performance patterns
- Discover security considerations
- Identify common pitfalls

### Step 3: Analyze codebase with SERENA tools
**Comprehensively analyze existing code for integration points**

Using SERENA tools:
- `mcp__serena__find_file` - Locate related components
- `mcp__serena__get_symbols_overview` - Understand structure
- `mcp__serena__search_for_pattern` - Find similar patterns
- `mcp__serena__find_referencing_symbols` - Map dependencies

Analysis targets:
- Existing patterns to follow
- Reusable components
- Integration points
- State management approach
- API conventions

### Step 4: Research UI patterns with SHADCN tools
**Identify UI components and patterns needed**

Using SHADCN tools:
- `mcp__shadcn-react__list_components` - Available components
- `mcp__shadcn-react__get_component_metadata` - Component specs
- `mcp__shadcn-react__get_component_demo` - Usage patterns

UI Research:
- Component selection
- Composition patterns
- Styling approaches
- Responsive design
- Accessibility requirements

### Step 5: Create comprehensive feature plan
**Write detailed implementation plan to FEATURE-PLAN.md**

Create `/DOCUMENTS/FEATURE-PLAN.md` with structure:

```markdown
# Feature Implementation Plan
Feature: [Feature Name]
Generated: [timestamp]
Status: PLANNED

## Executive Summary
- Feature Description: [brief overview]
- Estimated Effort: [hours/days]
- Complexity: [Low/Medium/High]
- Risk Level: [Low/Medium/High]

## Requirements Analysis
### Functional Requirements
- [Requirement 1]
- [Requirement 2]

### Non-Functional Requirements
- Performance: [targets]
- Security: [considerations]
- Accessibility: [standards]

## Architecture Design

### Component Architecture
```
[Component Tree Diagram]
```

### Data Flow
```
[Data Flow Diagram]
```

### State Management
- Local State: [what and where]
- Global State: [what and where]
- Server State: [Convex subscriptions]

## Technical Specifications

### Frontend Components
| Component | Purpose | Props | State |
|-----------|---------|-------|-------|
| [Component1] | [Purpose] | [Props] | [State] |

### Backend API Design
| Function | Type | Input | Output | Purpose |
|----------|------|-------|--------|---------|
| [Function1] | Query/Mutation | [Schema] | [Schema] | [Purpose] |

### Database Schema
```typescript
// Convex schema definitions
[Schema definitions]
```

## Implementation Plan

### Phase 1: Backend Setup
- [ ] Create Convex schemas
- [ ] Implement queries
- [ ] Create mutations
- [ ] Add validators

### Phase 2: Frontend Components
- [ ] Create base components
- [ ] Implement UI with shadcn
- [ ] Add state management
- [ ] Connect to backend

### Phase 3: Integration
- [ ] Wire up data flow
- [ ] Add error handling
- [ ] Implement loading states
- [ ] Add real-time updates

### Phase 4: Testing
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests
- [ ] Performance tests

## UI/UX Specifications

### Component Library
- shadcn components to use:
  - [Component]: [Purpose]

### Design Patterns
- [Pattern 1]: [Usage]
- [Pattern 2]: [Usage]

### Responsive Design
- Mobile: [approach]
- Tablet: [approach]
- Desktop: [approach]

## Testing Strategy

### Unit Testing
- Components to test: [list]
- Functions to test: [list]
- Coverage target: [X]%

### Integration Testing
- API endpoints: [list]
- Data flows: [list]

### E2E Testing
- User journeys: [list]
- Edge cases: [list]

## Integration Points

### Existing Code
- Files to modify: [list]
- Functions to update: [list]
- Components to extend: [list]

### Dependencies
- New packages needed: [list]
- Existing packages to use: [list]

## Risk Assessment

### Technical Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| [Risk1] | [L/M/H] | [L/M/H] | [Strategy] |

### Implementation Risks
- [Risk 1]: [Mitigation]
- [Risk 2]: [Mitigation]

## Success Criteria
- [ ] All requirements met
- [ ] Tests passing
- [ ] Performance targets hit
- [ ] Accessibility compliant
- [ ] Documentation complete

## Resource Estimates
- Development: [hours]
- Testing: [hours]
- Documentation: [hours]
- Total: [hours]

## References
- Context7 Docs: [links]
- Brave Search Findings: [links]
- Similar Implementations: [links]
- Design Patterns: [links]
```

## ULTRATHINK MODE ACTIVATION
**ENGAGE DEEP REASONING FOR:**

1. **Architecture Planning**
   - Component composition strategy
   - State management design
   - Data flow optimization
   - Performance considerations
   - Scalability planning

2. **Integration Analysis**
   - Dependency mapping
   - Impact assessment
   - Breaking change identification
   - Migration path planning
   - Rollback strategy

3. **Technical Design**
   - API contract design
   - Type system planning
   - Error handling strategy
   - Security boundaries
   - Testing approach

4. **Risk Assessment**
   - Technical debt evaluation
   - Performance impact analysis
   - Security vulnerability assessment
   - User experience risks
   - Implementation complexity

5. **Resource Planning**
   - Effort estimation
   - Skill requirements
   - Timeline projection
   - Dependency scheduling
   - Buffer allocation

## RESEARCH PROTOCOL

### Context7 Research Pattern
```javascript
// 1. Resolve framework docs
await mcp__context7__resolve-library-id("React");
await mcp__context7__resolve-library-id("Convex");

// 2. Get targeted documentation
await mcp__context7__get-library-docs({
  context7CompatibleLibraryID: id,
  topic: "specific-feature-pattern"
});
```

### Brave Search Pattern
```javascript
// Research implementation patterns
await mcp__brave-search__brave_web_search({
  query: "feature best practices 2025 React TypeScript"
});

// Find similar solutions
await mcp__brave-search__brave_web_search({
  query: "real-world feature implementation examples"
});
```

### Serena Analysis Pattern
```javascript
// Map existing code structure
await mcp__serena__find_file("*related*", "src");
await mcp__serena__get_symbols_overview(file);
await mcp__serena__search_for_pattern("similar-pattern");
```

### ShadCN Research Pattern
```javascript
// Identify UI components
await mcp__shadcn-react__list_components();
await mcp__shadcn-react__get_component_metadata(component);
await mcp__shadcn-react__get_component_demo(component);
```

## FINAL REMINDERS
- **ULTRATHINK** - Maximum reasoning for architecture decisions
- **RESEARCH FIRST** - Context7 + Brave before planning
- **ANALYZE CODEBASE** - Serena tools for existing patterns
- **PLAN UI** - ShadCN components selection
- **DOCUMENT EVERYTHING** - Comprehensive FEATURE-PLAN.md
- **NO IMPLEMENTATION** - Only planning and research

---
*Command creates comprehensive feature implementation plan using research tools with ULTRATHINK reasoning for optimal architecture and design decisions.*