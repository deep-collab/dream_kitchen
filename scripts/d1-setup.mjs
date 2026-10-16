// Applies migrations and seeds initial menu data into Cloudflare D1.
// Usage:
//   node scripts/d1-setup.mjs [--local]
//   node scripts/d1-setup.mjs --remote
import { execSync } from 'node:child_process'

const isRemote = process.argv.includes('--remote')
const flag = isRemote ? '--remote' : '--local'

console.log(`Setting up Cloudflare D1 database (${flag})...`)

try {
  console.log('\n1. Applying migrations...')
  execSync(`npx wrangler d1 migrations apply DB ${flag}`, { stdio: 'inherit' })

  console.log('\n2. Seeding menu data...')
  execSync(`npx wrangler d1 execute DB ${flag} --file=d1/seed.sql`, { stdio: 'inherit' })

  console.log(`\nCloudflare D1 database setup complete (${flag})!`)
} catch (err) {
  console.error('\nError running D1 setup:', err?.message)
  process.exit(1)
}
