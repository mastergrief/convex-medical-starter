#!/usr/bin/env python3
"""
Semantic Memory Enforcer - PostToolUse Hook (BACKUP ENFORCER)
Triggers when mcp__serena__think_about_whether_you_are_done is called.
Ensures agents document their work before completing.

This provides a backup to the primary cognitive_workflow_enforcer.
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from shared_thresholds import (
    MODIFICATION_TOOLS,
    ANALYSIS_TOOLS,
    PATTERN_TOOLS,
    MINIMAL_WORK
)

def check_memory_written(transcript_path: str) -> dict:
    """Check if meaningful memory was written in this session."""
    if not Path(transcript_path).exists():
        return {"written": False, "meaningful": False}
    
    memory_written = False
    meaningful_content = False
    
    try:
        with open(transcript_path, 'r') as f:
            for line in f:
                try:
                    turn = json.loads(line)
                    if turn.get("type") == "assistant":
                        message = turn.get("message", {})
                        for content_block in message.get("content", []):
                            if content_block.get("type") == "tool_use":
                                tool_name = content_block.get("name", "")
                                
                                if tool_name == "mcp__serena__write_memory":
                                    tool_input = content_block.get("input", {})
                                    memory_name = tool_input.get("memory_name", "")
                                    
                                    # Check for subagent memory pattern
                                    if "subagent_" in memory_name:
                                        memory_written = True
                                        
                                        # Check if content is meaningful
                                        content = tool_input.get("content", "{}")
                                        try:
                                            data = json.loads(content)
                                            # Meaningful if it has actual content
                                            if (data.get("files_created") or 
                                                data.get("files_modified") or
                                                data.get("key_outputs") or
                                                data.get("patterns_discovered") or
                                                data.get("analysis_complete")):
                                                meaningful_content = True
                                        except:
                                            pass
                                
                except (json.JSONDecodeError, KeyError):
                    continue
                    
    except Exception:
        pass
    
    return {"written": memory_written, "meaningful": meaningful_content}

def analyze_work_scope(transcript_path: str) -> dict:
    """Analyze what work was done to customize the memory template."""
    if not Path(transcript_path).exists():
        return {"files_modified": 0, "analysis_done": 0, "patterns_found": 0}
    
    files_modified = 0
    analysis_done = 0
    patterns_found = 0
    
    # Use tool categories from shared thresholds
    
    try:
        with open(transcript_path, 'r') as f:
            for line in f:
                try:
                    turn = json.loads(line)
                    if turn.get("type") == "assistant":
                        message = turn.get("message", {})
                        for content_block in message.get("content", []):
                            if content_block.get("type") == "tool_use":
                                tool_name = content_block.get("name", "")
                                
                                if tool_name in MODIFICATION_TOOLS:
                                    files_modified += 1
                                elif tool_name in ANALYSIS_TOOLS:
                                    analysis_done += 1
                                elif tool_name in PATTERN_TOOLS:
                                    patterns_found += 1
                                
                except (json.JSONDecodeError, KeyError):
                    continue
                    
    except Exception:
        pass
    
    return {
        "files_modified": files_modified,
        "analysis_done": analysis_done,
        "patterns_found": patterns_found
    }

def generate_contextual_template(work_scope: dict) -> str:
    """Generate a memory template based on work done."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Determine agent type from context
    agent_type = "agent"
    
    # Build contextual prompts based on work
    prompts = []
    
    if work_scope["files_modified"] > 0:
        prompts.append("files_created and files_modified lists")
    
    if work_scope["analysis_done"] > 0:
        prompts.append("analysis findings and insights")
    
    if work_scope["patterns_found"] > 0:
        prompts.append("patterns discovered and their locations")
    
    if not prompts:
        prompts.append("summary of work completed")
    
    focus = ", ".join(prompts)
    
    return f'''
📝 **Complete your work by documenting what you've done**

Since you've called think_about_whether_you_are_done, please document your work:

```python
mcp__serena__write_memory(
    memory_name="subagent_{agent_type}_{timestamp}",
    content=json.dumps({{
        "agent": "{agent_type}",
        "completed_at": "{datetime.now().isoformat()}",
        "work_summary": "Brief description of what was accomplished",
        "files_created": [
            # List any new files created
        ],
        "files_modified": [
            # List any files modified with changes made
        ],
        "key_outputs": {{
            # Document {focus}
        }},
        "next_steps": [
            # Any recommended follow-up actions
        ]
    }})
)
```

This ensures your work is captured for future reference and context sharing.
'''

def main():
    """Main hook entry point."""
    try:
        # Read hook input
        hook_input = json.load(sys.stdin)
        
        # Only process if this is the think_about_whether_you_are_done tool
        tool_name = hook_input.get("tool_name", "")
        if tool_name != "mcp__serena__think_about_whether_you_are_done":
            # Not our target tool
            sys.exit(0)
        
        transcript_path = hook_input.get("transcript_path", "")
        
        # Check if memory was already written
        memory_status = check_memory_written(transcript_path)
        
        # If meaningful memory was already written, we're good
        if memory_status["written"] and memory_status["meaningful"]:
            sys.exit(0)
        
        # Analyze what work was done
        work_scope = analyze_work_scope(transcript_path)
        
        # If no substantial work was done, don't enforce
        total_work = sum(work_scope.values())
        if total_work < MINIMAL_WORK:  # Use shared threshold
            sys.exit(0)
        
        # Generate contextual template
        template = generate_contextual_template(work_scope)
        
        # Output decision to block (PostToolUse hook behavior)
        output = {
            "decision": "block",
            "reason": template
        }
        
        print(json.dumps(output))
        sys.exit(0)
        
    except Exception as e:
        # On error, allow continuation
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()