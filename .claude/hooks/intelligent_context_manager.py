#!/usr/bin/env python3
"""
Intelligent Context Manager - PreCompact Hook
Automatically manages context by synthesizing work into semantic memory
and injecting it back for continuity during compact operations.
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict

def analyze_conversation(transcript_path: str) -> dict:
    """Analyze the full conversation to extract key information."""
    if not Path(transcript_path).exists():
        return {
            "total_turns": 0,
            "tools_used": defaultdict(int),
            "files_created": set(),
            "files_modified": set(),
            "patterns_discovered": [],
            "key_decisions": [],
            "errors_encountered": [],
            "todos_completed": [],
            "cognitive_validations": 0,
            "memory_writes": 0
        }
    
    analysis = {
        "total_turns": 0,
        "tools_used": defaultdict(int),
        "files_created": set(),
        "files_modified": set(),
        "patterns_discovered": [],
        "key_decisions": [],
        "errors_encountered": [],
        "todos_completed": [],
        "cognitive_validations": 0,
        "memory_writes": 0,
        "search_operations": 0,
        "modification_operations": 0,
        "validation_operations": 0
    }
    
    # File operation tools
    creation_tools = ["Write", "mcp__serena__insert_after_symbol", "mcp__serena__insert_before_symbol"]
    modification_tools = ["Edit", "MultiEdit", "mcp__serena__replace_symbol_body"]
    search_tools = ["mcp__serena__search_for_pattern", "mcp__serena__find_file", 
                   "mcp__serena__find_symbol", "mcp__serena__get_symbols_overview"]
    cognitive_tools = ["mcp__serena__think_about_collected_information",
                      "mcp__serena__think_about_task_adherence",
                      "mcp__serena__think_about_whether_you_are_done"]
    
    try:
        with open(transcript_path, 'r') as f:
            for line in f:
                try:
                    turn = json.loads(line)
                    turn_type = turn.get("type", "")
                    
                    if turn_type in ["user", "assistant"]:
                        analysis["total_turns"] += 1
                    
                    if turn_type == "assistant":
                        message = turn.get("message", {})
                        
                        # Analyze text content for decisions and patterns
                        for content_block in message.get("content", []):
                            if content_block.get("type") == "text":
                                text = content_block.get("text", "")
                                
                                # Extract key decisions (look for decision markers)
                                if any(marker in text.lower() for marker in 
                                      ["decided to", "choosing", "will use", "selected"]):
                                    if len(text) < 200:  # Keep it concise
                                        analysis["key_decisions"].append(text[:200])
                                
                                # Extract errors
                                if "error" in text.lower() or "failed" in text.lower():
                                    if len(analysis["errors_encountered"]) < 10:
                                        analysis["errors_encountered"].append(text[:100])
                            
                            # Analyze tool usage
                            elif content_block.get("type") == "tool_use":
                                tool_name = content_block.get("name", "")
                                tool_input = content_block.get("input", {})
                                
                                analysis["tools_used"][tool_name] += 1
                                
                                # Track file operations
                                if tool_name in creation_tools:
                                    file_path = tool_input.get("file_path") or tool_input.get("relative_path", "")
                                    if file_path:
                                        analysis["files_created"].add(file_path)
                                
                                if tool_name in modification_tools:
                                    file_path = tool_input.get("file_path") or tool_input.get("relative_path", "")
                                    if file_path:
                                        analysis["files_modified"].add(file_path)
                                
                                # Track operation types
                                if tool_name in search_tools:
                                    analysis["search_operations"] += 1
                                
                                if tool_name in modification_tools:
                                    analysis["modification_operations"] += 1
                                
                                if tool_name in cognitive_tools:
                                    analysis["cognitive_validations"] += 1
                                
                                if tool_name == "mcp__serena__write_memory":
                                    analysis["memory_writes"] += 1
                                
                                # Track pattern discoveries
                                if tool_name == "mcp__serena__search_for_pattern":
                                    pattern = tool_input.get("substring_pattern", "")
                                    if pattern and len(analysis["patterns_discovered"]) < 20:
                                        analysis["patterns_discovered"].append(pattern)
                                
                                # Track todo completions
                                if tool_name == "TodoWrite":
                                    todos = tool_input.get("todos", [])
                                    for todo in todos:
                                        if todo.get("status") == "completed":
                                            content = todo.get("content", "")
                                            if content and len(analysis["todos_completed"]) < 20:
                                                analysis["todos_completed"].append(content)
                    
                except (json.JSONDecodeError, KeyError):
                    continue
                    
    except Exception:
        pass
    
    # Convert sets to lists for JSON serialization
    analysis["files_created"] = list(analysis["files_created"])
    analysis["files_modified"] = list(analysis["files_modified"])
    analysis["tools_used"] = dict(analysis["tools_used"])
    
    return analysis

def synthesize_context(analysis: dict, trigger: str) -> str:
    """Synthesize the analysis into a context summary."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Determine work type
    work_types = []
    if analysis["search_operations"] > 5:
        work_types.append("extensive research")
    if analysis["modification_operations"] > 0:
        work_types.append("code modifications")
    if analysis["validation_operations"] > 0:
        work_types.append("validation")
    if analysis["memory_writes"] > 0:
        work_types.append("documentation")
    
    work_type = " and ".join(work_types) if work_types else "analysis"
    
    # Build context summary
    context = {
        "timestamp": datetime.now().isoformat(),
        "trigger": trigger,
        "conversation_stats": {
            "total_turns": analysis["total_turns"],
            "search_operations": analysis["search_operations"],
            "modifications": analysis["modification_operations"],
            "validations": analysis["cognitive_validations"],
            "memories_written": analysis["memory_writes"]
        },
        "work_completed": {
            "type": work_type,
            "files_created": analysis["files_created"][:10],  # Limit to 10
            "files_modified": analysis["files_modified"][:10],
            "todos_completed": analysis["todos_completed"][:10],
            "patterns_found": analysis["patterns_discovered"][:10]
        },
        "cognitive_state": {
            "validations_performed": analysis["cognitive_validations"],
            "information_validated": analysis["cognitive_validations"] > 0,
            "task_adherence_checked": "think_about_task_adherence" in analysis["tools_used"],
            "completion_verified": "think_about_whether_you_are_done" in analysis["tools_used"]
        },
        "key_insights": {
            "decisions": analysis["key_decisions"][:5],  # Top 5 decisions
            "errors_encountered": analysis["errors_encountered"][:5],
            "most_used_tools": sorted(
                analysis["tools_used"].items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10]  # Top 10 tools
        }
    }
    
    # Generate human-readable summary
    summary = f"""
## 📊 Context Summary (PreCompact at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')})

### Work Completed
- **Type**: {work_type}
- **Conversation**: {analysis['total_turns']} turns
- **Operations**: {analysis['search_operations']} searches, {analysis['modification_operations']} modifications
- **Validations**: {analysis['cognitive_validations']} cognitive checks
"""
    
    if analysis["files_created"]:
        summary += f"- **Files Created**: {len(analysis['files_created'])} files\n"
        for f in analysis["files_created"][:5]:
            summary += f"  - {f}\n"
    
    if analysis["files_modified"]:
        summary += f"- **Files Modified**: {len(analysis['files_modified'])} files\n"
        for f in analysis["files_modified"][:5]:
            summary += f"  - {f}\n"
    
    if analysis["todos_completed"]:
        summary += f"\n### Tasks Completed ({len(analysis['todos_completed'])} total)\n"
        for todo in analysis["todos_completed"][:5]:
            summary += f"- ✅ {todo}\n"
    
    if analysis["patterns_discovered"]:
        summary += f"\n### Patterns Discovered\n"
        for pattern in analysis["patterns_discovered"][:5]:
            summary += f"- `{pattern}`\n"
    
    if analysis["key_decisions"]:
        summary += f"\n### Key Decisions\n"
        for decision in analysis["key_decisions"][:3]:
            summary += f"- {decision[:100]}...\n" if len(decision) > 100 else f"- {decision}\n"
    
    # Add cognitive workflow status
    summary += f"\n### Cognitive Workflow Status\n"
    if analysis["cognitive_validations"] > 0:
        summary += f"- ✅ Performed {analysis['cognitive_validations']} cognitive validations\n"
    else:
        summary += f"- ⚠️ No cognitive validations performed yet\n"
    
    if trigger == "auto":
        summary += f"\n**Note**: Auto-compacting due to context limit. Above work will be preserved.\n"
    
    # Store in memory for persistence
    memory_name = f"context_compact_{timestamp}"
    memory_content = json.dumps(context, indent=2)
    
    # Write to memory file (simulate mcp__serena__write_memory)
    memory_dir = Path("/home/gabe/projects/occuhealth-v3/.serena/memories")
    if memory_dir.exists():
        memory_file = memory_dir / f"{memory_name}.md"
        with open(memory_file, 'w') as f:
            f.write(memory_content)
    
    return summary

def main():
    """Main hook entry point for PreCompact."""
    try:
        # Read hook input
        hook_input = json.load(sys.stdin)
        
        transcript_path = hook_input.get("transcript_path", "")
        trigger = hook_input.get("trigger", "manual")  # "manual" or "auto"
        custom_instructions = hook_input.get("custom_instructions", "")
        
        # Analyze the conversation
        analysis = analyze_conversation(transcript_path)
        
        # Only process if there's substantial work
        if analysis["total_turns"] < 10:
            # Too early for compaction
            sys.exit(0)
        
        # Synthesize context
        context_summary = synthesize_context(analysis, trigger)
        
        # Prepare output with additional context
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PreCompact",
                "additionalContext": context_summary
            }
        }
        
        # If auto-compact and significant work done, suggest cognitive validation
        if trigger == "auto" and analysis["cognitive_validations"] == 0 and analysis["search_operations"] > 5:
            suggestion = "\n\n💡 **Suggestion**: Consider running cognitive validation before continuing:\n"
            suggestion += "- `mcp__serena__think_about_collected_information()`\n"
            suggestion += "- `mcp__serena__think_about_task_adherence()`\n"
            suggestion += "- `mcp__serena__think_about_whether_you_are_done()`\n"
            output["hookSpecificOutput"]["additionalContext"] += suggestion
        
        # Output the context for injection
        print(json.dumps(output))
        sys.exit(0)
        
    except Exception as e:
        # On error, don't block compaction
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()