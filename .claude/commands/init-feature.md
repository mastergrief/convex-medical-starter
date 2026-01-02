# Initialize Feature Request

## Output: Feature request file ready for PRP generation

Create a comprehensive feature request file using the INITIAL.md template. This command helps you structure your feature requirements properly for optimal AI-assisted implementation.

## Usage

```
/init-feature [feature-name]
```

## Process

1. **Feature Analysis**
   - Understand the feature requirements
   - Identify relevant patterns in codebase
   - Determine integration points

2. **Example Discovery**
   - Search `examples/` directory for relevant patterns
   - Identify which examples should be referenced
   - Note specific files and patterns to follow

3. **Documentation Research**
   - Identify necessary documentation resources
   - Find relevant API docs, guides, tutorials
   - Include specific URLs and sections

4. **Considerations Gathering**
   - Common pitfalls for this type of feature
   - Performance considerations
   - Security implications
   - Edge cases to handle

5. **File Generation**
   - Create structured feature request
   - Save as `features/{feature-name}-request.md`
   - Validate completeness

## Template Structure

The generated file will include:

### FEATURE Section

- Clear description of functionality
- User-facing behavior
- Technical requirements
- Success criteria

### EXAMPLES Section

- Specific files from `examples/` to follow
- Why each example is relevant
- Patterns to extract and apply

### DOCUMENTATION Section

- Official documentation links
- API references
- Best practices guides
- Implementation examples

### OTHER CONSIDERATIONS Section

- Known gotchas
- Performance requirements
- Security considerations
- Integration challenges
- Testing strategies

## Arguments

- `feature-name`: Name for the feature (kebab-case recommended)
  - If not provided, will prompt for feature details

## Quality Checklist

Generated feature request should have:

- [ ] Clear, specific feature description
- [ ] At least 2-3 relevant examples referenced
- [ ] Documentation links with specific sections
- [ ] Concrete success criteria
- [ ] Known edge cases identified
- [ ] Integration points mapped

## Validation Steps

Before generating:

1. Check if `examples/` directory exists and has content
2. Verify CLAUDE.md exists for project context
3. Ensure feature name doesn't conflict with existing

After generating:

1. Validate all sections have content
2. Check example files actually exist
3. Verify documentation links are accessible
4. Score completeness (1-10)

## Next Steps

After running this command:

1. Review the generated feature request
2. Add any missing details
3. Run `/generate-prp features/{feature-name}-request.md`
4. Review the generated PRP
5. Run `/execute-prp PRPs/{feature-name}.md`

## Example Output

```markdown
## FEATURE:

Implement a real-time dashboard with WebSocket updates showing user activity metrics,
system health status, and performance KPIs. Should update every 5 seconds and support
filtering by date range and metric type.

## EXAMPLES:

- `examples/components/dashboard-widget.tsx` - For component structure and styling patterns
- `examples/hooks/use-websocket.ts` - For WebSocket connection management
- `examples/components/chart-component.tsx` - For data visualization patterns
- `examples/utils/data-formatter.ts` - For metric formatting utilities

## DOCUMENTATION:

- WebSocket API: https://developer.mozilla.org/en-US/docs/Web/API/WebSocket
- Chart.js Documentation: https://www.chartjs.org/docs/latest/
- React Query WebSocket Integration: https://tanstack.com/query/latest/docs/react/guides/websockets
- Performance Monitoring Best Practices: https://web.dev/vitals/

## OTHER CONSIDERATIONS:

- Handle WebSocket reconnection gracefully with exponential backoff
- Implement data aggregation on backend to reduce payload size
- Use React.memo for dashboard widgets to prevent unnecessary re-renders
- Add loading skeletons during initial data fetch
- Consider mobile responsive design from the start
- Implement proper error boundaries for failed widgets
- Add accessibility features (ARIA labels, keyboard navigation)
```

## Benefits

1. **Structured Thinking** - Forces comprehensive feature planning
2. **Pattern Reuse** - Identifies existing code to follow
3. **Documentation First** - Gathers resources upfront
4. **Risk Mitigation** - Identifies gotchas early
5. **Better PRPs** - More context leads to better implementation

Remember: The quality of your feature request directly impacts the quality of the generated PRP and final implementation.
