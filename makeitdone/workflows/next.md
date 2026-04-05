# Next Phase Workflow

Move to next phase after current phase verification passes.

**Token budget**: ~6K (state reads + verification spawn)

---

## Context Setup

@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/state-read.md

---

## Execution

### 1. Check Current Phase State

```bash
STATE=$(mid-tools state get)
CURRENT_PHASE=$(echo "$STATE" | grep "^phase:" | cut -d: -f2 | tr -d ' ')
PHASE_COMPLETE=$(echo "$STATE" | grep "phase_complete:" | cut -d: -f2 | tr -d ' ')

if [ "$PHASE_COMPLETE" != "true" ]; then
  error "Phase $CURRENT_PHASE not marked complete"
  output "Run /mid:verify --mode audit --phase $CURRENT_PHASE first"
fi
```

### 2. Verify All Waves Complete

```bash
PHASE_DIR=".planning/phases/$(printf '%02d' $CURRENT_PHASE)-*"

# Extract max wave number from PLAN.md
MAX_WAVE=$(grep "^## Wave" "$PHASE_DIR/PLAN.md" | tail -1 | grep -o "[0-9]")

for wave in $(seq 1 $MAX_WAVE); do
  WAVE_COMPLETE=$(echo "$STATE" | grep "wave_${wave}_complete" | cut -d: -f2)
  if [ "$WAVE_COMPLETE" != "true" ]; then
    error "Wave $wave not complete"
  fi
done
```

### 3. Calculate Next Phase

```bash
NEXT_PHASE=$((CURRENT_PHASE + 1))

# Check if next phase exists in roadmap
if ! grep -q "^## $(printf '%02d' $NEXT_PHASE)" .planning/ROADMAP.md; then
  output "All phases complete! Project done."
  output "Final report: /mid:report"
  exit 0
fi
```

### 4. Update State

```bash
mid-tools state set phase $NEXT_PHASE
mid-tools state set current_wave 1
mid-tools state set phase_start_time $(date -u +%s)

# Clear wave tracking for new phase
for wave in 1 2 3 4 5; do
  mid-tools state set wave_${wave}_complete false || true
done
```

### 5. Create PLAN.md Stub for Next Phase

If PLAN.md doesn't exist for next phase:

```bash
NEXT_DIR=".planning/phases/$(printf '%02d' $NEXT_PHASE)-*"

if [ ! -f "$NEXT_DIR/PLAN.md" ]; then
  cp ~/.claude/makeitdone/templates/plan.md "$NEXT_DIR/PLAN.md"
  output "Created PLAN.md stub for Phase $NEXT_PHASE"
  output "Next: /mid:plan --mode phase --phase $NEXT_PHASE"
fi
```

### 6. Success Output

```
## PHASE TRANSITION COMPLETE

Previous phase: $CURRENT_PHASE ✅
Current phase: $NEXT_PHASE (ready)

Status: Waiting for /mid:plan --mode phase --phase $NEXT_PHASE

To start execution: /mid:do $NEXT_PHASE
```

---

## Error Handling

- **Current phase not marked complete**: Fail, guide to `/mid:verify`
- **Waves not complete**: Fail, guide to `/mid:do`
- **No next phase in roadmap**: Success, output final report option
- **PLAN.md creation fails**: Warn, ask user to create manually

---

## Anti-patterns Avoided

✓ Fast-fail on state inconsistency
✓ Atomic state updates (no partial updates)
✓ Clear next steps for user
