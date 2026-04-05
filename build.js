import * as esbuild from 'esbuild'
import { writeFileSync, mkdirSync, chmodSync } from 'fs'
import { resolve } from 'path'

const isWatch = process.argv.includes('--watch')

const buildConfig = {
  entryPoints: ['src/index.ts'],
  outfile: 'makeitdone/bin/mid-tools.cjs',
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  external: [],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}

async function build() {
  try {
    // Ensure output directory exists
    mkdirSync('makeitdone/bin', { recursive: true })

    if (isWatch) {
      const context = await esbuild.context(buildConfig)
      await context.watch()
      console.log('🔍 Watching for changes...')
    } else {
      const result = await esbuild.build(buildConfig)
      console.log(`✅ Built mid-tools.cjs`)

      // Make executable
      try {
        chmodSync('makeitdone/bin/mid-tools.cjs', 0o755)
      } catch {
        // Windows doesn't support chmod, that's ok
      }
    }
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    process.exit(1)
  }
}

build()
