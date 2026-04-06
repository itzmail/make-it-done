#!/usr/bin/env node

import { cpSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const args = process.argv.slice(2)
const command = args[0] || 'interactive'

// Color mapping: named colors to hex codes
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

// Tool name mapping: Claude Code to OpenCode
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

async function main() {
  const { runtimes, location } = parseRuntimeFlags(args)

  if (args.includes('--uninstall')) {
    for (const runtime of runtimes) {
      uninstall(runtime, location)
    }
    return
  }

  if (args.includes('--update')) {
    for (const runtime of runtimes) {
      uninstall(runtime, location)
    }
  }

  for (const runtime of runtimes) {
    install(runtime, location)
  }
}

/**
 * Parse runtime flags from command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {{runtimes: string[], location: 'global' | 'local'}}
 */
function parseRuntimeFlags(args) {
  const runtimes = []

  if (args.includes('--opencode')) runtimes.push('opencode')
  if (args.includes('--claude')) runtimes.push('claude')

  // Handle --both and --all
  if (args.includes('--both')) {
    runtimes.length = 0
    runtimes.push('claude', 'opencode')
  }
  if (args.includes('--all')) {
    runtimes.length = 0
    runtimes.push('claude', 'opencode')
  }

  // Default to claude if no runtime specified
  if (runtimes.length === 0) {
    runtimes.push('claude')
  }

  const location = args.includes('--global') ? 'global' : args.includes('--local') ? 'local' : 'global'

  return { runtimes: [...new Set(runtimes)], location }
}

/**
 * Get directory name for a runtime
 * @param {string} runtime - Runtime name ('claude', 'opencode', etc)
 * @returns {string}
 */
function getDirName(runtime) {
  switch (runtime) {
    case 'opencode':
      return '.opencode'
    case 'claude':
    default:
      return '.claude'
  }
}

/**
 * Get config path for a runtime and location
 * @param {string} runtime - Runtime name
 * @param {string} location - 'global' or 'local'
 * @returns {string}
 */
function getConfigPath(runtime, location) {
  if (location === 'local') {
    return resolve(process.cwd(), getDirName(runtime))
  }

  // Global install
  if (runtime === 'opencode') {
    // XDG Base Directory compliance
    const xdgConfig = process.env.XDG_CONFIG_HOME
    const baseConfigDir = xdgConfig || resolve(homedir(), '.config')
    return resolve(baseConfigDir, 'opencode')
  }

  // Claude Code: ~/.claude
  return resolve(homedir(), getDirName(runtime))
}

/**
 * Validate and convert color name to hex
 * @param {string} color - Color name or hex code
 * @returns {string} - Hex color code or empty string if invalid
 */
function convertColor(color) {
  if (!color) return ''

  // Already hex
  if (color.startsWith('#')) {
    return /^#[0-9A-Fa-f]{6}$/.test(color) ? color : ''
  }

  // Named color
  return COLOR_MAP[color.toLowerCase()] || ''
}

/**
 * Convert Claude Code tool name to OpenCode tool name
 * @param {string} toolName - Claude Code tool name
 * @returns {string}
 */
function convertToolName(toolName) {
  return TOOL_NAME_MAP[toolName] || toolName.toLowerCase()
}

/**
 * Parse YAML frontmatter from markdown content
 * @param {string} content - File content
 * @returns {{frontmatter: string, body: string}}
 */
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

/**
 * Parse YAML fields from frontmatter string
 * @param {string} frontmatter - Frontmatter content (between ---)
 * @returns {object}
 */
function parseFrontmatterFields(frontmatter) {
  const fields = {}
  const lines = frontmatter.split('\n')
  let i = 0

  // Skip opening ---
  if (lines[0].trim() === '---') i = 1

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '---' || line.trim() === '') {
      i++
      continue
    }

    // Parse field: value
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const field = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()

      // Check if this is an array field
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

/**
 * Build YAML frontmatter string from fields
 * @param {object} fields - Field key-value pairs
 * @returns {string}
 */
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
        // Nested object (for tools or permission structure)
        lines.push(`${key}:`)
        for (const [nestedKey, nestedValue] of Object.entries(value)) {
          if (typeof nestedValue === 'boolean') {
            // For tools object: {read: true, write: true}
            lines.push(`  ${nestedKey}: ${nestedValue}`)
          } else if (typeof nestedValue === 'object') {
            // For permission structure: {read: {path: "allow"}}
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

/**
 * Convert allowed-tools array to tools object for OpenCode commands
 * @param {string[]} tools - Array of tool names
 * @returns {object}
 */
function convertAllowedToolsToTools(tools) {
  const toolsObj = {}
  for (const tool of tools) {
    const mappedName = convertToolName(tool)
    toolsObj[mappedName] = true
  }
  return toolsObj
}

/**
 * Convert content for a specific runtime
 * @param {string} content - File content
 * @param {string} runtime - Target runtime
 * @param {object} options - Conversion options
 * @returns {string}
 */
function convertForRuntime(content, runtime, options = {}) {
  const { isAgent = false, pathPrefix = '~/.config/opencode' } = options

  if (runtime === 'claude') {
    // No conversion needed for Claude Code
    return content
  }

  if (runtime === 'opencode') {
    return convertToOpenCode(content, isAgent, pathPrefix)
  }

  return content
}

/**
 * Convert content to OpenCode format
 * @param {string} content - File content
 * @param {boolean} isAgent - Whether this is an agent file
 * @param {string} pathPrefix - Path prefix for permission paths
 * @returns {string}
 */
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

    // Remove fields not supported by OpenCode
    delete newFields['model']

    if (isAgent) {
      // For agents: keep name, remove tools, add mode
      delete newFields['tools']
      delete newFields['color']
      delete newFields['memory']
      delete newFields['maxTurns']
      delete newFields['permissionMode']
      delete newFields['disallowedTools']
      newFields['mode'] = 'subagent'
    } else {
      // For commands: remove name, convert allowed-tools to tools
      delete newFields['name']

      if (newFields['allowed-tools']) {
        const toolsArray = newFields['allowed-tools']
        const toolsObj = convertAllowedToolsToTools(toolsArray)
        delete newFields['allowed-tools']
        newFields['tools'] = toolsObj
      }

      // Convert color
      if (newFields['color']) {
        const hexColor = convertColor(newFields['color'])
        if (hexColor) {
          newFields['color'] = hexColor
        }
      }
    }

    newFrontmatter = buildFrontmatter(newFields)
  }

  return newFrontmatter + converted
}

/**
 * Update OpenCode settings.json with permission rules
 * @param {string} opencodeConfigDir - Path to OpenCode config directory
 */
function updateOpenCodeSettings(opencodeConfigDir) {
  const settingsPath = resolve(opencodeConfigDir, 'settings.json')
  const gsdPath = `${opencodeConfigDir === resolve(homedir(), '.config', 'opencode') ? '~/.config/opencode' : opencodeConfigDir}/makeitdone/*`

  let settings = {}

  // Read existing settings if present
  if (existsSync(settingsPath)) {
    try {
      const content = readFileSync(settingsPath, 'utf-8')
      // Strip JSONC comments
      const cleanJson = stripJsonComments(content)
      settings = JSON.parse(cleanJson)
    } catch (e) {
      console.warn(`Warning: Could not parse settings.json — using default structure`)
    }
  }

  // Ensure permission structure exists
  if (!settings.permission) {
    settings.permission = {}
  }
  if (!settings.permission.read) {
    settings.permission.read = {}
  }
  if (!settings.permission.external_directory) {
    settings.permission.external_directory = {}
  }

  // Register makeitdone paths
  settings.permission.read[gsdPath] = 'allow'
  settings.permission.external_directory[gsdPath] = 'allow'

  // Write updated settings
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')
}

/**
 * Strip JSON comments (for JSONC support)
 * @param {string} content - JSON content with possible comments
 * @returns {string}
 */
function stripJsonComments(content) {
  let result = ''
  let inString = false
  let i = 0

  while (i < content.length) {
    // Handle string literals
    if (content[i] === '"' && (i === 0 || content[i - 1] !== '\\')) {
      inString = !inString
      result += content[i]
      i++
      continue
    }

    // Skip comments if not in string
    if (!inString && content[i] === '/' && content[i + 1] === '/') {
      while (i < content.length && content[i] !== '\n') i++
      if (i < content.length) result += '\n'
      i++
      continue
    }

    result += content[i]
    i++
  }

  // Remove trailing commas before } or ]
  result = result.replace(/,(\s*[}\]])/g, '$1')

  return result
}

/**
 * Install makeitdone for a specific runtime
 * @param {string} runtime - Runtime name ('claude', 'opencode')
 * @param {string} location - Installation location ('global' or 'local')
 */
function install(runtime, location) {
  const baseDir = getConfigPath(runtime, location)

  try {
    // Ensure base directory exists
    mkdirSync(baseDir, { recursive: true })

    const sourceDir = resolve(__dirname, '..')
    const targetMakeitdoneDir = resolve(baseDir, 'makeitdone')
    // For OpenCode: commands go directly to commands/ (flattened), for Claude: commands/mid/
    const targetCommandsDir = runtime === 'opencode'
      ? resolve(baseDir, 'commands')
      : resolve(baseDir, 'commands', 'mid')
    const targetAgentsDir = resolve(baseDir, 'agents')

    // Copy makeitdone framework directory (no conversion needed)
    const makeitdoneSource = resolve(sourceDir, 'makeitdone')
    if (existsSync(makeitdoneSource)) {
      cpSync(makeitdoneSource, targetMakeitdoneDir, { recursive: true, force: true })
      console.log(`✅ Installed makeitdone framework to ${targetMakeitdoneDir}`)
    }

    // Copy and convert commands directory
    const commandsSource = resolve(sourceDir, 'commands', 'mid')
    if (existsSync(commandsSource)) {
      mkdirSync(targetCommandsDir, { recursive: true })
      installFilesWithConversion(
        commandsSource,
        targetCommandsDir,
        runtime,
        false, // isAgent
        baseDir,
        runtime === 'opencode' ? 'mid-' : null // prefix for OpenCode flattening
      )
      console.log(`✅ Installed commands to ${targetCommandsDir}`)
    }

    // Copy and convert agents directory
    const agentsSource = resolve(sourceDir, 'agents')
    if (existsSync(agentsSource)) {
      mkdirSync(targetAgentsDir, { recursive: true })
      installFilesWithConversion(
        agentsSource,
        targetAgentsDir,
        runtime,
        true, // isAgent
        baseDir
      )
      console.log(`✅ Installed agents to ${targetAgentsDir}`)
    }

    // Update OpenCode settings if needed
    if (runtime === 'opencode') {
      updateOpenCodeSettings(baseDir)
      console.log(`✅ Updated OpenCode settings.json with permissions`)
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

    const commandPrefix = runtime === 'opencode' ? '/mid-' : '/mid:'
    console.log(`\n✨ makeitdone installed successfully for ${runtime}!`)
    console.log(`   Framework: ${targetMakeitdoneDir}`)
    console.log(`   Commands: ${targetCommandsDir}`)
    console.log(`   Agents: ${targetAgentsDir}`)
    console.log(`\nYou can now use: ${commandPrefix}init, ${commandPrefix}plan, ${commandPrefix}do, etc.`)
  } catch (error) {
    console.error(`❌ Installation failed:`, error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

/**
 * Install files with content conversion for target runtime
 * @param {string} sourceDir - Source directory path
 * @param {string} targetDir - Target directory path
 * @param {string} runtime - Target runtime
 * @param {boolean} isAgent - Whether these are agent files
 * @param {string} baseDir - Base config directory
 * @param {string} filePrefix - Optional prefix for filenames (e.g. 'mid-' for OpenCode commands)
 */
function installFilesWithConversion(sourceDir, targetDir, runtime, isAgent, baseDir, filePrefix = null) {
  const files = readDirRecursive(sourceDir)

  for (const file of files) {
    const sourcePath = resolve(sourceDir, file)
    // For OpenCode commands: add mid- prefix (init.md → mid-init.md)
    let targetFileName = file
    if (filePrefix) {
      // Remove directory path separators and add prefix
      targetFileName = file.replace(/\//g, '-')
      if (!targetFileName.startsWith(filePrefix)) {
        targetFileName = filePrefix + targetFileName
      }
    }
    const targetPath = resolve(targetDir, targetFileName)

    // Ensure target directory exists
    mkdirSync(dirname(targetPath), { recursive: true })

    // Handle markdown files with conversion
    if (file.endsWith('.md')) {
      let content = readFileSync(sourcePath, 'utf-8')

      // Convert content for target runtime
      const pathPrefix = runtime === 'opencode' && baseDir === getConfigPath(runtime, 'global')
        ? '~/.config/opencode'
        : baseDir

      content = convertForRuntime(content, runtime, {
        isAgent,
        pathPrefix
      })

      writeFileSync(targetPath, content, 'utf-8')
    } else {
      // Copy non-markdown files as-is
      cpSync(sourcePath, targetPath, { force: true })
    }
  }
}

/**
 * Recursively read all files in a directory
 * @param {string} dir - Directory path
 * @returns {string[]} - Array of relative file paths
 */
function readDirRecursive(dir) {
  const files = []

  function walkDir(currentPath, prefix = '') {
    try {
      const entries = readdirSync(currentPath, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = resolve(currentPath, entry.name)
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name

        if (entry.isDirectory()) {
          walkDir(fullPath, relativePath)
        } else {
          files.push(relativePath)
        }
      }
    } catch (e) {
      console.warn(`Warning: Could not read directory ${currentPath}`)
    }
  }

  walkDir(dir)
  return files
}

/**
 * Uninstall makeitdone for a specific runtime
 * @param {string} runtime - Runtime name ('claude', 'opencode')
 * @param {string} location - Installation location ('global' or 'local')
 */
function uninstall(runtime, location) {
  const baseDir = getConfigPath(runtime, location)

  // For OpenCode: remove individual flattened command files (mid-init.md, mid-plan.md, etc)
  if (runtime === 'opencode') {
    const commandsDir = resolve(baseDir, 'commands')
    if (existsSync(commandsDir)) {
      const files = readdirSync(commandsDir)
      for (const file of files) {
        if (file.startsWith('mid-') && file.endsWith('.md')) {
          const filePath = resolve(commandsDir, file)
          rmSync(filePath, { force: true })
          console.log(`✅ Removed ${filePath}`)
        }
      }
    }
  }

  const dirs = [
    resolve(baseDir, 'makeitdone'),
    resolve(baseDir, 'commands', 'mid'),  // Claude Code: commands in mid/ folder
    resolve(baseDir, 'agents')
  ]

  for (const dir of dirs) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true })
      console.log(`✅ Removed ${dir}`)
    }
  }

  console.log(`\n✨ makeitdone uninstalled for ${runtime}`)
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
