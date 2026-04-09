# Backlog Workflow

Manage project backlog items: add, list, move to phase, or remove.

**Token budget**: ~3K (file I/O, no state reads for add/list/remove)

---

## Context Setup

@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/state-read.md

---

## Argument Parsing

Parse `$ARGUMENTS` to extract the action and its parameters:

```
add <title> [--desc TEXT] [--priority high|medium|low] [--category CATEGORY]
list [--priority LEVEL] [--category CAT]
move <id> to <phase-number>
remove <id>
```

Extract:
- `ACTION` = first word (add | list | move | remove)
- For **add**: `TITLE` = text before first `--` flag, `DESC` from `--desc`, `PRIORITY` from `--priority` (default: medium), `CATEGORY` from `--category`
- For **list**: `FILTER_PRIORITY` from `--priority`, `FILTER_CATEGORY` from `--category`
- For **move**: `ITEM_ID` = second word, `TARGET_PHASE` = fourth word (after "to")
- For **remove**: `ITEM_ID` = second word

---

## Execution

### 1. Validate Project

```bash
if [ ! -d ".planning" ]; then
  echo "## ERROR"
  echo "Project not initialized. Run /mid:init first."
  exit 1
fi

mkdir -p .planning/backlog
```

### 2. ADD — Create backlog item

When `ACTION = add`:

```bash
# Validate title
if [ -z "$TITLE" ]; then
  echo "## ERROR"
  echo "Title is required."
  echo "Usage: /mid:backlog add \"<title>\" [--desc TEXT] [--priority high|medium|low] [--category CATEGORY]"
  exit 1
fi

# Generate UUID
UUID=$(node -e "console.log(require('crypto').randomUUID())")
SHORT_ID="${UUID:0:8}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Write item file
cat > ".planning/backlog/${UUID}.md" << ITEM
---
id: ${UUID}
title: ${TITLE}
description: ${DESC:-}
priority: ${PRIORITY:-medium}
category: ${CATEGORY:-}
created_at: ${TIMESTAMP}
status: pending
---

## Notes

Added on ${TIMESTAMP}
ITEM
```

Output:

```
## BACKLOG ITEM ADDED

**ID**: `{SHORT_ID}` (full: `{UUID}`)
**Title**: {TITLE}
**Priority**: {PRIORITY}
{if CATEGORY} **Category**: {CATEGORY}
{if DESC} **Description**: {DESC}

Next: `/mid:backlog list` to view all · `/mid:backlog move {UUID} to <phase>` to promote
```

### 3. LIST — Show backlog items

When `ACTION = list`:

```bash
# Scan .planning/backlog/ for all .md files
# For each file, read frontmatter fields: id, title, priority, category, created_at

# Apply filters if set:
#   FILTER_PRIORITY → skip items where priority != FILTER_PRIORITY
#   FILTER_CATEGORY → skip items where category != FILTER_CATEGORY

# Sort order: high → medium → low, then by created_at asc
```

Output format per item:
```
{ICON} `{SHORT_ID}` {TITLE} [{PRIORITY}]{if CATEGORY → · {CATEGORY}}
```

Icons: 🔴 high, 🟡 medium, 🟢 low

If no items:
```
## BACKLOG EMPTY

No items in backlog.
Add one: `/mid:backlog add "<title>"`
```

If items found:
```
## BACKLOG ({COUNT} items)

🔴 `abc12345` Implement dark mode [high] · feature
🟡 `def67890` Refactor auth module [medium] · debt
🟢 `ghi11121` Update documentation [low]

Commands:
- Move to phase: `/mid:backlog move <id> to <phase>`
- Remove: `/mid:backlog remove <id>`
```

### 4. MOVE — Promote item to phase

When `ACTION = move`:

```bash
# Validate ITEM_ID and TARGET_PHASE are present
# Find item file: .planning/backlog/{ITEM_ID}*.md (match by full UUID or short ID prefix)
# Validate target phase directory exists: .planning/phases/{padded-phase}/

# Read item frontmatter: title, description, priority, category
# Delete item file from backlog
```

Output:
```
## ITEM MOVED TO PHASE {TARGET_PHASE}

**Title**: {TITLE}
**ID**: `{SHORT_ID}`
{if PRIORITY} **Priority**: {PRIORITY}
{if CATEGORY} **Category**: {CATEGORY}
{if DESC} **Description**: {DESC}

✅ Removed from backlog.

Next step: Edit `.planning/phases/{padded-phase}/*-PLAN.md` to add this task to the appropriate wave.
```

If item not found:
```
## ERROR
Item not found: `{ITEM_ID}`
Run `/mid:backlog list` to see available IDs.
```

If phase not found:
```
## ERROR
Phase {TARGET_PHASE} does not exist.
Run `/mid:status` to see available phases.
```

### 5. REMOVE — Delete item from backlog

When `ACTION = remove`:

```bash
# Validate ITEM_ID is present
# Find item file: .planning/backlog/{ITEM_ID}*.md
# Read title for confirmation message
# Delete file
```

Output:
```
## ITEM REMOVED

**Title**: {TITLE}
**ID**: `{ITEM_ID}`

Item permanently removed from backlog.
```

If not found:
```
## ERROR
Item not found: `{ITEM_ID}`
Run `/mid:backlog list` to see available IDs.
```

### 6. Unknown action

```
## ERROR
Unknown action: `{ACTION}`

Available: add | list | move | remove
Run `/mid:help` for usage.
```

---

## Completion Markers

- `## BACKLOG ITEM ADDED` — add success
- `## BACKLOG EMPTY` — list with no items
- `## BACKLOG ({N} items)` — list success
- `## ITEM MOVED TO PHASE {N}` — move success
- `## ITEM REMOVED` — remove success
- `## ERROR` — any failure

---

## Anti-patterns Avoided

✓ No STATE.md mutation (backlog is independent)
✓ Frontmatter-only reads for list (no full file loads)
✓ Short ID display (first 8 chars) for usability
✓ Partial ID matching for move/remove (prefix search)
