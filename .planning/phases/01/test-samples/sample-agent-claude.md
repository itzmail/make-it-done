---
name: GSD Agent
model: claude-opus
memory: /Users/ismailalam/.claude/agents/gsd-memory.md
maxTurns: 10
---

# GSD Agent

A stateful agent that maintains memory across conversations.

## Capabilities

- Long-term memory using markdown files
- Context-aware planning
- Project state management

## Memory Location

Agent memory is stored in `~/.claude/agents/` directory.

## Usage with slash commands

Invoke via `/mid:do` which converts to `/mid-do` in OpenCode.

## Unsupported fields in OpenCode

The following Claude Code fields are NOT supported:
- `maxTurns` - OpenCode uses different turn management
- `memory` - Use file-based storage instead
- `model` - OpenCode determines runtime

These fields will be removed during conversion.
