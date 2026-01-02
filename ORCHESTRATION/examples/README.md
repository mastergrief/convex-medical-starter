# Example Templates

JSON templates for orchestration artifacts. Use these as references when creating new plans or handoffs.

## Files

| File | Description |
|------|-------------|
| `plan-template.json` | Example plan with phases, subtasks, dependencies |
| `handoff-template.json` | Example handoff with state, results, next actions |
| `token-state-template.json` | Example token tracking state with agent usage |

## Usage

```bash
# Validate a template
npx tsx ORCHESTRATION/cli/orch.ts validate examples/plan-template.json

# Copy and modify for your use
cp examples/plan-template.json my-plan.json
# Edit my-plan.json...
npx tsx ORCHESTRATION/cli/orch.ts plan write my-plan.json
```

## Creating New Artifacts

Templates show the required structure. Key fields:

**Plan**:
- `id`: UUID
- `type`: "plan"
- `phases[]`: Array of phases with subtasks
- `subtasks[].agentType`: Which agent handles this task

**Handoff**:
- `id`: UUID
- `type`: "handoff"
- `reason`: Why handoff occurred (task_complete, token_limit, etc.)
- `state`: Current progress (completed/pending tasks)
- `context.resumeInstructions`: How to continue
