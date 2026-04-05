# Initialize makeitdone Project

Token optimized initialization workflow for new projects.

**Token budget**: ~8K (init-gate + questions + template copy)

---

## Context Setup

@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/init-gate.md
@/Users/ismailalam/Development/my/makeitdone/makeitdone/steps/anti-patterns.md

---

## Execution

### 1. Project Metadata Collection

Ask user 5 critical questions:

- Project name: ?
- Description (one-liner): ?
- Team size (1-5+ people): ?
- Timeline estimate (weeks): ?
- Tech stack (framework/lang): ?

Store in memory for next session.

### 2. Create .planning Directory

```bash
mkdir -p .planning/phases/{01,02,03}
touch .planning/config.json
```

### 3. Initialize Templates

Copy templates to project:

```bash
cp ~/.claude/makeitdone/templates/project.md .planning/PROJECT.md
cp ~/.claude/makeitdone/templates/requirements.md .planning/REQUIREMENTS.md
cp ~/.claude/makeitdone/templates/roadmap.md .planning/ROADMAP.md
cp ~/.claude/makeitdone/templates/state.md .planning/STATE.md
```

### 4. Populate Config

```json
{
  "project_name": "[user input]",
  "description": "[user input]",
  "model_profile": "balanced",
  "context_window": 200000,
  "team_size": [user input],
  "created": "2026-04-05"
}
```

### 5. Update PROJECT.md

Populate with user answers:
- Name, description (frontmatter)
- Goals section (auto-generate 3 generic + ask user for specific)
- Scope, constraints, timeline
- Tech stack

### 6. First Roadmap Question

Ask: "How many phases do you estimate? (2-5)"

Create ROADMAP.md structure with user's phase count.

### 7. Success Checkpoint

```bash
# Verify structure
test -f .planning/PROJECT.md && echo "✅ PROJECT.md"
test -f .planning/REQUIREMENTS.md && echo "✅ REQUIREMENTS.md"
test -f .planning/ROADMAP.md && echo "✅ ROADMAP.md"
test -f .planning/STATE.md && echo "✅ STATE.md"
test -f .planning/config.json && echo "✅ config.json"
```

Output completion marker:

```
## PROJECT INITIALIZED

Name: [project name]
Location: .planning/
Files: 5 created

Next step: Run /mid:plan --mode roadmap to detail your phases
```

---

## Error Handling

- **Missing input**: Re-ask question
- **.planning already exists**: Skip creation, verify files
- **Invalid JSON**: Use defaults, warn user

---

## Anti-patterns Avoided

✓ Frontmatter-first (no full-file reads needed)
✓ No agents spawned (user-facing interview only)
✓ Templates via copy, not text generation
✓ Fast-fail on directory issues (escalate to user)
