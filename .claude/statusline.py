#!/usr/bin/env python3
"""
Advanced Claude Code Statusline with Creative Metrics
Shows model, cost, context usage estimation, git status, and project health
"""

import json
import sys
import os
import subprocess
from pathlib import Path
from datetime import datetime
import math

# ANSI Color codes
RESET = '\033[0m'
BOLD = '\033[1m'
DIM = '\033[2m'

# Colors
RED = '\033[91m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
MAGENTA = '\033[95m'
CYAN = '\033[96m'
WHITE = '\033[97m'
GRAY = '\033[90m'
BLACK = '\033[30m'

# Background colors
BG_RED = '\033[41m'
BG_GREEN = '\033[42m'
BG_YELLOW = '\033[43m'
BG_BLUE = '\033[44m'

def get_git_info():
    """Get git branch and status indicators."""
    try:
        # Get branch
        branch_result = subprocess.run(
            ['git', 'branch', '--show-current'],
            capture_output=True,
            text=True,
            timeout=0.5
        )
        branch = branch_result.stdout.strip() if branch_result.returncode == 0 else None
        
        # Get status
        status_result = subprocess.run(
            ['git', 'status', '--porcelain'],
            capture_output=True,
            text=True,
            timeout=0.5
        )
        
        if status_result.returncode == 0:
            lines = status_result.stdout.strip().split('\n') if status_result.stdout.strip() else []
            modified = sum(1 for l in lines if l.startswith(' M') or l.startswith('M'))
            untracked = sum(1 for l in lines if l.startswith('??'))
            staged = sum(1 for l in lines if l[:2] != '??' and l[0] != ' ')
            
            # Build status indicators
            indicators = []
            if staged > 0:
                indicators.append(f"S{staged}")  # Staged files (was ●)
            if modified > 0:
                indicators.append(f"M{modified}")  # Modified files (was ✎)
            if untracked > 0:
                indicators.append(f"?{untracked}")  # Untracked files (was …)
            
            status = ' '.join(indicators) if indicators else 'clean'
        else:
            status = ''
            
        return branch, status
    except:
        return None, None

def get_memory_count():
    """Get count of Serena memories."""
    try:
        memory_dir = Path('.serena/memories')
        if memory_dir.exists():
            return len(list(memory_dir.glob('*.md')))
    except:
        pass
    return 0

# Cost-related functions removed - using ccusage instead

def format_duration(duration_ms):
    """Format duration in human-readable format."""
    if not duration_ms:
        return "0s"
    
    seconds = duration_ms / 1000
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        secs = int(seconds % 60)
        return f"{minutes}m{secs}s" if secs > 0 else f"{minutes}m"
    else:
        hours = int(seconds / 3600)
        mins = int((seconds % 3600) / 60)
        return f"{hours}h{mins}m" if mins > 0 else f"{hours}h"

def get_project_health():
    """Determine project health based on various indicators."""
    health_score = 100
    issues = []
    
    # Check for placeholders (known issue)
    if Path('src/components').exists():
        placeholder_files = list(Path('src/components').rglob('*ComingSoon*'))
        if len(placeholder_files) > 10:
            health_score -= 30
            issues.append("placeholders")
    
    # Check for TODO count
    try:
        result = subprocess.run(
            ['rg', '-c', 'TODO|FIXME|XXX', '--type', 'ts', '--type', 'tsx'],
            capture_output=True,
            text=True,
            timeout=1
        )
        if result.returncode == 0:
            todo_count = sum(int(line.split(':')[-1]) for line in result.stdout.strip().split('\n') if ':' in line)
            if todo_count > 50:
                health_score -= 20
                issues.append(f"{todo_count} TODOs")
    except:
        pass
    
    # Check TypeScript errors (if tsconfig exists)
    if Path('tsconfig.json').exists():
        try:
            result = subprocess.run(
                ['npx', 'tsc', '--noEmit', '--pretty', 'false'],
                capture_output=True,
                text=True,
                timeout=2
            )
            if result.returncode != 0:
                error_count = len([l for l in result.stdout.split('\n') if ': error TS' in l])
                if error_count > 0:
                    health_score -= min(30, error_count * 3)
                    issues.append(f"{error_count} TS errors")
        except:
            pass
    
    # Determine health emoji and color
    if health_score >= 80:
        return f"{GREEN}❤️{RESET}", health_score, issues
    elif health_score >= 60:
        return f"{YELLOW}💛{RESET}", health_score, issues
    elif health_score >= 40:
        return f"{YELLOW}🩹{RESET}", health_score, issues
    else:
        return f"{RED}💔{RESET}", health_score, issues

def build_statusline(data):
    """Build the complete statusline."""
    # Check for ASCII-only mode (for terminal compatibility)
    ascii_mode = os.environ.get('CLAUDE_STATUSLINE_ASCII', 'false').lower() == 'true'
    
    # Extract basic info
    model_name = data.get('model', {}).get('display_name', 'Unknown')
    model_id = data.get('model', {}).get('id', '')
    current_dir = os.path.basename(data.get('workspace', {}).get('current_dir', ''))
    
    # Performance metrics (cost removed - using ccusage instead)
    cost = data.get('cost', {})
    duration = cost.get('total_duration_ms', 0)
    api_duration = cost.get('total_api_duration_ms', 0)
    lines_added = cost.get('total_lines_added', 0)
    lines_removed = cost.get('total_lines_removed', 0)
    
    # Model indicator with color
    model_colors = {
        'Opus': f"{MAGENTA}{BOLD}",
        'Sonnet': f"{CYAN}",
        'Haiku': f"{GREEN}"
    }
    model_color = model_colors.get(model_name, WHITE)
    model_str = f"{model_color}[{model_name}]{RESET}"
    
    # Git info
    branch, git_status = get_git_info()
    git_str = ""
    if branch:
        # Color branch based on name
        if branch == 'main' or branch == 'master':
            branch_color = GREEN
        elif branch.startswith('feature/'):
            branch_color = BLUE
        elif branch.startswith('fix/') or branch.startswith('hotfix/'):
            branch_color = YELLOW
        else:
            branch_color = CYAN
        
        git_str = f" {branch_color}⎇ {branch}{RESET}"
        if git_status and git_status != '✓':
            git_str += f" {YELLOW}{git_status}{RESET}"
        elif git_status == '✓':
            git_str += f" {GREEN}{git_status}{RESET}"
    
    # Context/token information not available in Claude Code API
    # Removed context bar since it would just be a wild guess
    
    # Lines changed indicator
    lines_str = ""
    if lines_added > 0 or lines_removed > 0:
        lines_str = f" {GREEN}+{lines_added}{RESET}/{RED}-{lines_removed}{RESET}"
    
    # Duration with smart formatting
    duration_str = ""
    if duration > 0:
        formatted_duration = format_duration(duration)
        if duration < 30000:  # Less than 30s
            duration_color = GREEN
        elif duration < 120000:  # Less than 2m
            duration_color = YELLOW
        else:
            duration_color = RED
        duration_str = f" {duration_color}⏱ {formatted_duration}{RESET}"
    
    # Memory count
    memory_count = get_memory_count()
    memory_str = ""
    if memory_count > 0:
        memory_str = f" {BLUE}🧠{memory_count}{RESET}"
    
    # Project health indicator
    health_emoji, health_score, health_issues = get_project_health()
    health_str = f" {health_emoji}"
    
    # Current time (for long sessions)
    now = datetime.now()
    time_str = f"{GRAY}{now.strftime('%H:%M')}{RESET}"
    
    # API efficiency indicator (API time vs total time)
    efficiency_str = ""
    if duration > 0 and api_duration > 0:
        efficiency = (api_duration / duration) * 100
        if efficiency < 10:
            efficiency_str = f" {GREEN}⚡{RESET}"  # Very efficient
        elif efficiency < 30:
            efficiency_str = f" {YELLOW}⚡{RESET}"  # Moderate
        else:
            efficiency_str = f" {RED}🐌{RESET}"  # Slow/inefficient
    
    # Combine all elements (cost and context removed - not in API)
    # Priority order: Model, Git, Lines, Duration, Memory, Health, Efficiency, Time
    statusline = f"{model_str}{git_str}{lines_str}{duration_str}{memory_str}{health_str}{efficiency_str} {time_str}"
    
    # Add project status if health is poor
    if health_score < 40 and health_issues:
        issue_str = f" {RED}({', '.join(health_issues[:2])}){RESET}"
        statusline += issue_str
    
    return statusline

def main():
    """Main entry point."""
    try:
        # Read JSON from stdin
        input_data = json.load(sys.stdin)
        
        # Build and output statusline
        statusline = build_statusline(input_data)
        print(statusline)
        
    except Exception as e:
        # Fallback statusline on error
        print(f"{RED}[Error]{RESET} {GRAY}statusline failed: {str(e)[:30]}{RESET}")
        sys.exit(0)  # Don't block Claude

if __name__ == "__main__":
    main()