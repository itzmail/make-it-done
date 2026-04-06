---
phase: 2
name: Testing & Validation
tasks: 8
estimated_waves: 2
---

## Wave 1

### 02-01 Prepare isolated OpenCode test environment (20m)
- Create temporary HOME/XDG dirs and baseline fixtures.
- Ensure existing settings.json and missing-settings scenarios are represented.

### 02-02 Run install matrix for runtime/location flags (25m)
- Execute `--opencode`, `--claude`, `--both` on global/local paths.
- Capture target paths, receipt creation, and success output.

### 02-03 Validate command and agent conversion outputs (25m)
- Assert `/mid:` becomes `/mid-` and tool mappings are applied.
- Verify command frontmatter removals and agent mode/name constraints.

### 02-04 Validate permission registration merge behavior (20m)
- Confirm permission object is generated and merged, not overwritten.
- Verify JSONC/commented settings handling for OpenCode.

## Wave 2

### 02-05 Test uninstall flows and cleanup safety (20m)
- Run uninstall per runtime and verify file/receipt removal.
- Confirm warnings are shown for already-missing artifacts.

### 02-06 Exercise edge-case and failure-path scenarios (30m)
- Simulate malformed JSON, missing source dirs, and partial failures.
- Verify rollback/cleanup behavior and clear error messages.

### 02-07 Add automated regression checks for critical paths (30m)
- Add/extend tests for conversion, path normalization, and permissions.
- Ensure checks are deterministic across macOS/Linux/Windows path forms.

### 02-08 Final validation report and phase sign-off checklist (15m)
- Map test evidence to roadmap deliverables and acceptance tests.
- Record unresolved risks and go/no-go decision for Phase 3.
