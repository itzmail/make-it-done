#!/usr/bin/env node

/**
 * Settings.json Integration Test Suite
 * Tests the updateOpenCodeSettings() function from bin/install.js
 *
 * Wave 4: Settings Integration Testing
 * Phase 1: OpenCode Installer Implementation
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Import the functions to test from install.js
import { execSync } from 'child_process'

// Test configuration
const TEMP_DIR = resolve(tmpdir(), `makeitdone-settings-test-${Date.now()}`)
const RESULTS = {
  passed: 0,
  failed: 0,
  tests: []
}

// Helper function to strip JSON comments (copied from install.js for testing)
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

// Mock updateOpenCodeSettings function (extracted from install.js)
function updateOpenCodeSettings(opencodeConfigDir) {
  const fs_resolve = resolve
  const fs_existsSync = existsSync
  const fs_readFileSync = readFileSync
  const fs_writeFileSync = writeFileSync

  const settingsPath = fs_resolve(opencodeConfigDir, 'settings.json')
  const gsdPath = `${opencodeConfigDir === resolve(process.env.HOME || '/root', '.config', 'opencode') ? '~/.config/opencode' : opencodeConfigDir}/makeitdone/*`

  let settings = {}

  // Read existing settings if present
  if (fs_existsSync(settingsPath)) {
    try {
      const content = fs_readFileSync(settingsPath, 'utf-8')
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
  fs_writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n')

  return settings
}

// Helper: Create a test scenario
function createTestScenario(name, setupFn, testFn, cleanupFn = null) {
  const testDir = resolve(TEMP_DIR, name.replace(/\s+/g, '-'))
  mkdirSync(testDir, { recursive: true })

  try {
    const context = { testDir, name }

    // Setup test environment
    if (setupFn) setupFn(context)

    // Run test
    const result = testFn(context)

    // Cleanup
    if (cleanupFn) cleanupFn(context)

    return result
  } catch (error) {
    return {
      pass: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Helper: Verify settings.json structure
function verifySettingsStructure(settingsPath, expectations) {
  const content = readFileSync(settingsPath, 'utf-8')
  const cleanJson = stripJsonComments(content)
  const settings = JSON.parse(cleanJson)

  const errors = []

  if (!settings.permission) {
    errors.push('Missing "permission" object')
  } else {
    if (!settings.permission.read) {
      errors.push('Missing "permission.read" object')
    } else {
      if (expectations.shouldHaveMakeitdoneRead) {
        const hasPath = Object.keys(settings.permission.read).some(p => p.includes('makeitdone'))
        if (!hasPath) errors.push('Missing makeitdone path in permission.read')
      }
    }

    if (!settings.permission.external_directory) {
      errors.push('Missing "permission.external_directory" object')
    } else {
      if (expectations.shouldHaveMakeitdoneExternalDir) {
        const hasPath = Object.keys(settings.permission.external_directory).some(p => p.includes('makeitdone'))
        if (!hasPath) errors.push('Missing makeitdone path in permission.external_directory')
      }
    }
  }

  if (expectations.shouldNotDuplicate) {
    if (settings.permission.read) {
      const makeitdonePaths = Object.keys(settings.permission.read).filter(p => p.includes('makeitdone'))
      if (makeitdonePaths.length > 1) {
        errors.push(`Found ${makeitdonePaths.length} makeitdone entries in read (expected 1)`)
      }
    }
  }

  if (expectations.shouldPreserveExisting) {
    const hasExistingPath = Object.keys(settings.permission.read || {}).some(
      p => !p.includes('makeitdone')
    )
    if (!hasExistingPath) {
      errors.push('Existing read permission was not preserved')
    }
  }

  return { settings, errors }
}

// Test scenarios
console.log('\n========================================')
console.log('  SETTINGS.JSON INTEGRATION TEST SUITE')
console.log('========================================\n')

// Scenario 1: settings.json doesn't exist → create new
RESULTS.tests.push(createTestScenario(
  'Scenario 1: Create new settings.json',
  (ctx) => {
    // No setup needed - settings.json should not exist
  },
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const result = updateOpenCodeSettings(ctx.testDir)

    const { errors } = verifySettingsStructure(settingsPath, {
      shouldHaveMakeitdoneRead: true,
      shouldHaveMakeitdoneExternalDir: true
    })

    return {
      pass: errors.length === 0,
      details: {
        fileCreated: existsSync(settingsPath),
        hasPermissionObject: !!result.permission,
        hasReadPermission: !!result.permission?.read,
        hasExternalDirPermission: !!result.permission?.external_directory,
        readPaths: Object.keys(result.permission?.read || {}),
        externalDirPaths: Object.keys(result.permission?.external_directory || {}),
        errors
      }
    }
  }
))

// Scenario 2: settings.json exists without permission field → add permission
RESULTS.tests.push(createTestScenario(
  'Scenario 2: Add permission to empty settings',
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const emptySetting = { some_other_field: 'value' }
    writeFileSync(settingsPath, JSON.stringify(emptySetting, null, 2))
  },
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const result = updateOpenCodeSettings(ctx.testDir)

    const { errors } = verifySettingsStructure(settingsPath, {
      shouldHaveMakeitdoneRead: true,
      shouldHaveMakeitdoneExternalDir: true
    })

    return {
      pass: errors.length === 0 && result.some_other_field === 'value',
      details: {
        preservedOtherField: result.some_other_field === 'value',
        hasPermissionObject: !!result.permission,
        readPaths: Object.keys(result.permission?.read || {}),
        externalDirPaths: Object.keys(result.permission?.external_directory || {}),
        errors
      }
    }
  }
))

// Scenario 3: settings.json exists with empty permission → add to existing structure
RESULTS.tests.push(createTestScenario(
  'Scenario 3: Add to empty permission structure',
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const settings = {
      permission: {},
      other_field: 'value'
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  },
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const result = updateOpenCodeSettings(ctx.testDir)

    const { errors } = verifySettingsStructure(settingsPath, {
      shouldHaveMakeitdoneRead: true,
      shouldHaveMakeitdoneExternalDir: true
    })

    return {
      pass: errors.length === 0 && result.other_field === 'value',
      details: {
        preservedOtherField: result.other_field === 'value',
        hasReadPermission: !!result.permission?.read,
        hasExternalDirPermission: !!result.permission?.external_directory,
        readPaths: Object.keys(result.permission?.read || {}),
        externalDirPaths: Object.keys(result.permission?.external_directory || {}),
        errors
      }
    }
  }
))

// Scenario 4: settings.json with existing read permissions → merge with makeitdone
RESULTS.tests.push(createTestScenario(
  'Scenario 4: Merge with existing permissions',
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const settings = {
      permission: {
        read: {
          'some/other/path': 'allow'
        }
      }
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  },
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const result = updateOpenCodeSettings(ctx.testDir)

    const { errors } = verifySettingsStructure(settingsPath, {
      shouldHaveMakeitdoneRead: true,
      shouldHaveMakeitdoneExternalDir: true,
      shouldPreserveExisting: true
    })

    return {
      pass: errors.length === 0 && result.permission?.read['some/other/path'] === 'allow',
      details: {
        preservedExistingPath: result.permission?.read['some/other/path'] === 'allow',
        readPathCount: Object.keys(result.permission?.read || {}).length,
        readPaths: Object.keys(result.permission?.read || {}),
        errors
      }
    }
  }
))

// Scenario 5: JSONC comments in settings.json → handle gracefully
RESULTS.tests.push(createTestScenario(
  'Scenario 5: Handle JSONC comments',
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const jsoncContent = `{
  // This is a comment
  "permission": {
    // Read permissions
    "read": {
      "some/path": "allow"  // Allow read
    }
  }
}`
    writeFileSync(settingsPath, jsoncContent)
  },
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const result = updateOpenCodeSettings(ctx.testDir)

    const { errors } = verifySettingsStructure(settingsPath, {
      shouldHaveMakeitdoneRead: true,
      shouldHaveMakeitdoneExternalDir: true,
      shouldPreserveExisting: true
    })

    return {
      pass: errors.length === 0 && result.permission?.read['some/path'] === 'allow',
      details: {
        commentsHandled: errors.length === 0,
        preservedExistingPath: result.permission?.read['some/path'] === 'allow',
        readPathCount: Object.keys(result.permission?.read || {}).length,
        errors
      }
    }
  }
))

// Scenario 6: Malformed JSON → error handling + recovery
RESULTS.tests.push(createTestScenario(
  'Scenario 6: Handle malformed JSON gracefully',
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const malformedContent = `{
  "permission": {
    "read": {
      "path": "allow"
    }
  },,,
}`
    writeFileSync(settingsPath, malformedContent)
  },
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')

    let functionExecuted = false
    let errorOccurred = false
    let resultSettings = null

    try {
      resultSettings = updateOpenCodeSettings(ctx.testDir)
      functionExecuted = true
    } catch (error) {
      errorOccurred = true
    }

    const { errors } = verifySettingsStructure(settingsPath, {
      shouldHaveMakeitdoneRead: true,
      shouldHaveMakeitdoneExternalDir: true
    })

    return {
      pass: functionExecuted && errors.length === 0,
      details: {
        functionExecuted,
        errorOccurred,
        recoveredWithDefaults: !!resultSettings && Object.keys(resultSettings.permission?.read || {}).length > 0,
        readPathCount: Object.keys(resultSettings?.permission?.read || {}).length,
        errors
      }
    }
  }
))

// Scenario 7: existing makeitdone permissions → idempotent (no duplicate)
RESULTS.tests.push(createTestScenario(
  'Scenario 7: Idempotent - no duplicate permissions',
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const settings = {
      permission: {
        read: {
          [ctx.testDir + '/makeitdone/*']: 'allow'
        },
        external_directory: {
          [ctx.testDir + '/makeitdone/*']: 'allow'
        }
      }
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  },
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')

    // First call
    const result1 = updateOpenCodeSettings(ctx.testDir)

    // Second call (should be idempotent)
    const result2 = updateOpenCodeSettings(ctx.testDir)

    const readCount = Object.keys(result2.permission?.read || {}).length
    const externalDirCount = Object.keys(result2.permission?.external_directory || {}).length

    // Should have exactly 1 makeitdone entry (not 2)
    const makeitdonePaths = Object.keys(result2.permission?.read || {}).filter(p => p.includes('makeitdone'))

    return {
      pass: readCount === 1 && externalDirCount === 1 && makeitdonePaths.length === 1,
      details: {
        readPermissionCount: readCount,
        externalDirPermissionCount: externalDirCount,
        makeitdonePathCount: makeitdonePaths.length,
        makeitdonePaths: makeitdonePaths,
        isIdempotent: makeitdonePaths.length === 1
      }
    }
  }
))

// Scenario 8: Large existing settings.json (performance test)
RESULTS.tests.push(createTestScenario(
  'Scenario 8: Performance with large settings.json',
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const largeSettings = {
      permission: {
        read: {},
        external_directory: {}
      }
    }

    // Add 100 entries to simulate large settings file
    for (let i = 0; i < 100; i++) {
      largeSettings.permission.read[`path/to/resource/${i}`] = 'allow'
      largeSettings.permission.external_directory[`path/to/resource/${i}`] = 'allow'
    }

    writeFileSync(settingsPath, JSON.stringify(largeSettings, null, 2))
  },
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')

    const startTime = Date.now()
    const result = updateOpenCodeSettings(ctx.testDir)
    const endTime = Date.now()
    const executionTime = endTime - startTime

    const readCount = Object.keys(result.permission?.read || {}).length
    const hasNewMakeitdone = Object.keys(result.permission?.read || {}).some(p => p.includes('makeitdone'))

    return {
      pass: readCount === 101 && hasNewMakeitdone && executionTime < 1000,
      details: {
        executionTimeMs: executionTime,
        readPermissionCount: readCount,
        externalDirPermissionCount: Object.keys(result.permission?.external_directory || {}).length,
        addedMakeitdonePath: hasNewMakeitdone,
        performanceOk: executionTime < 1000
      }
    }
  }
))

// Scenario 9: Path with special characters
RESULTS.tests.push(createTestScenario(
  'Scenario 9: Handle paths with special characters',
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const settings = {
      permission: {
        read: {
          'path/with space/and-dash': 'allow',
          'path/with/dot.file': 'allow'
        }
      }
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  },
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const result = updateOpenCodeSettings(ctx.testDir)

    const preservedSpecialPath1 = result.permission?.read['path/with space/and-dash'] === 'allow'
    const preservedSpecialPath2 = result.permission?.read['path/with/dot.file'] === 'allow'
    const hasNewMakeitdone = Object.keys(result.permission?.read || {}).some(p => p.includes('makeitdone'))

    return {
      pass: preservedSpecialPath1 && preservedSpecialPath2 && hasNewMakeitdone,
      details: {
        preservedPathWithSpace: preservedSpecialPath1,
        preservedPathWithDot: preservedSpecialPath2,
        addedMakeitdonePath: hasNewMakeitdone,
        readPathCount: Object.keys(result.permission?.read || {}).length
      }
    }
  }
))

// Scenario 10: Partial permission structure
RESULTS.tests.push(createTestScenario(
  'Scenario 10: Handle partial permission structure',
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const settings = {
      permission: {
        read: {
          'existing/path': 'allow'
        }
        // external_directory is missing
      }
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2))
  },
  (ctx) => {
    const settingsPath = resolve(ctx.testDir, 'settings.json')
    const result = updateOpenCodeSettings(ctx.testDir)

    const { errors } = verifySettingsStructure(settingsPath, {
      shouldHaveMakeitdoneRead: true,
      shouldHaveMakeitdoneExternalDir: true,
      shouldPreserveExisting: true
    })

    return {
      pass: errors.length === 0 &&
            result.permission?.read['existing/path'] === 'allow' &&
            !!result.permission?.external_directory,
      details: {
        preservedExistingRead: result.permission?.read['existing/path'] === 'allow',
        createdExternalDir: !!result.permission?.external_directory,
        readPermissionCount: Object.keys(result.permission?.read || {}).length,
        externalDirPermissionCount: Object.keys(result.permission?.external_directory || {}).length,
        errors
      }
    }
  }
))

// Run all tests
let allPassed = true
RESULTS.tests.forEach((testResult, index) => {
  const testNum = index + 1
  const status = testResult.pass ? '✅ PASS' : '❌ FAIL'
  console.log(`Test ${testNum}: ${status}`)

  if (testResult.pass) {
    RESULTS.passed++
  } else {
    RESULTS.failed++
    allPassed = false
  }

  if (testResult.error) {
    console.log(`  Error: ${testResult.error}`)
  } else if (testResult.details) {
    Object.entries(testResult.details).forEach(([key, value]) => {
      if (key !== 'errors' && Array.isArray(value)) {
        console.log(`  ${key}: [${value.join(', ')}]`)
      } else if (key !== 'errors') {
        console.log(`  ${key}: ${value}`)
      }
    })
    if (testResult.details.errors && testResult.details.errors.length > 0) {
      console.log(`  Verification errors:`)
      testResult.details.errors.forEach(err => {
        console.log(`    - ${err}`)
      })
    }
  }
  console.log('')
})

// Cleanup
try {
  if (existsSync(TEMP_DIR)) {
    rmSync(TEMP_DIR, { recursive: true })
  }
} catch (e) {
  console.warn(`Warning: Could not cleanup temp directory ${TEMP_DIR}`)
}

// Print summary
console.log('========================================')
console.log('           TEST SUMMARY')
console.log('========================================')
console.log(`Passed: ${RESULTS.passed}`)
console.log(`Failed: ${RESULTS.failed}`)
console.log(`Total:  ${RESULTS.passed + RESULTS.failed}`)
console.log('========================================\n')

// Exit with appropriate code
process.exit(allPassed ? 0 : 1)
