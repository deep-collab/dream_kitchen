// Writes docs/kannada-priority-for-hema.md, the Kannada for Hema to check, in plain words:
//   Part 1: only the text customers act on (ordering, the bar picker, booking, the screens after
//           sending, errors, call back, page not found). Kept under 80 lines.
//   Part 2: "Later, if you have time": every other Kannada text on the site and in the menu.
// English | Kannada | Correct? (blank for Hema). No keys or code: {placeholders} are shown with
// example values. Run: node scripts/kannada-list.mjs (again after any change to the text).
import { readFileSync, writeFileSync } from 'node:fs'
import { classes } from '../src/data/classes.js'
import { categories, occasions } from '../src/data/categories.js'
import { products } from '../src/data/products.js'
import { combos } from '../src/data/combos.js'
import { site } from '../src/config/site.js'

const OUT = 'docs/kannada-priority-for-hema.md'
const MAX_PART1_LINES = 80
const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8'))
const kn = JSON.parse(readFileSync('src/i18n/kn.json', 'utf8'))
const get = (d, k) => k.split('.').reduce((n, p) => n?.[p], d)
// Wednesday 7 October, written the way each language's dates.format writes it
const exampleDate = (dates) => dates.format.replace('{weekday}', dates.weekdays[3]).replace('{day}', '7').replace('{month}', dates.months[9])

// Example values for {placeholders}, per language, so every line reads as the customer sees it
const EXAMPLES = {
  en: { price: '₹549', phone: site.phone.display, count: '3', picked: '2', total: '3', amount: '₹150', days: '2', max: '6', date: exampleDate(en.dates), when: en.callback.when.evening, first: en.checkout.errors.name.required, name: 'Oreo Overload', category: 'Brownie Tubs', id: 'DK-261005-7Q4M', query: 'mango', n: '1', min: '8', grams: '250', old: '₹999', new: '₹1,099', charge: '50', namePrice: '100', nameMax: '20', class: en.classes.title, time: '11 am', list: '250g, 500g', last: '750g', year: '2026', fssai: '12345678901234', h: '10', opens: '10 am', closes: '8 pm', unit: '₹549', qty: '2', status: en.track.steps.preparing, weekday: en.dates.weekdays[3], day: '7', month: en.dates.months[9] },
  kn: { price: '₹549', phone: site.phone.display, count: '3', picked: '2', total: '3', amount: '₹150', days: '2', max: '6', date: exampleDate(kn.dates), when: kn.callback.when.evening, first: kn.checkout.errors.name.required, name: 'Oreo Overload', category: kn.home.fresh.title, id: 'DK-261005-7Q4M', query: 'ಮಾವು', n: '1', min: '8', grams: '250', old: '₹999', new: '₹1,099', charge: '50', namePrice: '100', nameMax: '20', class: kn.classes.title, time: kn.hours.time.morning.replace('{h}', '11'), list: '250 ಗ್ರಾಂ, 500 ಗ್ರಾಂ', last: '750 ಗ್ರಾಂ', year: '2026', fssai: '12345678901234', h: '10', opens: '10', closes: '8', unit: '₹549', qty: '2', status: kn.track.steps.preparing, weekday: kn.dates.weekdays[3], day: '7', month: kn.dates.months[9] },
}
// Texts whose example must differ from the general one (the name on a box costs ₹100, not ₹549)
const KEY_EXAMPLES = { 'customise.nameToggle': { price: '₹100' }, 'customise.includesName': { price: '₹100' } }
const fill = (text, lang, key) => String(text).replace(/\{(\w+)\}/g, (m, k) => KEY_EXAMPLES[key]?.[k] ?? EXAMPLES[lang][k] ?? m)
const cell = (s) => String(s).replaceAll(' ', ' ').replaceAll('|', '\\|').replace(/\s*\n\s*/g, ' ')
const row = (e, k) => `| ${cell(e)} | ${cell(k)} | |`

// Part 1: what customers act on, screen by screen
const PRIORITY = [
  ['On every page', ['notice.prebook', 'hero.orderNow', 'hero.callToOrder', 'callOptions.call', 'callOptions.voice', 'callOptions.voiceHelp']],
  ['Choosing an item', ['customise.size', 'customise.flavourHint', 'customise.flavourError', 'customise.nameToggle', 'customise.occasion', 'customise.add', 'customise.call']],
  ['Pick any 3 bars', ['combo.intro', 'combo.trayCount', 'combo.save', 'combo.pickMore']],
  ['Cart', ['cart.title', 'cart.emptyTitle', 'cart.added', 'cart.checkout', 'cart.noPayment', 'cart.deliveryToConfirm']],
  ['Checkout', ['checkout.name', 'checkout.phoneHint', 'checkout.addressHint', 'checkout.pincodeHint', 'checkout.prebook', 'checkout.payment', 'checkout.submit', 'checkout.fixMany', 'checkout.errors.phone.invalid', 'checkout.errors.pincode.outside', 'checkout.errors.date.closed']],
  ['After sending the order', ['success.title', 'success.lead', 'success.blockedTitle', 'success.blockedLead', 'success.openAgain', 'success.steps.confirm.title', 'success.steps.pay.title']],
  ['Ask Hema to call back', ['callback.intro', 'callback.submit', 'callback.doneTitle', 'callback.blockedTitle', 'callback.blockedText', 'callback.errors.phone.required']],
  ['Booking a class (only once classes are switched on)', ['booking.batch', 'booking.people', 'booking.submit', 'booked.blockedTitle']],
  ['Page not found', ['notFound.title', 'notFound.text', 'notFound.help']],
]
const part1 = ['| English | ಕನ್ನಡ | Correct? |', '|---|---|---|']
const inPart1 = new Set()
for (const [screen, keys] of PRIORITY) {
  part1.push(`| **${screen}** | | |`)
  for (const k of keys) {
    if (get(en, k) == null || get(kn, k) == null) throw new Error(`kannada-list: ${k} is missing from en.json or kn.json`)
    part1.push(row(fill(get(en, k), 'en', k), fill(get(kn, k), 'kn', k)))
    inPart1.add(k)
  }
}

// Part 2: everything else, grouped by where it appears
const PLACES = {
  brand: 'Logo and tagline', nav: 'Menu and navigation', common: 'Used on many pages', seo: 'Titles shown in Google', home: 'Home page',
  hero: 'Top of the home page', shop: 'Menu page', product: 'Item page', customise: 'Choosing an item', combo: 'Pick any 3 bars', cart: 'Cart',
  checkout: 'Checkout', success: 'After sending the order', track: 'Track order', callOptions: 'Call options', callback: 'Ask Hema to call back',
  about: 'Our story', gallery: 'Gallery', contact: 'Contact', faq: 'Questions and answers', notFound: 'Page not found', footer: 'Bottom of every page',
  mobileBar: 'Bar at the bottom of phones', mobileMenu: 'Phone menu', header: 'Top of every page', notice: 'Pre-booking notice', hours: 'Call hours',
  dates: 'Dates', units: 'Weights', badges: 'Labels on items', classes: 'Classes page (only once classes are switched on)',
  booking: 'Booking a class (only once classes are switched on)', booked: 'After sending a booking (only once classes are switched on)',
  langError: 'If Kannada cannot load', wa: 'WhatsApp greeting',
}
const leaves = (node, prefix = '', out = []) => {
  if (typeof node === 'string') out.push(prefix)
  else if (Array.isArray(node)) node.forEach((v, i) => leaves(v, `${prefix}.${i}`, out))
  else if (node && typeof node === 'object') Object.entries(node).forEach(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k, out))
  return out
}
const part2 = []
let part2Count = 0
const groups = {}
for (const k of leaves(kn)) {
  const section = k.split('.')[0]
  if (section === 'styleguide' || inPart1.has(k)) continue // styleguide: internal test page, never shown to customers
  ;(groups[section] ||= []).push(k)
}
for (const [section, keys] of Object.entries(groups)) {
  part2.push('', `### ${PLACES[section] || section}`, '', '| English | ಕನ್ನಡ | Correct? |', '|---|---|---|')
  for (const k of keys) {
    part2.push(row(fill(get(en, k), 'en', k), fill(get(kn, k), 'kn', k)))
    part2Count++
  }
}
const pairs = (list) => list.filter((x) => x && x.en && x.kn)
const dataRows = (title, list) => {
  const seen = new Set()
  const rows = pairs(list).filter((x) => !seen.has(`${x.en}|${x.kn}`) && seen.add(`${x.en}|${x.kn}`))
  if (!rows.length) return
  part2.push('', `### ${title}`, '', '| English | ಕನ್ನಡ | Correct? |', '|---|---|---|')
  rows.forEach((x) => part2.push(row(x.en, x.kn)))
  part2Count += rows.length
}
dataRows('Menu: categories', categories.flatMap((c) => [c.name, c.intro, c.note, c.slogan, ...(c.highlights || []), ...(c.whatYouGet || []), ...c.sections.flatMap((s) => [s.name, s.itemLabel])]))
dataRows('Menu: items', products.flatMap((p) => [p.name, p.description, ...(p.includes || []), ...p.optionGroups.flatMap((g) => (g.id === 'flavour' ? g.choices.map((c) => c.label) : []))]))
dataRows('Menu: 3-bar combo and occasions', [...combos.flatMap((c) => [c.name, c.itemLabel]), ...occasions.map((o) => o.label)])
dataRows('Classes (sample classes: these change once Hema gives the real ones)', classes.flatMap((c) => [c.title, c.summary, ...c.learn]))

const intro = [
  '# Kannada for Hema to check',
  '',
  `Please read the ಕನ್ನಡ column and write ✓ or a better wording in “Correct?”. Numbers, prices and the phone number are examples of what the site fills in. Brand names (Ferrero Rocher, Nutella, Lotus Biscoff, Oreo) and “Dream Kitchen” stay in English on purpose. WhatsApp messages sent to Hema are always in English, so they are not listed.`,
  '',
  '## Please check first: what customers tap and read while ordering',
  '',
]
const head = [...intro, ...part1]
if (head.length > MAX_PART1_LINES) throw new Error(`kannada-list: Part 1 is ${head.length} lines; keep it under ${MAX_PART1_LINES}`)
const md = [...head, '', `## Later, if you have time (${part2Count} more)`, ...part2, ''].join('\n')
writeFileSync(OUT, md)
console.log(`${OUT}: Part 1 ${head.length} lines (${inPart1.size} texts), Part 2 ${part2Count} texts`)
