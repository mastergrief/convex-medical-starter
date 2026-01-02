#!/bin/bash
# Integration test for SubagentStop hook workflow
# Tests the complete flow with a simulated sub-agent transcript

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOK_SCRIPT="$SCRIPT_DIR/subagent_feedback.py"

echo "=========================================="
echo "SubagentStop Integration Test"
echo "=========================================="

# Create a realistic test transcript
TRANSCRIPT_FILE=$(mktemp --suffix=.jsonl)

cat << 'EOF' > "$TRANSCRIPT_FILE"
{"type":"assistant","message":{"content":[{"type":"text","text":"Starting authentication implementation..."}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"TodoWrite","input":{"todos":[{"content":"Create auth context","status":"in_progress","activeForm":"Creating auth context"},{"content":"Add login form","status":"pending","activeForm":"Adding login form"},{"content":"Setup JWT validation","status":"pending","activeForm":"Setting up JWT validation"}]}}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write","input":{"file_path":"src/contexts/AuthContext.tsx","content":"import React from 'react';\nexport const AuthContext = React.createContext(null);"}}]}}
{"type":"tool_result","success":true}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Bash","input":{"command":"npm install jsonwebtoken","description":"Install JWT library"}}]}}
{"type":"tool_result","output":"added 5 packages"}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"TodoWrite","input":{"todos":[{"content":"Create auth context","status":"completed","activeForm":"Creating auth context"},{"content":"Add login form","status":"in_progress","activeForm":"Adding login form"},{"content":"Setup JWT validation","status":"pending","activeForm":"Setting up JWT validation"}]}}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write","input":{"file_path":"src/components/LoginForm.tsx","content":"export const LoginForm = () => { return <form>...</form>; }"}}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Edit","input":{"file_path":"src/App.tsx","old_string":"// imports","new_string":"import { LoginForm } from './components/LoginForm';"}}]}}
{"type":"tool_result","error":"File not found: src/App.tsx"}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Write","input":{"file_path":"src/App.tsx","content":"import { LoginForm } from './components/LoginForm';\nexport default function App() { return <LoginForm />; }"}}]}}
{"type":"assistant","message":{"content":[{"type":"tool_use","name":"TodoWrite","input":{"todos":[{"content":"Create auth context","status":"completed","activeForm":"Creating auth context"},{"content":"Add login form","status":"completed","activeForm":"Adding login form"},{"content":"Setup JWT validation","status":"in_progress","activeForm":"Setting up JWT validation"}]}}]}}
EOF

echo "✓ Created test transcript at: $TRANSCRIPT_FILE"
echo ""

# Test 1: Normal operation (should block and provide feedback)
echo "Test 1: Normal sub-agent completion"
echo "----------------------------------------"

HOOK_INPUT=$(cat <<EOF
{
  "session_id": "test_session_1",
  "transcript_path": "$TRANSCRIPT_FILE",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": false
}
EOF
)

echo "$HOOK_INPUT" | python3 "$HOOK_SCRIPT" > /tmp/hook_output.json 2>/tmp/hook_error.log
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ Hook executed successfully"
    
    # Check if output is valid JSON
    if jq . /tmp/hook_output.json > /dev/null 2>&1; then
        echo "✓ Output is valid JSON"
        
        # Check for expected fields
        DECISION=$(jq -r '.decision' /tmp/hook_output.json)
        if [ "$DECISION" = "block" ]; then
            echo "✓ Decision is 'block' as expected"
        else
            echo "✗ Expected decision 'block', got: $DECISION"
        fi
        
        # Check reason content
        REASON=$(jq -r '.reason' /tmp/hook_output.json)
        
        # Check for expected content
        if echo "$REASON" | grep -q "Files Created"; then
            echo "✓ Found 'Files Created' section"
        else
            echo "✗ Missing 'Files Created' section"
        fi
        
        if echo "$REASON" | grep -q "AuthContext.tsx"; then
            echo "✓ Found AuthContext.tsx in output"
        else
            echo "✗ Missing AuthContext.tsx in output"
        fi
        
        if echo "$REASON" | grep -q "Tasks Completed"; then
            echo "✓ Found 'Tasks Completed' section"
        else
            echo "✗ Missing 'Tasks Completed' section"
        fi
        
        if echo "$REASON" | grep -q "Create auth context"; then
            echo "✓ Found completed task in output"
        else
            echo "✗ Missing completed task in output"
        fi
        
        echo ""
        echo "Sample of generated feedback:"
        echo "------------------------------"
        echo "$REASON" | head -n 20
        
    else
        echo "✗ Output is not valid JSON"
        cat /tmp/hook_output.json
    fi
else
    echo "✗ Hook failed with exit code: $EXIT_CODE"
    if [ -s /tmp/hook_error.log ]; then
        echo "Error output:"
        cat /tmp/hook_error.log
    fi
fi

echo ""

# Test 2: Stop hook active (should not block to prevent loops)
echo "Test 2: Stop hook active (loop prevention)"
echo "----------------------------------------"

HOOK_INPUT=$(cat <<EOF
{
  "session_id": "test_session_2",
  "transcript_path": "$TRANSCRIPT_FILE",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": true
}
EOF
)

echo "$HOOK_INPUT" | python3 "$HOOK_SCRIPT" > /tmp/hook_output2.json 2>/tmp/hook_error2.log
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    if [ -s /tmp/hook_output2.json ]; then
        echo "✗ Should not output JSON when stop_hook_active is true"
        cat /tmp/hook_output2.json
    else
        echo "✓ No output when stop_hook_active is true (prevents loops)"
    fi
else
    echo "✗ Unexpected exit code: $EXIT_CODE"
fi

echo ""

# Test 3: Empty transcript (no meaningful work)
echo "Test 3: Empty transcript (no work done)"
echo "----------------------------------------"

EMPTY_TRANSCRIPT=$(mktemp --suffix=.jsonl)
echo '{"type":"assistant","message":{"content":[{"type":"text","text":"Thinking..."}]}}' > "$EMPTY_TRANSCRIPT"

HOOK_INPUT=$(cat <<EOF
{
  "session_id": "test_session_3",
  "transcript_path": "$EMPTY_TRANSCRIPT",
  "hook_event_name": "SubagentStop",
  "stop_hook_active": false
}
EOF
)

echo "$HOOK_INPUT" | python3 "$HOOK_SCRIPT" > /tmp/hook_output3.json 2>/tmp/hook_error3.log
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    if [ -s /tmp/hook_output3.json ]; then
        echo "✗ Should not block when no work was done"
        cat /tmp/hook_output3.json
    else
        echo "✓ No blocking when sub-agent did no meaningful work"
    fi
else
    echo "✗ Unexpected exit code: $EXIT_CODE"
fi

# Cleanup
rm -f "$TRANSCRIPT_FILE" "$EMPTY_TRANSCRIPT" /tmp/hook_output*.json /tmp/hook_error*.log

echo ""
echo "=========================================="
echo "Integration test complete!"
echo "=========================================="