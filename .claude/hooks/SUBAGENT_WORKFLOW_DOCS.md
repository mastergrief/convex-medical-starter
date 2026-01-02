# SubagentStop Direct Feedback Workflow

## Overview

This implementation provides **Workflow 1: Direct Feedback Loop** for sub-agent task handoffs. When a sub-agent completes its work, the hook automatically:

1. Parses the sub-agent's transcript
2. Extracts key information about work completed
3. Generates a summary
4. Feeds it back to the parent agent for continuation

## How It Works

### Workflow Components

1. **`subagent_feedback.py`** - The main hook script that:
   - Parses sub-agent transcripts
   - Extracts file operations, commands, todos, and errors
   - Generates formatted summaries
   - Blocks the stop event and provides feedback to parent

2. **`.claude/settings.json`** - Configuration that registers the hook:
   ```json
   {
     "hooks": {
       "SubagentStop": [
         {
           "hooks": [
             {
               "type": "command",
               "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/subagent_feedback.py"
             }
           ]
         }
       ]
     }
   }
   ```

### Information Extracted

The hook automatically extracts and summarizes:

- **Files Created** - New files written by the sub-agent
- **Files Modified** - Existing files edited
- **Commands Executed** - Shell commands run with descriptions
- **Tasks Completed** - Todo items marked as completed
- **Errors Encountered** - Any errors that occurred
- **Summary Statistics** - Counts of all operations

### Safety Features

1. **Loop Prevention**: If `stop_hook_active` is true, the hook exits immediately to prevent infinite loops
2. **Empty Work Detection**: If no meaningful work was done, allows normal stop
3. **Error Handling**: Gracefully handles parsing errors and malformed transcripts

## Example Output

When a sub-agent completes authentication implementation:

```markdown
## Sub-agent Task Summary

### Files Created
- `src/contexts/AuthContext.tsx`
- `src/components/LoginForm.tsx`

### Files Modified
- `src/App.tsx`

### Commands Executed
- Install JWT library: `npm install jsonwebtoken`

### Tasks Completed
- ✓ Create auth context
- ✓ Add login form

### Summary Statistics
- Files created: 2
- Files modified: 1
- Commands run: 1
- Tasks completed: 2

**Next Steps**: Based on the sub-agent's work above, please continue with the next phase of the task or spawn another sub-agent if needed.
```

## Testing

### Unit Tests
Run comprehensive unit tests with various scenarios:
```bash
python3 .claude/hooks/test_subagent_workflow.py
```

Tests cover:
- File creation and modification tracking
- Command execution and todo completion
- Error handling
- Empty transcript handling
- Loop prevention

### Integration Tests
Run real-world workflow simulation:
```bash
./.claude/hooks/test_integration.sh
```

Tests the complete flow with realistic transcripts and validates:
- JSON output format
- Blocking behavior
- Content extraction
- Loop prevention
- Empty work detection

## Usage in Claude Code

When you use the Task tool to spawn a sub-agent:

1. Sub-agent performs its work (creates files, runs commands, etc.)
2. When sub-agent completes, the hook automatically triggers
3. Hook parses the transcript and generates a summary
4. Parent agent receives the summary as context
5. Parent can continue work based on sub-agent's progress

### Example Parent-Child Flow

```
Parent: "I'll spawn a sub-agent to implement the authentication system"
  ↓
Sub-agent: Creates auth context, login form, installs dependencies
  ↓
Hook: Blocks stop, generates summary of work done
  ↓
Parent: "Based on the sub-agent's work creating AuthContext.tsx and LoginForm.tsx, 
         I'll now implement the JWT validation logic..."
```

## Customization

To modify what information is extracted:

1. Edit `parse_transcript()` in `subagent_feedback.py`
2. Add new tool name patterns to track
3. Modify `format_summary()` to change output format
4. Update tests to verify new behavior

## Troubleshooting

### Hook Not Triggering
- Check `.claude/settings.json` is properly configured
- Verify hook script has execute permissions: `chmod +x subagent_feedback.py`
- Use `claude --debug` to see hook execution details

### Missing Information
- Check transcript format matches expected structure
- Verify tool names in transcript match patterns in script
- Add debug logging to track parsing issues

### Performance Issues
- Hook has 60-second timeout by default
- Large transcripts may take longer to parse
- Consider filtering transcript to recent entries if needed

## Security Notes

- Hook runs with your user permissions
- Only reads transcript files, doesn't modify system
- Validates all input to prevent injection
- Uses absolute paths via `$CLAUDE_PROJECT_DIR`