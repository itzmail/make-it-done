# makeitdone — Token-Optimized Skill Orchestration Framework

A lightweight, token-efficient project orchestration framework for Claude Code. Build and execute projects in phases using wave-based parallelization with built-in token optimization (~40% savings via TOON).

## Features

- **Phase-based execution**: Organize work into discrete, milestoned phases
- **Wave parallelization**: Run independent tasks in parallel within phases
- **Token optimized**: All JSON payloads → TOON (40% token reduction)
- **Quality gates**: Automated verification against acceptance criteria
- **Model routing**: Haiku/Sonnet/Opus selection based on task complexity
- **Context awareness**: Graceful degradation when context window is low
- **Lean agents**: 5 consolidated agents vs 21 in GSD v1 (76% fewer definitions)
- **Selective injection**: Workflows only load step fragments they need

## Quick Start

### 1. Install

```bash
# Global installation
node bin/install.js --global

# Local project installation
node bin/install.js --local
```

Installs to:
- `~/.claude/commands/mid/` — 10 command stubs
- `~/.claude/agents/` — 5 agent definitions
- `~/.claude/makeitdone/` — framework files + mid-tools utility

### 2. Initialize a Project

```
/mid:init
```

Answers 5 questions:
- Project name
- Description
- Team size
- Timeline estimate
- Tech stack

Creates `.planning/` directory with:
- `PROJECT.md` — project spec
- `REQUIREMENTS.md` — functional/non-functional requirements
- `ROADMAP.md` — phase breakdown
- `STATE.md` — execution state (< 100 lines always)
- `config.json` — model profile, context window

### 3. Create Roadmap

```
/mid:plan --mode roadmap
```

Uses mid-planner agent to generate `ROADMAP.md` from PROJECT.md + REQUIREMENTS.md.

### 4. Plan First Phase

```
/mid:plan --mode phase --phase 1
```

Creates `.planning/phases/01-name/PLAN.md` with:
- Tasks broken into waves (parallelizable chunks)
- Acceptance criteria
- Estimated hours

### 5. Execute Phase

```
/mid:do 1
```

Spawns mid-executor agent to:
- Execute each wave of tasks
- Call mid-verifier for per-task validation
- Update `.planning/STATE.md` atomically
- Handle blockers and failures

### 6. Verify & Move Forward

```
/mid:verify --phase 1 --mode audit
/mid:next
```

Verify against acceptance criteria, then transition to next phase.

## Commands

| Command | Purpose |
|---------|---------|
| `/mid:init` | Initialize new makeitdone project |
| `/mid:plan` | Create/update roadmaps and phase plans |
| `/mid:do` | Execute phase with wave-based parallelization |
| `/mid:next` | Move to next phase (after verification) |
| `/mid:verify` | Quality gates (integration, security, UI, audit modes) |
| `/mid:status` | Show project status and progress |
| `/mid:report` | Generate comprehensive project report |
| `/mid:debug` | Diagnose phase execution issues |
| `/mid:quick` | Quick task execution (ad-hoc work) |
| `/mid:help` | Command reference |

## Architecture

### Commands (thin stubs, ~300 bytes)

```markdown
---
name: mid:do
description: Execute phase plans
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, Agent
---

@~/.claude/makeitdone/workflows/execute.md
```

Commands are thin delegators that reference workflows via `@path` context injection.

### Agents (5 consolidated)

| Agent | Purpose | Model |
|-------|---------|-------|
| **mid-executor** | Wave execution, task coordination | sonnet/haiku (routed) |
| **mid-planner** | Roadmaps, phase plans, gap closure | sonnet/haiku |
| **mid-researcher** | Codebase/project context analysis | haiku (lazy-loaded) |
| **mid-verifier** | Quality gates (integration, security, UI) | haiku (read-only) |
| **mid-debugger** | Root cause analysis, unblocking | sonnet |

### Workflows (9 orchestration files)

- **init.md** — Project initialization with template population
- **plan.md** — Roadmap and phase plan creation (with optional research gate)
- **execute.md** — Wave-based execution with atomic state updates
- **verify.md** — Quality gates and acceptance criteria validation
- **next.md** — Phase transition and state advancement
- **status.md** — Real-time project status (text/JSON/TOON formats)
- **report.md** — Comprehensive project report generation
- **debug.md** — Issue diagnosis and unblocking
- **quick.md** — Ad-hoc task execution without full phase structure

### Step Fragments (6 reusable patterns)

- **init-gate.md** — Initialization payload pattern (fresh context per run)
- **state-read.md** — State.md reading with context window guard
- **model-route.md** — Model selection based on profile + context
- **context-budget.md** — Budget guidelines for all workflows
- **agent-contracts.md** — Agent completion markers (strict contracts)
- **anti-patterns.md** — 15+ patterns to avoid (universal constraints)

### Templates (6 project files)

- **project.md** — Vision, goals, scope, constraints
- **requirements.md** — User stories, features, acceptance criteria
- **roadmap.md** — Phase breakdown with milestones
- **state.md** — Execution state frontmatter (< 100 lines)
- **plan.md** — Task decomposition into waves (< 150 lines)
- **summary.md** — Phase completion summary (< 80 lines)

## Token Optimization (Built-in)

### 1. TOON Native Output
All mid-tools outputs use TOON (Token-Oriented Object Notation):
```bash
mid-tools init execute 1        # Returns TOON (not JSON)
mid-tools state get             # Returns TOON (not JSON)
```

**Savings**: ~40% fewer tokens per JSON payload

### 2. Selective Step Injection

Workflows only `@include` steps they need:
```markdown
# Good (surgical)
@~/.claude/makeitdone/steps/init-gate.md
@~/.claude/makeitdone/steps/model-route.md

# Bad (monolithic)
@~/.claude/makeitdone/steps/*.md
```

### 3. Frontmatter-First Reads

When context < 500k tokens, read only frontmatter:
```bash
# Saves 5K+ tokens vs full STATE.md
mid-tools fm get .planning/STATE.md
```

### 4. Lazy Research Gate

mid-researcher only spawned with `--research` flag:
```bash
/mid:plan --mode phase --phase 1           # No research
/mid:plan --mode phase --phase 1 --research # With research
```

### 5. Model Routing

Select models by profile + context:
```json
{
  "model_profile": "balanced",     // Use Sonnet for execution
  "context_window": 500000
}
```

### 6. Agent Consolidation

5 agents replace 21 from GSD v1:
- 76% fewer agent definitions to load
- Fewer file reads, lower token overhead
- Focused responsibilities per agent

### 7. Context Tier System

Workflows degrade gracefully:

| Context | Tier | Behavior |
|---------|------|----------|
| < 300k | POOR | Read-only, no agents |
| 300-500k | DEGRADING | Haiku only, frontmatter reads |
| 500k-1M | GOOD | Normal operation |
| > 1M | PEAK | All features enabled |

## Project File Structure

After `/mid:init`:

```
project-root/
├── CLAUDE.md              # Project-specific directives
├── .planning/
│   ├── PROJECT.md         # Vision & goals
│   ├── REQUIREMENTS.md    # Features & acceptance criteria
│   ├── ROADMAP.md         # Phase breakdown
│   ├── STATE.md           # Execution state (< 100 lines)
│   ├── config.json        # Model profile, context window
│   └── phases/
│       ├── 01-foundation/
│       │   ├── PLAN.md         # Wave task list
│       │   ├── SUMMARY.md      # Completion results
│       │   └── research.md     # Optional research findings
│       ├── 02-core-features/
│       └── ...
└── (project code here)
```

## Configuration

`.planning/config.json`:

```json
{
  "project_name": "My Project",
  "description": "Brief description",
  "model_profile": "balanced",
  "context_window": 200000,
  "team_size": 1,
  "created": "2026-04-05"
}
```

### Model Profiles

- **budget**: Haiku for all work (token-constrained)
- **balanced**: Sonnet for executor, Haiku for verifier (default)
- **quality**: Opus for executor, Sonnet for verifier (complex design)

## Utilities

### mid-tools.cjs (63KB bundled)

TOON conversion + project utilities:

```bash
# JSON ↔ TOON conversion
node ~/.claude/makeitdone/bin/mid-tools.cjs toon file.json
echo '{}' | node ~/.claude/makeitdone/bin/mid-tools.cjs toon -

# Workflow init payload (returns TOON)
node ~/.claude/makeitdone/bin/mid-tools.cjs init execute 1

# State operations
node ~/.claude/makeitdone/bin/mid-tools.cjs state get           # Read as TOON
node ~/.claude/makeitdone/bin/mid-tools.cjs state set phase 2   # Atomic update
node ~/.claude/makeitdone/bin/mid-tools.cjs state advance 2     # Phase complete

# Frontmatter extraction
node ~/.claude/makeitdone/bin/mid-tools.cjs fm get .planning/STATE.md

# Roadmap queries
node ~/.claude/makeitdone/bin/mid-tools.cjs roadmap phases
node ~/.claude/makeitdone/bin/mid-tools.cjs roadmap current

# Config management
node ~/.claude/makeitdone/bin/mid-tools.cjs config get context_window
node ~/.claude/makeitdone/bin/mid-tools.cjs config set model_profile balanced
```

## Examples

### Example: Simple 2-Phase Project

```bash
# 1. Init
/mid:init
> Project name: "My API"
> Description: "REST API for todo app"
> Timeline: 2 weeks
> Tech: Node.js + Express + PostgreSQL

# 2. Plan roadmap
/mid:plan --mode roadmap
# Creates ROADMAP.md with 2 phases

# 3. Plan phase 1
/mid:plan --mode phase --phase 1
# Creates PLAN.md with setup tasks, auth, database

# 4. Execute phase 1
/mid:do 1
# Executor runs Wave 1 (setup, db schema, auth)
# Verifier checks per-task completion
# Updates STATE.md atomically

# 5. Check status
/mid:status
# Phase: 1/2
# Wave: 1/2
# Time: 4h 23m

# 6. Move to phase 2
/mid:verify --phase 1 --mode audit
/mid:next

# 7. Execute phase 2
/mid:do 2
# Executor runs core features (API endpoints)

# 8. Final report
/mid:report
# Generates REPORT_*.md with metrics
```

## Best Practices

1. **Keep STATE.md < 100 lines** — Use mid-tools for updates
2. **Keep PLAN.md < 150 lines** — Split into waves, not mega-plans
3. **Task estimation** — Break into 30-90 minute chunks
4. **Waves** — Max 10 tasks per wave for parallelization
5. **Acceptance criteria** — Be explicit (tests, coverage, security)
6. **Context awareness** — Check `/mid:status` before resource-heavy operations
7. **Research gate** — Only use `--research` if actually needed

## Limitations & Known Issues

- Framework assumes Claude Code environment (RTK for shell output compression)
- Parallelization within waves is logical (not actual parallel execution)
- mid-tools requires Node.js 18+ and @toon-format/toon package
- Large codebases (> 10k files) may need mid-researcher with custom grep patterns

## References

- **GSD v1**: Inspiration for phase-based execution, quality gates, agent patterns
- **TOON**: Token-Oriented Object Notation for ~40% token compression
- **RTK**: Rust Token Killer for shell output compression (separate CLI)

## Contributing

This is a Claude Code skill framework. Improvements welcome:
- Optimize step fragments for lower token overhead
- Add new workflow patterns
- Extend agent capabilities
- Improve TOON encoding strategies

## License

MIT — Use freely in your Claude Code projects.

---

**Token Savings Example**:
- Typical project: 5 phases, 40 tasks, 2 weeks runtime
- With makeitdone: ~150K tokens (with TOON + selective injection)
- Without optimization: ~250K tokens (full JSON, all steps loaded)
- **Savings**: ~40% of orchestration overhead

*Built with token optimization as the primary design constraint.*
