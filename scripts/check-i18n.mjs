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
const codes = (prefix, list) => list.map((c) => `${prefix}.${c}`)
const runtime = [
  'cart.added', 'cart.updated', 'sheet.add', 'sheet.update',
  ...codes('cart.unavailable', ['removed', 'soldOut', 'priceSoon', 'changed']),
  // useSeo(page) reads seo.<page>.title / .desc
  ...['home', 'menu', 'customize', 'classes', 'book', 'booking', 'story', 'contact', 'faq', 'track', 'cart', 'checkout', 'pay', 'order', 'notFound', 'terms', 'refund', 'shipping', 'privacy'].flatMap((p) => [`seo.${p}.title`, `seo.${p}.desc`]),
  // checkout: every code src/lib/checkout.js detailsErrors() returns, and the dispatch date
  ...codes('checkout.errors.name', ['required', 'short', 'long']),
  ...codes('checkout.errors.phone', ['required', 'invalid']),
  'checkout.errors.email.invalid',
  ...['line1', 'line2', 'city'].flatMap((f) => codes(`checkout.errors.${f}`, ['required', 'short', 'long'])),
  ...codes('checkout.errors.pincode', ['required', 'format']),
  ...codes('checkout.errors.state', ['required', 'invalid']),
  'checkout.errors.landmark.long', 'checkout.errors.note.long',
  ...codes('checkout.errors.date', ['required', 'invalid', 'tooSoon', 'closed', 'tooFar']),
  ...codes('checkout.steps', ['details', 'review', 'pay']),
  ...codes('checkout.zone', ['karnataka', 'outside']),
  // product sheet: src/lib/pricing.js selectionErrors() and the photo upload
  ...codes('sheet.errors.name', ['long', 'chars']),
  ...codes('sheet.errors.drawingText', ['required', 'long', 'chars']),
  ...codes('sheet.errors.photo', ['notImage', 'tooLarge', 'failed']),
  ...codes('pay.errors.utr', ['required', 'format']),
  ...codes('order.paymentStatus', ['pending', 'submitted', 'confirmed']),
  ...['placed', 'payment_confirmed', 'preparing', 'shipped', 'delivered'].flatMap((k) => [`track.steps.${k}`, `track.stepText.${k}`]),
  ...['required', 'invalid'].flatMap((c) => [`track.errors.orderId.${c}`, `track.errors.phone.${c}`]),
  // class enquiry: src/lib/enquiry.js enquiryErrors()
  ...codes('classes.errors.name', ['required', 'short', 'long']),
  ...codes('classes.errors.phone', ['required', 'invalid']),
  ...codes('classes.errors.interest', ['required', 'long']),
  'classes.errors.dates.long', 'classes.errors.message.long',
  ...codes('classes.sections', ['when', 'duration', 'slots']),
  // class booking: src/lib/classes.js bookingDetailsErrors(), the booking page's rows, the server's answers
  ...codes('book.errors.name', ['required', 'short', 'long']),
  ...codes('book.errors.phone', ['required', 'invalid']),
  'book.errors.email.invalid',
  ...codes('book', ['class', 'weekend', 'time', 'fee', 'slotFull', 'slotGone']),
  // Contact message form: src/lib/enquiry.js enquiryErrors(form, 'general')
  ...codes('contact.errors.name', ['required', 'short', 'long']),
  ...codes('contact.errors.phone', ['required', 'invalid']),
  ...codes('contact.errors.message', ['required', 'long']),
  // Razorpay: src/components/pay/PayParts.jsx RazorpayNote
  ...codes('pay', ['notFinished', 'failed', 'onlineFailed', 'checkLater']),
  ...['start', 'fresh', 'teach'].flatMap((k) => [`story.${k}.title`, `story.${k}.text`]),
  ...['order', 'pay', 'courier', 'when', 'track', 'name', 'ragi', 'change'].flatMap((k) => [`faq.items.${k}.q`, `faq.items.${k}.a`]),
  // src/lib/api.js errorText()
  ...codes('errors', ['network', 'server', 'tooMany', 'notReady', 'storeClosed', 'paymentsClosed', 'priceChanged', 'items', 'dispatchDate', 'details', 'rejected', 'notPending']),
  'dates.weekdays', 'dates.months', 'dates.format', 'dates.formatYear', 'units.g', 'units.kg',
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

// English text arrives with its screen (scripts/strings-split.mjs): a file that shows text from
// a section outside the core must import that section itself, or the text could be missing
// on whichever page loads the file first.
const { CORE_SECTIONS } = await import('./strings-split.mjs')
const lazySections = new Set(Object.keys(dicts.en).filter((s) => !CORE_SECTIONS.includes(s)))
const unimported = []
for (const f of files) {
  if (/[\\/]i18n[\\/]/.test(f)) continue
  const src = readFileSync(f, 'utf8')
  const used = new Set([...src.matchAll(/\bt\(\s*['`]([a-zA-Z]+)\./g), ...src.matchAll(/['`]([a-zA-Z]+)\.[a-zA-Z.]+['`]/g)].map((m) => m[1]).filter((s) => lazySections.has(s)))
  for (const s of used) if (!src.includes(`'virtual:dk-strings/${s}'`)) unimported.push(`${f}: ${s}`)
}
problems += unimported.length
console.log(`sections used without their import: ${unimported.length}`, unimported.join(' '))

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
