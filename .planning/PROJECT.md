---
name: makeitdone-opencode
description: |
  Adapt makeitdone framework untuk AI coding agent OpenCode
created: 2026-04-06
owner: Ismail Alam
---

# Project Overview

## Vision

Extend makeitdone framework dari Claude Code ke OpenCode (dan potensial AI coding agents lain). Framework ini harus bisa beradaptasi dengan struktur command/agent yang berbeda di setiap runtime.

## Goals

- **Must have**: Opencode installer yang bisa convert makeitdone commands/agents ke format OpenCode
- **Must have**: Permission system di opencode terintegrasi dengan benar
- **Must have**: Framework bisa di-install ke `~/.config/opencode/` dengan struktur folder yang tepat

## Scope

**IN scope:**
- OpenCode runtime detection + installation path management
- Command format conversion (`:` → `-` slash commands)
- Frontmatter conversion (allowed-tools → permission, remove name/model)
- Path normalization (~/.claude → ~/.config/opencode)
- Agent format adaptation for OpenCode

**OUT of scope:**
- Support untuk runtime lain (Gemini, Kilo, Codex) di phase ini
- GUI installer (CLI-only untuk fase 1)

## Key Constraints

- **Timeline**: ~2 minggu (minimal viable OpenCode support)
- **Tech Stack**: TypeScript/Node.js, esbuild (sama dengan makeitdone v1), reference dari GSD installer
- **Team**: Solo (Ismail)

## Success Metrics

- ✅ Installer bisa accept `--opencode --global` flag dan install ke `~/.config/opencode/`
- ✅ Command files ter-convert dengan benar (`:` → `-`, frontmatter adjustments)
- ✅ `/mid-init` command bisa jalan di OpenCode
- ✅ Permissions di OpenCode settings.json ter-register otomatis
- ✅ Framework bisa di-test dengan real OpenCode session

## Dependencies

- GSD installer code (reference implementation)
- OpenCode runtime (for testing)
- Node.js 18+ (same as makeitdone)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| OpenCode API/format changes | High | Reference GSD impl, test early |
| Settings.json format undocumented | Medium | Reverse-engineer from GSD code |
| Path handling cross-OS issues | Medium | Test on macOS/Linux |

## Next Steps

See ROADMAP.md for phase breakdown and STATE.md for execution progress.
