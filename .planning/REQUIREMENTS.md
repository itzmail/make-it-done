---
name: Requirements
description: Detailed feature requirements for OpenCode support
---

# Requirements

## Functional Requirements

### FR-1: Runtime Detection
- System shall accept CLI flags: `--claude`, `--opencode`, `--both`, `--all`
- System shall default to interactive mode if no runtime specified
- System shall support location flags: `--global`, `--local`
- System shall combine runtime + location flags correctly

### FR-2: Path Management
- Claude Code: `~/.claude/` (global) or `.claude/` (local)
- OpenCode: `~/.config/opencode/` (global) or `.opencode/` (local)
- System shall create directories if they don't exist
- System shall handle XDG Base Directory compliance for OpenCode

### FR-3: File Conversion - Commands
- Remove `name:` field dari frontmatter (OpenCode uses filename)
- Remove `model:` field (OpenCode uses default)
- Convert `allowed-tools:` array to `permission:` object
- Convert slash command format: `/mid:init` → `/mid-init`
- Replace paths: `~/.claude` → `~/.config/opencode`

### FR-4: File Conversion - Agents
- Keep `name:` field (required by OpenCode)
- Remove `model:` field
- Add `mode: subagent` field if missing
- Remove `tools:` array (OpenCode doesn't use it)
- Convert slash command references in body content

### FR-5: Tool Name Mapping (OpenCode only)
- AskUserQuestion → question
- SlashCommand → skill
- Read → read
- Write → write
- Edit → edit
- Bash → execute
- etc. (13 total mappings)

### FR-6: Permission System
- Convert `allowed-tools:` to permission object:
```json
{
  "read": {"~/.config/opencode/makeitdone/*": "allow"},
  "external_directory": {"~/.config/opencode/makeitdone/*": "allow"}
}
```
- Register in `~/.config/opencode/settings.json`
- Preserve existing permissions (merge strategy)
- Handle missing settings.json (create default)

### FR-7: Installation Process
- Copy makeitdone framework files to target runtime config
- Transform file content per runtime
- Register permissions in settings.json
- Write `.install.json` receipt with metadata
- Show appropriate success message per runtime

### FR-8: Uninstall Process
- Accept runtime parameter (`--claude`, `--opencode`, etc)
- Remove files from correct location per runtime
- Clean up `.install.json` receipt
- Warn if files don't exist

## Non-Functional Requirements

### NFR-1: Code Quality
- No external dependencies (Node stdlib only)
- JSDoc comments untuk semua functions
- Error handling untuk edge cases
- Testable code (pure functions where possible)

### NFR-2: Performance
- Installation should complete dalam < 5 seconds
- File transformations should handle 100+ files efficiently
- settings.json parsing/writing should be atomic

### NFR-3: Compatibility
- Support Node.js 18+
- Work on macOS, Linux, Windows (including WSL)
- Preserve file permissions after copy
- Handle JSONC comments in settings.json

### NFR-4: Reliability
- Atomic operations (all-or-nothing install)
- Rollback on error (cleanup partial installs)
- Backup existing files before overwrite
- Clear error messages for debugging

## Technical Specifications

### Installation Directory Structure

```
Claude Code:
~/.claude/
├── makeitdone/
├── commands/mid/
├── agents/
└── .install.json

OpenCode:
~/.config/opencode/
├── makeitdone/
├── commands/mid/
├── agents/
├── settings.json (auto-updated)
└── .install.json
```

### File Conversion Rules

**Frontmatter Parsing**:
- Extract content between first and second `---`
- Parse line-by-line (simple YAML, no external parser)
- Handle array fields (allowed-tools: [Read, Write, Bash])
- Preserve other fields as-is

**Slash Command Format**:
- Replace `/gsd:` with `/gsd-` (case-sensitive)
- Apply to command and agent body content
- For makeitdone: `/mid:` → `/mid-`

**Path Normalization**:
- `~/.claude/makeitdone/` → `~/.config/opencode/makeitdone/`
- `$HOME/.claude/` → `$HOME/.config/opencode/`
- Account for both forward and backslashes (Windows)

**Color Conversion** (OpenCode only):
- cyan → #00FFFF
- red → #FF0000
- green → #00FF00
- blue → #0000FF
- yellow → #FFFF00
- magenta → #FF00FF
- orange → #FFA500
- purple → #800080
- pink → #FFC0CB
- white → #FFFFFF
- black → #000000
- gray/grey → #808080

## Acceptance Tests

- [ ] `node bin/install.js --opencode --global` installs to `~/.config/opencode/`
- [ ] `node bin/install.js --claude --global` installs to `~/.claude/`
- [ ] `node bin/install.js --both --global` installs to both locations
- [ ] Command files: `/mid:init` → `/mid-init` in converted files
- [ ] Frontmatter: `allowed-tools` array → `permission` object
- [ ] Frontmatter: `name:` and `model:` fields removed from commands
- [ ] Paths: `~/.claude` → `~/.config/opencode` in converted content
- [ ] Settings: `~/.config/opencode/settings.json` created with permissions
- [ ] Uninstall: `node bin/install.js --opencode --uninstall` removes files correctly
- [ ] Edge cases: missing source dirs, malformed JSON, JSONC comments handled gracefully
