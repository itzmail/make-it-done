---
name: mid:help
description: Show makeitdone help and command reference
argument-hint: "[command]"
allowed-tools:
  - Read
---

# makeitdone Help

## Available Commands

| Command | Purpose |
|---------|---------|
| `/mid:init` | Initialize a new makeitdone project |
| `/mid:plan` | Create or update roadmap and phase plans |
| `/mid:do` | Execute phase plans with parallelization |
| `/mid:next` | Move to next phase and verify completion |
| `/mid:verify` | Verify phase against acceptance criteria |
| `/mid:status` | Show current project status |
| `/mid:report` | Generate comprehensive project report |
| `/mid:debug` | Debug phase execution issues |
| `/mid:backlog` | Manage project backlog items |
| `/mid:quick` | Quick task execution without full structure |
| `/mid:help` | Show this help (you are here) |

## Core Concepts

**Phases**: Discrete, time-boxed units of work organized by milestone. Each phase contains multiple plans.

**Plans**: Individual tasks within a phase, executed in waves for parallelization.

**State**: Lives in `.planning/STATE.md` frontmatter (< 100 lines). Tracks current phase, wave progress, completion status.

**Roadmap**: Lives in `.planning/ROADMAP.md`. Lists all phases with status and description.

**Workflows**: Large orchestration files in `~/.claude/makeitdone/workflows/` that delegate to agents and steps.

## Quick Start

```bash
# 1. Initialize project
/mid:init

# 2. Create roadmap
/mid:plan --mode roadmap

# 3. Plan first phase
/mid:plan --mode phase --phase 1

# 4. Execute phase
/mid:do 1

# 5. Check status
/mid:status

# 6. Move to next
/mid:next
```

## Configuration

Project config lives in `.planning/config.json`:
- `model_profile`: budget | balanced | quality
- `context_window`: Token budget (default 200000)
- `parallelization`: true | false

## Token Optimization

makeitdone uses **TOON** (Token-Oriented Object Notation) for all JSON payloads, achieving ~40% token reduction. All workflow and agent interactions automatically convert to TOON for maximum efficiency.

For details: `~/.claude/makeitdone/bin/mid-tools.cjs --help`

## Need More Help?

- Project spec: `.planning/PROJECT.md`
- Requirements: `.planning/REQUIREMENTS.md`
- Phase plans: `.planning/phases/{N}-*/PLAN.md`
