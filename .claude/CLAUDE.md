# 🚀 CLAUDE DEVELOPMENT PROTOCOL
> **TRIPLE DIRECTIVE**: SERENA tools for code operations + Aggressive cognitive gates + Continuous memory writes


PART 1 - IMPORTANT: SERENA CODE OPERATIONS**

**IMPORTANT**: ALWAYS use Serena MCP tools for ALL code operations

**IMPORTANT:**
- `mcp__serena__find_file`
- `mcp__serena__search_for_pattern`
- `mcp__serena__get_symbols_overview`
- `mcp__serena__replace_symbol_body`
- `mcp__serena__insert_after_symbol`
- `mcp__serena__insert_before_symbol`

**Forbidden:**
- `Read()`
- Bash commands (`grep`, `find`, `cat`, `head`, `tail`)
- `Edit()`
- `MultiEdit()`

PART 2 - ENHANCED COGNITIVE GATE USAGE

**IMPORTANT**: ALWAYS use Serena mcp cognitive gates

```python
# **IMPORTANT**:

# After EVERY discovery 
mcp__serena__think_about_collected_information()  

# BEFORE and AFTER every modification
mcp__serena__think_about_task_adherence()  # Pre-check
# ... perform modification ...
mcp__serena__think_about_task_adherence()  # Post-check

# THREE times at completion (not just once)
for i in range(3):
    mcp__serena__think_about_whether_you_are_done()
```

PART 3 - SEMANTIC MEMORY
**IMPORTANT**: AGGRESSIVE MEMORY WRITING
**SERENA uses a flat file structure with descriptive naming**. No subdirectories or setup needed!

#### Simple Format:
```python
# Category_Topic_Timestamp.md
"sessions_start_20250909"
"discoveries_auth_bug_20250909"
"errors_type_mismatch_20250909"
"decisions_architecture_20250909"
---

```python
# IMPORTANT: Write memory at EVERY significant point

# 1. Session start (ALWAYS)
mcp__serena__write_memory(f"sessions_start_{timestamp}", {
    "task": current_task,
    "context": initial_understanding,
    "plan": approach
})

# 2. After EVERY discovery (not optional)
mcp__serena__write_memory(f"discoveries_{item}_{timestamp}", {
    "found": what_discovered,
    "relevance": why_matters,
    "next_steps": what_to_explore
})

# 3. After EVERY decision
mcp__serena__write_memory(f"decisions_{choice}_{timestamp}", {
    "decision": what_decided,
    "rationale": why,
    "alternatives": other_options
})

# 4. After EVERY error
mcp__serena__write_memory(f"errors_{error}_{timestamp}", {
    "error": what_failed,
    "context": circumstances,
    "solution": how_fixed
})

# 5. EVERY 5 operations (checkpoint)
if operation_count % 5 == 0:
    mcp__serena__write_memory(f"checkpoints_state_{timestamp}", {
        "progress": current_state,
        "completed": what_done,
        "remaining": what_left
    })

# 6. Task completion (comprehensive)
mcp__serena__write_memory(f"completions_task_{timestamp}", {
    "summary": what_accomplished,
    "lessons": what_learned,
    "improvements": for_next_time
})
```



**IMPORTANT**: COGNITIVE WORKFLOW PATTERN 

```python
def enhanced_v41_workflow():
    # Initialize with memory
    mcp__serena__write_memory(f"sessions_{timestamp}", context)
    
    # Discovery Phase - Reflect after EACH
    for item in search_targets:
        result = mcp__serena__search_for_pattern(item)
        mcp__serena__think_about_collected_information()  # IMMEDIATE
        mcp__serena__write_memory(f"discoveries_{item}_{timestamp}", result)
        
        symbols = mcp__serena__find_symbol(item)
        mcp__serena__think_about_collected_information()  # AGAIN
        mcp__serena__write_memory(f"cache_symbols_{timestamp}", symbols)
    
    # Modification Phase - Double validation
    for change in modifications:
        mcp__serena__think_about_task_adherence()  # PRE-CHECK
        mcp__serena__write_memory(f"decisions_pre_{timestamp}", plan)
        
        mcp__serena__replace_symbol_body(...)
        
        mcp__serena__think_about_task_adherence()  # POST-CHECK
        mcp__serena__write_memory(f"modifications_{timestamp}", result)
    
    # Completion Phase - Triple verification
    for i in range(3):
        mcp__serena__think_about_whether_you_are_done()
        if i < 2:
            validate_more()  # Additional validation between checks
    
    mcp__serena__write_memory(f"completions_{timestamp}", summary)
```

**No subdirectories needed!** All memories live in one flat directory with descriptive names.

---

**IMPORTANT: IMPLEMENTATION WORKFLOW**

### 📋 PHASE 1: CONTEXT (ENHANCED)
```python
# Read context with immediate memory write
memories = mcp__serena__list_memories()
mcp__serena__write_memory(f"context_loaded_{timestamp}", memories)  # NEW

env = mcp__serena__read_memory(".env.local")
mcp__serena__write_memory(f"context_env_{timestamp}", env)  # NEW

prd = Read("DOCUMENTS/PRD.md")
sprint = Read("DOCUMENTS/SPRINT.md")
mcp__serena__write_memory(f"context_docs_{timestamp}", {prd, sprint})  # NEW
```

### 🧠 PHASE 2: ULTRATHINK VALIDATION (ENHANCED)

```python
def ultrathink_validation(feature):
    # ALWAYS use ULTRATHINK with memory persistence
    thinking_mode = "ultrathink"  # MANDATORY
    
    # Think and write
    mcp__serena__think_about_collected_information()  # NEW
    
    questions = {
        "1. Where will data be stored?": answer,
        "2. What Convex function handles this?": answer,
        "3. How will this survive page refresh?": answer,
        "4. Can I demo this with REAL user actions?": answer
    }
    
    # Persist validation results
    mcp__serena__write_memory(f"decisions_validation_{timestamp}", questions)  # NEW
    
    if any_answer_is_negative:
        mcp__serena__write_memory(f"errors_validation_failed_{timestamp}", reasons)  # NEW
        return "STOP - Implement backend first"
```

### 🔄 ENHANCED ITERATION PROTOCOLS (v4.1)

```python
# Backend Iteration with memory at EACH iteration
for iteration in range(1, 4):
    mcp__serena__think_about_task_adherence()  # NEW - Pre-iteration check
    
    # ... implementation ...
    
    mcp__serena__write_memory(f"iterations_backend_{iteration}_{timestamp}", {
        "changes": what_changed,
        "improvements": what_improved,
        "issues": what_remains
    })
    
    mcp__serena__think_about_task_adherence()  # NEW - Post-iteration check

# UI Iteration with checkpoint after EACH
for iteration in range(1, 4):
    mcp__serena__think_about_collected_information()  # NEW - Pre-UI check
    
    # ... implementation ...
    mcp__playwright__browser_take_screenshot(f"iteration_{iteration}.png")
    
    mcp__serena__write_memory(f"iterations_ui_{iteration}_{timestamp}", {
        "screenshot": filename,
        "changes": ui_updates,
        "feedback": visual_assessment
    })
```

### 🚦 ENHANCED VERIFICATION GATES (v4.1)

#### Gate 1: Post-Context (ENHANCED)
```python
gate1_checks = {
    "memories_loaded": mcp__serena__list_memories() completed,
    "context_written": memory_writes >= 3,  # NEW
    "initial_reflection": think_called >= 1,  # NEW
    "env_configured": .env.local verified,
    "prd_understood": PRD.md analyzed,
    "sprint_reviewed": SPRINT.md current
}
```

#### Gate 2: Post-Validation (ENHANCED)
```python
gate2_checks = {
    "ultrathink_used": thinking_mode == "ultrathink",
    "validation_memory_written": validation_results_persisted,  # NEW
    "decisions_documented": decision_memories >= 1,  # NEW
    "data_storage_defined": specific_table_named,
    "convex_functions_planned": api_endpoints_specified,
    "persistence_strategy_clear": refresh_survival_proven,
    "real_demo_possible": answer == "yes"
}
```

#### Gate 3: Post-Backend (ENHANCED)
```python
gate3_checks = {
    "tests_written_first": tdd_tests_exist,
    "iteration_memories": iteration_memories >= 2,  # NEW
    "checkpoint_written": checkpoint_exists,  # NEW
    "tests_passing": all_tests_green,
    "schema_defined": convex_schema_valid,
    "crud_operations_work": create_read_update_delete_verified,
    "data_persists_refresh": refresh_test_passed,
    "no_type_errors": typescript_clean,
    "minimum_iterations": backend_iterations >= 2,
    "reflection_count": think_calls >= 4  # NEW
}
```

### ⚡ v4.1 EXECUTION CHECKLIST
```python
class EnhancedRealSprintExecutor:
    def __init__(self):
        self.operation_count = 0
        self.memory_writes = 0
        self.think_calls = 0
        
    def track_metrics(self):
        """Track v4.1 compliance metrics"""
        self.operation_count += 1
        
        # Checkpoint every 5 operations
        if self.operation_count % 5 == 0:
            mcp__serena__write_memory(f"checkpoints_op_{self.operation_count}", state)
            self.memory_writes += 1
            
        # Ensure minimum ratios
        assert self.memory_writes >= self.operation_count // 2, "Not enough memory writes"
        assert self.think_calls >= self.operation_count // 3, "Not enough reflection"
```

### 📊 v4.1 COMPLIANCE REQUIREMENTS

```python
MANDATORY_MINIMUMS = {
    "cognitive_gates_per_task": 10,
    "memory_writes_per_task": 5,
    "checkpoints_per_session": "every_5_operations",
    "discovery_reflections": "100%_immediate",
    "modification_validations": "before_and_after",
    "completion_verifications": 3,
    "memory_categories_used": 8,  # At least 8 different categories
    "forbidden_tool_usage": 0  # ZERO tolerance
}
```

---

## 🎓 v4.1 QUICK REFERENCE

### EVERY Operation Pattern
```python
# 1. Think before
cognitive_gate()

# 2. Execute with SERENA
serena_operation()

# 3. Think after
cognitive_gate()

# 4. Write memory
write_memory()

# 5. Checkpoint if needed
if operation_count % 5 == 0:
    checkpoint()
```

### Forbidden → Required Replacements
```python
# NEVER → ALWAYS
Read("file.ts")              → mcp__serena__get_symbols_overview("file.ts")
Write("file.ts", content)    → mcp__serena__replace_symbol_body(...)
Edit(file, old, new)         → mcp__serena__replace_symbol_body(...)
bash("grep pattern")         → mcp__serena__search_for_pattern("pattern")
bash("find -name")           → mcp__serena__find_file("mask")
```

---

*Protocol v4.1 | Cognitive-First | Memory-Intensive | Reflection-Driven Development*
