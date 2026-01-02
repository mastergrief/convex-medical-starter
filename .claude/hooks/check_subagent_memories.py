#!/usr/bin/env python3
"""
PostToolUse Hook - Layer 2: NOTIFICATION
Reminds parent agent to check for subagent memories after Task tool completes.
"""
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path

def generate_memory_check_code(cutoff_time: str) -> str:
    """Generate the code snippet for checking memories."""
    return f'''
# Check for recent subagent memories
memories = mcp__serena__list_memories()
recent_subagent_memories = [
    m for m in memories 
    if m.startswith("subagent_") and not m.endswith("_read")
]

# Read and process each memory
for memory_name in recent_subagent_memories:
    context = mcp__serena__read_memory(memory_name)
    
    # Parse the context
    import json
    data = json.loads(context)
    
    # Process based on content
    print(f"Subagent {{data.get('agent')}} completed:")
    print(f"  - Files created: {{len(data.get('files_created', []))}}")
    print(f"  - Files modified: {{len(data.get('files_modified', []))}}")
    print(f"  - Next steps: {{data.get('next_steps', [])}}")
    
    # Mark as processed (optional)
    mcp__serena__write_memory(f"{{memory_name}}_read", "processed")
'''

def create_reminder_message() -> str:
    """Create a formatted reminder message for the parent."""
    cutoff = (datetime.now() - timedelta(minutes=5)).isoformat()
    
    return f"""
================================================================================
📋 SUBAGENT CONTEXT CHECK REMINDER
================================================================================

A subagent has completed its task. Per the Semantic Memory Context Sharing 
Protocol, you should check for any context it may have written.

**Quick Check Command:**
```python
# List all available memories
memories = mcp__serena__list_memories()
print([m for m in memories if "subagent_" in m])
```

**Full Context Retrieval:**
```python
{generate_memory_check_code(cutoff)}
```

**Important**: 
- Subagents write completion summaries to semantic memory
- These contain files created, decisions made, and next steps
- Process and delete old memories to prevent accumulation

================================================================================
"""

def should_trigger_reminder(hook_input: dict) -> bool:
    """Determine if we should show the reminder."""
    tool_name = hook_input.get("tool_name", "")
    
    # Only trigger after Task tool (subagent invocation)
    if tool_name != "Task":
        return False
    
    # Check if it was actually a subagent call
    tool_input = hook_input.get("tool_input", {})
    subagent_type = tool_input.get("subagent_type", "")
    
    # Import shared subagent types
    from shared_thresholds import SUBAGENT_TYPES
    
    return any(agent in subagent_type.lower() for agent in SUBAGENT_TYPES)

def main():
    """Main hook entry point."""
    try:
        # Read hook input
        hook_input = json.load(sys.stdin)
        
        # Check if we should trigger
        if not should_trigger_reminder(hook_input):
            # Not a subagent Task, exit silently
            sys.exit(0)
        
        # Check if there was an error
        error = hook_input.get("tool_error", "")
        if error:
            # Subagent had an error, probably didn't write memory
            print("Note: Subagent encountered an error and may not have written memory.")
            sys.exit(0)
        
        # Generate and output the reminder
        reminder = create_reminder_message()
        
        # Output as stdout (becomes visible to parent)
        print(reminder)
        
        # Write to a unique marker file for UserPromptSubmit hook (avoids race conditions)
        subagent_type = hook_input.get("tool_input", {}).get("subagent_type", "unknown")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        marker_file = Path(f".claude/hooks/.subagent_completed_{subagent_type}_{timestamp}.json")
        marker_file.parent.mkdir(parents=True, exist_ok=True)
        with open(marker_file, 'w') as f:
            f.write(json.dumps({
                "timestamp": datetime.now().isoformat(),
                "subagent_type": subagent_type,
                "session_id": hook_input.get("session_id", "")
            }))
        
        sys.exit(0)
        
    except Exception as e:
        # On error, exit silently
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()