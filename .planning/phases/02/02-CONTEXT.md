---
name: Phase 2 Context
description: Technical background and strategic context for Phase 2 testing
---

# Phase 2: Context & Strategic Direction

## Where We Are

**Phase 1** delivered a production-ready OpenCode installer:
- Extended `bin/install.js` from 123 → 659 lines
- Implemented full runtime detection (Claude Code, OpenCode, both, all)
- Built conversion logic for YAML frontmatter, command formats, paths
- Created 68+ tests (27 conversion tests, 33 integration tests, 100% passing)
- Documented all rules in CONVERSION-SPEC.md (563 lines)

**Current branch**: main (2 commits, ready for Phase 2)

## What Phase 2 Validates

Phase 1 was **theoretical**: code written and tested in the development environment.

Phase 2 is **practical**: we prove it works in a real OpenCode session.

### Three Main Testing Areas

#### 1. Installation & File Structure
- Does the installer place files in the right location?
- Are file formats correct for OpenCode?
- Are paths normalized correctly?
- Do permissions get registered in settings.json?

#### 2. Runtime Behavior
- Can we actually invoke `/mid-init` in OpenCode?
- Do commands route correctly?
- Does permission system grant/deny correctly?
- Can we read/write STATE.md?

#### 3. Lifecycle & State
- Does `/mid:do`, `/mid:verify`, `/mid:next` cycle work?
- Can we persist state across sessions?
- Does uninstall clean up properly?
- Can we update without losing user data?

## Why This Matters

If Phase 2 succeeds:
- Framework is **functionally complete** for OpenCode
- Phase 3 (Documentation) can proceed with confidence
- We can start dogfooding the framework itself (meta!)
- Safe to distribute to users

If Phase 2 finds critical issues:
- We fix Phase 1 code and re-test
- Blockers identified early = lower Phase 3 risk
- Learnings inform architecture decisions

## Technical Scope

### What We Test

**Installer behavior**:
- `makeitdone --opencode --global` runs cleanly
- Files end up at `~/.config/opencode/makeitdone/`
- settings.json gets updated without data loss
- Uninstall/update preserve user projects

**Framework commands**:
- All `/mid-*` commands are discoverable
- Commands execute without runtime errors
- Help text and error messages are clear

**Framework workflows**:
- `/mid:init` creates valid `.planning/` structure
- `/mid:plan` generates plans correctly
- `/mid:do` can start executing phases
- `/mid:verify` checks completion
- `/mid:next` advances state safely

**Permission system**:
- Settings.json rules allow `.planning/` reads
- Settings.json rules allow `.planning/` writes
- Denial cases have clear error messages
- No permission conflicts

**State management**:
- STATE.md is readable from OpenCode
- STATE.md updates persist
- Phase/wave tracking is accurate
- Rollback scenarios (if edge case) are documented

### What We Don't Test Yet

- **Documentation**: Phase 3 deliverable
- **Performance optimization**: Phase 3 stretch goal
- **Other runtimes** (Gemini, Kilo, etc): Future phases
- **CI/CD integration**: Backlog
- **User UX**: Feedback loop during Phase 3

---

## Environment Setup

### Prerequisites

You'll need:
- OpenCode runtime installed (e.g., `opencode --version`)
- Node.js 18+
- `make-it-done` package (from Phase 1 artifact)
- Write access to `~/.config/opencode/`

### Environment Info to Capture

For the test report, document:
- OpenCode version
- Node.js version
- macOS/Linux/Windows
- Home directory structure
- Existing settings.json content (if any)
- File system quirks (case sensitivity, etc)

---

## Conversion Rules (from Phase 1)

Wave 2 depends on these rules being implemented correctly. Keep CONVERSION-SPEC.md handy:

### Command Format

```
Claude Code:  /mid:init
OpenCode:     /mid-init
```

All `/mid:` → `/mid-` conversions in command files.

### YAML Frontmatter

```
Before:
allowed-tools: [Read, Write, Bash, Grep]

After:
permission:
  read: {"~/.config/opencode/makeitdone/*": "allow"}
  external_directory: {"~/.config/opencode/makeitdone/*": "allow"}
```

### Path Normalization

```
~/.claude/makeitdone/       →  ~/.config/opencode/makeitdone/
${CLAUDE_PLUGIN_ROOT}       →  ${OPENCODE_PLUGIN_ROOT}
/Users/.../makeitdone/      →  ~/.config/opencode/makeitdone/
```

### Color Conversion

16 named colors (red, blue, purple, etc) → hex values (#FF0000, #0000FF, #800080, etc)

---

## Common Pitfalls to Avoid

1. **Setting expectations too high**: Phase 2 validates, doesn't optimize
2. **Testing in Claude Code by mistake**: Must use real OpenCode session
3. **Not capturing environment info**: Needed for troubleshooting later
4. **Assuming all permission systems are the same**: OpenCode may differ
5. **Skipping edge cases**: They often reveal real problems

---

## Decision Gates

### When to Continue to Phase 3

- ✅ All 8 waves completed
- ✅ No critical (🔴) issues remain
- ✅ Test report shows > 90% pass rate
- ✅ Team confident in framework stability

### When to Loop Back to Phase 1

- Phase 1 code needs fixes (bugs in conversion logic, etc)
- Create new PR, merge, update Phase 2 test environment
- Re-run relevant waves

### When to Defer to Phase 3 (as backlog)

- Non-critical edge cases (document + move to Phase 3 backlog)
- Performance concerns (Phase 3 can address)
- "Nice-to-have" UX improvements (Phase 3 scope)

---

## Success Criteria Mapping

| Wave | Core Acceptance Criteria |
|------|-------------------------|
| 1 | Environment ready, baseline documented |
| 2 | Files placed correctly, format verified |
| 3 | `/mid-init` and commands accessible |
| 4 | Permissions allow file I/O correctly |
| 5 | STATE.md read/writable, transitions work |
| 6 | Uninstall/update clean and safe |
| 7 | Full workflow cycle from init → next |
| 8 | Test report complete, ready for Phase 3 |

---

## Related Artifacts

- **bin/install.js** (659 lines) - The code being tested
- **CONVERSION-SPEC.md** - Rules reference
- **Phase 1 test reports** - Baseline for Phase 2 manual tests
- **OPENCODE.md** (in progress) - Will be created in Phase 3

---

## Notes for Future Runners

- This is a validation phase, not a development phase
- Focus on "does it work?" not "can we make it better?"
- Document findings rigorously for Phase 3
- If critical issues arise, don't try to fix in Phase 2 (loop back to Phase 1)
- Celebrate small wins: each wave passing is progress toward shipping
