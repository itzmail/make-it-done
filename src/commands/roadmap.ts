import { readFileSync, existsSync } from 'fs'
import { encode } from '@toon-format/toon'
import { getRoadmapFile, extractFrontmatter } from '../utils'

export function roadmapCommand(args: string[]) {
  const subcommand = args[0]

  switch (subcommand) {
    case 'phases':
      roadmapPhases()
      break
    case 'current':
      roadmapCurrent()
      break
    case 'phase':
      roadmapPhase(args[1])
      break
    default:
      console.error(`Unknown roadmap command: ${subcommand}`)
      console.error(`Usage: mid-tools roadmap <phases|current|phase>`)
      process.exit(1)
  }
}

function roadmapPhases() {
  const roadmapFile = getRoadmapFile()
  if (!existsSync(roadmapFile)) {
    console.log(`phases[0]:`)
    return
  }

  const content = readFileSync(roadmapFile, 'utf-8')
  const phases = extractPhases(content)
  const toon = encode({ phases }, { keyFolding: 'safe', indent: 2 })
  console.log(toon)
}

function roadmapCurrent() {
  const roadmapFile = getRoadmapFile()
  if (!existsSync(roadmapFile)) {
    console.log(`phase_number: 0
phase_name: ""
status: pending`)
    return
  }

  const content = readFileSync(roadmapFile, 'utf-8')
  const phases = extractPhases(content)
  const currentPhase = phases.find(p => (p.status as string) !== 'complete') || phases[0]

  const toon = encode(currentPhase || {}, { keyFolding: 'safe', indent: 2 })
  console.log(toon)
}

function roadmapPhase(phaseNumber: string | undefined) {
  if (!phaseNumber) {
    console.error(`Usage: mid-tools roadmap phase <number>`)
    process.exit(1)
  }

  const roadmapFile = getRoadmapFile()
  if (!existsSync(roadmapFile)) {
    console.error(`ROADMAP.md not found at ${roadmapFile}`)
    process.exit(1)
  }

  const content = readFileSync(roadmapFile, 'utf-8')
  const phases = extractPhases(content)
  const num = parseInt(phaseNumber, 10)
  const phase = phases.find(p => (p.number as number) === num)

  if (!phase) {
    console.error(`Phase ${num} not found`)
    process.exit(1)
  }

  const toon = encode(phase, { keyFolding: 'safe', indent: 2 })
  console.log(toon)
}

interface Phase {
  number: number
  name: string
  status: string
  description?: string
}

function extractPhases(content: string): Phase[] {
  const phases: Phase[] = []
  const lines = content.split('\n')

  let phaseNumber = 0
  let phaseName = ''
  let phaseStatus = 'pending'

  for (const line of lines) {
    // Parse ROADMAP format: ## 01 - Phase Name [status]
    const phaseMatch = line.match(/^##\s+(\d+)\s*-\s*([^[\]]+)\s*\[([^\]]+)\]?/)
    if (phaseMatch) {
      if (phaseName) {
        phases.push({
          number: phaseNumber,
          name: phaseName,
          status: phaseStatus
        })
      }

      phaseNumber = parseInt(phaseMatch[1], 10)
      phaseName = phaseMatch[2].trim()
      phaseStatus = phaseMatch[3]?.toLowerCase() || 'pending'
    }
  }

  // Add last phase
  if (phaseName) {
    phases.push({
      number: phaseNumber,
      name: phaseName,
      status: phaseStatus
    })
  }

  return phases
}
