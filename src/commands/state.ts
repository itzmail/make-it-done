import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { encode } from '@toon-format/toon'
import { getStateFile, getPlanningDir, extractFrontmatter } from '../utils'

export function stateCommand(args: string[]) {
  const subcommand = args[0]

  switch (subcommand) {
    case 'get':
      stateGet()
      break
    case 'set':
      stateSet(args[1], args.slice(2).join(' '))
      break
    case 'advance':
      stateAdvance(args[1])
      break
    default:
      console.error(`Unknown state command: ${subcommand}`)
      console.error(`Usage: mid-tools state <get|set|advance>`)
      process.exit(1)
  }
}

function stateGet() {
  const stateFile = getStateFile()
  if (!existsSync(stateFile)) {
    // Return minimal TOON state
    console.log(`phase_number: 0
status: uninitialized`)
    return
  }

  const content = readFileSync(stateFile, 'utf-8')
  const fm = extractFrontmatter(content)
  const toon = encode(fm, { keyFolding: 'safe', indent: 2 })
  console.log(toon)
}

function stateSet(key: string, value: string) {
  const stateFile = getStateFile()
  const planningDir = getPlanningDir()

  // Ensure .planning directory exists
  if (!existsSync(planningDir)) {
    mkdirSync(planningDir, { recursive: true })
  }

  let content = ''
  let fm: Record<string, unknown> = {}

  // Read existing frontmatter
  if (existsSync(stateFile)) {
    content = readFileSync(stateFile, 'utf-8')
    fm = extractFrontmatter(content)

    // Extract body (content after frontmatter)
    const match = content.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/)
    content = match ? match[1] : ''
  }

  // Update value (try to parse as JSON if it looks like one)
  let parsedValue: unknown = value
  if (value === 'true') parsedValue = true
  else if (value === 'false') parsedValue = false
  else if (value === 'null') parsedValue = null
  else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10)
  else if (/^\d+\.\d+$/.test(value)) parsedValue = parseFloat(value)
  else if ((value.startsWith('[') || value.startsWith('{')) && value.endsWith(']') || value.endsWith('}')) {
    try {
      parsedValue = JSON.parse(value)
    } catch {
      // Keep as string
    }
  }

  fm[key] = parsedValue

  // Rebuild frontmatter
  const fmLines = Object.entries(fm).map(([k, v]) => {
    if (typeof v === 'string') {
      return `${k}: ${v}`
    } else if (v === null) {
      return `${k}:`
    } else if (typeof v === 'object') {
      return `${k}: ${JSON.stringify(v)}`
    } else {
      return `${k}: ${String(v)}`
    }
  })

  const newContent = `---\n${fmLines.join('\n')}\n---\n${content}`
  writeFileSync(stateFile, newContent, 'utf-8')
}

function stateAdvance(phase: string) {
  const stateFile = getStateFile()
  if (!existsSync(stateFile)) {
    console.error(`STATE.md not found at ${stateFile}`)
    process.exit(1)
  }

  stateSet('last_completed_phase', phase)
  console.log(`Advanced to phase: ${phase}`)
}
