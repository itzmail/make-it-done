---
title: Deploy makeitdone
description: Complete deployment workflow
---

# Deployment Workflow

This is a workflow example that uses multiple commands.

## Steps

1. **Verify installation**
   - Command: `/mid:verify`
   - Checks project structure

2. **Run tests**
   - Command: `/mid:test`
   - Uses Bash tool to run test suite

3. **Deploy**
   - Command: `/mid:deploy`
   - Copies files to target directory

## Tools used

- Read: Access configuration files
- Write: Create output files
- Bash: Execute system commands
- Grep: Search logs

## Paths referenced

- Project path: `~/.claude/makeitdone/`
- Agent memory: `~/.claude/agents/`
- Commands: `~/.claude/commands/mid/`
