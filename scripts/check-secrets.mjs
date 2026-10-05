/*
  No secrets in what the browser downloads. Run after `npm run build`:  node scripts/check-secrets.mjs
  Looks through every file in dist/ for key-shaped strings and for the names of the server-only
  variables, and for the actual values in a local .env (if there is one).
*/
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PATTERNS = [
  [/eyJhbGciOi[\w-]{10,}\.[\w-]{10,}/, 'a JWT (Supabase keys are JWTs)'],
  [/sb_secret_[\w-]{10,}/, 'a Supabase secret key'],
  [/service_role/, 'the words service_role'],
  [/SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|DK_DEV_ADMIN_PASSWORD/, 'a server-only variable name'],
  [/rzp_(live|test)_[A-Za-z0-9]{8,}/, 'a Razorpay key'],
  [/\bre_[A-Za-z0-9]{20,}/, 'a Resend API key'],
  [/sk_live_[A-Za-z0-9]{10,}/, 'a live secret key'],
]
const secretsFromEnv = existsSync('.env')
  ? readFileSync('.env', 'utf8')
      .split('\n')
      .map((l) => l.match(/^(SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|DK_DEV_ADMIN_PASSWORD)=(.{8,})$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim()])
  : []

const files = []
const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).forEach((f) => walk(join(p, f))) : files.push(p))
walk('dist')
const found = []
for (const f of files.filter((f) => /\.(js|html|json|css|txt|xml|map|webmanifest)$|_redirects$/.test(f))) {
  const text = readFileSync(f, 'utf8')
  for (const [re, what] of PATTERNS) if (re.test(text)) found.push(`${f}: ${what}`)
  for (const [name, value] of secretsFromEnv) if (text.includes(value)) found.push(`${f}: the value of ${name}`)
}
console.log(`${files.length} files checked in dist/: ${found.length ? found.join('\n') : 'no secrets found'}`)
process.exit(found.length ? 1 : 0)
