---
name: mid:colorize
color: magenta
allowed-tools:
  - Read
  - Write
---

# Colorize Output

Demonstrates color field conversion.

## Color Mapping

When converted to OpenCode, the named color `magenta` becomes `#FF00FF`.

## Supported colors

The installer converts these named colors to hex:
- cyan → #00FFFF
- red → #FF0000
- green → #00FF00
- blue → #0000FF
- yellow → #FFFF00
- magenta → #FF00FF
- orange → #FFA500
- purple → #800080
- pink → #FFC0CB
- white → #FFFFFF
- black → #000000
- gray/grey → #808080

## Already hex colors

If color is already hex like `#FF1234`, it passes through unchanged.

## Invalid colors

Invalid color names become empty string (removed from frontmatter).
