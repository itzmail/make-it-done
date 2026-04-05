# Context Budget Guidelines

Structural guidelines for all workflows to stay within token budget.

## Per-File Limits (hard constraints)

- **STATE.md**: Max 100 lines (YAML frontmatter only, no body)
- **PLAN.md**: Max 150 lines (task descriptions, no implementation)
- **SUMMARY.md**: Max 80 lines (results only, no verbose explanations)
- **PROJECT.md**: Max 200 lines (first 50 read, rest optional)
- **ROADMAP.md**: Max 100 lines (all phases must fit)

## Workflow-Level Budget

Typical workflow token distribution:

```
System prompt (workflow file): ~2-3K tokens
Agent definition (injected): ~1K tokens
Step fragments (selective @include): ~2-4K tokens
Context data (state, init payload): ~1-2K tokens
Output/completion: ~1K tokens

Total: ~7-11K tokens per workflow run
```

## Per-Agent Budget

When spawning agent:

```
Agent definition: ~1K tokens
Agent context (task, findings): ~2-4K tokens
Agent output: ~3-5K tokens

Total agent spawn: ~6-10K tokens
```

Max 3 agent spawns per workflow (18-30K tokens).

## Token Optimization Strategies

### 1. Selective @include of Steps

Instead of importing all steps, only include needed ones:

```
# Good: surgical inclusion
@~/makeitdone/steps/init-gate.md
@~/makeitdone/steps/model-route.md

# Bad: monolithic inclusion
@~/makeitdone/steps/*.md
```

### 2. Lazy Agent Spawning

Default: no agents unless necessary.

```
if research_required or --research flag:
  spawn mid-researcher
else:
  skip

if verification_needed:
  spawn mid-verifier
else:
  skip
```

### 3. Frontmatter-First Reads

Always check context_window:

```
if context_window < 500k:
  use: mid-tools fm get <file> --field <specific>
else:
  use: normal Read
```

### 4. Batch Grep Queries

Instead of N separate grep calls:

```
# Bad: 10 separate greps
grep "pattern1" ...
grep "pattern2" ...
grep "pattern3" ...

# Good: single grep with alternation
grep "pattern1|pattern2|pattern3" ...
```

### 5. Pass Paths, Not Contents

When delegating to agent:

```
# Good: path-based
task: "Review PLAN.md at .planning/phases/01/PLAN.md"

# Bad: content-based
task: "Review this plan: [full 150-line PLAN.md content]"
```

## Context Tier Actions

### POOR (< 300k)

- Frontmatter-only reads
- No agent spawning
- Return error: "Context too low for this workflow"

### DEGRADING (300-500k)

- Frontmatter-only reads
- Single agent max (critical path only)
- Skip optional research
- Use haiku exclusively

### GOOD (500k-1M)

- Full reads enabled
- Up to 3 agents
- Model routing by profile
- Research optional

### PEAK (> 1M)

- All features enabled
- Full parallelization
- Multiple agents
- Synthesis work enabled

## Budget Worksheet (for phase plan creators)

When creating PLAN.md, estimate waves:

```
Rough formula:
- Each wave: ~5-10 tasks
- Each task: ~10-15 lines in PLAN.md
- Max PLAN.md: 150 lines

If tasks > 10, split into 2+ waves
If PLAN.md approaches 150 lines, create secondary phase plan
```

## Anti-patterns

- Loading all documentation at once (use frontmatter)
- Reading files when context_window < 500k (use mid-tools fm)
- Creating large context data structures (use TOON, not JSON)
- Spawning multiple agents per wave (1 executor, 1 verifier max)
