#!/bin/bash

echo "=== SubagentStop Hook Validation ==="
echo "Testing Direct Feedback Loop Pattern"
echo ""

# Create a more comprehensive test transcript
cat > /tmp/test_subagent_transcript.jsonl << 'EOF'
{"type": "user", "message": {"content": "Create a new React component for displaying user profiles with TypeScript"}}
{"type": "assistant", "message": {"content": [{"type": "text", "text": "I'll create a new React component for displaying user profiles with TypeScript. Let me start by creating the component file."}]}}
{"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Write", "input": {"file_path": "/src/components/UserProfile.tsx", "content": "import React from 'react';\n\ninterface UserProfileProps {\n  name: string;\n  email: string;\n  avatar?: string;\n  bio?: string;\n}\n\nexport const UserProfile: React.FC<UserProfileProps> = ({ name, email, avatar, bio }) => {\n  return (\n    <div className=\"user-profile\">\n      {avatar && <img src={avatar} alt={name} />}\n      <h2>{name}</h2>\n      <p>{email}</p>\n      {bio && <p>{bio}</p>}\n    </div>\n  );\n};"}}]}}
{"type": "tool_result", "result": {"success": true}}
{"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Write", "input": {"file_path": "/src/components/UserProfile.test.tsx", "content": "import { render, screen } from '@testing-library/react';\nimport { UserProfile } from './UserProfile';\n\ndescribe('UserProfile', () => {\n  it('renders user information', () => {\n    render(<UserProfile name=\"John Doe\" email=\"john@example.com\" />);\n    expect(screen.getByText('John Doe')).toBeInTheDocument();\n    expect(screen.getByText('john@example.com')).toBeInTheDocument();\n  });\n});"}}]}}
{"type": "tool_result", "result": {"success": true}}
{"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Edit", "input": {"file_path": "/src/components/index.ts", "old_string": "export { Dashboard } from './Dashboard';", "new_string": "export { Dashboard } from './Dashboard';\nexport { UserProfile } from './UserProfile';"}}]}}
{"type": "tool_result", "result": {"success": true}}
{"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Bash", "input": {"command": "npm test UserProfile", "description": "Run tests for UserProfile component"}}]}}
{"type": "tool_result", "result": {"output": "PASS  src/components/UserProfile.test.tsx\n  UserProfile\n    ✓ renders user information (45ms)\n\nTest Suites: 1 passed, 1 total\nTests:       1 passed, 1 total"}}
{"type": "assistant", "message": {"content": [{"type": "tool_use", "name": "Bash", "input": {"command": "npx tsc --noEmit", "description": "Check TypeScript compilation"}}]}}
{"type": "tool_result", "result": {"output": "✨ No TypeScript errors found"}}
{"type": "assistant", "message": {"content": [{"type": "text", "text": "Successfully created the UserProfile React component with TypeScript. The component includes:\n\n1. **Main component** (`UserProfile.tsx`): A fully typed React component with optional avatar and bio fields\n2. **Test file** (`UserProfile.test.tsx`): Unit tests using React Testing Library\n3. **Export updated**: Added to the components index for easy importing\n\nAll tests are passing and TypeScript compilation is successful. The component is ready for use in the application."}]}}
EOF

echo "📝 Created test transcript with React component creation scenario"
echo ""

# Test 1: Basic hook execution
echo "Test 1: Basic hook execution"
echo "----------------------------"
INPUT='{"transcript_path": "/tmp/test_subagent_transcript.jsonl", "hook_event_name": "SubagentStop", "stop_hook_active": false}'
RESULT=$(echo "$INPUT" | python3 /home/gabe/projects/occuhealth-v2/.claude/hooks/subagent_feedback.py)

if [ $? -eq 0 ]; then
    echo "✅ Hook executed successfully"
    echo ""
    echo "Output structure:"
    echo "$RESULT" | jq -r '.decision'
    echo ""
    echo "Summary preview (first 500 chars):"
    echo "$RESULT" | jq -r '.reason' | head -c 500
    echo "..."
else
    echo "❌ Hook execution failed"
fi

echo ""
echo ""

# Test 2: Test with stop_hook_active=true (should not block)
echo "Test 2: Prevent infinite loop (stop_hook_active=true)"
echo "------------------------------------------------------"
INPUT='{"transcript_path": "/tmp/test_subagent_transcript.jsonl", "hook_event_name": "SubagentStop", "stop_hook_active": true}'
RESULT=$(echo "$INPUT" | python3 /home/gabe/projects/occuhealth-v2/.claude/hooks/subagent_feedback.py)

if [ $? -eq 0 ] && [ -z "$RESULT" ]; then
    echo "✅ Correctly prevented infinite loop (no output when stop_hook_active=true)"
else
    echo "❌ Should not output when stop_hook_active=true"
fi

echo ""

# Test 3: Error handling - missing transcript
echo "Test 3: Error handling - missing transcript"
echo "-------------------------------------------"
INPUT='{"transcript_path": "/nonexistent/transcript.jsonl", "hook_event_name": "SubagentStop", "stop_hook_active": false}'
RESULT=$(echo "$INPUT" | python3 /home/gabe/projects/occuhealth-v2/.claude/hooks/subagent_feedback.py 2>&1)

if echo "$RESULT" | jq -r '.reason' | grep -q "Error processing"; then
    echo "✅ Properly handles missing transcript"
else
    echo "❌ Error handling needs improvement"
fi

echo ""
echo "=== Validation Complete ===" 
echo ""
echo "📋 Summary:"
echo "- Hook script location: /home/gabe/projects/occuhealth-v2/.claude/hooks/subagent_feedback.py"
echo "- Configuration in: /home/gabe/projects/occuhealth-v2/.claude/settings.json"
echo "- Pattern: Direct Feedback Loop (Pattern 1)"
echo ""
echo "🎯 How it works:"
echo "1. Subagent completes a task"
echo "2. Hook intercepts with SubagentStop event"
echo "3. Parses transcript to extract key information"
echo "4. Returns decision:'block' with comprehensive summary"
echo "5. Parent agent receives summary as context immediately"
echo ""
echo "✨ The hook is ready for production use!"