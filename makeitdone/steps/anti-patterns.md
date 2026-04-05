# Universal Anti-patterns

Patterns to avoid across all workflows and agents.

## Reading & Context

### ❌ Full File Reads When Frontmatter Suffices

```bash
# BAD: loads 5K tokens
STATE=$(cat .planning/STATE.md)

# GOOD: loads 200 tokens (frontmatter only)
STATE_FM=$(mid-tools fm get .planning/STATE.md)
```

**Rule**: If context_window < 500k, always use frontmatter-only reads.

---

### ❌ Loading All Phases at Once

```bash
# BAD: loads 50K tokens
ALL_PHASES=$(find .planning/phases -name "PLAN.md" -exec cat {} \;)

# GOOD: load only active phase
PHASE_PLAN=$(cat .planning/phases/01-foundation/PLAN.md)
```

**Rule**: Query by phase number, never enumerate all phases.

---

### ❌ Importing All Step Fragments

```bash
# BAD: monolithic
@makeitdone/steps/*.md

# GOOD: surgical inclusion
@makeitdone/steps/init-gate.md
@makeitdone/steps/model-route.md
```

**Rule**: Only @include steps actually used in workflow.

---

## Agent Spawning

### ❌ Spawning Multiple Agents Per Wave

```bash
# BAD: context overload
spawn mid-planner
spawn mid-researcher
spawn mid-verifier
(all in same wave)

# GOOD: sequential necessity
spawn mid-executor (wave 1)
-> spawn mid-verifier (per-task)
-> next wave
```

**Rule**: Max 1 primary agent per wave. Spawn verifier only as quality gate.

---

### ❌ Passing File Contents to Agents

```bash
# BAD: bloats context
PLAN_CONTENT=$(cat .planning/phases/01/PLAN.md)
spawn mid-executor with "${PLAN_CONTENT}"

# GOOD: path-based delegation
spawn mid-executor with phase_dir=".planning/phases/01"
```

**Rule**: Pass file paths, let agents read. Exceptions: frontmatter extracts (< 500 tokens).

---

### ❌ Lazy Agents Without Guards

```bash
# BAD: always spawns
spawn mid-researcher

# GOOD: conditional
if [ "$research_required" = true ] || [ "$RESEARCH_FLAG" = true ]; then
  spawn mid-researcher
fi
```

**Rule**: Researchers are lazy-loaded. Check flags first.

---

## State Management

### ❌ Direct STATE.md Writes

```bash
# BAD: inconsistent, whitespace bloat
echo "phase: 2" >> .planning/STATE.md

# GOOD: atomic via mid-tools
mid-tools state set phase 2
mid-tools state advance 2
```

**Rule**: Never write STATE.md directly. Always use mid-tools CLI.

---

### ❌ Parsing STATE.md Manually

```bash
# BAD: brittle, breaks on format changes
PHASE=$(grep "^phase:" .planning/STATE.md | cut -d: -f2)

# GOOD: structured extraction
PHASE=$(mid-tools fm get .planning/STATE.md --field phase)
```

**Rule**: Use mid-tools for all state reads.

---

## Data Formats

### ❌ JSON in Context

```bash
# BAD: 40% more tokens
echo '{"phase":1,"tasks":["a","b"]}'

# GOOD: TOON compression
mid-tools toon <(echo '{"phase":1,"tasks":["a","b"]}')
```

**Rule**: All JSON payloads → TOON conversion. Output TOON, not JSON.

---

### ❌ Verbose Task Descriptions

```markdown
# BAD: 20 lines per task
### 01-01 Implement Auth Module
This task involves building an authentication system using JWT tokens.
We need to support login, logout, token refresh, and logout-all operations.
The implementation should use industry best practices including:
- Secure token storage
- HTTPS-only cookies
- Rate limiting
...

# GOOD: 5 lines per task
### 01-01 Implement JWT auth (login, refresh, logout)
User stories: US-001, US-002
Tests: auth.test.ts
Acceptance: login works, tokens refreshed, logout clears
```

**Rule**: PLAN.md max 150 lines. Tasks max 10-12 lines each.

---

## Error Handling

### ❌ Silent Failures

```bash
# BAD: fails silently
node ~/.claude/makeitdone/bin/mid-tools.cjs state set phase 2 || true

# GOOD: explicit error handling
if ! node ~/.claude/makeitdone/bin/mid-tools.cjs state set phase 2; then
  error "Failed to advance phase"
  escalate_to_user
fi
```

**Rule**: All critical operations must check exit codes and escalate on failure.

---

### ❌ Ignoring Context Exhaustion

```bash
# BAD: crashes when context < 500k
STATE=$(cat .planning/STATE.md)  # fails silently

# GOOD: context-aware fallback
if [ "$context_window" -lt 500000 ]; then
  STATE=$(mid-tools fm get .planning/STATE.md)
else
  STATE=$(cat .planning/STATE.md)
fi
```

**Rule**: Always check context_window and degrade gracefully.

---

## Workflow Structure

### ❌ Monolithic Workflows

```markdown
# BAD: one 50KB workflow
## Init Gate
## Model Routing
## Executor Spawn
## Verification
## State Update
## Report Generation
...all in one file
```

**Rule**: One workflow = one responsibility. Max 10-15KB per file.

---

### ❌ Unclear Completion Markers

```markdown
# BAD: multiple possible outputs
"execution done"
"all tasks complete"
"FINISHED"
"ready for next"
```

**Rule**: Exact markers only. See agent-contracts.md.

---

## Performance

### ❌ N+1 Grep Queries

```bash
# BAD: 10 separate greps
grep "pattern1" .
grep "pattern2" .
grep "pattern3" .
...

# GOOD: single batched grep
grep "pattern1|pattern2|pattern3" .
```

**Rule**: Batch patterns when possible. Grep is ~100 tokens, accumulates fast.

---

### ❌ Polling Loops

```bash
# BAD: spins waiting
while [ ! -f .planning/STATE.md ]; do
  sleep 1
done

# GOOD: immediate check or delegation
if [ ! -f .planning/STATE.md ]; then
  error "STATE.md not found"
fi
```

**Rule**: No sleep loops. Check once, escalate if needed.

---

## Summary

**Golden Rules:**

1. **Frontmatter-first** when context < 500k
2. **Path-based** delegation to agents
3. **mid-tools** for all state operations
4. **TOON** for all JSON output
5. **Selective @include** for steps
6. **Exact markers** for agent completion
7. **Context guard** every workflow
8. **Fast-fail** on errors (escalate immediately)
