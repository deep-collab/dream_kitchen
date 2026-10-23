// Creates or resets an admin user for Cloudflare D1.
// Usage:
//   node scripts/d1-admin.mjs <email> <password> [--local]
//   node scripts/d1-admin.mjs hema@dreamkitchen.in MySecurePass123
import { execSync } from 'node:child_process'
import { hashPassword } from '../netlify/lib/store/d1.mjs'

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const isLocal = process.argv.includes('--local') || !process.argv.includes('--remote')

const email = args[0]
const password = args[1]

if (!email || !password) {
  console.log('Usage: node scripts/d1-admin.mjs <email> <password> [--remote|--local]')
  console.log('Example: node scripts/d1-admin.mjs hema@dreamkitchen.in Password123 --local')
  process.exit(1)
}

if (password.length < 8) {
  console.error('Password must be at least 8 characters long.')
  process.exit(1)
}

const cleanEmail = email.trim().toLowerCase()
const id = crypto.randomUUID()
const { salt, hash } = await hashPassword(password)
const now = new Date().toISOString()

const sql = `INSERT INTO admin_users (id, email, password_salt, password_hash, created_at) VALUES ('${id}', '${cleanEmail}', '${salt}', '${hash}', '${now}') ON CONFLICT (email) DO UPDATE SET password_salt = excluded.password_salt, password_hash = excluded.password_hash;`

console.log(`\nPrepared admin account: ${cleanEmail}`)

const flag = isLocal ? '--local' : '--remote'
const cmd = `npx wrangler d1 execute DB ${flag} --command="${sql.replace(/"/g, '\\"')}"`

try {
  console.log(`Executing via Wrangler (${flag})...`)
  execSync(cmd, { stdio: 'inherit' })
  console.log(`\nAdmin user ${cleanEmail} successfully configured in D1!`)
} catch {
  console.log('\nCould not automatically run wrangler. You can run this command directly:')
  console.log(cmd)
}
