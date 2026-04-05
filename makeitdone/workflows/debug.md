# Debug Workflow

Diagnose phase execution issues and unblock work.

**Token budget**: ~10K (mid-debugger spawn + context)

---

## Context Setup

@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/state-read.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/model-route.md

---

## Execution

### 1. Capture Context

```bash
PHASE=${phase_arg}
PLAN_SPEC=${plan_arg:-"current"}

PHASE_DIR=".planning/phases/$(printf '%02d' $PHASE)-*"

# Get error/blocker from STATE.md
LAST_ERROR=$(mid-tools fm get .planning/STATE.md --field "last_error")
BLOCKED_AT=$(mid-tools fm get .planning/STATE.md --field "blocked_task_id")
```

### 2. Check Recent Output

```bash
# Look for executor/verifier output in session context
if [ -f "$PHASE_DIR/.last_execution_output" ]; then
  ERROR_CONTEXT=$(cat "$PHASE_DIR/.last_execution_output")
else
  ERROR_CONTEXT="No recent execution output"
fi
```

### 3. Spawn Debugger

```bash
DEBUGGER_OUTPUT=$(spawn agent \
  name=mid-debugger \
  model=sonnet \
  context=$(cat << EOF
phase: $PHASE
plan_spec: $PLAN_SPEC
last_error: $LAST_ERROR
blocked_at: $BLOCKED_AT
error_context: $ERROR_CONTEXT
phase_dir: $PHASE_DIR
EOF
))
```

### 4. Parse Debugger Output

```bash
if [[ $DEBUGGER_OUTPUT == *"## ROOT CAUSE:"* ]]; then
  # Extract root cause
  ROOT_CAUSE=$(echo "$DEBUGGER_OUTPUT" | grep -A 2 "ROOT CAUSE:")
  
  output "## ROOT CAUSE IDENTIFIED"
  echo "$ROOT_CAUSE"
  
elif [[ $DEBUGGER_OUTPUT == *"## ESCALATION NEEDED"* ]]; then
  # Extract escalation reason
  REASON=$(echo "$DEBUGGER_OUTPUT" | grep -A 5 "ESCALATION NEEDED")
  
  output "## ESCALATION NEEDED"
  echo "$REASON"
  
  ask_user "Next steps?"
else
  output "## DEBUG INCOMPLETE"
fi
```

### 5. Suggest Actions

```bash
# Debugger outputs recommended action
RECOMMENDED=$(echo "$DEBUGGER_OUTPUT" | grep -A 3 "Recommended Action:")

echo "Suggested fix:"
echo "$RECOMMENDED"

ask_user "Apply fix and retry? Or escalate?"
```

### 6. Checkpoint State

```bash
# Save debug output for record
cp <(echo "$DEBUGGER_OUTPUT") "$PHASE_DIR/.debug_$(date +%s).txt"

# Update STATE
mid-tools state set last_error ""
mid-tools state set last_debug_time $(date -u +%s)
```

---

## Usage Examples

```bash
# Debug current blocked phase
/mid:debug

# Debug specific phase
/mid:debug --phase 2

# Debug specific task
/mid:debug --phase 1 --plan 01-03
```

---

## Error Handling

- **No error context**: Ask user to describe issue
- **Debugger timeout**: Partial diagnosis OK
- **Root cause unclear**: Escalate with findings

---

## Anti-patterns Avoided

✓ Single agent spawn (debugger only)
✓ Context-aware (reads recent state)
✓ Fast diagnosis (5 min budget)
✓ Escalation when needed
