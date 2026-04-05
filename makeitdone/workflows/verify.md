# Verify Phase Workflow

Quality gate for phase completion. Validates against acceptance criteria.

**Token budget**: ~8K (read-only work, haiku agents)

---

## Context Setup

@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/state-read.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/model-route.md

---

## Modes

- `--mode integration` — test coordination, file presence, contracts
- `--mode security` — OWASP checks, auth patterns, secret scanning
- `--mode ui` — visual validation checkpoints
- `--mode audit` — full verification (all three)

---

## Initialization

### 1. Load Phase

```bash
PHASE=${phase_arg}
PHASE_DIR=".planning/phases/$(printf '%02d' $PHASE)-*"

if [ ! -f "$PHASE_DIR/PLAN.md" ] || [ ! -f ".planning/REQUIREMENTS.md" ]; then
  error "Phase or requirements not found"
fi
```

### 2. Check Acceptance Criteria

```bash
ACCEPTANCE=$(mid-tools fm get ".planning/REQUIREMENTS.md" --field "acceptance_criteria" || \
             mid-tools fm get "$PHASE_DIR/PLAN.md" --field "acceptance_criteria")

if [ -z "$ACCEPTANCE" ]; then
  warn "No acceptance criteria found, skipping verification"
  exit 0
fi
```

---

## Execution (Integration Mode)

### 1. Spawn Verifier

```bash
VERIFIER_OUTPUT=$(spawn agent \
  name=mid-verifier \
  model=haiku \
  context=$(cat << EOF
mode: integration
phase: $PHASE
acceptance_criteria: $ACCEPTANCE
phase_dir: $PHASE_DIR
EOF
))
```

### 2. Parse Result

```bash
if [[ $VERIFIER_OUTPUT == *"## VERIFICATION PASSED"* ]]; then
  output_marker "## VERIFICATION PASSED"
  exit 0
elif [[ $VERIFIER_OUTPUT == *"## VERIFICATION FAILED"* ]]; then
  # Extract blocker reasons
  BLOCKERS=$(echo "$VERIFIER_OUTPUT" | grep -A 10 "FAILED")
  echo "$BLOCKERS"
  output_marker "## VERIFICATION FAILED"
  ask_user "Fix blockers and retry? /mid:verify --phase $PHASE"
else
  output_marker "## VERIFICATION INCOMPLETE"
fi
```

---

## Execution (Security Mode)

```bash
VERIFIER_OUTPUT=$(spawn agent \
  name=mid-verifier \
  model=haiku \
  context=$(cat << EOF
mode: security
phase: $PHASE
phase_dir: $PHASE_DIR
EOF
))
```

Parse same as integration mode. Typical blockers:
- Hardcoded secrets
- Missing auth checks
- Vulnerable dependencies
- SQL injection patterns

---

## Execution (Audit Mode)

Runs all three modes sequentially:

```bash
for mode in integration security ui; do
  spawn mid-verifier mode=$mode phase=$PHASE
  
  if result contains "FAILED"; then
    accumulate_blockers
  fi
done

if [ ${#blockers[@]} -eq 0 ]; then
  output_marker "## VERIFICATION PASSED"
  mid-tools state advance $PHASE
else
  output_marker "## VERIFICATION FAILED - $BLOCKER_COUNT issues"
fi
```

---

## Success Path

```
## VERIFICATION PASSED

Criteria: 8/8 ✅
Duration: 3m
Phase: Ready for /mid:next
```

---

## Failure Path

```
## VERIFICATION FAILED - Security issues

Blockers:
1. Hardcoded API key in .env.example (line 5)
   Fix: Move to .env, add to .gitignore
   
2. Missing CSRF token on POST /user (route.ts:42)
   Fix: Add csrf middleware

Action: Apply fixes, then /mid:verify --phase 1
```

---

## Error Handling

- **No acceptance criteria**: Warn, skip verification
- **Verifier timeout**: Partial results OK, user can retry
- **Verification incomplete**: Mark as incomplete, ask for review
- **Critical blocker**: Escalate to user

---

## Anti-patterns Avoided

✓ Read-only work (haiku agents only)
✓ Frontmatter-only reads (context budget)
✓ Exact completion marker checking
✓ Fast-fail on critical blockers
✓ No attempt to fix (diagnose + escalate)
