import { existsSync, readFileSync } from 'fs'
import { encode } from '@toon-format/toon'
import { resolve, dirname } from 'path'
import { cwd } from 'process'
import { getPlanningDir, getRoadmapFile, extractFrontmatter, getContextWindow, getModelProfile, readMarkdown } from '../utils'

export async function initCommand(args: string[]) {
  const workflow = args[0]
  const phaseArg = args[1]

  if (!workflow) {
    console.error(`Usage: mid-tools init <workflow> [phase]`)
    process.exit(1)
  }

  const payload = getInitPayload(workflow, phaseArg)
  const toon = encode(payload, { keyFolding: 'safe', indent: 2 })
  console.log(toon)
}

interface InitPayload {
  workflow: string
  phase_number: number
  phase_name: string
  phase_dir: string
  plans: string[]
  incomplete_plans: string[]
  branch_name: string
  parallelization: boolean
  executor_model: string
  verifier_model: string
  context_window: number
  model_profile: string
}

function getInitPayload(workflow: string, phaseArg?: string): InitPayload {
  const planningDir = getPlanningDir()
  const contextWindow = getContextWindow()
  const modelProfile = getModelProfile()

  // Default phase number from argument or from STATE.md
  let phaseNumber = 1
  if (phaseArg) {
    phaseNumber = parseInt(phaseArg, 10) || 1
  }

  const phaseName = `Phase ${phaseNumber}`
  const phaseDir = resolve(planningDir, `phases`, `0${phaseNumber}`)
  const branchName = `phase-${phaseNumber}`

  // Get model routing
  const { executor, verifier } = routeModels(modelProfile)

  // Get plans from phase directory
  const { plans, incompletePlans } = getPlanList(phaseDir)

  // Determine parallelization
  const parallelization = incompletePlans.length > 1

  return {
    workflow,
    phase_number: phaseNumber,
    phase_name: phaseName,
    phase_dir: phaseDir,
    plans,
    incomplete_plans: incompletePlans,
    branch_name: branchName,
    parallelization,
    executor_model: executor,
    verifier_model: verifier,
    context_window: contextWindow,
    model_profile: modelProfile
  }
}

function routeModels(profile: string): { executor: string; verifier: string } {
  switch (profile) {
    case 'budget':
      return { executor: 'claude-haiku-4-5', verifier: 'claude-haiku-4-5' }
    case 'balanced':
      return { executor: 'claude-sonnet-4-6', verifier: 'claude-haiku-4-5' }
    case 'quality':
      return { executor: 'claude-opus-4-6', verifier: 'claude-sonnet-4-6' }
    default:
      return { executor: 'claude-sonnet-4-6', verifier: 'claude-haiku-4-5' }
  }
}

interface PlanList {
  plans: string[]
  incompletePlans: string[]
}

function getPlanList(phaseDir: string): PlanList {
  const plans: string[] = []
  const incompletePlans: string[] = []

  if (!existsSync(phaseDir)) {
    return { plans, incompletePlans }
  }

  // TODO: Read actual plans from phase directory
  // For now, return mock data
  const fs = require('fs')
  try {
    const files = fs.readdirSync(phaseDir)
    const planFiles = files.filter((f: string) => f.match(/^\d+-\d+-PLAN\.md$/))

    for (const file of planFiles) {
      plans.push(file)
      // Check if plan has a corresponding SUMMARY.md (indicates completion)
      const summaryFile = file.replace('PLAN', 'SUMMARY')
      if (!files.includes(summaryFile)) {
        incompletePlans.push(file)
      }
    }
  } catch {
    // Phase directory doesn't exist yet
  }

  return { plans, incompletePlans }
}
