# State Read Pattern

Token-optimized STATE.md reading with context window guard.

## Pattern

```bash
# Check context
if context_window < 500k:
  FRONTMATTER=$(node ~/.claude/makeitdone/bin/mid-tools.cjs fm get .planning/STATE.md)
else:
  STATE=$(node ~/.claude/makeitdone/bin/mid-tools.cjs state get)
```

## Frontmatter-Only Read (< 500k tokens)

When context is tight, read only frontmatter:
```bash
mid-tools fm get .planning/STATE.md
```

Returns TOON with only:
```
phase: 1
current_wave: 1
wave_1_complete: false
wave_2_complete: false
...
```

## Full State Read (>= 500k tokens)

When context is abundant:
```bash
mid-tools state get
```

Returns TOON with entire STATE.md frontmatter + body structure.

## Atomic State Updates

Always use mid-tools for writes (never write STATE.md directly):

```bash
# Set single field
mid-tools state set current_wave 2

# Advance to next phase
mid-tools state advance 2
```

## Anti-patterns

- Never write STATE.md directly
- Never load full STATE.md if context < 500k (use fm)
- Never update multiple fields without atomic operation
