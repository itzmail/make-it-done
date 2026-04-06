# OpenCode Guide

OpenCode support for `makeitdone` uses OpenCode-native command naming (`/mid-*`) and installs framework files into OpenCode config paths.

## Quick Start

### Global install (OpenCode)

```bash
makeitdone --opencode --global
```

### Local install (project only)

```bash
makeitdone --opencode --local
```

### Local development install from this repository

```bash
node bin/install.js --opencode --global
```

Use `node bin/install.js ...` during repository development to ensure you execute the latest local code.

## Installation Targets

- OpenCode global config: `~/.config/opencode/`
- OpenCode local config: `.opencode/`
- Framework root: `<config>/makeitdone/`
- Commands: `<config>/commands/mid-*.md`
- Agents: `<config>/agents/mid-*.md`

## Supported Installer Flags

- Runtime flags: `--opencode`, `--claude`, `--both`, `--all`
- Location flags: `--global`, `--local`
- Lifecycle flags: `--update`, `--uninstall`

Examples:

```bash
# Install OpenCode only
makeitdone --opencode --global

# Install both OpenCode and Claude runtime targets
makeitdone --both --global

# Update existing OpenCode installation
makeitdone --update --opencode --global

# Uninstall OpenCode framework
makeitdone --uninstall --opencode --global
```

## Command Mapping (OpenCode vs Claude)

OpenCode command names are dash-based. Claude command names are colon-based.

| Function | OpenCode | Claude Code |
|---|---|---|
| Initialize | `/mid-init` | `/mid:init` |
| Plan | `/mid-plan` | `/mid:plan` |
| Execute | `/mid-do` | `/mid:do` |
| Verify | `/mid-verify` | `/mid:verify` |
| Next phase | `/mid-next` | `/mid:next` |
| Status | `/mid-status` | `/mid:status` |
| Help | `/mid-help` | `/mid:help` |
| Debug | `/mid-debug` | `/mid:debug` |
| Quick task | `/mid-quick` | `/mid:quick` |
| Report | `/mid-report` | `/mid:report` |

## OpenCode Workflow Commands

Typical execution sequence:

```text
/mid-init
/mid-plan --mode roadmap
/mid-plan --mode phase --phase 1
/mid-do 1
/mid-verify --phase 1 --mode audit
/mid-next
/mid-status
```

## Permissions and settings.json

Installer updates OpenCode `settings.json` with required permissions for framework files.

Expected shape:

```json
{
  "permission": {
    "read": {
      "~/.config/opencode/makeitdone/*": "allow"
    },
    "external_directory": {
      "~/.config/opencode/makeitdone/*": "allow"
    }
  }
}
```

Notes:

- Existing permission entries are merged, not replaced.
- If `settings.json` is missing, installer creates a default structure.

## Update and Uninstall Behavior

- `--update` refreshes framework files and keeps project planning files/state.
- `--uninstall` removes installed framework files for selected runtime target.
- Reinstall after uninstall is supported.
- Claude and OpenCode installations can coexist safely.

## Multi-Runtime Coexistence (Claude + OpenCode)

You can run both runtimes on the same machine without conflict when each runtime stays in its own config path.

| Runtime | Global config path | Command format |
|---|---|---|
| OpenCode | `~/.config/opencode/` | `/mid-*` |
| Claude Code | `~/.claude/` | `/mid:*` |

Recommended install commands:

```bash
# Install both runtimes (global)
makeitdone --both --global

# Or install each runtime explicitly
makeitdone --opencode --global
makeitdone --claude --global
```

Safe coexistence checks:

- OpenCode commands exist in `~/.config/opencode/commands/`.
- Claude commands exist in `~/.claude/commands/`.
- OpenCode uses `/mid-*` command names, Claude uses `/mid:*`.
- Each runtime has its own settings/config file and permission model.

## Release Verification Checklist

Use this checklist before tagging/releasing OpenCode changes.

- [ ] Run OpenCode install: `node bin/install.js --opencode --global`
- [ ] Run OpenCode update: `node bin/install.js --update --opencode --global`
- [ ] Run OpenCode uninstall + reinstall cycle
- [ ] Verify OpenCode command files exist (`mid-init`, `mid-plan`, `mid-do`, `mid-verify`, `mid-next`, `mid-status`, `mid-help`, `mid-debug`)
- [ ] Verify command naming in docs is `/mid-*` for OpenCode
- [ ] Verify `settings.json` includes `permission.read` and `permission.external_directory` for makeitdone path
- [ ] Verify phase plan convention in docs: `.planning/phases/NN/NN-PLAN.md`
- [ ] Verify known limitations are documented (JSONC comment stripping)
- [ ] Verify Claude runtime behavior remains unchanged when OpenCode is updated

## Recovery and Rollback Playbook

### Scenario A: `STATE.md` corrupted or invalid

1. Backup corrupted file: `cp .planning/STATE.md .planning/STATE.md.bak`
2. Restore from known good state or regenerate via `/mid-init` in a safe branch.
3. Re-apply latest phase/wave values manually if needed (`phase`, `current_wave`, completion flags).
4. Validate with `/mid-status`.

### Scenario B: Partial install/update

1. Re-run deterministic installer from repo root:

```bash
node bin/install.js --update --opencode --global
```

2. Verify required directories/files exist (`makeitdone/`, `commands/`, `agents/`).
3. Verify `settings.json` permission entries are present.

### Scenario C: Commands missing after update

1. Check runtime target mismatch (`--global` vs `--local`).
2. Reinstall to expected target:

```bash
node bin/install.js --opencode --global
```

3. Confirm command filenames under target `commands/` directory.

### Scenario D: Need clean rollback and reinstall

1. Uninstall runtime package:

```bash
node bin/install.js --uninstall --opencode --global
```

2. Reinstall:

```bash
node bin/install.js --opencode --global
```

3. Re-check permissions and run `/mid-status`.

## Known Limitations

1. JSONC comments in OpenCode `settings.json` are not preserved on installer update.
   - Installer strips comments while parsing/writing JSON.
   - Recommended workaround: keep operational notes in markdown docs, not JSON comments.

2. For development validation, PATH-resolved `makeitdone` may not point to local repo code.
   - Recommended workaround: use `node bin/install.js ...` from repository root.

## Troubleshooting

### Command not found (`/mid-*`)

- Verify install target (`--global` vs `--local`) matches your active OpenCode session.
- Confirm command files exist in `.opencode/commands/` or `~/.config/opencode/commands/`.
- Re-run install:

```bash
node bin/install.js --opencode --global
```

### Phase plan not found

- Ensure phase layout follows: `.planning/phases/NN/NN-PLAN.md`.
- Example: `.planning/phases/03/03-PLAN.md`.

### State inconsistencies

- Inspect current execution state in `.planning/STATE.md`.
- Use `/mid-status` to check phase/wave progress.

### Permission issues while reading/writing planning files

- Confirm OpenCode `settings.json` contains both `read` and `external_directory` permission entries for `makeitdone` path.
