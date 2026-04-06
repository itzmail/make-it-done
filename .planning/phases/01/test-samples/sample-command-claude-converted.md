---
color: #00FFFF
tools:
  read: true
  write: true
  bash: true
---

# Initialize makeitdone project

This command initializes a new makeitdone project by creating:
- Project directory structure
- `.planning/` directory for phase planning
- Configuration files

## Usage

Use `/mid-init <project-name>` to initialize a project.

## Slash command format

Commands use `/mid:` prefix in Claude Code, but this converts to `/mid-` in OpenCode.

## Tool references

This command allows:
- **read**: read files from the project
- **write**: write new files
- **bash**: execute shell commands

## Paths

Makeitdone data is stored in `~/.config/opencode/makeitdone/` for Claude Code.

When installed to OpenCode, it becomes `~/.config/opencode/makeitdone/`.
