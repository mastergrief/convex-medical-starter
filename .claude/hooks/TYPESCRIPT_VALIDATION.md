# TypeScript Validation Hook

## Overview
Automatically runs `npx tsgo --noEmit` after editing TypeScript files to catch type errors immediately.

## Features

### Smart Validation
- ✅ Only runs for `.ts`, `.tsx`, `.mts`, `.cts` files
- ✅ Skips declaration files (`.d.ts`)
- ✅ Ignores `node_modules`
- ✅ Finds project root with `tsconfig.json`
- ✅ Falls back to `tsc` if `tsgo` not available

### Error Feedback
When TypeScript errors are detected:
1. **Exit code 2** - Blocks Claude from continuing
2. **Shows relevant errors** - Only for edited file
3. **Forces fix** - Claude must fix TypeScript errors before proceeding

## Configuration

### Current Setup (Smart Script)
In `.claude/settings.json`:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/typescript_validator.py"
          }
        ]
      }
    ]
  }
}
```

### Alternative: Simple Inline Command
For a simpler approach without a script:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "jq -r '.tool_input.file_path // \"\"' | { read f; if [[ $f == *.ts || $f == *.tsx ]] && [[ $f != *.d.ts ]]; then cd \"$CLAUDE_PROJECT_DIR\" && npx tsgo --noEmit 2>&1 || exit 2; fi; }",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

### Alternative: Ultra-Simple Version
Runs on ALL file edits (less efficient but simpler):
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "cd \"$CLAUDE_PROJECT_DIR\" && npx tsgo --noEmit || exit 0",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```
Note: Uses `exit 0` to avoid blocking on non-TypeScript projects.

## How It Works

### Workflow
1. Claude edits a TypeScript file
2. Hook triggers after edit completes
3. Runs `npx tsgo --noEmit` in project root
4. If errors found:
   - Shows errors to Claude (exit code 2)
   - Claude must fix before continuing
5. If no errors:
   - Silent success
   - Claude continues normally

### Example Error Feedback
```
❌ TypeScript validation failed!

Fix these TypeScript errors before continuing:

src/auth.ts(17,7): error TS2741: Property 'age' is missing...
src/auth.ts(24,22): error TS7006: Parameter 'data' implicitly has an 'any' type.

Run 'npx tsgo --noEmit' to see all errors.
```

## Benefits

1. **Immediate Feedback** - Catch errors instantly
2. **Forced Quality** - Can't continue with broken types
3. **Automatic** - No need to remember to run checks
4. **Educational** - Claude learns from TypeScript errors
5. **Project-Specific** - Uses project's tsconfig.json

## Testing

### Test with Error File
```bash
# Create a file with TypeScript errors
echo 'const x: string = 123;' > test.ts

# Simulate hook
echo '{"tool_name":"Write","tool_input":{"file_path":"test.ts"}}' | \
  env CLAUDE_PROJECT_DIR="$(pwd)" python3 .claude/hooks/typescript_validator.py
```

### Verify Hook is Active
```bash
# Check settings
cat .claude/settings.json | jq '.hooks.PostToolUse'

# Watch for hook execution in Claude Code
# Look for TypeScript error messages after file edits
```

## Customization

### Skip Test Files
Edit `typescript_validator.py`:
```python
# Uncomment these lines to skip test files
if '.test.' in file_path or '.spec.' in file_path:
    return False
```

### Change Timeout
```json
{
  "timeout": 60  // Increase for large projects
}
```

### Add Pre-commit Style Enforcement
Combine with formatting:
```json
{
  "hooks": [
    {
      "type": "command",
      "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/typescript_validator.py"
    },
    {
      "type": "command", 
      "command": "npx prettier --write \"$1\" || exit 0"
    }
  ]
}
```

## Troubleshooting

### Hook Not Running?
- Check if file extension matches (`.ts`, `.tsx`)
- Verify `tsconfig.json` exists in project
- Test with `claude --debug` to see execution

### False Positives?
- Check if file is in tsconfig.json `include`
- Verify not in `exclude` patterns
- Run `npx tsgo --noEmit` manually to confirm

### Performance Issues?
- Use `tsgo` instead of `tsc` (faster)
- Increase timeout for large projects
- Consider skipping test files

## Summary

This hook ensures TypeScript code quality by:
- ✅ Running type checks automatically
- ✅ Blocking on errors
- ✅ Providing immediate feedback
- ✅ Enforcing type safety consistently

Perfect for maintaining code quality in TypeScript projects!