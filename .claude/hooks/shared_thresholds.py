#!/usr/bin/env python3
"""
Shared thresholds and constants for all hooks.
Ensures consistency across the hook system.
"""

# Work thresholds - unified definitions
MINIMAL_WORK = 3                  # Bare minimum operations to consider work done
SUBSTANTIAL_WORK = 5               # Substantial operations threshold
MODIFICATION_THRESHOLD = 1         # Any code modification counts as substantial
COGNITIVE_SEARCH_THRESHOLD = 3     # Searches before think_about_collected_information needed

# Rate limiting
COGNITIVE_RATE_LIMIT_SECONDS = 300  # 5 minutes for cognitive workflow enforcement
MEMORY_RATE_LIMIT_SECONDS = 60      # 1 minute for memory enforcement (if used)

# Tool categories
SEARCH_TOOLS = [
    "mcp__serena__search_for_pattern",
    "mcp__serena__find_file",
    "mcp__serena__find_symbol",
    "mcp__serena__get_symbols_overview",
    "mcp__serena__find_referencing_symbols"
]

MODIFICATION_TOOLS = [
    "mcp__serena__replace_symbol_body",
    "mcp__serena__insert_after_symbol",
    "mcp__serena__insert_before_symbol",
    "Write", "Edit", "MultiEdit"
]

ANALYSIS_TOOLS = [
    "mcp__serena__get_symbols_overview",
    "mcp__serena__find_symbol",
    "mcp__serena__find_referencing_symbols"
]

PATTERN_TOOLS = [
    "mcp__serena__search_for_pattern",
    "mcp__serena__find_file"
]

COGNITIVE_TOOLS = [
    "mcp__serena__think_about_collected_information",
    "mcp__serena__think_about_task_adherence",
    "mcp__serena__think_about_whether_you_are_done"
]

# Known subagent types
SUBAGENT_TYPES = [
    "serena", "frontend", "backend", "codex", "validator",
    "surgeon", "convex", "shadcn", "supabase", "playtest",
    "github", "research", "rag", "context7", "database",
    "api", "test", "docs"
]

def is_substantial_work(tool_count: int, modification_count: int, search_count: int) -> bool:
    """
    Unified logic to determine if substantial work was done.
    
    Returns True if:
    - Total operations >= SUBSTANTIAL_WORK (5)
    - OR any modifications were made
    - OR search operations >= COGNITIVE_SEARCH_THRESHOLD (3)
    """
    return (
        tool_count >= SUBSTANTIAL_WORK or
        modification_count >= MODIFICATION_THRESHOLD or
        search_count >= COGNITIVE_SEARCH_THRESHOLD
    )

def is_minimal_work(tool_count: int) -> bool:
    """Check if at least minimal work was done."""
    return tool_count >= MINIMAL_WORK

def needs_cognitive_validation(search_count: int, modification_count: int) -> bool:
    """
    Determine if cognitive validation is needed based on work type.
    
    Returns True if:
    - Search operations >= COGNITIVE_SEARCH_THRESHOLD
    - OR modifications were made
    """
    return (
        search_count >= COGNITIVE_SEARCH_THRESHOLD or
        modification_count >= MODIFICATION_THRESHOLD
    )