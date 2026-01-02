#!/usr/bin/env python3
"""
UserPromptSubmit Hook - Layer 3: AUTO-INJECTION
Automatically injects unread subagent memory context before processing prompts.
Uses unique marker files to avoid race conditions.
"""
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta
import os
from shared_thresholds import SUBAGENT_TYPES

def read_memory_files() -> list:
    """Read memory files from the Serena memory directory."""
    memory_dir = Path(".serena/memories")  # Fixed: plural 'memories' not 'memory'
    memories = []
    
    if memory_dir.exists():
        for file_path in memory_dir.glob("*.md"):
            filename = file_path.stem
            # Check if it's a subagent memory and not marked as read
            if filename.startswith("subagent_") and not filename.endswith("_read"):
                try:
                    with open(file_path, 'r') as f:
                        content = f.read()
                        memories.append({
                            "name": filename,
                            "path": str(file_path),
                            "content": content,
                            "mtime": file_path.stat().st_mtime
                        })
                except Exception:
                    continue
    
    return sorted(memories, key=lambda x: x["mtime"], reverse=True)

def check_marker_files() -> list:
    """Check for recent subagent completion markers (unique per agent)."""
    marker_dir = Path(".claude/hooks")
    recent_markers = []
    
    if not marker_dir.exists():
        return recent_markers
    
    # Look for all unique subagent marker files
    for marker_file in marker_dir.glob(".subagent_completed_*.json"):
        try:
            # Check if marker is recent (within last hour)
            mtime = marker_file.stat().st_mtime
            age_hours = (datetime.now().timestamp() - mtime) / 3600
            
            if age_hours < 1:
                with open(marker_file, 'r') as f:
                    marker_data = json.load(f)
                    recent_markers.append(marker_data)
                # Remove marker after reading
                marker_file.unlink(missing_ok=True)
        except Exception:
            continue
    
    return recent_markers

def parse_memory_content(content: str) -> dict:
    """Parse JSON content from memory, handling various formats."""
    try:
        # Try to parse as pure JSON
        return json.loads(content)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code block
        import re
        json_match = re.search(r'```json\s*(.*?)\s*```', content, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
    
    # Return as plain text if not JSON
    return {"raw_content": content}

def format_memory_for_injection(memory: dict) -> str:
    """Format a memory for injection into context."""
    content = parse_memory_content(memory["content"])
    
    output = [f"### 📦 Memory: {memory['name']}"]
    
    if isinstance(content, dict) and "raw_content" not in content:
        # Structured content
        if "agent" in content:
            output.append(f"**Agent**: {content['agent']}")
        
        if "completed_at" in content:
            output.append(f"**Completed**: {content['completed_at']}")
        
        if "files_created" in content and content["files_created"]:
            output.append("\n**Files Created**:")
            for file_info in content["files_created"]:
                if isinstance(file_info, dict):
                    output.append(f"- `{file_info.get('path', '')}`: {file_info.get('purpose', '')}")
                else:
                    output.append(f"- `{file_info}`")
        
        if "files_modified" in content and content["files_modified"]:
            output.append("\n**Files Modified**:")
            for file_info in content["files_modified"]:
                if isinstance(file_info, dict):
                    output.append(f"- `{file_info.get('path', '')}`: {file_info.get('changes', '')}")
                else:
                    output.append(f"- `{file_info}`")
        
        if "key_outputs" in content and content["key_outputs"]:
            output.append("\n**Key Outputs**:")
            output.append(f"```json\n{json.dumps(content['key_outputs'], indent=2)}\n```")
        
        if "next_steps" in content and content["next_steps"]:
            output.append("\n**Next Steps**:")
            for step in content["next_steps"]:
                output.append(f"- {step}")
        
        if "errors_encountered" in content and content["errors_encountered"]:
            output.append("\n**⚠️ Errors Encountered**:")
            for error in content["errors_encountered"]:
                output.append(f"- {error}")
    else:
        # Raw content
        output.append(content.get("raw_content", memory["content"]))
    
    return "\n".join(output)

def create_memory_action_code(memories: list) -> str:
    """Generate code for the parent to process the memories."""
    if not memories:
        return ""
    
    code_lines = [
        "# To process these memories programmatically:",
        "```python"
    ]
    
    for memory in memories:
        code_lines.append(f"# Process memory: {memory['name']}")
        code_lines.append(f"context = mcp__serena__read_memory('{memory['name']}')")
        code_lines.append(f"# ... process context ...")
        code_lines.append(f"mcp__serena__write_memory('{memory['name']}_read', 'processed')")
        code_lines.append("")
    
    code_lines.append("```")
    return "\n".join(code_lines)

def main():
    """Main hook entry point."""
    try:
        # Read hook input
        hook_input = json.load(sys.stdin)
        
        # Check if we should inject memories
        # Only inject if there are markers or unread memories
        recent_markers = check_marker_files()
        memories = read_memory_files()
        
        if not recent_markers and not memories:
            # Nothing to inject
            sys.exit(0)
        
        # Build injection content
        output_parts = []
        
        if memories:
            output_parts.append("=" * 80)
            output_parts.append("📥 **AUTO-LOADED SUBAGENT CONTEXT**")
            output_parts.append("=" * 80)
            output_parts.append("")
            output_parts.append(f"Found {len(memories)} unread subagent memory/memories:")
            output_parts.append("")
            
            for memory in memories[:3]:  # Limit to 3 most recent to avoid overwhelming
                output_parts.append(format_memory_for_injection(memory))
                output_parts.append("")
                output_parts.append("-" * 40)
                output_parts.append("")
            
            if len(memories) > 3:
                output_parts.append(f"*Note: {len(memories) - 3} additional memories available*")
                output_parts.append("")
            
            # Add action code
            action_code = create_memory_action_code(memories)
            if action_code:
                output_parts.append(action_code)
                output_parts.append("")
            
            output_parts.append("=" * 80)
            output_parts.append("")
        
        if recent_markers and not memories:
            # Markers exist but no memories found yet
            agents = ', '.join([m.get('subagent_type', 'unknown') for m in recent_markers])
            output_parts.append(f"📋 Note: Subagent(s) [{agents}] recently completed. Check for memories with:")
            output_parts.append("```python")
            output_parts.append("memories = mcp__serena__list_memories()")
            output_parts.append("subagent_memories = [m for m in memories if 'subagent_' in m]")
            output_parts.append("```")
            output_parts.append("")
        
        # Output the injection
        if output_parts:
            print("\n".join(output_parts))
        
        sys.exit(0)
        
    except Exception as e:
        # On error, exit silently
        print(f"Hook error: {e}", file=sys.stderr)
        sys.exit(0)

if __name__ == "__main__":
    main()