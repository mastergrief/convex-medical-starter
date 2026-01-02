#!/usr/bin/env python3
"""
Cognitive Workflow Enforcer - SubagentStop Hook (MASTER ENFORCER)
Ensures agents complete the full Serena cognitive validation chain:
1. think_about_collected_information (after research)
2. think_about_task_adherence (before changes)
3. think_about_whether_you_are_done (at completion)
4. write_memory (document work)

This is the PRIMARY SubagentStop hook after resolving conflicts.
"""

import json
import sys
import fcntl
from pathlib import Path
from datetime import datetime, timedelta
from shared_thresholds import (
    COGNITIVE_RATE_LIMIT_SECONDS,
    SEARCH_TOOLS,
    MODIFICATION_TOOLS,
    is_substantial_work,
    needs_cognitive_validation,
    COGNITIVE_SEARCH_THRESHOLD,
    MODIFICATION_THRESHOLD,
    SUBSTANTIAL_WORK,
    SUBAGENT_TYPES
)

CACHE_FILE = Path("/tmp/.cognitive_workflow_cache.json")

def load_cache_with_lock():
    """Load workflow enforcement cache with file locking."""
    if not CACHE_FILE.exists():
        return {}
    
    try:
        with open(CACHE_FILE, 'r+') as f:
            # Acquire exclusive lock
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = {}
            finally:
                # Release lock
                fcntl.flock(f, fcntl.LOCK_UN)
            return data
    except (IOError, OSError):
        return {}

def save_cache_with_lock(cache):
    """Save workflow enforcement cache with file locking."""
    try:
        # Ensure file exists
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        CACHE_FILE.touch(exist_ok=True)
        
        with open(CACHE_FILE, 'r+') as f:
            # Acquire exclusive lock
            fcntl.flock(f, fcntl.LOCK_EX)
            try:
                f.seek(0)
                json.dump(cache, f)
                f.truncate()
            finally:
                # Release lock
                fcntl.flock(f, fcntl.LOCK_UN)
    except (IOError, OSError):
        pass

def analyze_cognitive_workflow(transcript_path: str) -> dict:
    """Analyze if the agent followed the cognitive workflow."""
    if not Path(transcript_path).exists():
        return {
            "work_done": False,
            "collected_info_checked": False,
            "task_adherence_checked": False,
            "completion_checked": False,
            "memory_written": False,
            "tool_count": 0,
            "modification_count": 0,
            "search_count": 0
        }
    
    # Track workflow steps
    collected_info_checked = False
    task_adherence_checked = False
    completion_checked = False
    memory_written = False
    meaningful_memory = False
    
    # Track work categories
    tool_count = 0
    modification_count = 0
    search_count = 0
    
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
                                tool_count += 1
                                
                                # Track cognitive tools
                                if tool_name == "mcp__serena__think_about_collected_information":
                                    collected_info_checked = True
                                elif tool_name == "mcp__serena__think_about_task_adherence":
                                    task_adherence_checked = True
                                elif tool_name == "mcp__serena__think_about_whether_you_are_done":
                                    completion_checked = True
                                
                                # Track work types
                                if tool_name in SEARCH_TOOLS:
                                    search_count += 1
                                elif tool_name in MODIFICATION_TOOLS:
                                    modification_count += 1
                                
                                # Check memory write
                                if tool_name == "mcp__serena__write_memory":
                                    tool_input = content_block.get("input", {})
                                    memory_name = tool_input.get("memory_name", "")
                                    
                                    if "subagent_" in memory_name:
                                        memory_written = True
                                        
                                        # Check if meaningful
                                        content = tool_input.get("content", "{}")
                                        try:
                                            data = json.loads(content)
                                            if (data.get("files_created") or 
                                                data.get("files_modified") or
                                                data.get("key_outputs")):
                                                meaningful_memory = True
                                        except:
                                            pass
                                
                except (json.JSONDecodeError, KeyError):
                    continue
                    
    except Exception:
        pass
    
    # Use shared threshold logic
    work_done = is_substantial_work(tool_count, modification_count, search_count)
    
    return {
        "work_done": work_done,
        "collected_info_checked": collected_info_checked,
        "task_adherence_checked": task_adherence_checked,
        "completion_checked": completion_checked,
        "memory_written": memory_written and meaningful_memory,
        "tool_count": tool_count,
        "modification_count": modification_count,
        "search_count": search_count
    }

def generate_workflow_guidance(workflow_status: dict) -> str:
    """Generate guidance based on what's missing from the workflow."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    missing_steps = []
    
    # Determine what's missing based on work type
    if workflow_status["search_count"] >= COGNITIVE_SEARCH_THRESHOLD and not workflow_status["collected_info_checked"]:
        missing_steps.append({
            "tool": "mcp__serena__think_about_collected_information",
            "reason": "You've done substantial research. Please validate the information is complete."
        })
    
    if workflow_status["modification_count"] >= MODIFICATION_THRESHOLD:
        if not workflow_status["task_adherence_checked"]:
            missing_steps.append({
                "tool": "mcp__serena__think_about_task_adherence",
                "reason": "You've made code changes. Please verify they align with the task."
            })
    
    if workflow_status["work_done"] and not workflow_status["completion_checked"]:
        missing_steps.append({
            "tool": "mcp__serena__think_about_whether_you_are_done",
            "reason": "Please validate that your work is complete."
        })
    
    if workflow_status["work_done"] and not workflow_status["memory_written"]:
        missing_steps.append({
            "tool": "mcp__serena__write_memory",
            "reason": "Please document your work for context sharing."
        })
    
    if not missing_steps:
        return ""  # All good!
    
    # Build guidance message
    guidance = f"""
📋 **Complete the Serena Cognitive Workflow**

You've done substantial work ({workflow_status['tool_count']} operations) but haven't completed the cognitive validation chain.

**Required steps to complete:**
"""
    
    for i, step in enumerate(missing_steps, 1):
        guidance += f"\n{i}. Call `{step['tool']}()`"
        guidance += f"\n   → {step['reason']}\n"
    
    # Add memory template if needed
    if any(s["tool"] == "mcp__serena__write_memory" for s in missing_steps):
        guidance += f"""
**Memory template for step {len(missing_steps)}:**
```python
mcp__serena__write_memory(
    memory_name="subagent_{{agent_type}}_{timestamp}",
    content=json.dumps({{
        "agent": "{{agent_type}}",
        "completed_at": "{datetime.now().isoformat()}",
        "work_type": "{'modification' if workflow_status['modification_count'] > 0 else 'analysis'}",
        "files_created": [...],
        "files_modified": [...],
        "key_outputs": {{...}},
        "cognitive_validation": {{
            "information_complete": {'true' if workflow_status['collected_info_checked'] else 'pending'},
            "task_aligned": {'true' if workflow_status['task_adherence_checked'] else 'pending'},
            "work_complete": {'true' if workflow_status['completion_checked'] else 'pending'}
        }},
        "next_steps": [...]
    }})
)
```
"""
    
    guidance += "\n**Why this matters:** The cognitive workflow ensures quality, completeness, and proper documentation of your work."
    
    return guidance

def should_enforce(workflow_status: dict, agent_name: str) -> bool:
    """Determine if we should enforce the workflow."""
    # Don't enforce if no substantial work
    if not workflow_status["work_done"]:
        return False
    
    # Don't enforce if workflow is complete
    if (workflow_status["completion_checked"] and 
        workflow_status["memory_written"]):
        return False
    
    # Check rate limiting
    cache = load_cache_with_lock()
    last_enforcement = cache.get(f"last_{agent_name}")
    
    if last_enforcement:
        last_time = datetime.fromisoformat(last_enforcement)
        if datetime.now() - last_time < timedelta(seconds=COGNITIVE_RATE_LIMIT_SECONDS):
            return False
    
    # Use shared logic for when to enforce
    if needs_cognitive_validation(workflow_status["search_count"], workflow_status["modification_count"]):
        # Check if cognitive validation is missing
        if not workflow_status["collected_info_checked"] or not workflow_status["task_adherence_checked"]:
            return True
    
    # Always enforce if substantial work but no completion check
    if workflow_status["tool_count"] >= SUBSTANTIAL_WORK and not workflow_status["completion_checked"]:
        return True
    
    return False

def parse_agent_info(hook_input: dict) -> str:
    """Extract agent name from hook input."""
    agent_name = hook_input.get("agent_name", "")
    
    if not agent_name:
        prompt = hook_input.get("prompt", "")
        for name in SUBAGENT_TYPES:
            if name in prompt.lower():
                agent_name = name
                break
    
    return agent_name or "unknown"

def main():
    """Main hook entry point."""
    try:
        # Read hook input
        hook_input = json.load(sys.stdin)
        
        transcript_path = hook_input.get("transcript_path", "")
        agent_name = parse_agent_info(hook_input)
        
        # Analyze the cognitive workflow
        workflow_status = analyze_cognitive_workflow(transcript_path)
        
        # Determine if we should enforce
        if should_enforce(workflow_status, agent_name):
            # Update cache with locking
            cache = load_cache_with_lock()
            cache[f"last_{agent_name}"] = datetime.now().isoformat()
            save_cache_with_lock(cache)
            
            # Generate guidance
            guidance = generate_workflow_guidance(workflow_status)
            
            if guidance:
                # Block and provide guidance
                output = {
                    "decision": "block",
                    "reason": guidance
                }
                print(json.dumps(output))
                sys.exit(0)
        
        # Allow stop - workflow complete or not required
        sys.exit(0)
        
    except Exception as e:
        # On error, allow stop
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()