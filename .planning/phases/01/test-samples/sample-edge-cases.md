---
name: mid:test-edge
allowed-tools: []
color: invalid-color
---

# Edge Cases Test

This file tests various edge cases in conversion.

## Test case 1: Empty allowed-tools

When `allowed-tools` is empty array `[]`, conversion should handle gracefully.
Result: Empty `tools: {}` object.

## Test case 2: Invalid color

When color is invalid (not in COLOR_MAP and not hex), it should be removed.
Before: `color: invalid-color`
After: (removed)

## Test case 3: Tool references in text

When text contains `AskUserQuestion`, it should convert to `question`.
Example: Use `/mid-task` to create a question interactively.

## Test case 4: Multiple slash command formats

Both formats should convert:
- `/mid:something` → `/mid-something`
- `/gsd:workflow` → `/gsd-workflow`

## Test case 5: Path variations

Different path formats should all be converted:
- `~/.claude/makeitdone/` → `~/.config/opencode/makeitdone/`
- `$HOME/.claude/makeitdone/` → `$HOME/.config/opencode/makeitdone/`

## Test case 6: No frontmatter

A file without frontmatter should pass through correctly.

## Test case 7: Malformed YAML

Graceful degradation when YAML is malformed.
