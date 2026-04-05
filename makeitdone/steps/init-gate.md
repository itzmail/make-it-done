# Init Gate Pattern

Token-optimized initialization payload pattern. Use this in any workflow that needs fresh execution context.

## Pattern

```bash
PAYLOAD=$(node ~/.claude/makeitdone/bin/mid-tools.cjs init <workflow> <phase>)
```

The PAYLOAD contains (in TOON format):
- `phase_dir`: Full path to current phase directory
- `plans`: List of all PLAN.md files in phase
- `incomplete_plans`: Plans without SUMMARY.md (not yet done)
- `branch_name`: Conventional branch name `phase-{number}`
- `parallelization`: true if multiple plans (waves enabled)
- `executor_model`: Model routed for execution (sonnet/haiku based on profile)
- `verifier_model`: Model routed for verification (haiku/sonnet)
- `context_window`: Token budget from config.json
- `model_profile`: Current profile (budget/balanced/quality)

## Usage in Workflows

At start of workflow:

```
# Get fresh context
<context>
init_payload: (mid-tools init <workflow> <phase-number>)
</context>

Parse TOON payload:
- Extract phase_dir
- Extract incomplete_plans count
- Route models based on executor_model, verifier_model fields
```

## Token Savings

- TOON format saves ~40% vs JSON
- Only includes essential fields (not full phase history)
- Frontmatter-safe for context_window < 500k
