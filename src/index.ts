#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { cwd } from 'process'
import { toonEncode, toonDecode } from './commands/toon'
import { stateCommand } from './commands/state'
import { frontmatterCommand } from './commands/frontmatter'
import { roadmapCommand } from './commands/roadmap'
import { configCommand } from './commands/config'
import { initCommand } from './commands/init'

const args = process.argv.slice(2)

async function main() {
  if (args.length === 0) {
    printHelp()
    process.exit(0)
  }

  const command = args[0]
  const commandArgs = args.slice(1)

  try {
    switch (command) {
      case 'toon':
        await toonEncode(commandArgs)
        break
      case 'init':
        await initCommand(commandArgs)
        break
      case 'state':
        stateCommand(commandArgs)
        break
      case 'fm':
      case 'frontmatter':
        frontmatterCommand(commandArgs)
        break
      case 'roadmap':
        roadmapCommand(commandArgs)
        break
      case 'config':
        configCommand(commandArgs)
        break
      case 'help':
      case '--help':
      case '-h':
        printHelp()
        break
      default:
        console.error(`Unknown command: ${command}`)
        printHelp()
        process.exit(1)
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    } else {
      console.error(`Unknown error: ${error}`)
    }
    process.exit(1)
  }
}

function printHelp() {
  console.log(`
makeitdone tools — token-optimized utility for Claude Code orchestration

USAGE:
  mid-tools <command> [options]

COMMANDS:
  toon <file|->              Convert JSON to TOON or vice versa
                             Use '-' for stdin

  init <workflow> [phase]    Get workflow initialization payload (returns TOON)

  state <subcommand>         STATE.md operations
    get                      Read STATE.md as TOON
    set <key> <value>        Atomic field update
    advance <phase>          Mark phase as complete

  fm|frontmatter <subcommand>  YAML frontmatter operations
    get <file> --field <f>   Extract single frontmatter field
    list <file>              List all frontmatter fields (TOON)

  roadmap <subcommand>       ROADMAP.md queries
    phases                   List all phases (TOON)
    current                  Current active phase (TOON)
    phase <n>               Get phase details by number (TOON)

  config <subcommand>        .planning/config.json
    get <key>                Read config value
    set <key> <value>        Write config value

  help                       Show this help

EXAMPLES:
  node mid-tools.cjs toon data.json
  node mid-tools.cjs init execute 1
  node mid-tools.cjs state get
  node mid-tools.cjs roadmap phases
`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
