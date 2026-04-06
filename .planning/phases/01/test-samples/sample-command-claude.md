---
name: mid:init
model: claude-opus
color: cyan
allowed-tools:
  - Read
  - Write
  - Bash
---

# Initialize makeitdone project

This command initializes a new makeitdone project by creating:
- Project directory structure
- `.planning/` directory for phase planning
- Configuration files

## Usage

Use `/mid:init <project-name>` to initialize a project.

## Slash command format

Commands use `/mid:` prefix in Claude Code, but this converts to `/mid-` in OpenCode.

## Tool references

This command allows:
- **Read**: Read files from the project
- **Write**: Write new files
- **Bash**: Execute shell commands

## Paths

Makeitdone data is stored in `~/.claude/makeitdone/` for Claude Code.

When installed to OpenCode, it becomes `~/.config/opencode/makeitdone/`.
