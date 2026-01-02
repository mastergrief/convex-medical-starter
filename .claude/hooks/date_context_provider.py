#!/usr/bin/env python3
"""
Date Context Provider Hook for Claude Code
Provides accurate current date and project timeline context at session start.

This hook solves the training date confusion problem by injecting the real
current date and calculating actual elapsed time since key project milestones.
"""

import json
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

def get_git_info():
    """Get basic git information about the project."""
    try:
        import subprocess
        
        # Get current branch
        branch = subprocess.run(
            ["git", "branch", "--show-current"],
            capture_output=True,
            text=True,
            cwd=os.environ.get("CLAUDE_PROJECT_DIR", ".")
        ).stdout.strip()
        
        # Get last commit date
        last_commit = subprocess.run(
            ["git", "log", "-1", "--format=%ai"],
            capture_output=True,
            text=True,
            cwd=os.environ.get("CLAUDE_PROJECT_DIR", ".")
        ).stdout.strip()
        
        # Get total commits
        total_commits = subprocess.run(
            ["git", "rev-list", "--count", "HEAD"],
            capture_output=True,
            text=True,
            cwd=os.environ.get("CLAUDE_PROJECT_DIR", ".")
        ).stdout.strip()
        
        return {
            "branch": branch or "unknown",
            "last_commit": last_commit or "unknown",
            "total_commits": total_commits or "0"
        }
    except:
        return {
            "branch": "unknown",
            "last_commit": "unknown",
            "total_commits": "0"
        }

def calculate_project_timeline():
    """Calculate timeline from key project milestones."""
    now = datetime.now(timezone.utc)
    
    # Key project milestones (from memory analysis)
    milestones = {
        "current_work_start": datetime(2025, 8, 28, tzinfo=timezone.utc),  # When current team started
    }
    
    timeline = {}
    for name, date in milestones.items():
        delta = now - date
        days = delta.days
        
        if days == 0:
            timeline[name] = "today"
        elif days == 1:
            timeline[name] = "1 day ago"
        elif days < 7:
            timeline[name] = f"{days} days ago"
        elif days < 30:
            weeks = days // 7
            timeline[name] = f"{weeks} week{'s' if weeks > 1 else ''} ago"
        else:
            months = days // 30
            timeline[name] = f"{months} month{'s' if months > 1 else ''} ago"
    
    return timeline

def get_project_status():
    """Get current project status from memory if available."""
    try:
        # Check if Serena memories exist
        memory_dir = Path(os.environ.get("CLAUDE_PROJECT_DIR", ".")) / ".serena" / "memories"
        if memory_dir.exists():
            memories = list(memory_dir.glob("*.md"))
            recent_memories = sorted(memories, key=lambda x: x.stat().st_mtime, reverse=True)[:3]
            return {
                "total_memories": len(memories),
                "recent_memories": [m.stem for m in recent_memories]
            }
    except:
        pass
    
    return {
        "total_memories": 0,
        "recent_memories": []
    }

def format_context_message(data):
    """Format the context message for Claude."""
    now = data["current_date"]
    timeline = data["timeline"]
    git = data["git_info"]
    
    message = f"""
# 📅 ACCURATE DATE & TIMELINE CONTEXT

## Current Date and Time
**Today is: {now['readable']}**
- ISO Format: {now['iso']}
- Unix Timestamp: {now['unix']}

## Project Timeline (Actual Elapsed Time)
- **Reality Check Discovery**: {timeline.get('reality_check', 'unknown')}
  - Found actual completion was 5%, not 18-25% claimed
- **Strategic Pivot Decision**: {timeline.get('strategic_pivot', 'unknown')}
  - Decided to focus on Doctor Portal only
- **Current Work Started**: {timeline.get('current_work_start', 'unknown')}
  - When the current team began working

## Git Repository Status
- **Current Branch**: {git['branch']}
- **Last Commit**: {git['last_commit']}
- **Total Commits**: {git['total_commits']}

## Important Context
- Your training date (December 31, 2024) is NOT the current date
- Use the actual current date above for all time calculations
- The "8 months ago" references in memories refer to time elapsed from Dec 2024 to Aug 2025
- Current work on this project started only {timeline.get('current_work_start', 'recently')}

## Project Status Notes
{data.get('project_status', {}).get('total_memories', 0)} Serena memories found
"""
    
    if data.get('project_status', {}).get('recent_memories'):
        message += f"Recent memories: {', '.join(data['project_status']['recent_memories'])}\n"
    
    message += """
---
*This context was automatically injected by the date_context_provider hook to ensure accurate time awareness.*
"""
    
    return message

def main():
    """Main hook execution."""
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)
        
        # Get current date and time
        now = datetime.now(timezone.utc)
        current_date = {
            "iso": now.isoformat(),
            "readable": now.strftime("%A, %B %d, %Y at %H:%M:%S UTC"),
            "unix": int(now.timestamp()),
            "year": now.year,
            "month": now.month,
            "day": now.day,
            "weekday": now.strftime("%A")
        }
        
        # Calculate project timeline
        timeline = calculate_project_timeline()
        
        # Get git info
        git_info = get_git_info()
        
        # Get project status
        project_status = get_project_status()
        
        # Prepare data
        context_data = {
            "current_date": current_date,
            "timeline": timeline,
            "git_info": git_info,
            "project_status": project_status
        }
        
        # Format the context message
        context_message = format_context_message(context_data)
        
        # Output for Claude
        output = {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": context_message
            },
            "data": context_data  # Also include structured data
        }
        
        # Write to stdout (this gets added to Claude's context)
        json.dump(output, sys.stdout)
        
        # Log to stderr for debugging (visible to user)
        print(f"✅ Date context injected: {current_date['readable']}", file=sys.stderr)
        
    except Exception as e:
        # Log error to stderr
        print(f"❌ Date context hook error: {e}", file=sys.stderr)
        
        # Still try to provide basic date context
        fallback_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
        fallback_output = {
            "hookSpecificOutput": {
                "hookEventName": "SessionStart",
                "additionalContext": f"Current date: {fallback_date} (fallback mode due to error)"
            }
        }
        json.dump(fallback_output, sys.stdout)
        sys.exit(0)  # Don't block session start

if __name__ == "__main__":
    main()