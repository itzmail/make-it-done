#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { homedir } from 'os'

// Import from install.js - we'll extract just the functions we need
const COLOR_MAP = {
  cyan: '#00FFFF',
  red: '#FF0000',
  green: '#00FF00',
  blue: '#0000FF',
  yellow: '#FFFF00',
  magenta: '#FF00FF',
  orange: '#FFA500',
  purple: '#800080',
  pink: '#FFC0CB',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#808080',
  grey: '#808080'
}

const TOOL_NAME_MAP = {
  'Read': 'read',
  'Write': 'write',
  'Edit': 'edit',
  'Bash': 'bash',
  'Grep': 'grep',
  'Glob': 'glob',
  'Task': 'task',
  'WebFetch': 'webfetch',
  'WebSearch': 'websearch',
  'AskUserQuestion': 'question',
  'SlashCommand': 'skill',
  'TodoWrite': 'todowrite'
}

function convertColor(color) {
  if (!color) return ''
  if (color.startsWith('#')) {
    return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : ''
  }
  return COLOR_MAP[color.toLowerCase()] || ''
}

function convertToolName(toolName) {
  return TOOL_NAME_MAP[toolName] || toolName.toLowerCase()
}

function parseFrontmatter(content) {
  if (!content.startsWith('---')) {
    return { frontmatter: '', body: content }
  }

  const lines = content.split('\n')
  let endIndex = -1

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i
      break
    }
  }

  if (endIndex === -1) {
    return { frontmatter: '', body: content }
  }

  const frontmatter = lines.slice(0, endIndex + 1).join('\n')
  const body = lines.slice(endIndex + 1).join('\n')

  return { frontmatter, body }
}

function parseFrontmatterFields(frontmatter) {
  const fields = {}
  const lines = frontmatter.split('\n')
  let i = 0

  if (lines[0].trim() === '---') i = 1

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '---' || line.trim() === '') {
      i++
      continue
    }

    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const field = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()

      if (i + 1 < lines.length && lines[i + 1].trim().startsWith('- ')) {
        const array = []
        i++
        while (i < lines.length && lines[i].trim().startsWith('- ')) {
          const itemValue = lines[i].trim().substring(2).trim()
          array.push(itemValue)
          i++
        }
        fields[field] = array
        continue
      }

      fields[field] = value
    }

    i++
  }

  return fields
}

function buildFrontmatter(fields) {
  const lines = ['---']

  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === 'string') {
      lines.push(`${key}: ${value}`)
    } else if (typeof value === 'boolean') {
      lines.push(`${key}: ${value}`)
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        lines.push(`${key}:`)
        for (const item of value) {
          lines.push(`  - ${item}`)
        }
      } else {
        lines.push(`${key}:`)
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (typeof nestedValue === 'boolean') {
            lines.push(`  ${nestedKey}: ${nestedValue}`)
          } else if (typeof nestedValue === 'object') {
            lines.push(`  ${nestedKey}:`)
            for (const [path, permission] of Object.entries(nestedValue)) {
              lines.push(`    "${path}": "${permission}"`)
            }
          }
        }
      }
    }
  }

  lines.push('---')
  return lines.join('\n')
}

function convertAllowedToolsToTools(tools) {
  const toolsObj = {}
  for (const tool of tools) {
    const mappedName = convertToolName(tool)
    toolsObj[mappedName] = true
  }
  return toolsObj
}

function convertToOpenCode(content, isAgent = false, pathPrefix = '~/.config/opencode') {
  const { frontmatter, body } = parseFrontmatter(content)

  let converted = body

  // 1. Replace slash command format: /mid: → /mid-
  converted = converted.replace(/\/mid:/g, '/mid-')
  converted = converted.replace(/\/gsd:/g, '/gsd-')

  // 2. Replace paths
  converted = converted.replace(/~\/\.claude\b/g, pathPrefix)
  converted = converted.replace(/\$HOME\/\.claude\b/g, `$HOME${pathPrefix.substring(1)}`)

  // 3. Replace tool name references in text
  for (const [claudeName, opencodeeName] of Object.entries(TOOL_NAME_MAP)) {
    const regex = new RegExp(`\\b${claudeName}\\b`, 'g')
    converted = converted.replace(regex, opencodeeName)
  }

  // 4. Convert frontmatter
  let newFrontmatter = frontmatter
  if (frontmatter) {
    const fields = parseFrontmatterFields(frontmatter)
    const newFields = { ...fields }

    delete newFields['model']

    if (isAgent) {
      delete newFields['tools']
      delete newFields['color']
      delete newFields['memory']
      delete newFields['maxTurns']
      delete newFields['permissionMode']
      delete newFields['disallowedTools']
      newFields['mode'] = 'subagent'
    } else {
      delete newFields['name']

      if (newFields['allowed-tools']) {
        const toolsArray = newFields['allowed-tools']
        const toolsObj = convertAllowedToolsToTools(toolsArray)
        delete newFields['allowed-tools']
        newFields['tools'] = toolsObj
      }

      if (newFields['color']) {
        const hexColor = convertColor(newFields['color'])
        if (hexColor) {
          newFields['color'] = hexColor
        } else {
          delete newFields['color']
        }
      }
    }

    newFrontmatter = buildFrontmatter(newFields)
  }

  return newFrontmatter + converted
}

// Test harness
class TestRunner {
  constructor() {
    this.tests = []
    this.passed = 0
    this.failed = 0
  }

  test(name, fn) {
    try {
      fn()
      console.log(`  ✅ ${name}`)
      this.passed++
    } catch (e) {
      console.log(`  ❌ ${name}`)
      console.log(`     Error: ${e.message}`)
      this.failed++
    }
  }

  assertEqual(actual, expected, message) {
    if (actual !== expected) {
      throw new Error(`${message}\n     Expected: ${JSON.stringify(expected)}\n     Got: ${JSON.stringify(actual)}`)
    }
  }

  assertTrue(value, message) {
    if (!value) {
      throw new Error(message)
    }
  }

  assertInclude(haystack, needle, message) {
    if (!haystack.includes(needle)) {
      throw new Error(`${message}\n     String does not include: ${needle}`)
    }
  }

  summary() {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Test Summary: ${this.passed} passed, ${this.failed} failed`)
    console.log(`${'='.repeat(60)}\n`)
    return this.failed === 0
  }
}

// Run tests
const runner = new TestRunner()

console.log('\n' + '='.repeat(60))
console.log('CONVERSION LOGIC TEST SUITE')
console.log('='.repeat(60) + '\n')

// Test 1: Color Conversion
console.log('Test 1: Color Conversion')
runner.test('cyan to hex', () => {
  runner.assertEqual(convertColor('cyan'), '#00FFFF', 'cyan conversion failed')
})
runner.test('magenta to hex', () => {
  runner.assertEqual(convertColor('magenta'), '#FF00FF', 'magenta conversion failed')
})
runner.test('invalid color returns empty', () => {
  runner.assertEqual(convertColor('invalid-color'), '', 'invalid color should return empty')
})
runner.test('hex color passes through', () => {
  runner.assertEqual(convertColor('#FF1234'), '#FF1234', 'hex color should pass through')
})
runner.test('invalid hex returns empty', () => {
  runner.assertEqual(convertColor('#ZZZZZZ'), '', 'invalid hex should return empty')
})

// Test 2: Tool Name Conversion
console.log('\nTest 2: Tool Name Conversion')
runner.test('Read to read', () => {
  runner.assertEqual(convertToolName('Read'), 'read', 'Read conversion failed')
})
runner.test('AskUserQuestion to question', () => {
  runner.assertEqual(convertToolName('AskUserQuestion'), 'question', 'AskUserQuestion conversion failed')
})
runner.test('unknown tool lowercase', () => {
  runner.assertEqual(convertToolName('UnknownTool'), 'unknowntool', 'unknown tool should lowercase')
})

// Test 3: Frontmatter Parsing
console.log('\nTest 3: Frontmatter Parsing')
runner.test('parse simple frontmatter', () => {
  const content = '---\nname: test\nmodel: claude\n---\nBody here'
  const { frontmatter, body } = parseFrontmatter(content)
  runner.assertTrue(frontmatter.includes('name: test'), 'frontmatter should include name')
  runner.assertEqual(body.trim(), 'Body here', 'body should be extracted')
})
runner.test('parse frontmatter with array', () => {
  const content = '---\nallowed-tools:\n  - Read\n  - Write\n---\nBody'
  const { frontmatter } = parseFrontmatter(content)
  runner.assertTrue(frontmatter.includes('allowed-tools'), 'frontmatter should include allowed-tools')
})
runner.test('no frontmatter returns empty', () => {
  const content = 'Just body content'
  const { frontmatter, body } = parseFrontmatter(content)
  runner.assertEqual(frontmatter, '', 'frontmatter should be empty')
  runner.assertEqual(body, 'Just body content', 'body should be full content')
})

// Test 4: Frontmatter Field Parsing
console.log('\nTest 4: Frontmatter Field Parsing')
runner.test('parse scalar field', () => {
  const frontmatter = '---\nname: test\nmodel: claude\n---'
  const fields = parseFrontmatterFields(frontmatter)
  runner.assertEqual(fields.name, 'test', 'name field should be parsed')
  runner.assertEqual(fields.model, 'claude', 'model field should be parsed')
})
runner.test('parse array field', () => {
  const frontmatter = '---\nallowed-tools:\n  - Read\n  - Write\n---'
  const fields = parseFrontmatterFields(frontmatter)
  runner.assertTrue(Array.isArray(fields['allowed-tools']), 'allowed-tools should be array')
  runner.assertEqual(fields['allowed-tools'].length, 2, 'should have 2 tools')
})

// Test 5: Build Frontmatter
console.log('\nTest 5: Build Frontmatter')
runner.test('build simple frontmatter', () => {
  const fields = { name: 'test', model: 'claude' }
  const frontmatter = buildFrontmatter(fields)
  runner.assertTrue(frontmatter.includes('name: test'), 'should include name')
  runner.assertTrue(frontmatter.startsWith('---'), 'should start with ---')
  runner.assertTrue(frontmatter.endsWith('---'), 'should end with ---')
})
runner.test('build frontmatter with array', () => {
  const fields = { tools: ['read', 'write'] }
  const frontmatter = buildFrontmatter(fields)
  runner.assertInclude(frontmatter, '- read', 'should include array items')
})

// Test 6: Allowed Tools Conversion
console.log('\nTest 6: Allowed Tools Conversion')
runner.test('convert tools array', () => {
  const tools = ['Read', 'Write', 'Bash']
  const result = convertAllowedToolsToTools(tools)
  runner.assertEqual(result.read, true, 'read should be true')
  runner.assertEqual(result.write, true, 'write should be true')
  runner.assertEqual(result.bash, true, 'bash should be true')
})
runner.test('empty tools array', () => {
  const tools = []
  const result = convertAllowedToolsToTools(tools)
  runner.assertEqual(Object.keys(result).length, 0, 'empty array should result in empty object')
})

// Test 7: Full Command Conversion
console.log('\nTest 7: Full Command Conversion (Command File)')
runner.test('convert command file', () => {
  const content = `---
name: mid:init
model: claude-opus
color: cyan
allowed-tools:
  - Read
  - Write
---

Use /mid:test command here.

Reference: ~/.claude/makeitdone/`

  const result = convertToOpenCode(content, false)
  runner.assertTrue(!result.includes('name: mid:init'), 'name field should be removed')
  runner.assertTrue(!result.includes('model:'), 'model field should be removed')
  runner.assertTrue(result.includes('color: #00FFFF'), 'color should be converted to hex')
  runner.assertTrue(result.includes('read: true'), 'allowed-tools should convert to tools')
  runner.assertTrue(result.includes('/mid-test'), 'slash command should convert')
  runner.assertTrue(result.includes('~/.config/opencode/makeitdone/'), 'path should be converted')
})

// Test 8: Full Agent Conversion
console.log('\nTest 8: Full Agent Conversion (Agent File)')
runner.test('convert agent file', () => {
  const content = `---
name: GSD Agent
model: claude-opus
memory: /path/to/memory.md
maxTurns: 10
---

Agent description here.`

  const result = convertToOpenCode(content, true)
  runner.assertTrue(!result.includes('model:'), 'model field should be removed')
  runner.assertTrue(!result.includes('memory:'), 'memory field should be removed')
  runner.assertTrue(!result.includes('maxTurns:'), 'maxTurns field should be removed')
  runner.assertTrue(result.includes('mode: subagent'), 'mode field should be added')
})

// Test 9: Path Normalization
console.log('\nTest 9: Path Normalization')
runner.test('replace tilde path', () => {
  const content = 'Config: ~/.claude/makeitdone/'
  const result = convertToOpenCode(content, false)
  runner.assertTrue(result.includes('~/.config/opencode/makeitdone/'), 'tilde path should be replaced')
})
runner.test('replace HOME var path', () => {
  const content = 'Config: $HOME/.claude/makeitdone/'
  const result = convertToOpenCode(content, false)
  runner.assertTrue(result.includes('$HOME/.config/opencode/makeitdone/'), 'HOME var path should be replaced')
})

// Test 10: Slash Command Format
console.log('\nTest 10: Slash Command Format')
runner.test('convert /mid: to /mid-', () => {
  const content = 'Use `/mid:init` or `/mid:do` commands.'
  const result = convertToOpenCode(content, false)
  runner.assertTrue(result.includes('/mid-init'), 'should convert /mid:init')
  runner.assertTrue(result.includes('/mid-do'), 'should convert /mid:do')
})
runner.test('convert /gsd: to /gsd-', () => {
  const content = 'Use `/gsd:workflow` command.'
  const result = convertToOpenCode(content, false)
  runner.assertTrue(result.includes('/gsd-workflow'), 'should convert /gsd:workflow')
})

// Test 11: Tool Reference Conversion in Text
console.log('\nTest 11: Tool Reference Conversion in Text')
runner.test('convert AskUserQuestion in text', () => {
  const content = 'Using AskUserQuestion tool for input.'
  const result = convertToOpenCode(content, false)
  runner.assertTrue(result.includes('question'), 'AskUserQuestion should convert to question')
})
runner.test('convert multiple tool references', () => {
  const content = 'Uses Read, Write, and Bash tools.'
  const result = convertToOpenCode(content, false)
  runner.assertTrue(result.includes('read'), 'Read should convert')
  runner.assertTrue(result.includes('write'), 'Write should convert')
  runner.assertTrue(result.includes('bash'), 'Bash should convert')
})

// Test 12: Edge Cases
console.log('\nTest 12: Edge Cases')
runner.test('invalid color is removed', () => {
  const content = `---
name: test
color: not-a-color
---
Body`
  const result = convertToOpenCode(content, false)
  runner.assertTrue(!result.includes('color:'), 'invalid color should be removed')
})
runner.test('empty allowed-tools creates empty tools object', () => {
  const content = `---
name: test
allowed-tools: []
---
Body`
  const result = convertToOpenCode(content, false)
  runner.assertTrue(result.includes('tools:'), 'tools field should exist')
  runner.assertTrue(!result.includes('- '), 'should have no array items')
})

// Print summary
const allPassed = runner.summary()
process.exit(allPassed ? 0 : 1)
