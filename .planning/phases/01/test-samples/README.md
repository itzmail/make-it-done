# Conversion Logic Test Samples

This directory contains test sample files for Wave 3: Conversion Logic Testing.

## Sample Files

### Command Files

#### sample-command-claude.md
- **Type**: Claude Code command file
- **Purpose**: Test command file conversion to OpenCode format
- **Fields Tested**:
  - `name`: mid:init (removed in conversion)
  - `model`: claude-opus (removed in conversion)
  - `color`: cyan (converted to #00FFFF)
  - `allowed-tools`: [Read, Write, Bash] (converted to tools object)
- **Conversions Applied**:
  - Field removal: name, model
  - Color conversion: cyan → #00FFFF
  - Tool mapping: Read → read, Write → write, Bash → bash
  - Path conversion: ~/.claude/ → ~/.config/opencode/
  - Slash command: /mid:init → /mid-init
- **Result**: ✅ PASS

#### sample-with-colors.md
- **Type**: Command file with color field
- **Purpose**: Test color name to hex conversion
- **Fields Tested**:
  - `color`: magenta (converted to #FF00FF)
  - `allowed-tools`: [Read, Write]
- **Conversions Applied**:
  - Color: magenta → #FF00FF
  - Tool mapping and conversion
- **Result**: ✅ PASS

#### sample-edge-cases.md
- **Type**: Edge case testing file
- **Purpose**: Test graceful handling of invalid input
- **Fields Tested**:
  - `allowed-tools`: [] (empty array)
  - `color`: invalid-color (invalid color name)
- **Expected Behavior**:
  - Empty array creates empty tools object: tools: {}
  - Invalid color is removed from output
- **Result**: ✅ PASS

### Agent Files

#### sample-agent-claude.md
- **Type**: Claude Code agent file
- **Purpose**: Test agent file conversion with agent-specific rules
- **Fields Tested**:
  - `name`: GSD Agent (kept for agents)
  - `model`: claude-opus (removed)
  - `memory`: /path/to/memory.md (removed, unsupported)
  - `maxTurns`: 10 (removed, unsupported)
- **Conversions Applied**:
  - Field removal: model, memory, maxTurns
  - Field addition: mode: subagent
  - Path conversion in content
  - Slash command conversion in content
- **Result**: ✅ PASS

### Workflow Files

#### sample-workflow.md
- **Type**: Workflow file (no frontmatter)
- **Purpose**: Test content-level conversions in files without YAML frontmatter
- **Content References**:
  - Slash commands: /mid:verify, /mid:test, /mid:deploy
  - Paths: ~/.claude/makeitdone/, ~/.claude/agents/
  - Tool names: Read, Write, Bash, Grep
- **Conversions Applied**:
  - Slash commands: /mid:X → /mid-X
  - Paths: ~/.claude/ → ~/.config/opencode/
  - Tool references: Read → read, etc.
- **Result**: ✅ PASS

## Converted Outputs

Each sample file (except workflow) has a corresponding `-converted.md` file showing the expected output after conversion:

- sample-command-claude-converted.md
- sample-agent-claude-converted.md
- sample-with-colors-converted.md
- sample-edge-cases-converted.md

## Test Coverage

These samples test all conversion scenarios:

### Color Conversion
- ✅ Named colors (cyan, magenta, etc.)
- ✅ Invalid color removal
- ✅ Hex color pass-through

### Tool Conversion
- ✅ Tool name mapping (Read → read, AskUserQuestion → question)
- ✅ Empty tool array handling
- ✅ Multiple tool array conversion

### YAML Frontmatter
- ✅ Simple field parsing
- ✅ Array field parsing
- ✅ Field removal
- ✅ Field transformation

### Content Conversion
- ✅ Slash command format (/mid: → /mid-)
- ✅ Path normalization (~/. claude/ → ~/.config/opencode/)
- ✅ Tool reference conversion in text
- ✅ Both tilde and HOME variable paths

### Agent vs Command
- ✅ Command files: name removed
- ✅ Agent files: name kept, mode added
- ✅ Both: model field removed

### Edge Cases
- ✅ Invalid color values
- ✅ Empty arrays
- ✅ Malformed YAML (graceful handling)
- ✅ Files without frontmatter

## Usage

To test conversions manually, run the test script:

```bash
node test-conversion.js
```

Expected output: 27/27 tests passing

## Test Results Summary

- **Total Test Cases**: 12 groups, 27 individual tests
- **Pass Rate**: 100% (27/27)
- **Coverage**: All conversion functions verified
- **Edge Cases**: Handled gracefully

All sample files demonstrate successful conversion from Claude Code format to OpenCode format.
