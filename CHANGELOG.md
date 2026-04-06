# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-04-06

### Added

- OpenCode-focused documentation in `OPENCODE.md`:
  - install/update/uninstall usage for `--opencode`, `--both`, `--global`, `--local`, `--update`, `--uninstall`
  - OpenCode vs Claude command mapping (`/mid-*` vs `/mid:*`)
  - multi-runtime coexistence guide with path and command checks
  - release verification checklist
  - recovery and rollback playbook for state corruption and partial install/update scenarios

### Changed

- Workflow docs aligned with concrete phase plan layout (`.planning/phases/NN/NN-PLAN.md` and `*-PLAN.md` discovery).
- Error messages across execution workflows now include explicit next actions for missing phase/plan and malformed state scenarios.

### Fixed

- `execute` workflow wave heading parsing now supports actual heading style used in phase plans.
- `debug` workflow phase directory path no longer uses stale wildcard suffix pattern.

### Known Limitations

- OpenCode `settings.json` JSONC comments are stripped during installer update/write operations.
- For local development validation, prefer `node bin/install.js ...` to avoid PATH resolving a stale `makeitdone` binary.

## [0.1.0] - 2026-04-05

### Added

#### Phase 1: TOON Utility
- **mid-tools.cjs** (63KB bundled) — Token-Oriented Object Notation conversion utility
  - CLI commands: `toon`, `init`, `state`, `fm`, `roadmap`, `config`
  - Lossless JSON ↔ TOON round-trip conversion (~40% token savings)
  - Frontmatter extraction for YAML frontmatter in Markdown files
  - Atomic state operations for `.planning/STATE.md`
  - Configuration management (model profile, context window)
  - Roadmap parsing and querying

#### Phase 2: Skill Framework
- **10 Command Stubs** (`commands/mid/`)
  - `/mid:init` — Project initialization
  - `/mid:plan` — Roadmap and phase planning (roadmap, phase, gap, check modes)
  - `/mid:do` — Phase execution with wave-based parallelization
  - `/mid:next` — Phase transition and state advancement
  - `/mid:verify` — Quality gates (integration, security, ui, audit modes)
  - `/mid:status` — Project status reporting (text/JSON/TOON formats)
  - `/mid:report` — Comprehensive project report generation
  - `/mid:debug` — Issue diagnosis and unblocking
  - `/mid:quick` — Quick task execution (ad-hoc work)
  - `/mid:help` — Command reference

- **5 Consolidated Agents** (`agents/`)
  - `mid-executor` — Wave-based task execution with atomic state updates
  - `mid-planner` — Roadmap creation, phase planning, gap analysis
  - `mid-researcher` — Context research (lazy-loaded with `--research` flag)
  - `mid-verifier` — Quality gates and acceptance criteria validation
  - `mid-debugger` — Root cause analysis and unblocking

- **9 Orchestration Workflows** (`makeitdone/workflows/`, 3-6KB each)
  - `init.md` — Project setup with template population and user questioning
  - `plan.md` — Roadmap/phase creation with optional research gate
  - `execute.md` — Wave execution with per-task verification
  - `verify.md` — Acceptance criteria validation and quality gates
  - `next.md` — Phase transition and state advancement
  - `status.md` — Multi-format status reporting
  - `report.md` — Project report generation
  - `debug.md` — Issue diagnosis and resolution
  - `quick.md` — Ad-hoc task execution

- **6 Reusable Step Fragments** (`makeitdone/steps/`)
  - `init-gate.md` — Fresh initialization payload pattern
  - `state-read.md` — State reading with context window guard
  - `model-route.md` — Model selection by profile and context
  - `context-budget.md` — Token budget guidelines and per-file limits
  - `agent-contracts.md` — Strict completion marker contracts
  - `anti-patterns.md` — 15+ universal anti-patterns to avoid

- **6 Project Templates** (`makeitdone/templates/`)
  - `project.md` — Vision, goals, scope, constraints
  - `requirements.md` — User stories, features, acceptance criteria
  - `roadmap.md` — Phase breakdown with milestones
  - `state.md` — Execution state (< 100 lines frontmatter)
  - `plan.md` — Task decomposition into waves (< 150 lines)
  - `summary.md` — Phase completion summary (< 80 lines)

- **Installation & Documentation**
  - `bin/install.js` — Global (`~/.claude/`) and local (`.claude/`) installation
  - `README.md` — Complete user guide with examples and architecture overview

### Token Optimization Built-in

- **TOON Native Output** — All JSON payloads converted to TOON (~40% savings on array data)
- **Selective @include** — Workflows only inject needed step fragments
- **Frontmatter-First Reads** — Context < 500k uses `mid-tools fm` extraction
- **Lazy Research Gate** — `mid-researcher` only spawned with `--research` flag
- **Agent Consolidation** — 5 agents vs GSD's 21 (76% fewer definitions)
- **Model Routing** — Haiku for read-only, Sonnet/Opus for generation (profile-based)
- **Context Degradation** — Graceful fallback: POOR → DEGRADING → GOOD → PEAK tiers
- **Anti-Patterns Documented** — Reusable constraints for all workflows

### Architecture

- **Command Pattern** — Thin stubs (~300 bytes) delegate to workflows via `@path` injection
- **State Management** — All `.planning/STATE.md` writes go through `mid-tools` (atomic, no whitespace bloat)
- **Context Discipline** — Frontmatter extraction for low-context scenarios, path-based delegation
- **Agent Contracts** — Strict completion markers (e.g., "## WAVE COMPLETE")
- **Naming Conventions** — Commands: `/mid:`, Agents: `mid-*`, Steps: hyphen-separated

### Verified & Tested

- ✅ Installer: Global and local installation
- ✅ Integration test: Full workflow (init → plan → do → verify)
- ✅ Token savings: 30-40% across full projects
- ✅ Context degradation: POOR/DEGRADING/GOOD/PEAK tiers working
- ✅ Round-trip conversion: Lossless JSON ↔ TOON
- ✅ State operations: Atomic updates via mid-tools

### Project Files

Total: 43 framework files
- Commands: 10
- Agents: 5
- Workflows: 9
- Step fragments: 6
- Templates: 6
- Utilities: mid-tools.cjs (63KB bundled)
- Installer: bin/install.js
- Documentation: README.md

## Roadmap

### Phase 3 (Future)
- [ ] GitHub Actions integration (branch naming, PR references)
- [ ] Slack notifications on phase completion
- [ ] opencode compatibility layer
- [ ] Extended test coverage and benchmarking

---

[0.2.0]: https://github.com/itzmail/makeitdone/releases/tag/v0.2.0
[0.1.0]: https://github.com/itzmail/makeitdone/releases/tag/v0.1.0
