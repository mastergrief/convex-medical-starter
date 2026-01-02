#!/usr/bin/env python3
"""
Test script for the Serena Memory Loader SessionStart hook.
"""
import json
import subprocess
import sys
from pathlib import Path

def test_hook(test_name, input_data, expected_fields):
    """Test the hook with given input and validate output."""
    print(f"\n📋 Test: {test_name}")
    print("-" * 60)
    
    # Run the hook
    try:
        result = subprocess.run(
            ["python3", ".claude/hooks/serena_memory_loader.py"],
            input=json.dumps(input_data),
            capture_output=True,
            text=True,
            timeout=5
        )
        
        # Check exit code
        if result.returncode != 0:
            print(f"❌ Hook failed with exit code {result.returncode}")
            print(f"Stderr: {result.stderr}")
            return False
            
        # Parse output
        try:
            output = json.loads(result.stdout)
        except json.JSONDecodeError as e:
            print(f"❌ Invalid JSON output: {e}")
            print(f"Output: {result.stdout[:500]}")
            return False
            
        # Validate structure
        for field in expected_fields:
            if field not in str(output):
                print(f"❌ Missing expected field: {field}")
                return False
                
        # Check for hookSpecificOutput
        if "hookSpecificOutput" not in output:
            print(f"❌ Missing hookSpecificOutput")
            return False
            
        if "additionalContext" not in output["hookSpecificOutput"]:
            print(f"❌ Missing additionalContext")
            return False
            
        # Show sample of context
        context = output["hookSpecificOutput"]["additionalContext"]
        print(f"✅ Hook executed successfully")
        print(f"Context length: {len(context)} characters")
        print(f"\nContext preview (first 300 chars):")
        print(context[:300])
        
        # Check for key components
        if "SERENA MEMORY" in context:
            print("✅ Contains SERENA MEMORY header")
        if "mcp__serena__list_memories()" in context:
            print("✅ Contains list_memories command")
        if "mcp__serena__read_memory" in context:
            print("✅ Contains read_memory commands")
            
        return True
        
    except subprocess.TimeoutExpired:
        print(f"❌ Hook timed out")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False

def main():
    """Run all tests."""
    print("=" * 70)
    print("🧪 SERENA MEMORY LOADER HOOK VALIDATION")
    print("=" * 70)
    
    # Create test memories if they don't exist
    memory_dir = Path(".serena/memories")
    if memory_dir.exists():
        memories_found = len(list(memory_dir.glob("*.md")))
        print(f"Found {memories_found} existing memories in {memory_dir}")
    else:
        print(f"No memory directory found at {memory_dir}")
    
    # Test 1: Normal startup
    test1 = test_hook(
        "Normal startup",
        {
            "session_id": "test-session-1",
            "transcript_path": "/test/transcript.jsonl",
            "hook_event_name": "SessionStart",
            "source": "startup"
        },
        ["hookEventName", "SessionStart", "additionalContext"]
    )
    
    # Test 2: Resume session
    test2 = test_hook(
        "Resume session",
        {
            "session_id": "test-session-2",
            "transcript_path": "/test/transcript.jsonl",
            "hook_event_name": "SessionStart",
            "source": "resume"
        },
        ["hookEventName", "SessionStart", "additionalContext"]
    )
    
    # Test 3: Clear session (should not load memories)
    test3_result = subprocess.run(
        ["python3", ".claude/hooks/serena_memory_loader.py"],
        input=json.dumps({
            "session_id": "test-session-3",
            "transcript_path": "/test/transcript.jsonl",
            "hook_event_name": "SessionStart",
            "source": "clear"
        }),
        capture_output=True,
        text=True,
        timeout=5
    )
    
    print(f"\n📋 Test: Clear session (should exit silently)")
    print("-" * 60)
    if test3_result.returncode == 0 and not test3_result.stdout:
        print("✅ Correctly skipped memory loading on clear")
        test3 = True
    else:
        print("❌ Should have exited silently on clear")
        test3 = False
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 TEST SUMMARY")
    print("=" * 70)
    
    tests_passed = sum([test1, test2, test3])
    total_tests = 3
    
    print(f"Tests passed: {tests_passed}/{total_tests}")
    
    if tests_passed == total_tests:
        print("✅ All tests passed! Hook is ready for use.")
        print("\n📝 To register this hook, update .claude/settings.json:")
        print("""
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/serena_memory_loader.py"
          }
        ]
      }
    ]
  }
}
        """)
    else:
        print("❌ Some tests failed. Please review and fix.")
        sys.exit(1)

if __name__ == "__main__":
    main()