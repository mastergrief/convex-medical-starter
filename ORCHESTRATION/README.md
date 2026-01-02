# Multi-Agent Orchestration System

Central coordination system for managing complex multi-agent workflows with JSON-based state management and token-aware handoffs.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATION FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User Request ──► PARENT AGENT                                      │
│                       │                                             │
│                       ▼                                             │
│              ┌───────────────┐                                      │
│              │  CONTEXT HUB  │ ◄──── JSON read/write ────┐          │
│              │    (JSON)     │                           │          │
│              └───────────────┘                           │          │
│                    │    ▲                                │          │
│                    ▼    │                                │          │
│              ┌──────────┴───┐     ┌─────────────────┐    │          │
│              │  PLAN AGENT  │────►│  Plan JSON      │────┤          │
│              └──────────────┘     └─────────────────┘    │          │
│                                          │               │          │
│                                          ▼               │          │
│              ┌──────────────────────────────────────┐    │          │
│              │         ORCHESTRATOR                 │◄───┤          │
│              │  (resumed until 120k tokens)         │    │          │
│              └──────────────────────────────────────┘    │          │
│                    │              │              │       │          │
│                    ▼              ▼              ▼       │          │
│              ┌─────────┐   ┌─────────┐   ┌─────────┐     │          │
│              │ Explore │   │ Explore │   │Developer│     │          │
│              │ Agent 1 │   │ Agent 2 │   │  Agent  │     │          │
│              └────┬────┘   └────┬────┘   └────┬────┘     │          │
│                   │             │             │          │          │
│                   └─────────────┴─────────────┘          │          │
│                              │                           │          │
│                              ▼                           │          │
│                     Hand-off JSON ───────────────────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Agent Configuration

The orchestration system uses agents defined in `.claude/agents/`. Only these agents are valid:

| Agent Type | File | Purpose |
|------------|------|---------|
| `analyst` | `.claude/agents/analyst.md` | Codebase analysis, architecture mapping |
| `browser` | `.claude/agents/browser.md` | E2E testing, UI validation |
| `context7` | `.claude/agents/context7.md` | Documentation retrieval |
| `developer` | `.claude/agents/developer.md` | Code implementation, type-safe edits |
| `orchestrator` | `.claude/agents/orchestrator.md` | Workflow coordination |
| `plan` | `.claude/agents/plan.md` | Task decomposition |
| `shadcn` | `.claude/agents/shadcn.md` | UI component development |

**Path constant**: `AGENTS_DIR = ".claude/agents"`

To add a new agent type:
1. Create `{name}.md` in `.claude/agents/`
2. Add `"{name}"` to `AgentTypeSchema` in `ORCHESTRATION/schemas/index.ts`

## Components

### 1. Context Hub (`lib/context-hub.ts`)
Central JSON state management for orchestration:
- Session management with unique IDs
- Prompt, plan, and handoff storage
- Orchestrator state persistence
- History tracking

### 2. Schemas (`schemas/index.ts`)
Zod schemas for all JSON contracts:
- **PromptSchema**: Initial request from parent
- **PlanSchema**: Decomposed tasks from composer agent
- **HandoffSchema**: State transfer between agents
- **OrchestratorStateSchema**: Internal tracking
- **AgentResultSchema**: Agent-specific result discriminated union (analyst, developer, browser, composer, orchestrator)
- **GateValidationSchema**: Phase gate validation requirements
- **GateResultSchema**: Gate check results with blockers
- **LinkedMemorySchema**: Memory bridge with traceability data
- **ExecutionStrategySchema**: Parallel execution groups and token budgets

### 3. Token Tracker (`lib/token-tracker.ts`) [DEPRECATED]
> **Deprecated December 2025**: Token tracking is no longer needed with Claude Max subscriptions.
> The `tokenUsage` field remains optional in schemas for backward compatibility.

### 4. CLI (`cli/orch.ts`)
Command-line interface for all operations.

## CLI Commands

```bash
# Session Management
npx tsx ORCHESTRATION/cli/orch.ts session new           # Create new session
npx tsx ORCHESTRATION/cli/orch.ts session list          # List sessions
npx tsx ORCHESTRATION/cli/orch.ts session info [id]     # Show session info
npx tsx ORCHESTRATION/cli/orch.ts session purge         # Purge old sessions

# Prompt Operations
npx tsx ORCHESTRATION/cli/orch.ts prompt write "desc"   # Write prompt
npx tsx ORCHESTRATION/cli/orch.ts prompt read [id]      # Read prompt

# Plan Operations
npx tsx ORCHESTRATION/cli/orch.ts plan write file.json  # Write plan
npx tsx ORCHESTRATION/cli/orch.ts plan read [id]        # Read plan

# Handoff Operations
npx tsx ORCHESTRATION/cli/orch.ts handoff write file.json  # Write handoff
npx tsx ORCHESTRATION/cli/orch.ts handoff read [id]        # Read handoff
npx tsx ORCHESTRATION/cli/orch.ts handoff list             # List handoffs

# Memory Linking (connect Serena memories to sessions)
npx tsx ORCHESTRATION/cli/orch.ts memory link <name> [summary]  # Link memory
npx tsx ORCHESTRATION/cli/orch.ts memory list                   # List linked memories
npx tsx ORCHESTRATION/cli/orch.ts memory get <name>             # Get memory with traceability

# Phase Gates (validation before phase transitions)
npx tsx ORCHESTRATION/cli/orch.ts gate check <phaseId>   # Check if gate passes
npx tsx ORCHESTRATION/cli/orch.ts gate advance <phaseId> # Advance to next phase
npx tsx ORCHESTRATION/cli/orch.ts gate list [phaseId]    # List gate history
npx tsx ORCHESTRATION/cli/orch.ts gate read <phaseId>    # Read gate result details

# State & Status
npx tsx ORCHESTRATION/cli/orch.ts state read            # Read orchestrator state
npx tsx ORCHESTRATION/cli/orch.ts status                # Show overall status
npx tsx ORCHESTRATION/cli/orch.ts validate file.json    # Validate JSON

# Options
--session <id>    Use specific session
--json            Output as JSON

# Session Purge Options
--days <n>        Purge sessions older than n days (default: 7)
--keep <n>        Always keep n most recent sessions (default: 3)
--dry-run         Preview what would be purged
--force           Confirm deletion (required for actual purge)

# Memory Link Options
--extract         Extract traceability data from memory content
--for-agents <list>  Comma-separated agent types (default: developer,browser)

# Gate Check Options
--memory <patterns>      Comma-separated memory glob patterns (e.g., ANALYSIS_*)
--traceability <fields>  Comma-separated fields (analyzed_symbols,entry_points,data_flow_map)
--typecheck              Require npm run typecheck to pass
--tests                  Require npm test to pass

# Execute Commands
npx tsx ORCHESTRATION/cli/orch.ts execute <phaseId>      # Execute single phase
npx tsx ORCHESTRATION/cli/orch.ts execute-plan           # Execute entire plan

# Agent Commands
npx tsx ORCHESTRATION/cli/orch.ts agents list            # List active agents
npx tsx ORCHESTRATION/cli/orch.ts agents kill <agentId>  # Terminate agent

# Trace Commands
npx tsx ORCHESTRATION/cli/orch.ts trace create <taskId>  # Create evidence chain
npx tsx ORCHESTRATION/cli/orch.ts trace list             # List all chains
npx tsx ORCHESTRATION/cli/orch.ts trace validate <id>    # Validate chain

# Template Commands
npx tsx ORCHESTRATION/cli/orch.ts template list          # List templates
npx tsx ORCHESTRATION/cli/orch.ts template show <id>     # Show template details
npx tsx ORCHESTRATION/cli/orch.ts template validate <f>  # Validate template file

# Dashboard
npx tsx ORCHESTRATION/cli/orch.ts dashboard              # Interactive status view
npx tsx ORCHESTRATION/cli/orch.ts dashboard --json       # JSON output
```

## Configuration

### DashboardConfig

Dashboard display options for the interactive status view.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `refreshInterval` | number | 1000 | Refresh interval in milliseconds |
| `maxEvents` | number | 10 | Maximum events to display |

**CLI Usage:**
```bash
npx tsx ORCHESTRATION/cli/orch.ts dashboard --interval=2000  # Custom refresh rate
npx tsx ORCHESTRATION/cli/orch.ts dashboard --once           # Single snapshot (no refresh)
npx tsx ORCHESTRATION/cli/orch.ts dashboard --json           # JSON output
```

**Programmatic Usage:**
```typescript
import { createDashboard } from './lib/dashboard-data.js';

const config: DashboardConfig = {
  refreshInterval: 2000,
  maxEvents: 20
};

const dashboard = createDashboard(sessionPath, config);
```

### ParallelExecutionConfig

Agent parallelization options for concurrent task execution.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxConcurrentAgents` | number | 5 | Maximum agents running concurrently |
| `waitForAll` | boolean | true | Wait for all agents in group before continuing |
| `timeoutMs` | number | 300000 | Timeout per agent (5 minutes) |
| `retryOnFailure` | boolean | true | Retry failed agents automatically |
| `tokenBudget` | number | - | Maximum total tokens for the phase |
| `maxRetryAttempts` | number | 3 | Maximum retry attempts when `retryOnFailure` is true |
| `retryDelayMs` | number[] | [500, 1000, 2000] | Exponential backoff delays in milliseconds |

**Programmatic Usage:**
```typescript
import { ParallelExecutionConfig } from './lib/parallelEngineModules/types.js';

const config: ParallelExecutionConfig = {
  maxConcurrentAgents: 3,
  waitForAll: true,
  timeoutMs: 600000, // 10 minutes for complex tasks
  retryOnFailure: true,
  tokenBudget: 50000,
  maxRetryAttempts: 3,
  retryDelayMs: [500, 1000, 2000] // Exponential backoff
};
```

### GateCheckConfig

Gate validation timeouts for phase transition checks.

| Check Type | Timeout | Description |
|------------|---------|-------------|
| `typecheck` | 60000ms (1 min) | TypeScript compilation check |
| `tests` | 120000ms (2 min) | Test suite execution |
| `customCheck` | 30000ms (30 sec) | User-defined shell commands |
| `totalTimeout` | 300000ms (5 min) | Maximum time for all gate checks |

**CLI Usage:**
```bash
# Check gate with typecheck requirement
npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --typecheck

# Check gate with tests requirement
npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --tests

# Combined checks with memory requirements
npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --typecheck --tests --memory "ANALYSIS_*"
```

#### Timeout Rationale

| Check | Timeout | Rationale |
|-------|---------|-----------|
| Typecheck | 60s | Large TypeScript projects may have 1000+ files; incremental builds are faster |
| Tests | 120s | Unit tests should complete quickly; longer tests indicate performance issues |
| Custom | 30s | Shell commands should be lightweight validators, not full builds |
| Total | 300s | Prevents runaway gate checks from blocking orchestration indefinitely |

The total timeout acts as a circuit breaker. If individual checks complete but the total exceeds 5 minutes, the gate fails with a timeout blocker. This ensures the orchestration system remains responsive even when validation commands hang.

## Gate Condition DSL

The Gate Condition DSL provides a declarative language for specifying phase transition requirements. Conditions are evaluated before allowing progression to the next phase.

### Grammar Specification

```bnf
<condition>        ::= <expression>
<expression>       ::= <term> (('AND' | 'OR') <term>)*
<term>             ::= 'NOT'? <factor>
<factor>           ::= '(' <expression> ')' | <check>
<check>            ::= <simple-check> | <threshold-check>
<simple-check>     ::= 'typecheck' | 'tests' | <memory-check> | <traceability-check> | <evidence-check>
<memory-check>     ::= 'memory:' <pattern>
<traceability-check> ::= 'traceability:' <field-name>
<evidence-check>   ::= 'evidence:' (<chain-id> ['exists'] | 'coverage')
<threshold-check>  ::= <check-name> '[' <field> ']' <operator> <number> ['%']
                     | 'coverage' <operator> <number> ['%']
                     | 'evidence:coverage' <operator> <number> ['%']
<operator>         ::= '>=' | '<=' | '>' | '<' | '='
<pattern>          ::= glob pattern (e.g., "ANALYSIS_*", "*_AUTH_*")
<field-name>       ::= identifier (e.g., "analyzed_symbols", "entry_points")
<chain-id>         ::= identifier (e.g., "auth-chain", "validation-123")
```

### Operator Precedence

| Precedence | Operator | Type | Associativity |
|------------|----------|------|---------------|
| 1 (highest) | NOT | Unary | Right-to-left |
| 2 | AND | Conjunction | Left-to-right |
| 3 (lowest) | OR | Disjunction | Left-to-right |

Parentheses override default precedence: `(A OR B) AND C` evaluates OR first.

### Check Types Reference

| Check | Syntax | Description |
|-------|--------|-------------|
| typecheck | `typecheck` | Runs `npm run typecheck`, passes if exit code 0 |
| tests | `tests` | Runs `npm test`, passes if exit code 0 |
| memory | `memory:PATTERN` | Checks for linked memories matching glob pattern |
| traceability | `traceability:FIELD` | Checks that field exists in linked memories |
| evidence | `evidence:CHAIN_ID` | Checks evidence chain exists in session |
| evidence exists | `evidence:CHAIN_ID exists` | Explicit existence check for chain |
| coverage | `coverage >= N` | Shorthand for `evidence:coverage >= N` |
| threshold | `check[field] >= N` | Generic threshold check on any field |

### Examples

**Simple checks:**
```
typecheck
tests
memory:ANALYSIS_*
traceability:analyzed_symbols
evidence:auth-chain
```

**Compound conditions (AND):**
```
typecheck AND tests
memory:ANALYSIS_* AND traceability:entry_points
```

**Compound conditions (OR):**
```
typecheck OR tests
memory:ANALYSIS_* OR memory:IMPL_*
```

**Complex expressions with grouping:**
```
(typecheck AND tests) OR (memory:SKIP_* AND traceability:justification)
NOT tests OR memory:UNIT_TEST_EXEMPTION_*
typecheck AND (tests OR memory:TEST_SKIP_*)
```

**Threshold checks:**
```
coverage >= 80
coverage >= 80%
evidence:coverage >= 75
tests[passed] >= 90
evidence[coverage] >= 80
```

### Error Messages

Gate failures produce structured output with blockers:

```json
{
  "phaseId": "phase-1",
  "passed": false,
  "checkedAt": "2025-12-26T10:30:00.000Z",
  "results": [
    { "check": "typecheck", "passed": true },
    { "check": "tests", "passed": false, "message": "npm test exited with code 1" },
    { "check": "memory:ANALYSIS_*", "passed": true }
  ],
  "blockers": [
    "tests: npm test exited with code 1"
  ],
  "duration": 45230
}
```

**Parse errors** include position and found token:
```
GateParseError: Expected check type at position 15, found ')'
```

**Common error patterns:**
| Error | Cause | Fix |
|-------|-------|-----|
| `Unexpected character` | Invalid character in condition | Check for typos, use valid operators |
| `Expected check type` | Missing check after operator | Add check: `AND tests` not `AND` |
| `Expected comparison operator` | Threshold missing operator | Use `coverage >= 80` not `coverage 80` |
| `Unknown check type` | Unrecognized check name | Use valid checks: typecheck, tests, memory, etc. |

## Complete Workflow Example

### End-to-End Workflow

This example demonstrates a complete orchestration workflow from session creation to result retrieval.

**1. Start New Session**
```bash
npx tsx ORCHESTRATION/cli/orch.ts session new --template feature-implementation \
  --var feature_name="User Authentication" \
  --var testing_strategy="e2e"
```

**2. Write Initial Prompt**
```bash
npx tsx ORCHESTRATION/cli/orch.ts prompt write <<EOF
{
  "metadata": { "id": "prompt_001", "type": "initial" },
  "request": { "objective": "Implement OAuth2 authentication" }
}
EOF
```

**3. Link Relevant Memories**
```bash
npx tsx ORCHESTRATION/cli/orch.ts memory link AUTH_ARCHITECTURE --summary "Existing auth patterns"
```

**4. Create Plan with Phases and Gate Conditions**
```bash
npx tsx ORCHESTRATION/cli/orch.ts plan write <<EOF
{
  "id": "plan-auth-001",
  "type": "plan",
  "metadata": { "promptId": "prompt_001", "sessionId": "current" },
  "summary": "Implement OAuth2 authentication with E2E testing",
  "phases": [
    {
      "id": "phase-1",
      "name": "Analysis",
      "parallelizable": true,
      "subtasks": [
        { "id": "task-1.1", "description": "Analyze auth requirements", "agentType": "analyst" },
        { "id": "task-1.2", "description": "Map existing auth patterns", "agentType": "analyst" }
      ],
      "gateCondition": "memory:ANALYSIS_* AND traceability:entry_points"
    },
    {
      "id": "phase-2",
      "name": "Implementation",
      "parallelizable": false,
      "subtasks": [
        { "id": "task-2.1", "description": "Implement OAuth2 flow", "agentType": "developer" }
      ],
      "gateCondition": "typecheck AND tests"
    },
    {
      "id": "phase-3",
      "name": "Testing",
      "parallelizable": true,
      "subtasks": [
        { "id": "task-3.1", "description": "E2E auth flow testing", "agentType": "browser" }
      ],
      "gateCondition": "evidence:coverage >= 80"
    }
  ]
}
EOF
```

**5. Execute Phase with Parallel Agents**
```bash
npx tsx ORCHESTRATION/cli/orch.ts execute phase-1 --parallel --max-agents=3
```

**6. Check and Advance Gate**
```bash
# Check if gate requirements are met
npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1

# If passed, advance to next phase
npx tsx ORCHESTRATION/cli/orch.ts gate advance phase-1
```

**7. Read Results**
```bash
# View handoffs from completed agents
npx tsx ORCHESTRATION/cli/orch.ts handoff list --json

# Read specific handoff details
npx tsx ORCHESTRATION/cli/orch.ts handoff read <handoff-id> --json

# Check overall session status
npx tsx ORCHESTRATION/cli/orch.ts status
```

### Template Usage Example

Templates provide pre-configured session structures for common workflows.

**List Available Templates**
```bash
npx tsx ORCHESTRATION/cli/orch.ts template list
```

Output:
```
Available Templates:
  feature-implementation  - Standard feature development workflow
  bug-fix                 - Targeted bug investigation and fix
  refactoring             - Code refactoring with safety checks
  e2e-testing             - End-to-end testing workflow
```

**Show Template Details**
```bash
npx tsx ORCHESTRATION/cli/orch.ts template show feature-implementation
```

Output:
```
Template: feature-implementation
Description: Standard feature development workflow

Variables:
  feature_name     (required)  - Name of the feature to implement
  testing_strategy (optional)  - Testing approach: unit, e2e, both (default: both)

Phases:
  1. Analysis      - Codebase analysis and requirements mapping
  2. Implementation - Feature development with type safety
  3. Testing       - Automated testing based on strategy
  4. Review        - Final validation and documentation
```

**Create Session from Template**
```bash
npx tsx ORCHESTRATION/cli/orch.ts session new --template feature-implementation \
  --var feature_name="Dashboard Widget" \
  --var testing_strategy="e2e"
```

## Error Handling

### Error Scenarios Reference

| Error Type | Example | Recovery |
|------------|---------|----------|
| Schema Validation | `"metadata.id is required"` | Fix data structure, ensure required fields present, retry |
| Gate Check Failure | `"typecheck: 5 errors"` | Fix TypeScript errors, run `npm run typecheck` locally, re-check gate |
| File Not Found | `"Prompt not found: xyz"` | Verify prompt ID exists with `prompt list`, check session context |
| Session Error | `"Session not found"` | Create new session with `session new`, or specify `--session <id>` |
| Subprocess Timeout | `"Timed out after 60s"` | Increase timeout with `--timeout`, check for hanging processes |
| Memory Link Error | `"Memory 'X' not found"` | Verify memory exists with `mcp__serena__list_memories()` |
| Plan Validation Error | `"Invalid phase structure"` | Check plan JSON against schema, ensure all required fields |
| Agent Spawn Failure | `"Failed to spawn agent"` | Check agent file exists in `.claude/agents/`, verify agent type |

### Recovery Strategies

**Schema Validation Errors**

When encountering schema validation errors, the CLI provides detailed field-level feedback:

```bash
# Validate before writing
npx tsx ORCHESTRATION/cli/orch.ts validate plan.json

# Common fixes:
# - Add missing "id" field to metadata
# - Ensure "type" matches expected value ("plan", "handoff", etc.)
# - Check array fields are not empty when required
```

**Gate Check Failures**

Gate failures include specific blockers that guide resolution:

```bash
# Check gate and see blockers
npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --typecheck --tests

# Output shows:
# ✗ Gate check failed for phase-1
# Blockers:
#   - typecheck: npm run typecheck exited with code 1
#   - tests: 3 tests failed

# Resolution:
# 1. Fix TypeScript errors: npm run typecheck
# 2. Fix failing tests: npm test
# 3. Re-run gate check
```

**Session Recovery**

When session state becomes inconsistent:

```bash
# List all sessions to find correct one
npx tsx ORCHESTRATION/cli/orch.ts session list

# Get detailed session info
npx tsx ORCHESTRATION/cli/orch.ts session info <session-id>

# Set environment variable for persistent session
export ORCH_SESSION=<session-id>

# Or specify per-command
npx tsx ORCHESTRATION/cli/orch.ts status --session <session-id>
```

**Timeout Handling**

For long-running operations:

```bash
# Increase gate check timeout (default: 60s for typecheck, 120s for tests)
npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --timeout 180000

# For parallel execution, increase agent timeout
npx tsx ORCHESTRATION/cli/orch.ts execute phase-1 --timeout 600000

# Monitor progress via dashboard
npx tsx ORCHESTRATION/cli/orch.ts dashboard
```

**Partial Execution Recovery**

When execution is interrupted:

```bash
# Check current state
npx tsx ORCHESTRATION/cli/orch.ts state read

# View completed tasks
npx tsx ORCHESTRATION/cli/orch.ts handoff list

# Resume from last checkpoint
npx tsx ORCHESTRATION/cli/orch.ts execute phase-1 --resume
```

## Workflow

### 1. Parent Agent Receives Request
```bash
npx tsx ORCHESTRATION/cli/orch.ts session new
npx tsx ORCHESTRATION/cli/orch.ts prompt write "Implement feature X"
```

### 2. Plan Agent Decomposes Task
Reads prompt, creates plan with phases and subtasks:
```bash
npx tsx ORCHESTRATION/cli/orch.ts prompt read --json
# Create plan...
npx tsx ORCHESTRATION/cli/orch.ts plan write plan.json
```

### 3. Orchestrator Dispatches Agents
Reads plan, spawns specialized agents:
```bash
npx tsx ORCHESTRATION/cli/orch.ts plan read --json
# Spawn agents via Task tool...
```

### 4. Agents Complete and Hand Off
Each agent writes handoff when complete or at token limit:
```bash
npx tsx ORCHESTRATION/cli/orch.ts handoff write handoff.json
```

### 5. Orchestrator Resumes
Reads handoffs and continues:
```bash
npx tsx ORCHESTRATION/cli/orch.ts handoff read --json
# Continue with next tasks...
```

## Phase Gates

Phase gates validate requirements before transitioning to the next phase. Gates can check:

| Check Type | Description | Example |
|------------|-------------|---------|
| Memory | Serena memories matching glob pattern | `ANALYSIS_*` |
| Traceability | Required fields in linked memories | `analyzed_symbols,entry_points` |
| Typecheck | npm run typecheck passes | `--typecheck` |
| Tests | npm test passes | `--tests` |
| Custom | Shell command with expected output | JSON in plan |

### Gate Workflow

```bash
# Check if phase gate passes (dry run)
npx tsx ORCHESTRATION/cli/orch.ts gate check phase-1 --typecheck --memory "ANALYSIS_*"

# If passed, advance to next phase
npx tsx ORCHESTRATION/cli/orch.ts gate advance phase-1

# View gate history
npx tsx ORCHESTRATION/cli/orch.ts gate list
```

### Gate Condition in Plan

Plans can define gate conditions per phase:

```json
{
  "phases": [{
    "id": "phase-1",
    "name": "Analysis",
    "gateCondition": "typecheck, memory:ANALYSIS_*, traceability:analyzed_symbols"
  }]
}
```

## Token Management [DEPRECATED]

> **Deprecated December 2025**: Token budget tracking has been removed. Claude Max subscriptions eliminate the need for token consumption monitoring. Approximately 400 lines of token tracking code have been removed. The `tokenUsage` field remains optional in schemas for backward compatibility only.

## Agent Types

| Type | Purpose |
|------|---------|
| parent | Top-level coordinator |
| orchestrator | Central coordination |
| plan | Task decomposition |
| developer | Full-stack implementation |
| browser | UI testing, E2E validation, browser automation |
| analyst | Integration verification |
| context7 | Documentation retrieval |
| custom | User-defined agents |

## Directory Structure

```
ORCHESTRATION/
├── cli/
│   └── orch.ts           # Main CLI
├── lib/
│   ├── context-hub.ts    # State management
│   └── token-tracker.ts  # Token tracking
├── schemas/
│   └── index.ts          # Zod schemas
├── context-hub/
│   └── sessions/         # Session data
│       └── {session-id}/
│           ├── prompts/
│           ├── plans/
│           ├── handoffs/
│           ├── state/
│           ├── history/
│           ├── memories/   # Linked Serena memories
│           └── gates/      # Phase gate check results
├── examples/
│   ├── plan-template.json
│   └── handoff-template.json
├── tsconfig.json
└── README.md
```

## Environment Variables

```bash
ORCH_SESSION    # Default session ID
```

## Example Plan Structure

```json
{
  "id": "uuid",
  "type": "plan",
  "metadata": { "promptId": "...", "sessionId": "...", ... },
  "summary": "High-level description",
  "phases": [
    {
      "id": "phase-1",
      "name": "Analysis",
      "parallelizable": true,
      "subtasks": [
        {
          "id": "task-1.1",
          "description": "Analyze X",
          "agentType": "explore",
          "priority": "high",
          "dependencies": [],
          "estimatedTokens": 8000
        }
      ],
      "gateCondition": "All analysis complete"
    }
  ],
  "totalEstimatedTokens": 43000
}
```

## Example Handoff Structure

```json
{
  "id": "uuid",
  "type": "handoff",
  "metadata": { "fromAgent": {...}, "toAgent": {...}, ... },
  "reason": "task_complete",
  "tokenUsage": { "consumed": 7500, "limit": 120000, ... },
  "state": {
    "currentPhase": "phase-1",
    "completedTasks": ["task-1.1"],
    "pendingTasks": ["task-1.2", ...]
  },
  "results": [...],
  "context": {
    "criticalContext": "Key info for resumption",
    "resumeInstructions": "How to continue"
  },
  "nextActions": [...]
}
```
