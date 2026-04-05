# Quick Task Execution Workflow

Ad-hoc task execution without full phase structure. Useful for out-of-band work.

**Token budget**: ~12K (direct executor spawn, no wave structure)

---

## Context Setup

@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/model-route.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/agent-contracts.md

---

## Execution

### 1. Parse Task Description

```bash
TASK_DESC="$ARGUMENTS"

if [ -z "$TASK_DESC" ]; then
  error "Usage: /mid:quick '<task description>'"
  exit 1
fi
```

### 2. Route Model

```bash
context_window=$(mid-tools config get context_window)
model_profile=$(mid-tools config get model_profile)

if [ "$context_window" -lt 500000 ]; then
  # Degrade to haiku
  EXECUTOR_MODEL=haiku
  output "warn: Low context, using haiku"
else
  # Use profile routing
  case "$model_profile" in
    budget) EXECUTOR_MODEL=haiku ;;
    balanced) EXECUTOR_MODEL=sonnet ;;
    quality) EXECUTOR_MODEL=opus ;;
  esac
fi
```

### 3. Spawn Executor (Direct)

```bash
EXECUTOR_OUTPUT=$(spawn agent \
  name=mid-executor \
  model=$EXECUTOR_MODEL \
  context=$(cat << EOF
mode: quick
task: $TASK_DESC
interactive: $([ "$INTERACTIVE_FLAG" = true ] && echo "true" || echo "false")
EOF
))
```

### 4. Parse Output

```bash
if [[ $EXECUTOR_OUTPUT == *"## WAVE COMPLETE"* ]] || \
   [[ $EXECUTOR_OUTPUT == *"completed"* ]]; then
  output "## TASK COMPLETE"
  
  # Extract results
  RESULTS=$(echo "$EXECUTOR_OUTPUT" | grep -A 10 "Results:")
  echo "$RESULTS"
  
  if [ "$VERIFY_FLAG" = true ]; then
    # Quick verification
    spawn mid-verifier mode=integration
  fi
  
elif [[ $EXECUTOR_OUTPUT == *"## BLOCKED"* ]]; then
  output "## TASK BLOCKED"
  
  # Show blocker
  BLOCKER=$(echo "$EXECUTOR_OUTPUT" | grep -A 5 "BLOCKED")
  echo "$BLOCKER"
  
  ask_user "How to proceed?"
  
else
  output "## TASK FAILED"
  ask_user "Debug or skip?"
fi
```

### 5. Update STATE (Optional)

If task is part of current phase:

```bash
if [ "$UPDATE_STATE" = true ]; then
  mid-tools state set last_quick_task "$TASK_DESC"
  mid-tools state set last_quick_time $(date -u +%s)
fi
```

---

## Usage Examples

```bash
# Simple task
/mid:quick "Write unit tests for auth module"

# With verification
/mid:quick "Refactor login endpoint" --verify

# Interactive (ask questions)
/mid:quick "Design database schema" --interactive

# Don't update state
/mid:quick "Review code in PR" --no-state-update
```

---

## Key Differences from /mid:do

| Aspect | /mid:do | /mid:quick |
|--------|---------|-----------|
| **Scope** | Full phase execution | Single task |
| **Structure** | PLAN.md + waves | Task description only |
| **State** | Full tracking | Optional |
| **Verification** | Per-wave gates | Optional |
| **Time budget** | Hours | 30 minutes max |

---

## Error Handling

- **No task description**: Show usage error
- **Blocked task**: Escalate to user
- **Context too low**: Fail with suggestion to run `/mid:status`
- **Task too complex**: Suggest using `/mid:plan` + `/mid:do`

---

## Anti-patterns Avoided

✓ Lightweight (direct executor spawn)
✓ No wave structure (simpler context)
✓ Optional state updates (don't force tracking)
✓ Time-boxed execution
