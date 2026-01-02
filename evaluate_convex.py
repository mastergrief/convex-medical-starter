#!/usr/bin/env python3
"""
Convex Rules Evaluator
Parses Convex rules from MDC file and evaluates TypeScript configurations for compliance.

Usage:
    python evaluate_convex.py [project_dir] [--rules-file path/to/rules.mdc]
    
    If no arguments provided:
    - project_dir defaults to current directory
    - rules_file defaults to searching for convex_rules.mdc in standard locations
"""

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple
import yaml


class Severity(Enum):
    """Severity levels for rule violations."""
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"
    SUCCESS = "SUCCESS"


class RuleType(Enum):
    """Types of rules that can be evaluated."""
    REQUIRED = "required"
    FORBIDDEN = "forbidden"
    RECOMMENDED = "recommended"


@dataclass
class Rule:
    """Represents a single rule extracted from the MDC file."""
    id: str
    description: str
    type: RuleType
    severity: Severity
    path: List[str]  # JSON path in config
    expected_value: Any = None
    forbidden_value: Any = None
    validator: Optional[callable] = None
    fix_suggestion: Optional[str] = None


@dataclass
class Violation:
    """Represents a rule violation found during evaluation."""
    rule: Rule
    config_file: str
    actual_value: Any
    message: str
    fix_suggestion: Optional[str] = None


@dataclass
class MDCDocument:
    """Parsed MDC document structure."""
    frontmatter: Dict[str, Any] = field(default_factory=dict)
    sections: Dict[str, str] = field(default_factory=dict)
    code_blocks: List[Dict[str, str]] = field(default_factory=list)


class MDCParser:
    """Parser for MDC (Markdown with Configuration) files."""
    
    def parse(self, file_path: Path) -> MDCDocument:
        """Parse an MDC file into structured data."""
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        doc = MDCDocument()
        
        # Extract frontmatter
        frontmatter_match = re.match(r'^---\n(.*?)\n---\n', content, re.DOTALL)
        if frontmatter_match:
            frontmatter_text = frontmatter_match.group(1)
            # Fix the globs field by quoting it if necessary
            frontmatter_text = re.sub(r'(globs:\s*)([^\n"]+)', r'\1"\2"', frontmatter_text)
            try:
                doc.frontmatter = yaml.safe_load(frontmatter_text)
            except yaml.YAMLError:
                # If YAML parsing fails, try to extract manually
                doc.frontmatter = {}
                for line in frontmatter_text.split('\n'):
                    if ':' in line:
                        key, value = line.split(':', 1)
                        doc.frontmatter[key.strip()] = value.strip().strip('"')
            content = content[frontmatter_match.end():]
        
        # Parse sections
        sections = re.split(r'^(#+\s+.*?)$', content, flags=re.MULTILINE)
        current_section = "root"
        
        for i in range(0, len(sections), 2):
            if i + 1 < len(sections):
                header = sections[i + 1].strip()
                body = sections[i + 2] if i + 2 < len(sections) else ""
                section_name = re.sub(r'^#+\s+', '', header)
                doc.sections[section_name] = body
        
        # Extract code blocks
        code_block_pattern = r'```(\w+)?\n(.*?)```'
        for match in re.finditer(code_block_pattern, content, re.DOTALL):
            language = match.group(1) or 'text'
            code = match.group(2)
            doc.code_blocks.append({
                'language': language,
                'code': code
            })
        
        return doc


class ConvexRulesExtractor:
    """Extracts TypeScript configuration rules from Convex guidelines."""
    
    def extract_rules(self, mdc_doc: MDCDocument) -> List[Rule]:
        """Extract all TypeScript configuration rules from the MDC document."""
        rules = []
        
        # Extract TypeScript compiler option rules from guidelines
        rules.extend(self._extract_typescript_rules(mdc_doc))
        
        # Extract Convex-specific TypeScript rules
        rules.extend(self._extract_convex_typescript_rules(mdc_doc))
        
        # Extract example configuration rules
        rules.extend(self._extract_example_config_rules(mdc_doc))
        
        return rules
    
    def _extract_typescript_rules(self, mdc_doc: MDCDocument) -> List[Rule]:
        """Extract general TypeScript configuration rules."""
        rules = []
        
        # From the TypeScript guidelines section
        if "Typescript guidelines" in mdc_doc.sections:
            content = mdc_doc.sections["Typescript guidelines"]
            
            # Rule: strict types
            if "Be strict with types" in content:
                rules.append(Rule(
                    id="ts-strict-types",
                    description="TypeScript strict mode should be enabled",
                    type=RuleType.REQUIRED,
                    severity=Severity.ERROR,
                    path=["compilerOptions", "strict"],
                    expected_value=True,
                    fix_suggestion="Set 'strict': true in compilerOptions"
                ))
            
            # Rule: @types/node for Node.js modules
            if "@types/node" in content:
                rules.append(Rule(
                    id="ts-node-types",
                    description="Add @types/node when using Node.js modules",
                    type=RuleType.RECOMMENDED,
                    severity=Severity.INFO,
                    path=["compilerOptions", "types"],
                    validator=lambda v: "@types/node" in (v or []) if isinstance(v, list) else True,
                    fix_suggestion="Add '@types/node' to types array or install it"
                ))
        
        return rules
    
    def _extract_convex_typescript_rules(self, mdc_doc: MDCDocument) -> List[Rule]:
        """Extract Convex-specific TypeScript rules."""
        rules = []
        
        # Extract required Convex compiler options from the document
        # These are mentioned as "required by Convex" in the convex/tsconfig.json comments
        required_convex_opts = {
            "target": "ESNext",
            "module": "ESNext",
            "forceConsistentCasingInFileNames": True,
            "isolatedModules": True,
            "noEmit": True
        }
        
        for key, value in required_convex_opts.items():
            rules.append(Rule(
                id=f"convex-required-{key}",
                description=f"Convex requires {key} to be {value}",
                type=RuleType.REQUIRED,
                severity=Severity.ERROR,
                path=["compilerOptions", key],
                expected_value=value,
                fix_suggestion=f"Set '{key}': {json.dumps(value)} in compilerOptions"
            ))
        
        # Required lib settings for Convex
        rules.append(Rule(
            id="convex-required-lib",
            description="Convex requires ES2021 or DOM in lib array",
            type=RuleType.REQUIRED,
            severity=Severity.WARNING,
            path=["compilerOptions", "lib"],
            validator=lambda v: isinstance(v, list) and (
                any("ES2021" in str(lib) or "ES2020" in str(lib) or "ESNext" in str(lib) for lib in v) or
                any("DOM" in str(lib) for lib in v)
            ),
            fix_suggestion="Include 'ES2021' and 'DOM' in lib array"
        ))
        
        # Module resolution for Convex bundler
        rules.append(Rule(
            id="convex-module-resolution",
            description="Module resolution should be compatible with Convex bundler",
            type=RuleType.RECOMMENDED,
            severity=Severity.WARNING,
            path=["compilerOptions", "moduleResolution"],
            validator=lambda v: v in ["Bundler", "bundler", "Node", "node"],
            fix_suggestion="Set 'moduleResolution': 'Bundler' for Convex compatibility"
        ))
        
        # JSX support for React components
        rules.append(Rule(
            id="convex-jsx",
            description="JSX should be configured for React",
            type=RuleType.RECOMMENDED,
            severity=Severity.INFO,
            path=["compilerOptions", "jsx"],
            validator=lambda v: v in ["react-jsx", "react", "preserve"],
            fix_suggestion="Set 'jsx': 'react-jsx' for React 17+ support"
        ))
        
        # Exclude convex/_generated from compilation
        rules.append(Rule(
            id="convex-exclude-generated",
            description="Convex generated files should be excluded",
            type=RuleType.RECOMMENDED,
            severity=Severity.INFO,
            path=["exclude"],
            validator=lambda v: isinstance(v, list) and any("_generated" in str(item) for item in v),
            fix_suggestion="Add './_generated' or 'convex/_generated' to exclude array"
        ))
        
        return rules
    
    def _extract_example_config_rules(self, mdc_doc: MDCDocument) -> List[Rule]:
        """Extract rules from example configurations in the MDC document."""
        rules = []
        
        # Look for the example tsconfig.json in the chat-app example
        for block in mdc_doc.code_blocks:
            if "tsconfig.json" in str(block):
                # Extract configuration patterns
                if '"skipLibCheck": true' in block['code']:
                    rules.append(Rule(
                        id="example-skip-lib-check",
                        description="Skip library type checking for faster builds",
                        type=RuleType.RECOMMENDED,
                        severity=Severity.INFO,
                        path=["compilerOptions", "skipLibCheck"],
                        expected_value=True,
                        fix_suggestion="Set 'skipLibCheck': true for faster builds"
                    ))
                
                if '"allowSyntheticDefaultImports": true' in block['code']:
                    rules.append(Rule(
                        id="example-synthetic-imports",
                        description="Allow synthetic default imports",
                        type=RuleType.RECOMMENDED,
                        severity=Severity.INFO,
                        path=["compilerOptions", "allowSyntheticDefaultImports"],
                        expected_value=True,
                        fix_suggestion="Set 'allowSyntheticDefaultImports': true"
                    ))
        
        return rules


class TypeScriptConfigEvaluator:
    """Evaluates TypeScript configurations against extracted rules."""
    
    def __init__(self, rules: List[Rule]):
        self.rules = rules
    
    def evaluate(self, config_path: Path) -> Tuple[List[Violation], List[Rule]]:
        """
        Evaluate a TypeScript configuration file against rules.
        Returns (violations, passed_rules).
        """
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                # Remove comments from JSON (TypeScript allows comments in tsconfig)
                # Store strings to preserve them from comment removal
                import uuid
                string_placeholders = {}
                
                # Replace strings with placeholders to protect them
                def replace_string(match):
                    placeholder = f"__STRING_{uuid.uuid4().hex}__"
                    string_placeholders[placeholder] = match.group(0)
                    return placeholder
                
                content = re.sub(r'"[^"\\]*(?:\\.[^"\\]*)*"', replace_string, content)
                
                # Now safely remove comments
                # First remove multi-line comments
                content = re.sub(r'/\*[^*]*\*+(?:[^/*][^*]*\*+)*/', '', content)
                # Remove single-line comments
                content = re.sub(r'//[^\n\r]*', '', content)
                
                # Restore strings
                for placeholder, original in string_placeholders.items():
                    content = content.replace(placeholder, original)
                
                # Remove trailing commas before closing brackets (multiple passes for nested structures)
                for _ in range(3):
                    content = re.sub(r',(\s*[}\]])', r'\1', content)
                # Parse the cleaned JSON
                config = json.loads(content)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            return [Violation(
                rule=Rule(
                    id="config-parse-error",
                    description="Failed to parse configuration file",
                    type=RuleType.REQUIRED,
                    severity=Severity.ERROR,
                    path=[]
                ),
                config_file=str(config_path),
                actual_value=None,
                message=f"Failed to parse {config_path}: {str(e)}"
            )], []
        
        # Check if this is a project references config (no compilerOptions)
        is_references_config = 'references' in config and 'compilerOptions' not in config
        
        violations = []
        passed_rules = []
        
        for rule in self.rules:
            # Skip compiler option rules for project reference configs
            if is_references_config and rule.path and rule.path[0] == 'compilerOptions':
                continue
            
            violation = self._evaluate_rule(rule, config, str(config_path))
            if violation:
                violations.append(violation)
            else:
                passed_rules.append(rule)
        
        return violations, passed_rules
    
    def _evaluate_rule(self, rule: Rule, config: Dict, config_file: str) -> Optional[Violation]:
        """Evaluate a single rule against the configuration."""
        # Navigate to the config path
        value = config
        for key in rule.path:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                value = None
                break
        
        # Evaluate based on rule type
        if rule.type == RuleType.REQUIRED:
            if rule.expected_value is not None:
                if value != rule.expected_value:
                    return Violation(
                        rule=rule,
                        config_file=config_file,
                        actual_value=value,
                        message=f"{rule.description}. Expected: {rule.expected_value}, Got: {value}",
                        fix_suggestion=rule.fix_suggestion
                    )
            elif rule.validator:
                if not rule.validator(value):
                    return Violation(
                        rule=rule,
                        config_file=config_file,
                        actual_value=value,
                        message=f"{rule.description}. Validation failed for value: {value}",
                        fix_suggestion=rule.fix_suggestion
                    )
        
        elif rule.type == RuleType.FORBIDDEN:
            if value == rule.forbidden_value:
                return Violation(
                    rule=rule,
                    config_file=config_file,
                    actual_value=value,
                    message=f"{rule.description}. Forbidden value found: {value}",
                    fix_suggestion=rule.fix_suggestion
                )
        
        elif rule.type == RuleType.RECOMMENDED:
            if rule.expected_value is not None:
                if value != rule.expected_value:
                    return Violation(
                        rule=rule,
                        config_file=config_file,
                        actual_value=value,
                        message=f"{rule.description}. Recommended: {rule.expected_value}, Got: {value}",
                        fix_suggestion=rule.fix_suggestion
                    )
            elif rule.validator:
                if not rule.validator(value):
                    return Violation(
                        rule=rule,
                        config_file=config_file,
                        actual_value=value,
                        message=f"{rule.description}. Recommendation not followed for value: {value}",
                        fix_suggestion=rule.fix_suggestion
                    )
        
        return None


class ConvexRulesReporter:
    """Reports evaluation results in a clear, actionable format."""
    
    def report(self, config_file: str, violations: List[Violation], passed_rules: List[Rule]):
        """Generate and print a comprehensive report."""
        print(f"\n{'='*80}")
        print(f"📋 Convex Rules Evaluation Report")
        print(f"📁 Config File: {config_file}")
        print(f"{'='*80}\n")
        
        # Summary
        total_rules = len(violations) + len(passed_rules)
        error_count = sum(1 for v in violations if v.rule.severity == Severity.ERROR)
        warning_count = sum(1 for v in violations if v.rule.severity == Severity.WARNING)
        info_count = sum(1 for v in violations if v.rule.severity == Severity.INFO)
        
        print(f"📊 Summary:")
        print(f"   Total Rules Evaluated: {total_rules}")
        print(f"   ✅ Passed: {len(passed_rules)}")
        print(f"   ❌ Violations: {len(violations)}")
        if violations:
            print(f"      - Errors: {error_count}")
            print(f"      - Warnings: {warning_count}")
            print(f"      - Info: {info_count}")
        print()
        
        # Violations by severity
        if violations:
            print(f"⚠️  Violations Found:\n")
            
            # Group by severity
            for severity in [Severity.ERROR, Severity.WARNING, Severity.INFO]:
                severity_violations = [v for v in violations if v.rule.severity == severity]
                if severity_violations:
                    icon = "🔴" if severity == Severity.ERROR else "🟡" if severity == Severity.WARNING else "🔵"
                    print(f"{icon} {severity.value}S ({len(severity_violations)}):")
                    print("-" * 40)
                    
                    for v in severity_violations:
                        print(f"  Rule ID: {v.rule.id}")
                        print(f"  Message: {v.message}")
                        if v.fix_suggestion:
                            print(f"  💡 Fix: {v.fix_suggestion}")
                        print()
        
        # Passed rules summary
        if passed_rules:
            print(f"✅ Passed Rules ({len(passed_rules)}):")
            print("-" * 40)
            for rule in passed_rules[:5]:  # Show first 5
                print(f"  ✓ {rule.id}: {rule.description}")
            if len(passed_rules) > 5:
                print(f"  ... and {len(passed_rules) - 5} more")
            print()
        
        # Overall status
        print("=" * 80)
        if error_count > 0:
            print("❌ FAILED: Critical errors found. Please fix the issues above.")
            return False
        elif warning_count > 0:
            print("⚠️  PASSED WITH WARNINGS: Consider addressing the warnings above.")
            return True
        else:
            print("✅ PASSED: All rules satisfied!")
            return True


def find_rules_file(project_dir: Path) -> Optional[Path]:
    """Find the convex_rules.mdc file in common locations."""
    search_locations = [
        project_dir / "convex_rules.mdc",
        project_dir / "docs" / "convex_rules.mdc",
        project_dir / ".convex" / "rules.mdc",
        Path.home() / "projects" / "occuhealth-v2" / "convex_rules.mdc",
        Path.home() / "projects" / "convex-rules" / "convex_rules.mdc",
        Path.home() / ".convex" / "convex_rules.mdc",
        Path("/etc/convex/convex_rules.mdc"),
    ]
    
    for location in search_locations:
        if location.exists():
            return location
    
    return None


def find_tsconfig_files(project_dir: Path) -> List[Tuple[str, Path]]:
    """Find all TypeScript configuration files in the project."""
    configs = []
    
    # Standard tsconfig files
    standard_configs = [
        ("Main TypeScript Config", project_dir / "tsconfig.json"),
        ("App TypeScript Config", project_dir / "tsconfig.app.json"),
        ("Convex TypeScript Config", project_dir / "convex" / "tsconfig.json"),
        ("Node TypeScript Config", project_dir / "tsconfig.node.json"),
        ("Build TypeScript Config", project_dir / "tsconfig.build.json"),
    ]
    
    for name, path in standard_configs:
        if path.exists():
            configs.append((name, path))
    
    # Look for other tsconfig files
    for tsconfig_path in project_dir.glob("**/tsconfig*.json"):
        # Skip node_modules and other common directories to ignore
        parts = tsconfig_path.parts
        if any(part in ['.git', 'node_modules', 'dist', 'build', '.next'] for part in parts):
            continue
        
        # Check if already in list
        if not any(tsconfig_path == config[1] for config in configs):
            rel_path = tsconfig_path.relative_to(project_dir)
            name = f"TypeScript Config ({rel_path})"
            configs.append((name, tsconfig_path))
    
    return configs


def main():
    """Main entry point for the Convex rules evaluator."""
    parser = argparse.ArgumentParser(
        description="Evaluate TypeScript configurations against Convex rules",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Evaluate current directory
  python evaluate_convex.py
  
  # Evaluate specific project
  python evaluate_convex.py /path/to/project
  
  # Use specific rules file
  python evaluate_convex.py --rules-file ./my-rules.mdc
  
  # Evaluate specific project with custom rules
  python evaluate_convex.py /path/to/project --rules-file ./custom-rules.mdc
        """
    )
    
    parser.add_argument(
        "project_dir",
        nargs="?",
        default=".",
        help="Project directory to evaluate (default: current directory)"
    )
    
    parser.add_argument(
        "--rules-file",
        "-r",
        type=str,
        help="Path to the MDC rules file (default: auto-detect)"
    )
    
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show verbose output including all rule evaluations"
    )
    
    args = parser.parse_args()
    
    # Resolve project directory
    project_dir = Path(args.project_dir).resolve()
    if not project_dir.exists():
        print(f"❌ Project directory not found: {project_dir}")
        sys.exit(1)
    
    print("🚀 Convex Rules Evaluator Starting...")
    print(f"📁 Project Directory: {project_dir}")
    
    # Find or use specified rules file
    if args.rules_file:
        rules_file = Path(args.rules_file).resolve()
    else:
        rules_file = find_rules_file(project_dir)
        if not rules_file:
            print("❌ Could not find convex_rules.mdc file!")
            print("\nSearched in:")
            print("  - ./convex_rules.mdc")
            print("  - ./docs/convex_rules.mdc")
            print("  - ./.convex/rules.mdc")
            print("  - ~/projects/occuhealth-v2/convex_rules.mdc")
            print("\nPlease specify the rules file with --rules-file")
            sys.exit(1)
    
    if not rules_file.exists():
        print(f"❌ Rules file not found: {rules_file}")
        sys.exit(1)
    
    print(f"📖 Loading rules from: {rules_file}")
    
    # Parse MDC document
    parser = MDCParser()
    try:
        mdc_doc = parser.parse(rules_file)
    except Exception as e:
        print(f"❌ Failed to parse rules file: {e}")
        sys.exit(1)
    
    # Extract rules
    extractor = ConvexRulesExtractor()
    rules = extractor.extract_rules(mdc_doc)
    print(f"📏 Extracted {len(rules)} rules from MDC document")
    
    if args.verbose:
        print("\n📜 Extracted Rules:")
        for rule in rules:
            print(f"  - {rule.id}: {rule.description} ({rule.severity.value})")
    
    # Find TypeScript config files
    config_files = find_tsconfig_files(project_dir)
    
    if not config_files:
        print("\n⚠️  No TypeScript configuration files found in project!")
        print("Looking for: tsconfig.json, tsconfig.app.json, convex/tsconfig.json, etc.")
        sys.exit(1)
    
    print(f"\n📂 Found {len(config_files)} TypeScript configuration file(s)")
    
    # Create evaluator
    evaluator = TypeScriptConfigEvaluator(rules)
    reporter = ConvexRulesReporter()
    
    all_passed = True
    
    # Evaluate each config file
    for name, config_path in config_files:
        print(f"\n🔍 Evaluating {name}...")
        violations, passed_rules = evaluator.evaluate(config_path)
        passed = reporter.report(str(config_path), violations, passed_rules)
        if not passed:
            all_passed = False
    
    # Final summary
    print("\n" + "="*80)
    print("📊 OVERALL EVALUATION RESULT")
    print("="*80)
    
    if all_passed:
        print("✅ SUCCESS: All TypeScript configurations meet Convex requirements!")
        sys.exit(0)
    else:
        print("❌ FAILURE: Some configurations have critical issues that need fixing.")
        sys.exit(1)


if __name__ == "__main__":
    main()