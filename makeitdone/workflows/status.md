# Status Workflow

Show current project status and phase progress.

**Token budget**: ~4K (frontmatter reads only)

---

## Context Setup

@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/state-read.md

---

## Execution

### 1. Load State

```bash
context_window=$(mid-tools config get context_window)

if [ "$context_window" -lt 500000 ]; then
  STATE=$(mid-tools fm get .planning/STATE.md)
else
  STATE=$(mid-tools state get)
fi
```

### 2. Extract Metrics

```bash
PHASE=$(echo "$STATE" | grep "^phase:" | cut -d: -f2 | tr -d ' ')
CURRENT_WAVE=$(echo "$STATE" | grep "^current_wave:" | cut -d: -f2 | tr -d ' ')
PHASE_START=$(echo "$STATE" | grep "phase_start_time:" | cut -d: -f2 | tr -d ' ')

# Calculate elapsed time
ELAPSED=$(($(date +%s) - $PHASE_START))
ELAPSED_HOURS=$(($ELAPSED / 3600))
ELAPSED_MINS=$((($ELAPSED % 3600) / 60))
```

### 3. Load Roadmap (frontmatter)

```bash
ROADMAP_FM=$(mid-tools fm get .planning/ROADMAP.md)
TOTAL_PHASES=$(echo "$ROADMAP_FM" | grep -c "^## [0-9]")
```

### 4. Load Plan Progress

```bash
PHASE_DIR=".planning/phases/$(printf '%02d' $PHASE)-*"

if [ -f "$PHASE_DIR/PLAN.md" ]; then
  PLAN_FM=$(mid-tools fm get "$PHASE_DIR/PLAN.md")
  TOTAL_TASKS=$(echo "$PLAN_FM" | grep "^tasks:" | cut -d: -f2)
  TOTAL_WAVES=$(echo "$PLAN_FM" | grep "^waves:" | cut -d: -f2)
fi
```

### 5. Format Output

Text format (default):

```
╔════════════════════════════════════╗
║   makeitdone Project Status        ║
╚════════════════════════════════════╝

Project: [from config.json]
Phase: $PHASE / $TOTAL_PHASES
Wave: $CURRENT_WAVE / $TOTAL_WAVES

Tasks: [count completed] / $TOTAL_TASKS
Time: ${ELAPSED_HOURS}h ${ELAPSED_MINS}m

Recent Updates:
- [from STATE.md notes]

Next: /mid:do $PHASE --wave $CURRENT_WAVE
```

JSON format (--format json):

```json
{
  "phase": $PHASE,
  "total_phases": $TOTAL_PHASES,
  "wave": $CURRENT_WAVE,
  "total_waves": $TOTAL_WAVES,
  "tasks_total": $TOTAL_TASKS,
  "elapsed_seconds": $ELAPSED,
  "status": "in-progress"
}
```

TOON format (--format toon):

```
phase: $PHASE
total_phases: $TOTAL_PHASES
wave: $CURRENT_WAVE
total_waves: $TOTAL_WAVES
tasks_total: $TOTAL_TASKS
elapsed_seconds: $ELAPSED
status: in-progress
```

### 6. Output Status

```
## STATUS REPORT

Phase: $PHASE / $TOTAL_PHASES (progress%)
Wave: $CURRENT_WAVE / $TOTAL_WAVES
Time: ${ELAPSED_HOURS}h ${ELAPSED_MINS}m

Next: See command above
```

---

## Error Handling

- **Missing STATE.md**: Suggest `/mid:init`
- **Missing PLAN.md**: Suggest `/mid:plan --mode phase --phase $PHASE`
- **Invalid format flag**: Default to text

---

## Anti-patterns Avoided

✓ Frontmatter-only reads (no full files)
✓ Multiple output formats (user choice)
✓ Fast calculation (no spawning agents)
