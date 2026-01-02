# E2E Test Data Contract Template

Template for ensuring test data exists before E2E testing.

---

## Data Discovery Phase (Composer Agent)

**Before creating test plan**, composer agent MUST:

1. Load Convex skill: `Skill("convex")`
2. Query existing data:
   ```bash
   npx tsx CONVEX-CLI/SCRIPTS/convex-data.ts calendarWorkouts --limit=50 --json
   ```
3. Analyze what exercise types exist (category, contacts, distance, duration fields)
4. Identify gaps vs required test scenarios
5. Include SETUP phase in plan if gaps exist

---

## Test Scenarios & Required Data

| Scenario ID | Validation Type | Required Field | Exercise Categories | Keywords |
|-------------|-----------------|----------------|---------------------|----------|
| contacts-validation | Contacts-based | `contacts > 0` | Plyometric, Extensive Plyometrics | pogo, hop, jump, bound |
| distance-validation | Distance-based | `distance > 0` | Speed Training, Plyometric | sprint, fly, acceleration |
| time-validation | Time-based | `duration > 0` | Isometric, Core, Stability | hold, iso, plank, wall sit |
| reps-validation | Reps-only | `reps != null` | Strength, Hypertrophy | squat, deadlift, bench |

---

## Browser Agent Prompt Template

Include this section in ALL E2E test browser agent prompts:

```markdown
## Pre-condition Check & Setup Fallback

**BEFORE testing, verify data exists:**

1. Navigate to Training Calendar
2. Look for workout with required exercise type
3. IF FOUND and status=incomplete → proceed to TEST STEPS
4. IF NOT FOUND → execute SETUP FALLBACK below

### SETUP FALLBACK: Create Test Workout via Quick Program

**For [SCENARIO_TYPE] exercise:**

1. Navigate to Training Calendar
2. Find an empty date cell (today or future date)
3. Click the date cell once (selects it, turns blue)
4. `wait 300`
5. Click the SAME date cell again → Quick Program modal opens
6. `snapshot` to verify modal opened
7. In exercise search, type: "[EXERCISE_NAME]"
8. Select the exercise from results
9. Configure fields:
   - Sets: [VALUE]
   - [REQUIRED_FIELD]: [VALUE]
10. Click "Add to Workout" or "Save"
11. `wait 1000`
12. `snapshot` to verify workout created
13. NOW proceed to TEST STEPS

### Exercise-Specific Setup

**Contacts-based (Plyometric):**
- Search: "Pogo" or "Hurdle Hop"
- Configure: sets=3, contacts=20

**Distance-based (Speed):**
- Search: "Fly Sprint" or "Acceleration"
- Configure: sets=3, distance=30, reps=3

**Time-based (Isometric):**
- Search: "Plank" or "Wall Sit" or "Iso Hold"
- Configure: sets=3, duration=30

**Reps-based (Strength):**
- Search: "Squat" or "Deadlift" or "Bench"
- Configure: sets=3, reps=8, weight=100
```

---

## Orchestrator Dispatch Pattern

```
Phase 0: Data Discovery (Plan Agent)
  └── Load Convex skill
  └── Query calendarWorkouts table
  └── Return gap analysis

IF gaps exist:
  Phase 1: Data Setup (Browser Agent)
    └── Create missing workout types via Quick Program UI
    └── Verify creation successful
    └── Return fixture locations (dates)

Phase 2: E2E Tests (Browser Agents - parallel)
  └── Instance 1: Test scenarios A, B
  └── Instance 2: Test scenarios C, D
```

---

## JSON Schema: Test Data Contract

```typescript
interface TestDataContract {
  scenarioId: string;
  name: string;
  precondition: {
    type: "workout" | "exercise";
    requiredField: string;
    query: string;  // Convex query or table filter
  };
  setupFallback: {
    method: "quick-program";
    exerciseSearch: string;
    configuration: Record<string, number | string>;
  };
  testSteps: string[];
}
```

---

## Example: Complete Browser Agent Prompt

```markdown
## E2E Test: Contacts-based Validation

**Instance**: BROWSER_INSTANCE=inst1 BROWSER_PORT=3456
**Target**: http://localhost:5173
**Credentials**: coach@zenith.co.uk / Testpass1234

### Pre-condition Check

1. After login, navigate to Training Calendar
2. Look for workout with Plyometric exercise (Pogo's, Hurdle Hops, etc.)
3. Check workout is NOT completed (status != "completed")

**IF suitable workout found** → Skip to TEST STEPS
**IF NOT found** → Execute SETUP FALLBACK

### SETUP FALLBACK: Create Plyometric Workout

1. Find empty date on calendar (use tomorrow's date)
2. `click '[data-date="2025-12-10"]'` - Select date
3. `wait 300`
4. `click '[data-date="2025-12-10"]'` - Open Quick Program
5. `snapshot` - Verify modal
6. Search for "Pogo" in exercise field
7. Select "Pogo's" from results
8. Set: sets=3, contacts=20
9. Save workout
10. `screenshot setup-complete.png`
11. Continue to TEST STEPS

### TEST STEPS

1. Click workout card to select
2. Click "Start Workout" button
3. Expand exercise card
4. Verify "Log All Sets" button is DISABLED (no value entered)
5. Enter contacts value: 20
6. Verify "Log All Sets" button is now ENABLED
7. `screenshot test-result.png`

### Expected Result
- Button disabled when contacts field empty
- Button enabled when contacts field has value > 0
```
