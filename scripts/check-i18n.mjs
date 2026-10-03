// Lists t('key') calls whose key is missing from en.json or kn.json. Run: node scripts/check-i18n.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const files = []
const walk = (dir) => readdirSync(dir).forEach((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : /\.jsx?$/.test(f) && files.push(join(dir, f))))
walk('src')
const keys = new Set()
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*['`]([a-zA-Z0-9_.]+)['`]/g)) keys.add(m[1])
// Keys chosen at runtime (ternaries / lookups) that the regex above cannot see
;['cart.added','cart.updated','customise.add','customise.save','badges.signature','badges.topSelling','customise.size','customise.weight'].forEach((k) => keys.add(k))
keys.delete('a.b') // example in a code comment
const dicts = { en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8')), kn: JSON.parse(readFileSync('src/i18n/kn.json', 'utf8')) }
const get = (d, k) => k.split('.').reduce((n, p) => (n == null ? undefined : n[p]), d)
let missing = 0
for (const [lang, d] of Object.entries(dicts)) {
  const gone = [...keys].filter((k) => get(d, k) === undefined).sort()
  missing += gone.length
  console.log(`${lang}: ${gone.length} missing`, gone.join(' '))
}
process.exit(missing ? 1 : 0)
