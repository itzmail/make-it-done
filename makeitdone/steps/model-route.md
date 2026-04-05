# Model Routing Pattern

Route Claude models based on task complexity and context window.

## Profiles

From config.json `model_profile` field:

| Profile | Executor | Verifier | Use Case |
|---------|----------|----------|----------|
| **budget** | haiku | haiku | Token-constrained, simple tasks |
| **balanced** | sonnet | haiku | Default, good speed/quality trade-off |
| **quality** | opus | sonnet | Complex design, safety-critical code |

## Context Window Tiers

Based on `context_window` from config.json:

| Range | Tier | Behavior |
|-------|------|----------|
| < 300k | **POOR** | Read-only, no generation, agent spawn disabled |
| 300-500k | **DEGRADING** | Frontmatter-only reads, small tasks only |
| 500k-1M | **GOOD** | Full reads, normal task complexity |
| > 1M | **PEAK** | All features enabled, complex synthesis |

## Model Selection Logic

```
if tier == POOR:
  disable agents, return "context too low"

if tier == DEGRADING:
  use haiku for all work
  forbid agents
  use frontmatter-only reads

if tier == GOOD:
  use config model_profile routing
  enable research agent if --research

if tier == PEAK:
  use config model_profile routing
  enable all agents
  parallelization enabled
```

## Practical Usage in Workflows

```
<context>
context_window: (mid-tools config get context_window)
model_profile: (mid-tools config get model_profile)
</context>

Determine Tier:
- If context_window < 300k: POOR tier → escalate to user
- If context_window < 500k: DEGRADING tier → frontmatter-only reads
- Else: Use normal read strategy

Route Executor:
- budget: use haiku
- balanced: use sonnet
- quality: use opus
```

## Anti-patterns

- Ignoring context_window (causes context exhaustion)
- Using opus for verification (wastes tokens)
- Not adjusting for POOR tier (causes failures)
