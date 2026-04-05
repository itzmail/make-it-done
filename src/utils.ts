import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { homedir } from 'os'
import { cwd } from 'process'

export function getPlanningDir(): string {
  const local = resolve(cwd(), '.planning')
  if (existsSync(local)) {
    return local
  }

  // Fallback to project root if .planning doesn't exist yet
  return local
}

export function getConfigPath(): string {
  return resolve(getPlanningDir(), 'config.json')
}

export function getStateFile(): string {
  return resolve(getPlanningDir(), 'STATE.md')
}

export function getRoadmapFile(): string {
  return resolve(getPlanningDir(), 'ROADMAP.md')
}

export function readJSON(path: string): unknown {
  if (!existsSync(path)) {
    return {}
  }
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return {}
  }
}

export function readMarkdown(path: string): string {
  if (!existsSync(path)) {
    return ''
  }
  return readFileSync(path, 'utf-8')
}

export function extractFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) {
    return {}
  }

  const fm: Record<string, unknown> = {}
  const lines = match[1].split('\n')

  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.substring(0, colonIndex).trim()
    const value = line.substring(colonIndex + 1).trim()

    // Parse YAML-like values
    if (value === 'true') {
      fm[key] = true
    } else if (value === 'false') {
      fm[key] = false
    } else if (value === 'null' || value === '') {
      fm[key] = null
    } else if (/^\d+$/.test(value)) {
      fm[key] = parseInt(value, 10)
    } else if (/^\d+\.\d+$/.test(value)) {
      fm[key] = parseFloat(value)
    } else if (value.startsWith('[') && value.endsWith(']')) {
      try {
        fm[key] = JSON.parse(value)
      } catch {
        fm[key] = value
      }
    } else {
      fm[key] = value.replace(/^["']|["']$/g, '')
    }
  }

  return fm
}

export function getContextWindow(): number {
  try {
    const config = readJSON(getConfigPath()) as Record<string, unknown>
    return (config.context_window as number) || 200000
  } catch {
    return 200000
  }
}

export function getModelProfile(): string {
  try {
    const config = readJSON(getConfigPath()) as Record<string, unknown>
    return (config.model_profile as string) || 'balanced'
  } catch {
    return 'balanced'
  }
}
