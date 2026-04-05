# Execute Phase Workflow

Wave-based phase execution with parallelization and per-task verification.

**Token budget**: ~12K per wave (includes executor + verifier spawns)

---

## Context Setup

@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/init-gate.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/state-read.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/model-route.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/agent-contracts.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/anti-patterns.md

---

## Initialization

### 1. Get Phase Context

```bash
PHASE=${phase_arg}
PHASE_DIR=".planning/phases/$(printf '%02d' $PHASE)-*"

if [ ! -d "$PHASE_DIR" ]; then
  error "Phase $PHASE not found"
fi

if [ ! -f "$PHASE_DIR/PLAN.md" ]; then
  error "PLAN.md not found for phase $PHASE"
fi
```

### 2. Load Execution Payload

```bash
PAYLOAD=$(node ~/.claude/makeitdone/bin/mid-tools.cjs init execute $PHASE)

# Parse TOON payload
BRANCH_NAME=$(echo "$PAYLOAD" | grep "branch_name" | cut -d: -f2 | tr -d ' ')
EXECUTOR_MODEL=$(echo "$PAYLOAD" | grep "executor_model" | cut -d: -f2 | tr -d ' ')
EXECUTOR=$(echo "$PAYLOAD" | grep "parallelization" | grep -q "true" && echo "parallel" || echo "serial")
```

### 3. Check State

```bash
STATE=$(mid-tools state get)

CURRENT_WAVE=$(echo "$STATE" | grep "current_wave" | cut -d: -f2)
CURRENT_PHASE=$(echo "$STATE" | grep "phase" | cut -d: -f2)

if [ "$CURRENT_PHASE" != "$PHASE" ]; then
  warn "Phase mismatch: state says $CURRENT_PHASE, executing $PHASE"
  mid-tools state set phase $PHASE
fi
```

---

## Wave Execution Loop

### 1. Extract Wave Tasks

```bash
WAVE=$CURRENT_WAVE

# Parse PLAN.md for Wave N tasks
TASKS=$(grep -A 200 "^## Wave $WAVE" "$PHASE_DIR/PLAN.md" | \
        grep "^### [0-9]" | \
        sed 's/### //' | \
        cut -d' ' -f1-2)
```

### 2. Update STATE (Wave Start)

```bash
mid-tools state set current_wave $WAVE
mid-tools state set wave_${WAVE}_start $(date -u +%s)
```

### 3. Spawn Executor

```bash
EXECUTOR_OUTPUT=$(spawn agent \
  name=mid-executor \
  model=$EXECUTOR_MODEL \
  context=$(cat << EOF
phase: $PHASE
wave: $WAVE
tasks: $TASKS
phase_dir: $PHASE_DIR
branch: $BRANCH_NAME
mode: execute
parallelization: $EXECUTOR
EOF
))
```

### 4. Parse Completion Marker

```bash
if [[ $EXECUTOR_OUTPUT == *"## WAVE COMPLETE"* ]]; then
  handle_wave_complete
elif [[ $EXECUTOR_OUTPUT == *"## BLOCKED"* ]]; then
  handle_blocked
elif [[ $EXECUTOR_OUTPUT == *"## FAILED"* ]]; then
  handle_failed
else
  error "Unexpected executor output, no completion marker"
fi
```

### 5. Wave Complete Actions

```bash
mid-tools state set wave_${WAVE}_complete true
mid-tools state set wave_${WAVE}_end $(date -u +%s)

# Check if more waves
NEXT_WAVE=$((WAVE + 1))

if grep -q "^## Wave $NEXT_WAVE" "$PHASE_DIR/PLAN.md"; then
  # More waves exist
  mid-tools state set current_wave $NEXT_WAVE
  
  echo "Wave $WAVE complete. Ready for Wave $NEXT_WAVE."
  echo "Run: /mid:do $PHASE --wave $NEXT_WAVE"
  
  output_marker "## WAVE COMPLETE"
else
  # No more waves - phase complete
  spawn mid-verifier mode=integration phase=$PHASE
  
  # After verification passes
  mid-tools state advance $PHASE
  
  output_marker "## PHASE EXECUTION COMPLETE"
fi
```

---

## Error Handling

### Blocked by User Decision

```bash
if [[ $EXECUTOR_OUTPUT == *"## BLOCKED"* ]]; then
  # Extract blocker details
  BLOCKER=$(echo "$EXECUTOR_OUTPUT" | grep -A 5 "BLOCKED")
  
  echo "$BLOCKER"
  
  ask_user "How should we proceed?"
  - "Skip this task and continue"
  - "Retry task"
  - "Stop and escalate"
  
  if [ $user_choice = "Skip" ]; then
    mark_task_skipped $task_id
    continue_wave
  fi
fi
```

### Task Failure

```bash
if [[ $EXECUTOR_OUTPUT == *"## FAILED"* ]]; then
  spawn mid-debugger with executor_output
  
  # Wait for debug report
  
  ask_user "Debugging complete. Options:"
  - "Apply suggested fix and retry"
  - "Skip task"
  - "Stop phase execution"
fi
```

### Context Exhaustion

```bash
if [ "$context_window" -lt 300000 ]; then
  error "Context too low for continuation"
  output "Current state saved in .planning/STATE.md"
  output "Resume later: /mid:do $PHASE --wave $WAVE"
fi
```

---

## Per-Wave Verification (Optional)

If `--verify` flag:

```bash
after_wave_complete:
  spawn mid-verifier \
    mode=integration \
    phase=$PHASE \
    wave=$WAVE \
    tasks=$COMPLETED_TASKS
```

---

## Anti-patterns Avoided

✓ Fresh init payload per wave (not cached)
✓ Exact completion marker checking
✓ Atomic state updates via mid-tools
✓ Spawn verifier only as quality gate
✓ Escalate on failure (don't continue blindly)
✓ Fast-fail on context < 300k
