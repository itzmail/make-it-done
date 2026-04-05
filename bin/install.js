#!/usr/bin/env node

import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { resolve, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const args = process.argv.slice(2)
const command = args[0] || 'interactive'

async function main() {
  // For now, only support Claude Code
  const runtime = args.includes('--claude') ? 'claude' : 'claude'
  const location = args.includes('--global') ? 'global' : args.includes('--local') ? 'local' : 'global'

  if (args.includes('--uninstall')) {
    uninstall(runtime, location)
    return
  }

  if (args.includes('--update')) {
    uninstall(runtime, location)
  }

  install(runtime, location)
}

function install(runtime, location) {
  const baseDir = location === 'global' ? resolve(homedir(), '.claude') : resolve(process.cwd(), '.claude')

  // Ensure base directory exists
  mkdirSync(baseDir, { recursive: true })

  const sourceDir = resolve(__dirname, '..')
  const targetMakeitdoneDir = resolve(baseDir, 'makeitdone')
  const targetCommandsDir = resolve(baseDir, 'commands', 'mid')
  const targetAgentsDir = resolve(baseDir, 'agents')

  try {
    // Copy makeitdone framework directory
    const makeitdoneSource = resolve(sourceDir, 'makeitdone')
    if (existsSync(makeitdoneSource)) {
      cpSync(makeitdoneSource, targetMakeitdoneDir, { recursive: true, force: true })
      console.log(`✅ Installed makeitdone framework to ${targetMakeitdoneDir}`)
    }

    // Copy commands directory
    const commandsSource = resolve(sourceDir, 'commands', 'mid')
    if (existsSync(commandsSource)) {
      mkdirSync(targetCommandsDir, { recursive: true })
      cpSync(commandsSource, targetCommandsDir, { recursive: true, force: true })
      console.log(`✅ Installed commands to ${targetCommandsDir}`)
    }

    // Copy agents directory
    const agentsSource = resolve(sourceDir, 'agents')
    if (existsSync(agentsSource)) {
      mkdirSync(targetAgentsDir, { recursive: true })
      cpSync(agentsSource, targetAgentsDir, { recursive: true, force: true })
      console.log(`✅ Installed agents to ${targetAgentsDir}`)
    }

    // Write install receipt
    const receipt = {
      version: getPackageVersion(),
      installedAt: new Date().toISOString(),
      runtime,
      location,
      baseDir
    }
    writeFileSync(
      resolve(targetMakeitdoneDir, '.install.json'),
      JSON.stringify(receipt, null, 2)
    )

    console.log(`\n✨ makeitdone installed successfully!`)
    console.log(`   Framework: ${targetMakeitdoneDir}`)
    console.log(`   Commands: ${targetCommandsDir}`)
    console.log(`   Agents: ${targetAgentsDir}`)
    console.log(`\nYou can now use: /mid:init, /mid:plan, /mid:do, etc.`)
  } catch (error) {
    console.error(`❌ Installation failed:`, error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

function uninstall(runtime, location) {
  const baseDir = location === 'global' ? resolve(homedir(), '.claude') : resolve(process.cwd(), '.claude')

  const dirs = [
    resolve(baseDir, 'makeitdone'),
    resolve(baseDir, 'commands', 'mid'),
    resolve(baseDir, 'agents')
  ]

  for (const dir of dirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
      console.log(`✅ Removed ${dir}`)
    }
  }

  console.log(`\n✨ makeitdone uninstalled`)
}

function getPackageVersion() {
  try {
    const pkgPath = resolve(__dirname, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return pkg.version || '0.1.0'
  } catch {
    return '0.1.0'
  }
}

main().catch(error => {
  console.error('Error:', error)
  process.exit(1)
})
