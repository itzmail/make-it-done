---
name: Roadmap
description: Phase breakdown and timeline
---

# Roadmap

## Phase Summary

Total phases: 3
Timeline: ~2 weeks
Current phase: 1

---

## 01 - OpenCode Installer Implementation [in-progress]

**Goal**: Build OpenCode runtime detection + conversion logic dalam bin/install.js

**Milestone**: Installer bisa deploy ke `~/.config/opencode/` dengan format yang benar

**Dependencies**: None (project start)

**Deliverables**:
- ✅ OpenCode runtime detection + flag handling (`--opencode`)
- ✅ Directory path management (~/.config/opencode XDG compliance)
- ✅ Command format conversion (`:` → `-`)
- ✅ Frontmatter YAML conversion (allowed-tools → permission)
- ✅ Path normalization dalam file content
- ✅ Permission registration di OpenCode settings.json

**Duration**: 1 week

**Progress**: Wave 2 complete, Wave 3 in progress

---

## 02 - Testing & Validation [not-started]

**Goal**: Test OpenCode installer dengan real OpenCode session, verify all features

**Milestone**: Framework fully functional di OpenCode

**Dependencies**: Phase 1 complete

**Deliverables**:
- `/mid-init` command accessible di OpenCode
- Permission system working (read + external_directory)
- Command/agent conversion verified
- PATH environment working correctly
- State management (STATE.md) bisa diakses

**Duration**: 4-5 days

---

## 03 - Documentation & Edge Cases [not-started]

**Goal**: Dokumentasi OpenCode setup, handle edge cases, future runtime support

**Milestone**: Framework siap untuk distribusi multi-runtime

**Dependencies**: Phase 2 complete

**Deliverables**:
- OPENCODE.md documentation
- Error handling + graceful degradation
- Support untuk future runtimes (structure in place)
- CHANGELOG entry untuk v0.2.0

**Duration**: 2-3 days

---

## Notes

- **Critical path**: Installer → Testing → Docs (2 weeks)
- **Risk**: OpenCode SDK behavior changes atau undocumented features
- **Mitigation**: Reference GSD installer code extensively, test early with real OpenCode
