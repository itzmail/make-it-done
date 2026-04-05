import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { getConfigPath, getPlanningDir, readJSON } from '../utils'

export function configCommand(args: string[]) {
  const subcommand = args[0]

  switch (subcommand) {
    case 'get':
      configGet(args[1])
      break
    case 'set':
      configSet(args[1], args.slice(2).join(' '))
      break
    default:
      console.error(`Unknown config command: ${subcommand}`)
      console.error(`Usage: mid-tools config <get|set>`)
      process.exit(1)
  }
}

function configGet(key: string | undefined) {
  if (!key) {
    console.error(`Usage: mid-tools config get <key>`)
    process.exit(1)
  }

  const config = readJSON(getConfigPath()) as Record<string, unknown>
  const value = config[key]

  if (value === undefined) {
    console.log(``)
  } else if (typeof value === 'object') {
    console.log(JSON.stringify(value))
  } else {
    console.log(String(value))
  }
}

function configSet(key: string | undefined, value: string) {
  if (!key) {
    console.error(`Usage: mid-tools config set <key> <value>`)
    process.exit(1)
  }

  const configPath = getConfigPath()
  const planningDir = getPlanningDir()

  // Ensure .planning directory exists
  if (!existsSync(planningDir)) {
    mkdirSync(planningDir, { recursive: true })
  }

  const config = readJSON(configPath) as Record<string, unknown>

  // Parse value
  let parsedValue: unknown = value
  if (value === 'true') parsedValue = true
  else if (value === 'false') parsedValue = false
  else if (value === 'null') parsedValue = null
  else if (/^\d+$/.test(value)) parsedValue = parseInt(value, 10)
  else if (/^\d+\.\d+$/.test(value)) parsedValue = parseFloat(value)
  else if ((value.startsWith('[') || value.startsWith('{')) && (value.endsWith(']') || value.endsWith('}'))) {
    try {
      parsedValue = JSON.parse(value)
    } catch {
      // Keep as string
    }
  }

  config[key] = parsedValue
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
}
