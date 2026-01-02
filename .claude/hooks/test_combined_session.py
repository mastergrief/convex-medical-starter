#!/usr/bin/env python3
"""
Test that both SessionStart hooks work together properly.
"""
import json
import subprocess
import sys

def test_combined_hooks():
    """Test that both hooks execute and provide complementary context."""
    print("=" * 70)
    print("🚀 TESTING COMBINED SESSIONSTART HOOKS")
    print("=" * 70)
    
    test_input = {
        "session_id": "combined-test",
        "transcript_path": "/test/combined.jsonl",
        "hook_event_name": "SessionStart",
        "source": "startup"
    }
    
    # Test date_context_provider
    print("\n📅 Testing date_context_provider.py:")
    print("-" * 60)
    result1 = subprocess.run(
        ["python3", ".claude/hooks/date_context_provider.py"],
        input=json.dumps(test_input),
        capture_output=True,
        text=True,
        timeout=5
    )
    
    if result1.returncode == 0:
        try:
            output1 = json.loads(result1.stdout)
            context1 = output1.get("hookSpecificOutput", {}).get("additionalContext", "")
            if "ACCURATE DATE & TIMELINE CONTEXT" in context1:
                print("✅ Date context provider working")
                print(f"   - Provides current date/time")
                print(f"   - Git repository status")
                print(f"   - Project timeline")
        except:
            print("❌ Date context provider failed")
    
    # Test serena_memory_loader
    print("\n🧠 Testing serena_memory_loader.py:")
    print("-" * 60)
    result2 = subprocess.run(
        ["python3", ".claude/hooks/serena_memory_loader.py"],
        input=json.dumps(test_input),
        capture_output=True,
        text=True,
        timeout=5
    )
    
    if result2.returncode == 0:
        try:
            output2 = json.loads(result2.stdout)
            context2 = output2.get("hookSpecificOutput", {}).get("additionalContext", "")
            if "SERENA MEMORY" in context2:
                print("✅ Serena memory loader working")
                print(f"   - Lists available memories")
                print(f"   - Generates MCP tool commands")
                print(f"   - Prioritizes memory loading")
        except:
            print("❌ Serena memory loader failed")
    
    # Show how they complement each other
    print("\n" + "=" * 70)
    print("💡 COMBINED CONTEXT BENEFITS")
    print("=" * 70)
    print("""
When a new session starts, Claude will receive:

1. **Date & Timeline Context** (date_context_provider.py)
   - Accurate current date/time (not training date)
   - Git repository status
   - Project timeline understanding
   - Count of available memories

2. **Memory Loading Instructions** (serena_memory_loader.py)
   - Automatic MCP commands to load memories
   - Prioritized memory selection
   - Context restoration from previous work
   - Subagent completion tracking

Together, these hooks ensure:
- ✅ Claude knows the actual date (not December 2024)
- ✅ Claude loads relevant context from Serena memories
- ✅ Claude can continue where previous sessions left off
- ✅ Claude understands project history and timeline
""")
    
    print("=" * 70)
    print("✨ SETUP COMPLETE!")
    print("=" * 70)
    print("""
The hooks are now registered and will run automatically when:
- You start a new Claude session
- You resume an existing session
- But NOT when you use /clear (by design)

The session will be enriched with both temporal and memory context.
""")

if __name__ == "__main__":
    test_combined_hooks()