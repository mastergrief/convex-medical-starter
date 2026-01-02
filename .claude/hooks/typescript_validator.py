#!/usr/bin/env python3
"""
TypeScript Validation Hook for Claude Code
Runs npm run typecheck after TypeScript file edits and provides feedback.
"""
import json
import sys
import os
import subprocess
from pathlib import Path

def should_validate(file_path: str) -> bool:
    """Check if file should trigger TypeScript validation."""
    if not file_path:
        return False
    
    # Check file extensions
    ts_extensions = ('.ts', '.tsx', '.mts', '.cts')
    if not file_path.endswith(ts_extensions):
        return False
    
    # Skip declaration files
    if file_path.endswith('.d.ts'):
        return False
    
    # Skip node_modules
    if 'node_modules' in file_path:
        return False
    
    # Skip test files if desired (optional)
    # if '.test.' in file_path or '.spec.' in file_path:
    #     return False
    
    return True

def find_project_root(file_path: str) -> str:
    """Find the project root containing tsconfig.json."""
    # Start from file's directory
    current = Path(file_path).parent
    
    # Look for tsconfig.json
    while current != current.parent:
        if (current / 'tsconfig.json').exists():
            return str(current)
        if (current / 'package.json').exists():
            # Also check if package.json exists as fallback
            return str(current)
        current = current.parent
    
    # Fall back to CLAUDE_PROJECT_DIR
    return os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())

def run_typescript_check(project_dir: str) -> tuple[bool, str, str]:
    """Run TypeScript validation and return success, stdout, stderr."""
    try:
        # First, check if package.json has a typecheck script
        package_json_path = Path(project_dir) / 'package.json'
        has_typecheck_script = False
        
        if package_json_path.exists():
            try:
                with open(package_json_path, 'r') as f:
                    package_data = json.load(f)
                    scripts = package_data.get('scripts', {})
                    has_typecheck_script = 'typecheck' in scripts
            except (json.JSONDecodeError, IOError):
                pass
        
        # Use npm run typecheck if available (preferred method)
        if has_typecheck_script:
            result = subprocess.run(
                ['npm', 'run', 'typecheck'],
                cwd=project_dir,
                capture_output=True,
                text=True,
                timeout=60
            )
        else:
            # Fallback: Check if tsconfig.app.json exists (for this specific project structure)
            tsconfig_app = Path(project_dir) / 'tsconfig.app.json'
            
            # Try tsgo first (faster) with appropriate config
            if tsconfig_app.exists():
                # Use tsconfig.app.json for projects with this structure
                result = subprocess.run(
                    ['npx', 'tsgo', '--noEmit', '--project', 'tsconfig.app.json'],
                    cwd=project_dir,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
            else:
                # Default tsgo command for other projects
                result = subprocess.run(
                    ['npx', 'tsgo', '--noEmit'],
                    cwd=project_dir,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
        
        # Both npm and tsgo output to stdout primarily
        if result.returncode == 0:
            return True, result.stdout, ""
        else:
            # Check if tsgo is not available (only if we tried tsgo)
            if not has_typecheck_script and ('tsgo' in str(result.stderr) or 'not found' in str(result.stderr)):
                # Fall back to tsc
                result = subprocess.run(
                    ['npx', 'tsc', '--noEmit'],
                    cwd=project_dir,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                # tsc also outputs to stdout
                return result.returncode == 0, result.stdout, result.stdout
            
            # Return errors (usually in stdout for TypeScript tools)
            return False, result.stdout, result.stdout
            
    except subprocess.TimeoutExpired:
        return False, "", "TypeScript validation timed out (>60s)"
    except Exception as e:
        return False, "", f"Failed to run TypeScript check: {str(e)}"

def format_error_message(stderr: str, file_path: str) -> str:
    """Format TypeScript errors for Claude feedback."""
    if not stderr.strip():
        return "TypeScript errors detected. Run 'npx tsgo --noEmit' to see details."
    
    lines = stderr.strip().split('\n')
    
    # Get base filename for matching
    from os.path import basename
    base_name = basename(file_path)
    
    # Filter to show only errors related to the edited file
    relevant_errors = []
    
    for i, line in enumerate(lines):
        # Check if this line mentions our file
        if base_name in line or file_path in line:
            relevant_errors.append(line)
            # Also capture the next line if it exists (often contains the error details)
            if i + 1 < len(lines) and lines[i + 1].strip():
                next_line = lines[i + 1]
                if not any(next_line.startswith(p) for p in ['src/', 'lib/', './']):
                    relevant_errors.append(next_line)
    
    if not relevant_errors:
        # If no specific errors for this file, show first few errors as examples
        for line in lines[:10]:
            if 'error' in line.lower():
                relevant_errors.append(line)
    
    # Limit output to prevent overwhelming
    max_lines = 20
    if len(relevant_errors) > max_lines:
        relevant_errors = relevant_errors[:max_lines] + [
            f"... and {len(relevant_errors) - max_lines} more errors"
        ]
    
    return '\n'.join(relevant_errors) if relevant_errors else stderr[:500]

def main():
    """Main hook entry point."""
    try:
        # Read hook input
        input_data = json.load(sys.stdin)
        
        # Debug: Log what we receive for MCP tools
        tool_name = input_data.get('tool_name', '')
        if tool_name.startswith('mcp__'):
            debug_file = '/tmp/mcp_tool_debug.log'
            with open(debug_file, 'a') as f:
                f.write(f"\n--- MCP Tool Debug ---\n")
                f.write(f"Tool: {tool_name}\n")
                f.write(f"Input data keys: {list(input_data.keys())}\n")
                f.write(f"Full data: {json.dumps(input_data, indent=2)[:500]}\n")
        
        # Get tool information
        tool_input = input_data.get('tool_input', {})
        
        # Check if this is a file edit operation
        valid_tools = [
            'Write', 'Edit', 'MultiEdit',
            'mcp__serena__replace_symbol_body',
            'mcp__serena__insert_after_symbol',
            'mcp__serena__insert_before_symbol'
        ]
        if tool_name not in valid_tools:
            sys.exit(0)
        
        # Get file path(s)
        file_paths = []
        
        if tool_name in ['Write', 'Edit']:
            file_path = tool_input.get('file_path', '')
            if file_path:
                file_paths.append(file_path)
        elif tool_name == 'MultiEdit':
            # MultiEdit has file_path at top level
            file_path = tool_input.get('file_path', '')
            if file_path:
                file_paths.append(file_path)
        elif tool_name.startswith('mcp__serena__'):
            # MCP Serena tools use 'relative_path' parameter
            file_path = tool_input.get('relative_path', '')
            if file_path:
                # Convert relative path to absolute if needed
                if not file_path.startswith('/'):
                    project_dir = os.environ.get('CLAUDE_PROJECT_DIR', os.getcwd())
                    file_path = os.path.join(project_dir, file_path)
                file_paths.append(file_path)
        
        # Check if any TypeScript files were edited
        ts_files = [f for f in file_paths if should_validate(f)]
        
        if not ts_files:
            # No TypeScript files edited, skip validation
            sys.exit(0)
        
        # Find project root
        project_dir = find_project_root(ts_files[0])
        
        # Check if tsconfig.json exists
        tsconfig_path = Path(project_dir) / 'tsconfig.json'
        if not tsconfig_path.exists():
            # No TypeScript configuration, skip
            sys.exit(0)
        
        # Run TypeScript validation
        success, stdout, stderr = run_typescript_check(project_dir)
        
        if success:
            # TypeScript validation passed
            # Output to transcript mode for user visibility
            print(f"✅ TypeScript validation passed for {', '.join(ts_files)}")
            sys.exit(0)
        else:
            # TypeScript validation failed
            # Format error message
            error_msg = format_error_message(stderr, ts_files[0])
            
            # Provide feedback to Claude using exit code 2
            print("❌ TypeScript validation failed!\n", file=sys.stderr)
            print("Fix these TypeScript errors before continuing:\n", file=sys.stderr)
            print(error_msg, file=sys.stderr)
            print("\nRun 'npm run typecheck' to see all errors.", file=sys.stderr)
            
            # Exit code 2 makes Claude see the stderr and address the issues
            sys.exit(2)
            
    except json.JSONDecodeError:
        # Invalid JSON input, skip
        sys.exit(0)
    except Exception as e:
        # Log error but don't block the operation
        print(f"TypeScript validation hook error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()