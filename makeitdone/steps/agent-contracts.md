# Agent Completion Contracts

Strict contract definitions. Workflows MUST check for these exact markers.

## mid-executor

**Completion Markers:**
```
## WAVE COMPLETE
## PHASE EXECUTION FAILED
## BLOCKED - USER INPUT NEEDED
## ALL WAVES COMPLETE
```

**Contract:**
- Executes one complete wave (all tasks in wave)
- Updates STATE.md via mid-tools after each task
- Spawns mid-verifier for per-task validation
- Returns exact completion marker + blockers list
- Never continues if task fails (unless --skip-failed flag)

**Output Format:**
```
## WAVE COMPLETE

Completed tasks: 3/3
Wave runtime: 12m
State updated: wave_1_complete = true

Next: Run mid:do 1 --wave 2
```

---

## mid-planner

**Completion Markers:**
```
## ROADMAP CREATED
## PHASE PLAN CREATED
## GAP PLANS CREATED
## PLAN VALIDATION PASSED
## PLAN VALIDATION FAILED
```

**Contract:**
- Creates file(s) in .planning/ directory
- Respects size limits (PLAN.md < 150 lines)
- Returns completion marker + file path(s)
- Includes acceptance criteria in plan
- Validates against previous phase (dependencies)

**Output Format:**
```
## PHASE PLAN CREATED

File: .planning/phases/01-foundation/PLAN.md
Tasks: 5 (1 wave)
Estimated: 6-8 hours
Acceptance: 8 criteria

Next: Review with /mid:plan --mode check --phase 1
```

---

## mid-researcher

**Completion Markers:**
```
## RESEARCH COMPLETE
## RESEARCH PARTIAL (context limit)
## RESEARCH FAILED
```

**Contract:**
- Creates research.md in phase directory
- Respects context_window limits
- Returns marker + summary (20-50 lines max)
- Partial research includes "(PARTIAL)" in marker and lists stopped-at section
- Failed research includes error reason

**Output Format:**
```
## RESEARCH COMPLETE

File: .planning/phases/01-foundation/research.md
Coverage: 8 areas
Lines: 45/150

Key findings:
- [fact 1]
- [fact 2]
```

---

## mid-verifier

**Completion Markers:**
```
## VERIFICATION PASSED
## VERIFICATION FAILED - <reason>
## VERIFICATION INCOMPLETE
```

**Contract:**
- Checks against ACCEPTANCE.md criteria
- Returns marker + pass/fail per criterion
- Fast-fails on critical blockers
- Returns blockers list with remediation steps
- Never modifies code (read-only)

**Output Format:**
```
## VERIFICATION PASSED

Criteria passed: 8/8
Coverage: 100%
Duration: 2m

Status: Phase 1 ready for /mid:next
```

---

## mid-debugger

**Completion Markers:**
```
## DEBUG COMPLETE - <action>
## ROOT CAUSE: <identified issue>
## ESCALATION NEEDED - <reason>
```

**Contract:**
- Identifies root cause of error/blocker
- Returns diagnostic report (20-40 lines max)
- Suggests specific fix or escalation path
- Never attempts to fix (only diagnose)
- Respects ~5 min time budget

**Output Format:**
```
## ROOT CAUSE: Missing environment variable

Error: TypeError: Cannot read property 'apiKey' of undefined
File: src/api/client.ts:23

Finding: process.env.API_KEY not loaded from .env

Action: Add API_KEY to .env.example, load in config.ts

Next: Run /mid:do 1 --rerun-task 3-2
```

---

## Verification Pattern (in Workflows)

Always check for completion marker:

```bash
# Spawn agent
AGENT_OUTPUT=$(... spawn mid-executor ...)

# Parse completion marker
if [[ $AGENT_OUTPUT == *"## WAVE COMPLETE"* ]]; then
  handle_wave_complete
elif [[ $AGENT_OUTPUT == *"## BLOCKED"* ]]; then
  handle_blocked
elif [[ $AGENT_OUTPUT == *"## FAILED"* ]]; then
  handle_failed
else
  error "Unexpected output, no completion marker"
fi
```

## Anti-patterns

- Checking for partial strings ("complete" instead of "## WAVE COMPLETE")
- Ignoring "FAILED" markers (must escalate)
- Assuming marker presence without verification (use explicit check)
- Parsing agent output besides marker (markers are contract boundary)
