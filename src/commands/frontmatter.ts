import { readFileSync, existsSync } from 'fs'
import { encode } from '@toon-format/toon'
import { extractFrontmatter } from '../utils'

export function frontmatterCommand(args: string[]) {
  const subcommand = args[0]

  switch (subcommand) {
    case 'get':
      frontmatterGet(args.slice(1))
      break
    case 'list':
      frontmatterList(args[1])
      break
    default:
      console.error(`Unknown frontmatter command: ${subcommand}`)
      console.error(`Usage: mid-tools fm <get|list>`)
      process.exit(1)
  }
}

function frontmatterGet(args: string[]) {
  const file = args[0]
  let field: string | null = null

  // Parse --field argument
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--field' && i + 1 < args.length) {
      field = args[i + 1]
      break
    }
  }

  if (!file) {
    console.error(`Usage: mid-tools fm get <file> --field <fieldname>`)
    process.exit(1)
  }

  if (!existsSync(file)) {
    console.error(`File not found: ${file}`)
    process.exit(1)
  }

  const content = readFileSync(file, 'utf-8')
  const fm = extractFrontmatter(content)

  if (!field) {
    console.error(`Usage: mid-tools fm get <file> --field <fieldname>`)
    process.exit(1)
  }

  const value = fm[field]
  if (value === undefined) {
    console.log(``)
  } else if (typeof value === 'object') {
    console.log(JSON.stringify(value))
  } else {
    console.log(String(value))
  }
}

function frontmatterList(file: string | undefined) {
  if (!file) {
    console.error(`Usage: mid-tools fm list <file>`)
    process.exit(1)
  }

  if (!existsSync(file)) {
    console.error(`File not found: ${file}`)
    process.exit(1)
  }

  const content = readFileSync(file, 'utf-8')
  const fm = extractFrontmatter(content)
  const toon = encode(fm, { keyFolding: 'safe', indent: 2 })
  console.log(toon)
}
