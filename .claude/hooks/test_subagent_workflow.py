#!/usr/bin/env python3
"""
Test script for SubagentStop hook workflow validation.
Creates mock transcript data and validates hook behavior.
"""
import json
import tempfile
import subprocess
import sys
import os
from pathlib import Path

# Test scenarios with expected outcomes
TEST_SCENARIOS = [
    {
        "name": "File creation and modification",
        "transcript": [
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Write",
                            "input": {
                                "file_path": "/test/component.tsx",
                                "content": "export const Component = () => <div>Test</div>;"
                            }
                        }
                    ]
                }
            },
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Edit",
                            "input": {
                                "file_path": "/test/index.ts",
                                "old_string": "old",
                                "new_string": "new"
                            }
                        }
                    ]
                }
            }
        ],
        "should_block": True,
        "expected_in_output": ["Files Created", "component.tsx", "Files Modified", "index.ts"]
    },
    {
        "name": "Command execution with todos",
        "transcript": [
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Bash",
                            "input": {
                                "command": "npm install",
                                "description": "Install dependencies"
                            }
                        }
                    ]
                }
            },
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "TodoWrite",
                            "input": {
                                "todos": [
                                    {"content": "Setup project", "status": "completed"},
                                    {"content": "Configure database", "status": "in_progress"}
                                ]
                            }
                        }
                    ]
                }
            }
        ],
        "should_block": True,
        "expected_in_output": ["Commands Executed", "Install dependencies", "Tasks Completed", "Setup project"]
    },
    {
        "name": "Error handling",
        "transcript": [
            {
                "type": "tool_result",
                "error": "Permission denied: Cannot write to protected directory"
            },
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Write",
                            "input": {
                                "file_path": "/test/error_recovery.js",
                                "content": "console.log('recovered');"
                            }
                        }
                    ]
                }
            }
        ],
        "should_block": True,
        "expected_in_output": ["Errors Encountered", "Permission denied", "Files Created"]
    },
    {
        "name": "Empty transcript (no work done)",
        "transcript": [
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "text",
                            "text": "Just thinking about the problem..."
                        }
                    ]
                }
            }
        ],
        "should_block": False,
        "expected_in_output": []
    },
    {
        "name": "Stop hook active (prevent loop)",
        "transcript": [
            {
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Write",
                            "input": {
                                "file_path": "/test/file.txt",
                                "content": "content"
                            }
                        }
                    ]
                }
            }
        ],
        "stop_hook_active": True,
        "should_block": False,
        "expected_in_output": []
    }
]

def create_mock_transcript(scenario):
    """Create a temporary transcript file with test data."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False) as f:
        for entry in scenario["transcript"]:
            f.write(json.dumps(entry) + "\n")
        return f.name

def run_hook(transcript_path, stop_hook_active=False):
    """Run the SubagentStop hook with mock input."""
    hook_input = {
        "session_id": "test_session",
        "transcript_path": transcript_path,
        "hook_event_name": "SubagentStop",
        "stop_hook_active": stop_hook_active
    }
    
    hook_path = Path(__file__).parent / "subagent_feedback.py"
    
    try:
        result = subprocess.run(
            [sys.executable, str(hook_path)],
            input=json.dumps(hook_input),
            capture_output=True,
            text=True,
            timeout=5
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Hook timed out"
    except Exception as e:
        return -1, "", str(e)

def validate_output(output, scenario):
    """Validate the hook output against expected results."""
    errors = []
    
    # Parse JSON output if present
    try:
        if output:
            result = json.loads(output)
            
            # Check blocking decision
            if scenario["should_block"]:
                if result.get("decision") != "block":
                    errors.append(f"Expected 'block' decision, got: {result.get('decision')}")
                if not result.get("reason"):
                    errors.append("Expected reason to be provided when blocking")
            else:
                if result.get("decision") == "block":
                    errors.append("Should not block for this scenario")
            
            # Check expected content in reason
            if scenario["should_block"] and "reason" in result:
                reason = result["reason"]
                for expected in scenario["expected_in_output"]:
                    if expected not in reason:
                        errors.append(f"Expected '{expected}' in output reason")
        
        elif scenario["should_block"]:
            errors.append("Expected JSON output but got none")
            
    except json.JSONDecodeError as e:
        if scenario["should_block"]:
            errors.append(f"Invalid JSON output: {e}")
    
    return errors

def run_tests():
    """Run all test scenarios."""
    print("=" * 60)
    print("SubagentStop Hook Validation Tests")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for scenario in TEST_SCENARIOS:
        print(f"\n📝 Testing: {scenario['name']}")
        print("-" * 40)
        
        # Create mock transcript
        transcript_path = create_mock_transcript(scenario)
        
        try:
            # Run the hook
            stop_hook_active = scenario.get("stop_hook_active", False)
            exit_code, stdout, stderr = run_hook(transcript_path, stop_hook_active)
            
            # Validate output
            errors = validate_output(stdout, scenario)
            
            # Check for unexpected errors
            if exit_code not in [0, 1]:
                errors.append(f"Unexpected exit code: {exit_code}")
            if stderr and exit_code == 0:
                errors.append(f"Unexpected stderr with exit 0: {stderr}")
            
            # Report results
            if errors:
                print(f"❌ FAILED")
                for error in errors:
                    print(f"   - {error}")
                if stdout:
                    print(f"\n   Output received:")
                    try:
                        output_json = json.loads(stdout)
                        print(f"   {json.dumps(output_json, indent=2)}")
                    except:
                        print(f"   {stdout[:200]}")
                failed += 1
            else:
                print(f"✅ PASSED")
                if scenario["should_block"] and stdout:
                    try:
                        output_json = json.loads(stdout)
                        reason = output_json.get("reason", "")
                        lines = reason.split("\n")[:5]
                        print(f"   Sample output:")
                        for line in lines:
                            if line.strip():
                                print(f"   {line[:60]}")
                    except:
                        pass
                passed += 1
                
        finally:
            # Clean up
            os.unlink(transcript_path)
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"✅ Passed: {passed}/{len(TEST_SCENARIOS)}")
    print(f"❌ Failed: {failed}/{len(TEST_SCENARIOS)}")
    
    if failed == 0:
        print("\n🎉 All tests passed!")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please review the hook implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(run_tests())