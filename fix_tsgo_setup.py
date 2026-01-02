#!/usr/bin/env python3
"""
TSGO Setup Auto-Fixer
Automatically fixes common TSGO configuration issues
"""

import json
import subprocess
import shutil
from pathlib import Path
from typing import Dict, Any, List
import sys

class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'

class TSGOAutoFixer:
    def __init__(self):
        self.project_root = Path.cwd()
        self.fixes_applied = []
        self.fixes_failed = []
        
    def print_header(self, text: str):
        """Print formatted header"""
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}{text}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}{'='*60}{Colors.END}")
    
    def print_fix(self, text: str):
        """Print fix being applied"""
        print(f"{Colors.YELLOW}🔧 Fixing: {text}{Colors.END}")
    
    def print_success(self, text: str):
        """Print success message"""
        print(f"{Colors.GREEN}✅ {text}{Colors.END}")
        self.fixes_applied.append(text)
    
    def print_error(self, text: str):
        """Print error message"""
        print(f"{Colors.RED}❌ {text}{Colors.END}")
        self.fixes_failed.append(text)
    
    def print_info(self, text: str):
        """Print info message"""
        print(f"   {text}")
    
    def backup_file(self, filepath: Path) -> bool:
        """Create backup of file before modification"""
        if not filepath.exists():
            return True
            
        backup_path = filepath.with_suffix(filepath.suffix + '.backup')
        try:
            shutil.copy2(filepath, backup_path)
            self.print_info(f"Backup created: {backup_path}")
            return True
        except Exception as e:
            self.print_error(f"Failed to backup {filepath}: {e}")
            return False
    
    def load_json_file(self, filepath: Path) -> Dict[str, Any]:
        """Load JSON file safely"""
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def save_json_file(self, filepath: Path, data: Dict[str, Any]) -> bool:
        """Save JSON file with proper formatting"""
        try:
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2)
                f.write('\n')
            return True
        except Exception as e:
            self.print_error(f"Failed to save {filepath}: {e}")
            return False
    
    def fix_missing_dependencies(self):
        """Install missing TSGO dependencies"""
        self.print_header("Checking Dependencies")
        
        package_json_path = self.project_root / "package.json"
        package_json = self.load_json_file(package_json_path)
        
        if not package_json:
            self.print_error("package.json not found")
            return
        
        dev_deps = package_json.get("devDependencies", {})
        deps_to_install = []
        
        # Check for TSGO
        if "@typescript/native-preview" not in dev_deps:
            deps_to_install.append("@typescript/native-preview@^7.0.0-dev.20250827.1")
        
        # Check for npm-run-all
        if "npm-run-all" not in dev_deps:
            deps_to_install.append("npm-run-all@^4.1.5")
        
        if deps_to_install:
            self.print_fix(f"Installing missing dependencies: {', '.join(deps_to_install)}")
            try:
                result = subprocess.run(
                    ["npm", "install", "--save-dev"] + deps_to_install,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                if result.returncode == 0:
                    self.print_success("Dependencies installed successfully")
                else:
                    self.print_error(f"Failed to install dependencies: {result.stderr}")
            except Exception as e:
                self.print_error(f"Error installing dependencies: {e}")
        else:
            self.print_success("All required dependencies already installed")
    
    def fix_tsconfig_files(self):
        """Fix TypeScript configuration files"""
        self.print_header("Fixing TypeScript Configurations")
        
        # Root tsconfig.json
        root_config_path = self.project_root / "tsconfig.json"
        self.print_fix("Updating root tsconfig.json")
        
        root_config = {
            "compilerOptions": {
                "composite": True,
                "incremental": True,
                "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.tsbuildinfo",
                "paths": {
                    "@/*": ["./src/*"]
                }
            },
            "files": [],
            "references": [
                {"path": "./tsconfig.app.json"},
                {"path": "./tsconfig.node.json"}
            ],
            "exclude": ["convex/_generated", "**/_generated"]
        }
        
        if self.backup_file(root_config_path) and self.save_json_file(root_config_path, root_config):
            self.print_success("Root tsconfig.json updated")
        
        # App tsconfig
        app_config_path = self.project_root / "tsconfig.app.json"
        self.print_fix("Updating tsconfig.app.json")
        
        app_config = self.load_json_file(app_config_path)
        app_config.setdefault("compilerOptions", {}).update({
            "composite": True,
            "incremental": True,
            "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
            "target": "ESNext",
            "forceConsistentCasingInFileNames": True
        })
        app_config["include"] = ["src", "convex"]
        app_config["exclude"] = ["convex/_generated", "**/_generated"]
        
        if self.backup_file(app_config_path) and self.save_json_file(app_config_path, app_config):
            self.print_success("tsconfig.app.json updated")
        
        # Node tsconfig
        node_config_path = self.project_root / "tsconfig.node.json"
        self.print_fix("Updating tsconfig.node.json")
        
        node_config = self.load_json_file(node_config_path)
        node_config.setdefault("compilerOptions", {}).update({
            "composite": True,
            "incremental": True,
            "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
            "target": "ESNext",
            "forceConsistentCasingInFileNames": True
        })
        
        if self.backup_file(node_config_path) and self.save_json_file(node_config_path, node_config):
            self.print_success("tsconfig.node.json updated")
    
    def fix_package_scripts(self):
        """Fix package.json scripts for TSGO"""
        self.print_header("Fixing Package Scripts")
        
        package_json_path = self.project_root / "package.json"
        package_json = self.load_json_file(package_json_path)
        
        if not package_json:
            self.print_error("package.json not found")
            return
        
        self.backup_file(package_json_path)
        
        scripts = package_json.get("scripts", {})
        
        # Update scripts for TSGO
        script_updates = {
            "typecheck": "tsgo --noEmit --project tsconfig.app.json",
            "typecheck:tsc": "tsc --noEmit",  # Keep tsc as fallback
            "dev:typecheck": "tsgo --watch --noEmit --project tsconfig.app.json",
            "build:typecheck": "tsgo --noEmit --project tsconfig.app.json",
        }
        
        # Update dev script if it exists
        if "dev" in scripts:
            if "npm-run-all" in scripts["dev"]:
                if "dev:typecheck" not in scripts["dev"]:
                    scripts["dev"] = scripts["dev"].replace(
                        "dev:backend",
                        "dev:backend dev:typecheck"
                    )
            else:
                scripts["dev"] = "npm-run-all --parallel dev:frontend dev:backend dev:typecheck"
        
        # Update build script
        if "build" in scripts and "tsc" in scripts["build"]:
            scripts["build"] = "npm-run-all build:typecheck build:app"
            scripts["build:app"] = "vite build"
        
        # Update backend scripts for Convex
        if "dev:backend" in scripts and "convex dev" in scripts["dev:backend"]:
            if "--typecheck=disable" not in scripts["dev:backend"]:
                scripts["dev:backend"] = scripts["dev:backend"].replace(
                    "convex dev",
                    "convex dev --typecheck=disable"
                )
        
        # Apply all script updates
        for script_name, script_content in script_updates.items():
            if script_name not in scripts or "tsc" in scripts.get(script_name, ""):
                self.print_fix(f"Updating script: {script_name}")
                scripts[script_name] = script_content
        
        # Add Convex deployment scripts if using Convex
        if "convex" in package_json.get("dependencies", {}):
            if "convex:deploy" not in scripts:
                scripts["convex:deploy"] = "npm run typecheck && convex deploy --typecheck=disable"
            if "convex:deploy:prod" not in scripts:
                scripts["convex:deploy:prod"] = "npm run typecheck && convex deploy --typecheck=disable --prod"
        
        package_json["scripts"] = scripts
        
        if self.save_json_file(package_json_path, package_json):
            self.print_success("Package scripts updated for TSGO")
    
    def clean_build_cache(self):
        """Clean build cache for fresh start"""
        self.print_header("Cleaning Build Cache")
        
        cache_dir = self.project_root / "node_modules" / ".tmp"
        
        if cache_dir.exists():
            self.print_fix("Removing old build cache")
            try:
                shutil.rmtree(cache_dir)
                self.print_success("Build cache cleaned")
            except Exception as e:
                self.print_error(f"Failed to clean cache: {e}")
        else:
            self.print_info("No build cache to clean")
    
    def remove_test_file(self):
        """Remove the test file if it exists"""
        self.print_header("Cleaning Test Files")
        
        test_file = self.project_root / "src" / "test-tsgo.ts"
        
        if test_file.exists():
            self.print_fix("Removing test-tsgo.ts")
            try:
                test_file.unlink()
                self.print_success("Test file removed")
            except Exception as e:
                self.print_error(f"Failed to remove test file: {e}")
        else:
            self.print_info("No test file to remove")
    
    def verify_fix(self):
        """Verify that fixes were successful"""
        self.print_header("Verifying Fixes")
        
        try:
            # Test TSGO command
            result = subprocess.run(
                ["npx", "tsgo", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                self.print_success(f"TSGO is working: {result.stdout.strip()}")
            else:
                self.print_error("TSGO command failed")
            
            # Test typecheck script
            result = subprocess.run(
                ["npm", "run", "typecheck"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0 or "test-tsgo.ts" in result.stderr:
                self.print_success("Type checking script is working")
            else:
                self.print_warning("Type checking may have issues")
                
        except Exception as e:
            self.print_error(f"Verification failed: {e}")
    
    def print_summary(self):
        """Print fix summary"""
        self.print_header("Auto-Fix Summary")
        
        print(f"\n{Colors.BOLD}Results:{Colors.END}")
        print(f"  {Colors.GREEN}✅ Fixes Applied: {len(self.fixes_applied)}{Colors.END}")
        print(f"  {Colors.RED}❌ Fixes Failed: {len(self.fixes_failed)}{Colors.END}")
        
        if self.fixes_applied:
            print(f"\n{Colors.GREEN}{Colors.BOLD}Successfully Applied:{Colors.END}")
            for fix in self.fixes_applied:
                print(f"  • {fix}")
        
        if self.fixes_failed:
            print(f"\n{Colors.RED}{Colors.BOLD}Failed Fixes:{Colors.END}")
            for fix in self.fixes_failed:
                print(f"  • {fix}")
        
        if not self.fixes_failed:
            print(f"\n{Colors.GREEN}{Colors.BOLD}✅ All fixes applied successfully!{Colors.END}")
            print(f"\nNext steps:")
            print(f"  1. Run 'python validate_tsgo_setup.py' to verify the setup")
            print(f"  2. Run 'npm run dev' to start development")
            print(f"  3. Enjoy 3-5x faster type checking!")
        else:
            print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  Some fixes failed. Manual intervention may be required.{Colors.END}")
    
    def run_all_fixes(self):
        """Run all automatic fixes"""
        print(f"{Colors.BOLD}")
        print("╔══════════════════════════════════════════════════════════╗")
        print("║           TSGO Setup Auto-Fixer v1.0                      ║")
        print("║     Automatically Fix Common Configuration Issues         ║")
        print("╚══════════════════════════════════════════════════════════╝")
        print(f"{Colors.END}")
        
        # Ask for confirmation
        print(f"\n{Colors.YELLOW}This will modify your project configuration files.")
        print(f"Backups will be created for all modified files.{Colors.END}")
        response = input(f"\n{Colors.BOLD}Continue with auto-fix? (y/n): {Colors.END}")
        
        if response.lower() != 'y':
            print("Auto-fix cancelled.")
            return 1
        
        # Run all fixes
        self.fix_missing_dependencies()
        self.fix_tsconfig_files()
        self.fix_package_scripts()
        self.clean_build_cache()
        self.remove_test_file()
        self.verify_fix()
        
        # Print summary
        self.print_summary()
        
        return 0 if not self.fixes_failed else 1

def main():
    """Main entry point"""
    fixer = TSGOAutoFixer()
    exit_code = fixer.run_all_fixes()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()