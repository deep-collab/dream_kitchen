// Checks the language files. Run: node scripts/check-i18n.mjs
//  1. every t('key') used in src exists in en.json and kn.json
//  2. keys built at runtime (error codes, steps, times) exist too
//  3. en.json and kn.json have exactly the same keys, and the same {placeholders}
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const files = []
const walk = (dir) => readdirSync(dir).forEach((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : /\.jsx?$/.test(f) && files.push(join(dir, f))))
walk('src')
const keys = new Set()
for (const f of files) for (const m of readFileSync(f, 'utf8').matchAll(/\bt\(\s*['`]([a-zA-Z0-9_.]+)['`]/g)) keys.add(m[1])

// Keys chosen at runtime (ternaries / template strings) that the regex above cannot see
const runtime = [
  'cart.added', 'cart.updated', 'customise.add', 'customise.save', 'badges.signature', 'badges.topSelling', 'customise.size', 'customise.weight',
  ...['removed', 'soldOut', 'changed'].map((k) => `cart.unavailable.${k}`),
  ...['morning', 'afternoon', 'evening'].flatMap((k) => [`callback.times.${k}`, `callback.when.${k}`]),
  ...['required', 'invalid'].map((c) => `callback.errors.phone.${c}`),
  ...['received', 'confirmed', 'preparing', 'dispatched', 'delivered'].flatMap((k) => [`track.steps.${k}`, `track.stepText.${k}`]),
  ...['required', 'invalid'].flatMap((c) => [`track.errors.orderId.${c}`, `track.errors.phone.${c}`]),
  ...['confirm', 'pay', 'dispatch'].flatMap((k) => [`success.steps.${k}.title`, `success.steps.${k}.text`]),
  // checkout: every code returned by lib/order.js checkoutErrors()
  'checkout.errors.name.required',
  'checkout.errors.phone.required', 'checkout.errors.phone.invalid',
  'checkout.errors.address.required', 'checkout.errors.address.short',
  'checkout.errors.area.required',
  'checkout.errors.pincode.required', 'checkout.errors.pincode.format', 'checkout.errors.pincode.outside',
  ...['required', 'invalid', 'tooSoon', 'closed', 'tooFar'].map((c) => `checkout.errors.date.${c}`),
  'checkout.errors.note.long',
  'dates.weekdays', 'dates.months', 'dates.format', 'dates.formatYear',
  // useSeo(page) reads seo.<page>.title / .desc
  ...['home', 'shop', 'about', 'gallery', 'contact', 'faq', 'track', 'cart', 'checkout', 'success', 'notFound', 'classes', 'classBooked', 'styleguide'].flatMap((p) => [`seo.${p}.title`, `seo.${p}.desc`]),
  // Step 4: classes, booking, story
  'classes.mode.inPerson', 'classes.mode.online', 'classes.location.inPerson', 'classes.location.online',
  'classes.full', 'classes.seatsLeft', 'classes.seatsLeftOne', 'classes.hours', 'classes.minutes',
  ...['pick', 'send', 'confirm'].flatMap((k) => [`classes.how.${k}.title`, `classes.how.${k}.text`]),
  ...['start', 'fresh', 'teach'].flatMap((k) => [`about.${k}.title`, `about.${k}.text`]),
  // booking: every code returned by lib/classes.js bookingErrors()
  'booking.errors.name.required', 'booking.errors.phone.required', 'booking.errors.phone.invalid',
  ...['required', 'gone', 'full'].map((c) => `booking.errors.batch.${c}`),
  ...['invalid', 'tooMany'].map((c) => `booking.errors.people.${c}`),
]
runtime.forEach((k) => keys.add(k))
keys.delete('a.b') // example in a code comment

const dicts = { en: JSON.parse(readFileSync('src/i18n/en.json', 'utf8')), kn: JSON.parse(readFileSync('src/i18n/kn.json', 'utf8')) }
const get = (d, k) => k.split('.').reduce((n, p) => (n == null ? undefined : n[p]), d)
let problems = 0
for (const [lang, d] of Object.entries(dicts)) {
  const gone = [...keys].filter((k) => get(d, k) === undefined).sort()
  problems += gone.length
  console.log(`${lang}: ${gone.length} missing`, gone.join(' '))
}

// Parity: same leaves, same placeholders, same array lengths
const leaves = (node, prefix = '', out = {}) => {
  if (typeof node === 'string') out[prefix] = node
  else if (Array.isArray(node)) {
    out[`${prefix}.length`] = String(node.length)
    node.forEach((v, i) => leaves(v, `${prefix}.${i}`, out))
  } else if (node && typeof node === 'object') Object.entries(node).forEach(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k, out))
  return out
}
const en = leaves(dicts.en)
const kn = leaves(dicts.kn)
const holes = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',')
const onlyEn = Object.keys(en).filter((k) => !(k in kn))
const onlyKn = Object.keys(kn).filter((k) => !(k in en))
const placeholderDiff = Object.keys(en).filter((k) => k in kn && !k.endsWith('.length') && holes(en[k]) !== holes(kn[k]))
const arrayDiff = Object.keys(en).filter((k) => k.endsWith('.length') && en[k] !== kn[k])
for (const [label, list] of [['only in en.json', onlyEn], ['only in kn.json', onlyKn], ['different {placeholders}', placeholderDiff], ['different list lengths', arrayDiff]]) {
  problems += list.length
  console.log(`${label}: ${list.length}`, list.join(' '))
}

// No emoji anywhere in the UI text
const emoji = Object.entries({ ...en, ...Object.fromEntries(Object.entries(kn).map(([k, v]) => [`kn:${k}`, v])) }).filter(([, v]) => /(?![©®™])\p{Extended_Pictographic}/u.test(v)) // © is not an emoji
problems += emoji.length
console.log(`emoji: ${emoji.length}`, emoji.map(([k]) => k).join(' '))

// Unused strings: nobody should proofread text the site never shows. A key counts as
// used when code reads it or one of its parents (t('faq.items') covers every item).
// vite.config.js reads a few for index.html.
for (const m of readFileSync('vite.config.js', 'utf8').matchAll(/\ben\.([a-zA-Z0-9_.]+)/g)) keys.add(m[1])
// Keys kept in data (nav items: key: 'nav.shop') and built from templates (`styleguide.sizes.${k}`)
const mentioned = new Set(keys)
for (const f of files) {
  const src = readFileSync(f, 'utf8')
  for (const m of src.matchAll(/['"`]([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)+)['"`]/g)) mentioned.add(m[1])
  for (const m of src.matchAll(/`([a-zA-Z][a-zA-Z0-9_.]*)\.\$\{/g)) mentioned.add(m[1])
}
const used = (k) => [...mentioned].some((u) => k === u || k.startsWith(`${u}.`))
const unused = Object.keys(en).filter((k) => !k.endsWith('.length') && !used(k))
problems += unused.length
console.log(`unused: ${unused.length}`, unused.join(' '))

process.exit(problems ? 1 : 0)
