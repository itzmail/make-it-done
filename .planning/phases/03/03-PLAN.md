---
phase: 3
title: Documentation & Edge Cases
status: complete
duration: 2-3 days
team_size: 1
context_window: 200000
---

# Phase 3: Documentation & Edge Cases

## Overview

Finalize OpenCode support for release by documenting setup/usage, hardening edge-case handling, and preparing changelog + distribution notes.

**Dependencies**: Phase 2 complete (validation + reports)
**Target**: 2-3 days / 4 waves / 12 tasks

---

## Acceptance Criteria

- [x] `OPENCODE.md` published with install, usage, update, uninstall, and troubleshooting
- [x] Workflow docs use correct phase path pattern (`.planning/phases/NN/NN-PLAN.md`)
- [x] Known limitations documented (including JSONC comment stripping on settings update)
- [x] Edge-case error messages are actionable and tested
- [x] Changelog updated for OpenCode release scope
- [x] Verification checklist for multi-runtime (Claude + OpenCode) documented

---

## Waves

### Wave 1: Documentation Baseline
**Goal**: Establish complete OpenCode docs from real behavior in Phase 2.

### 03-01 OPENCODE.md structure and scope
- [x] Define sections: quick start, command mapping, permissions, lifecycle commands, troubleshooting.

### 03-02 Install/update/uninstall docs
- [x] Document supported flags (`--opencode`, `--both`, `--global`, `--local`, `--update`, `--uninstall`) with examples.

### 03-03 Workflow command reference
- [x] Document `/mid-init`, `/mid-plan`, `/mid-do`, `/mid-verify`, `/mid-next`, `/mid-status`, `/mid-help`, `/mid-debug`.

**Deliverable**: Draft `OPENCODE.md` ready for technical review.

---

### Wave 2: Workflow and Edge-Case Hardening
**Goal**: Ensure workflow docs and behavior match real repository structure.

### 03-04 Phase path consistency audit
- [x] Audit all workflow docs for stale wildcard phase-dir assumptions and update to concrete phase path discovery.

### 03-05 Error-message hardening
- [x] Improve common failure messages (missing plan, malformed state, missing phase) with next-action guidance.

### 03-06 Settings behavior note
- [x] Document JSONC comment handling limitation and recommended backup/workaround.

**Deliverable**: Workflow docs aligned with runtime behavior + documented limitations.

---

### Wave 3: Quality Gates and Multi-Runtime Guidance
**Goal**: Provide repeatable validation steps for maintainers.

### 03-07 Multi-runtime coexistence guide
- [x] Document safe coexistence of Claude and OpenCode configs with path examples.

### 03-08 Release verification checklist
- [x] Add checklist for install/update/uninstall regression, permission registration, and command availability.

### 03-09 Recovery and rollback playbook
- [x] Add steps for corrupted `STATE.md`, partial install, and reinstall recovery.

**Deliverable**: Maintainer-focused validation/recovery documentation.

---

### Wave 4: Release Packaging
**Goal**: Prepare final release notes and completion artifacts.

### 03-10 Changelog updates
- [x] Add release notes entry summarizing OpenCode support and known limitations.

### 03-11 Final documentation QA pass
- [x] Run consistency pass across ROADMAP, phase docs, and OPENCODE docs for naming/paths/flags.

### 03-12 Phase completion report
- [x] Create `PHASE-3-COMPLETE.md` with outcomes, deferred items, and post-release follow-ups.

**Deliverable**: Phase 3 completion package ready for review.

---

## Testing Checklist

```
[x] Commands in docs match actual command filenames
[x] All documented install commands run successfully
[x] Permission examples match settings schema
[x] Troubleshooting steps are reproducible
[x] Changelog entry reflects implemented behavior
```

---

## Notes

- Keep the scope focused on docs + hardening; avoid new feature expansion.
- Prefer small, reviewable patches per wave.
- Any newly discovered runtime mismatch should be added to docs and ROADMAP learnings.
