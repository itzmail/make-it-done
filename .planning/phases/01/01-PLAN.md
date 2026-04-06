---
phase: 1
title: OpenCode Installer Implementation
status: in-progress
duration: 5-7 days
team_size: 1
context_window: 200000
---

# Phase 1: OpenCode Installer Implementation

## Overview

Extend `bin/install.js` untuk support OpenCode runtime dengan format conversion yang tepat. Phase ini fokus pada:
1. Runtime detection (`--opencode` flag)
2. Path management untuk `~/.config/opencode/`
3. File content transformation (commands, agents, workflows)
4. Permission registration di OpenCode settings.json

---

## Acceptance Criteria

- [x] `--opencode --global` flag accepted dan install ke `~/.config/opencode/`
- [x] Runtime detection implemented
- [x] Path management functions working
- [x] File content transformation logic implemented
- [ ] Conversion logic tested with sample files
- [ ] Permission registration tested
- [ ] Full integration test passing
- [ ] Manual uninstall/update works correctly

---

## Waves

### Wave 1: Research & Analysis ✅ COMPLETE
**Goal**: Understand OpenCode installer requirements completely

**Completed Tasks**:
- [x] Analyzed GSD installer opencode conversion logic
- [x] Documented OpenCode file structure requirements
- [x] Identified permission system rules
- [x] Created CONVERSION-SPEC.md (563 lines)

**Deliverable**: CONVERSION-SPEC.md (internal reference)

---

### Wave 2: Installer Refactor ✅ COMPLETE
**Goal**: Extend bin/install.js untuk OpenCode runtime

**Completed Tasks**:
- [x] Added runtime detection logic (`--opencode`, `--claude`, `--both`, `--all`)
- [x] Implemented `getDirName(runtime)` function
- [x] Implemented `getConfigPath(runtime, location)` function
- [x] Created `convertForRuntime(content, runtime)` function
- [x] Implemented YAML frontmatter parser
- [x] Implemented path normalization
- [x] Added settings.json integration

**Deliverable**: Updated bin/install.js (659 lines, syntax valid)

---

### Wave 3: Conversion Logic ⏳ IN PROGRESS
**Goal**: Ensure accurate file content transformation

**Tasks**:
- [ ] Verify slash command format conversion works
- [ ] Test allowed-tools → permission conversion
- [ ] Verify field removal (name, model) works correctly
- [ ] Test color name to hex conversion
- [ ] Verify path normalization in file content
- [ ] Test YAML frontmatter handling edge cases
- [ ] Create test cases for all conversion scenarios

**Deliverable**: Tested conversion functions with sample files

---

### Wave 4: Settings Integration ⏳ PENDING
**Goal**: Auto-register permissions di OpenCode settings.json

**Tasks**:
- [ ] Parse OpenCode settings.json structure
- [ ] Generate permission rules correctly
- [ ] Handle case: settings.json doesn't exist
- [ ] Merge permissions (don't overwrite existing)
- [ ] Write updated settings.json
- [ ] Test with real OpenCode config

**Deliverable**: Permission registration function + tested

---

### Wave 5: Testing & Validation ⏳ PENDING
**Goal**: Verify installer works correctly untuk OpenCode

**Tasks**:
- [ ] Unit test: runtime detection
- [ ] Unit test: path resolution
- [ ] Unit test: YAML conversion
- [ ] Unit test: slash command format
- [ ] Integration test: Full install flow `--opencode --global`
- [ ] Verify generated files structure
- [ ] Verify settings.json permissions
- [ ] Test uninstall/update

**Deliverable**: Passing test suite

---

## Technical Details

### File Conversion Rules

**Command files** (`.md`):
```
Before:
---
name: mid:init
allowed-tools:
  - Read, Write, Bash
---

After:
---
permission:
  read:
    "~/.config/opencode/makeitdone/*": "allow"
  external_directory:
    "~/.config/opencode/makeitdone/*": "allow"
---
```

**Slash command format**:
- `/mid:init` → `/mid-init` (baru di OpenCode)

**Path replacement**:
- `~/.claude/makeitdone/` → `~/.config/opencode/makeitdone/`

### Directory Structure

```
~/.config/opencode/
├── makeitdone/
├── commands/mid/
├── agents/
└── settings.json (auto-updated)
```

---

## Reference Files

- GSD installer: `reference/get-shit-done/bin/install.js`
- Current installer: `bin/install.js`
- Conversion spec: `.planning/phases/01/CONVERSION-SPEC.md`

---

## Progress Summary

**Completed**: Wave 1 & 2 (Research + Implementation)
**Status**: bin/install.js extended dengan OpenCode support, ready for testing
**Next**: Wave 3-5 (Conversion testing, Settings, Validation)
