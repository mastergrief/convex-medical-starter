#!/usr/bin/env python3
"""
TSGO Setup Validation Script
Validates the complete TSGO configuration for Vite + React + Convex project
"""

import json
import subprocess
import time
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import sys

class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

class TSGOValidator:
    def __init__(self):
        self.project_root = Path.cwd()
        self.errors = []
        self.warnings = []
        self.successes = []
        
    def print_header(self, text: str):
        """Print a formatted section header"""
        print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.END}")
    
    def print_success(self, text: str):
        """Print success message"""
        print(f"{Colors.GREEN}✅ {text}{Colors.END}")
        self.successes.append(text)
    
    def print_error(self, text: str):
        """Print error message"""
        print(f"{Colors.RED}❌ {text}{Colors.END}")
        self.errors.append(text)
    
    def print_warning(self, text: str):
        """Print warning message"""
        print(f"{Colors.YELLOW}⚠️  {text}{Colors.END}")
        self.warnings.append(text)
    
    def print_info(self, text: str):
        """Print info message"""
        print(f"   {text}")
    
    def validate_file_exists(self, filepath: Path, description: str) -> bool:
        """Check if a required file exists"""
        if filepath.exists():
            self.print_success(f"{description} exists: {filepath}")
            return True
        else:
            self.print_error(f"{description} missing: {filepath}")
            return False
    
    def validate_json_file(self, filepath: Path, description: str) -> Optional[Dict]:
        """Validate and load a JSON file"""
        if not self.validate_file_exists(filepath, description):
            return None
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
            self.print_success(f"{description} is valid JSON")
            return data
        except json.JSONDecodeError as e:
            self.print_error(f"{description} has invalid JSON: {e}")
            return None
    
    def validate_tsconfig_files(self):
        """Validate all TypeScript configuration files"""
        self.print_header("TypeScript Configuration Files")
        
        configs = [
            (self.project_root / "tsconfig.json", "Root tsconfig.json"),
            (self.project_root / "tsconfig.app.json", "Application tsconfig"),
            (self.project_root / "tsconfig.node.json", "Node tsconfig"),
            (self.project_root / "convex" / "tsconfig.json", "Convex tsconfig"),
        ]
        
        for filepath, description in configs:
            config = self.validate_json_file(filepath, description)
            if config and "compilerOptions" in config:
                options = config["compilerOptions"]
                
                # Check for composite configuration
                if filepath.name in ["tsconfig.json", "tsconfig.app.json", "tsconfig.node.json"]:
                    if options.get("composite"):
                        self.print_info(f"  ✓ Composite mode enabled")
                    else:
                        self.print_warning(f"  Composite mode not enabled in {filepath.name}")
                
                # Check for incremental builds
                if options.get("incremental"):
                    self.print_info(f"  ✓ Incremental builds enabled")
                    if "tsBuildInfoFile" in options:
                        self.print_info(f"  ✓ Build info file: {options['tsBuildInfoFile']}")
                
                # Check for TSGO-specific settings
                if options.get("target") == "ESNext":
                    self.print_info(f"  ✓ Target set to ESNext (optimal for TSGO)")
    
    def validate_package_json(self):
        """Validate package.json configuration"""
        self.print_header("Package.json Configuration")
        
        package_json = self.validate_json_file(
            self.project_root / "package.json", 
            "package.json"
        )
        
        if not package_json:
            return
        
        # Check dependencies
        dev_deps = package_json.get("devDependencies", {})
        
        # Check for TSGO
        if "@typescript/native-preview" in dev_deps:
            version = dev_deps["@typescript/native-preview"]
            self.print_success(f"TSGO installed: {version}")
        else:
            self.print_error("TSGO (@typescript/native-preview) not found in devDependencies")
        
        # Check for npm-run-all
        if "npm-run-all" in dev_deps:
            self.print_success(f"npm-run-all installed: {dev_deps['npm-run-all']}")
        else:
            self.print_error("npm-run-all not found in devDependencies")
        
        # Validate scripts
        scripts = package_json.get("scripts", {})
        required_scripts = [
            ("dev", "Development script"),
            ("build", "Build script"),
            ("typecheck", "Type checking script"),
            ("dev:typecheck", "Watch mode type checking"),
        ]
        
        for script_name, description in required_scripts:
            if script_name in scripts:
                script_content = scripts[script_name]
                
                # Check if script uses tsgo
                if "tsgo" in script_content or script_name == "dev":
                    self.print_success(f"{description} configured: {script_name}")
                    if "tsgo" in script_content:
                        self.print_info(f"  Command: {script_content}")
                elif "tsc" in script_content and script_name != "typecheck:tsc":
                    self.print_warning(f"{description} still using tsc instead of tsgo")
            else:
                self.print_warning(f"{description} missing: {script_name}")
    
    def validate_tsgo_installation(self):
        """Validate TSGO binary installation"""
        self.print_header("TSGO Installation")
        
        try:
            # Check TSGO version
            result = subprocess.run(
                ["npx", "tsgo", "--version"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                version = result.stdout.strip()
                self.print_success(f"TSGO binary found: {version}")
                
                # Check if it's the native preview version
                if "7.0.0-dev" in version:
                    self.print_info("  ✓ Using native Rust compiler preview")
                else:
                    self.print_warning("  Not using the native preview version")
            else:
                self.print_error(f"TSGO binary error: {result.stderr}")
                
        except subprocess.TimeoutExpired:
            self.print_error("TSGO version check timed out")
        except FileNotFoundError:
            self.print_error("npx command not found")
        except Exception as e:
            self.print_error(f"Error checking TSGO: {e}")
    
    def run_performance_test(self):
        """Run performance benchmarks"""
        self.print_header("Performance Validation")
        
        # Test TSGO performance
        try:
            start_time = time.time()
            result = subprocess.run(
                ["npm", "run", "typecheck"],
                capture_output=True,
                text=True,
                timeout=10
            )
            elapsed_time = time.time() - start_time
            
            if result.returncode != 0:
                # Check if it's the expected test error
                if "test-tsgo.ts" in result.stderr:
                    self.print_success("Type checking completed (with expected test errors)")
                else:
                    self.print_warning("Type checking completed with unexpected errors")
                    self.print_info(f"  Errors: {result.stderr[:200]}...")
            else:
                self.print_success("Type checking completed successfully")
            
            # Evaluate performance
            self.print_info(f"  Execution time: {elapsed_time:.3f} seconds")
            
            if elapsed_time < 1.0:
                self.print_success(f"Performance EXCELLENT: {elapsed_time:.3f}s (< 1s)")
            elif elapsed_time < 2.0:
                self.print_success(f"Performance GOOD: {elapsed_time:.3f}s (< 2s)")
            elif elapsed_time < 3.0:
                self.print_warning(f"Performance ACCEPTABLE: {elapsed_time:.3f}s (< 3s)")
            else:
                self.print_error(f"Performance SLOW: {elapsed_time:.3f}s (> 3s)")
                
            # Compare with traditional tsc if available
            if "typecheck:tsc" in json.loads(open("package.json").read()).get("scripts", {}):
                self.print_info("\n  Comparing with traditional tsc...")
                tsc_start = time.time()
                tsc_result = subprocess.run(
                    ["npm", "run", "typecheck:tsc"],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                tsc_elapsed = time.time() - tsc_start
                
                speedup = tsc_elapsed / elapsed_time if elapsed_time > 0 else 0
                self.print_info(f"  TSC time: {tsc_elapsed:.3f}s")
                self.print_info(f"  TSGO speedup: {speedup:.2f}x faster")
                
                if speedup > 2:
                    self.print_success(f"TSGO is {speedup:.2f}x faster than tsc!")
                
        except subprocess.TimeoutExpired:
            self.print_error("Type checking timed out (> 10 seconds)")
        except Exception as e:
            self.print_error(f"Error during performance test: {e}")
    
    def validate_convex_integration(self):
        """Validate Convex integration with TSGO"""
        self.print_header("Convex Integration")
        
        package_json = json.loads(open("package.json").read())
        scripts = package_json.get("scripts", {})
        
        # Check Convex scripts
        convex_scripts = ["dev:backend", "convex:deploy", "convex:deploy:prod"]
        
        for script_name in convex_scripts:
            if script_name in scripts:
                script_content = scripts[script_name]
                if "--typecheck=disable" in script_content:
                    self.print_success(f"{script_name} configured with --typecheck=disable")
                else:
                    self.print_warning(f"{script_name} not using --typecheck=disable flag")
                    self.print_info(f"  Current: {script_content}")
            else:
                if script_name.startswith("convex:"):
                    self.print_info(f"Optional script {script_name} not configured")
    
    def validate_build_cache(self):
        """Check for build cache configuration"""
        self.print_header("Build Cache Configuration")
        
        cache_dir = self.project_root / "node_modules" / ".tmp"
        
        if cache_dir.exists():
            self.print_success("Build cache directory exists")
            
            # Check for tsbuildinfo files
            tsbuildinfo_files = list(cache_dir.glob("*.tsbuildinfo"))
            if tsbuildinfo_files:
                self.print_success(f"Found {len(tsbuildinfo_files)} build cache files:")
                for file in tsbuildinfo_files:
                    size_kb = file.stat().st_size / 1024
                    self.print_info(f"  • {file.name} ({size_kb:.1f} KB)")
            else:
                self.print_info("  No build cache files yet (will be created on first run)")
        else:
            self.print_info("Build cache directory not yet created (will be created on first run)")
    
    def run_all_validations(self):
        """Run all validation checks"""
        print(f"{Colors.BOLD}")
        print("╔══════════════════════════════════════════════════════════╗")
        print("║         TSGO Setup Validation Suite v1.0                  ║")
        print("║     TypeScript Native Compiler Configuration Check        ║")
        print("╚══════════════════════════════════════════════════════════╝")
        print(f"{Colors.END}")
        
        # Run all validations
        self.validate_tsconfig_files()
        self.validate_package_json()
        self.validate_tsgo_installation()
        self.validate_convex_integration()
        self.validate_build_cache()
        self.run_performance_test()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print validation summary"""
        self.print_header("Validation Summary")
        
        total_checks = len(self.successes) + len(self.errors) + len(self.warnings)
        
        print(f"\n{Colors.BOLD}Results:{Colors.END}")
        print(f"  {Colors.GREEN}✅ Passed: {len(self.successes)}{Colors.END}")
        print(f"  {Colors.YELLOW}⚠️  Warnings: {len(self.warnings)}{Colors.END}")
        print(f"  {Colors.RED}❌ Failed: {len(self.errors)}{Colors.END}")
        print(f"  📊 Total checks: {total_checks}")
        
        if self.errors:
            print(f"\n{Colors.RED}{Colors.BOLD}Critical Issues to Fix:{Colors.END}")
            for error in self.errors:
                print(f"  • {error}")
        
        if self.warnings:
            print(f"\n{Colors.YELLOW}{Colors.BOLD}Warnings to Review:{Colors.END}")
            for warning in self.warnings:
                print(f"  • {warning}")
        
        # Overall status
        print(f"\n{Colors.BOLD}Overall Status: ", end="")
        if not self.errors:
            print(f"{Colors.GREEN}✅ TSGO Setup VALIDATED{Colors.END}")
            print(f"\n{Colors.GREEN}Your project is ready to use TSGO!{Colors.END}")
            print(f"Run 'npm run dev' to start development with blazing fast type checking.")
            return 0
        else:
            print(f"{Colors.RED}❌ VALIDATION FAILED{Colors.END}")
            print(f"\n{Colors.RED}Please fix the errors above before proceeding.{Colors.END}")
            return 1

def main():
    """Main entry point"""
    validator = TSGOValidator()
    exit_code = validator.run_all_validations()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()