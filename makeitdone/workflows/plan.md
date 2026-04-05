# Plan Phase Workflow

Create or update project plans with token-optimized research gate.

**Token budget**: ~10K (depends on research flag; lazy-loaded)

---

## Context Setup

@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/init-gate.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/state-read.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/model-route.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/context-budget.md

---

## Modes

- `--mode roadmap` — create ROADMAP.md from PROJECT.md + REQUIREMENTS.md
- `--mode phase --phase N` — create PLAN.md for specific phase
- `--mode gap --phase N` — identify missing requirements, create gap plan
- `--mode check --phase N` — validate plan against requirements

---

## Execution (Roadmap Mode)

### 1. Check Context

```bash
context_window=$(mid-tools config get context_window)

if [ "$context_window" -lt 300000 ]; then
  error "Context too low for roadmap planning (need > 300k)"
fi
```

### 2. Research Gate

```bash
if [ "$research_required" = true ] || [ "$RESEARCH_FLAG" = true ]; then
  spawn mid-researcher mode=project
else:
  skip research
fi
```

### 3. Spawn Planner (Roadmap)

```bash
spawn mid-planner \
  mode=roadmap \
  context=$(cat .planning/PROJECT.md | head -50) \
  requirements=$(mid-tools fm get .planning/REQUIREMENTS.md)
```

**mid-planner contract**: Must output `## ROADMAP CREATED` when complete.

### 4. Verify Output

```bash
if [ -f .planning/ROADMAP.md ] && grep -q "^## [0-9]" .planning/ROADMAP.md; then
  success "ROADMAP.md created"
else
  error "ROADMAP.md not created or invalid format"
fi
```

### 5. Update STATE.md

```bash
mid-tools state set current_phase 1
mid-tools state set status planning_complete
```

Output completion marker:

```
## PHASE PLAN CREATED

File: .planning/ROADMAP.md
Phases: 3
Status: Ready for phase-level planning

Next: Run /mid:plan --mode phase --phase 1
```

---

## Execution (Phase Mode)

### 1. Load Phase Context

```bash
PHASE=${phase_arg}
PHASE_DIR=".planning/phases/$(printf '%02d' $PHASE)-*"

if [ ! -d "$PHASE_DIR" ]; then
  error "Phase $PHASE directory not found"
fi
```

### 2. Research Gate

Only if `--research` flag:

```bash
if [ "$RESEARCH_FLAG" = true ]; then
  spawn mid-researcher mode=phase phase=$PHASE
else
  skip
fi
```

### 3. Spawn Planner (Phase)

```bash
spawn mid-planner \
  mode=phase \
  phase=$PHASE \
  requirements=$(mid-tools fm get .planning/REQUIREMENTS.md) \
  phase_context=$(mid-tools fm get "$PHASE_DIR/PLAN.md" 2>/dev/null || echo "")
```

**Expectation**: Output `## PHASE PLAN CREATED` + PLAN.md file.

### 4. Validate Plan Size

```bash
LINES=$(wc -l < "$PHASE_DIR/PLAN.md")
if [ "$LINES" -gt 150 ]; then
  warn "PLAN.md exceeds 150 lines ($LINES), may need splitting"
fi
```

### 5. Update STATE

```bash
mid-tools state set current_phase $PHASE
TASKS=$(grep -c "^### [0-9]" "$PHASE_DIR/PLAN.md")
mid-tools state set phase_${PHASE}_tasks $TASKS
```

Output:

```
## PHASE PLAN CREATED

Phase: $PHASE
Tasks: $TASKS (N waves)
File: .planning/phases/NN-name/PLAN.md

Next: Run /mid:do $PHASE to execute
```

---

## Execution (Gap Mode)

### 1. Load PLAN.md

```bash
if [ ! -f "$PHASE_DIR/PLAN.md" ]; then
  error "PLAN.md not found for phase $PHASE"
fi
```

### 2. Spawn Planner (Gap)

```bash
spawn mid-planner \
  mode=gap \
  phase=$PHASE \
  plan=$(cat "$PHASE_DIR/PLAN.md") \
  requirements=$(cat .planning/REQUIREMENTS.md)
```

### 3. Handle Output

Creates gap-closure plan file(s): `$PHASE_DIR/gap-plan-N.md`

Output:

```
## GAP PLANS CREATED

Gaps found: N
Plans: gap-plan-1.md, gap-plan-2.md

Next: Review gaps, then /mid:do $PHASE --include-gaps
```

---

## Execution (Check Mode)

### 1. Spawn Planner (Check)

```bash
spawn mid-planner \
  mode=check \
  phase=$PHASE \
  plan=$(cat "$PHASE_DIR/PLAN.md")
```

### 2. Parse Result

If contains `## PLAN VALIDATION PASSED`:
- Success, continue
If contains `## PLAN VALIDATION FAILED`:
- Show issues, escalate to user

---

## Error Handling

- **Phase not found**: Create phase directory, ask user for phase name
- **PLAN.md invalid format**: Show format error, offer template
- **Research timeout**: Partial research OK, continue with findings
- **Planner blocked**: Escalate findings to user

---

## Anti-patterns Avoided

✓ Lazy research gate (only spawn if flagged)
✓ Frontmatter reads for context (no full files)
✓ Path-based delegation to agents
✓ Exact completion markers for verification
✓ Context guard for roadmap mode (> 300k required)
