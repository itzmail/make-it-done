import { readFileSync } from 'fs'
import { encode, decode, type EncodeOptions } from '@toon-format/toon'

export async function toonEncode(args: string[]) {
  const file = args[0]

  if (!file || file === '--help' || file === '-h') {
    console.error(`USAGE: mid-tools toon <file|->`)
    process.exit(1)
  }

  let input: string

  if (file === '-') {
    // Read from stdin
    input = await readStdin()
  } else {
    // Read from file
    input = readFileSync(file, 'utf-8')
  }

  // Auto-detect format
  const isToon = input.trim().split('\n')[0]?.includes(':') && !input.startsWith('{') && !input.startsWith('[')

  try {
    if (isToon) {
      // TOON → JSON
      const decoded = decode(input)
      console.log(JSON.stringify(decoded, null, 2))
    } else {
      // JSON → TOON
      const parsed = JSON.parse(input)
      const encoded = encode(parsed, {
        indent: 2
      })
      console.log(encoded)
    }
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Parse error: ${error.message}`)
    } else if (error instanceof Error) {
      console.error(`Error: ${error.message}`)
    }
    process.exit(1)
  }
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('readable', () => {
      let chunk
      while ((chunk = process.stdin.read()) !== null) {
        data += chunk
      }
    })
    process.stdin.on('end', () => {
      resolve(data)
    })
    process.stdin.on('error', reject)
  })
}
