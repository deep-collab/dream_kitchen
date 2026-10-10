// Writes docs/kannada-priority-for-hema.md, the Kannada for Hema to check, in plain words:
//   Part 1: what customers act on while ordering and paying (Step 6: product sheet, cart and
//           courier, checkout, UPI payment, order and tracking pages, errors), and the emails
//           customers receive. Kept under 140 lines.
//   Part 2: "Later, if you have time": every other Kannada text on the site and in the menu.
// English | Kannada | Correct? (blank for Hema). No keys or code: {placeholders} are shown with
// example values. Run: node scripts/kannada-list.mjs (again after any change to the text).
import { readFileSync, writeFileSync } from 'node:fs'
import { brownieInfo, categories, products } from '../src/config/shop.js'
import { states } from '../src/data/states.js'
import { site } from '../src/config/site.js'
import { customerText } from '../netlify/lib/emailText.mjs'

const OUT = 'docs/kannada-priority-for-hema.md'
const MAX_PART1_LINES = 140
const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8'))
const kn = JSON.parse(readFileSync('src/i18n/kn.json', 'utf8'))
const get = (d, k) => k.split('.').reduce((n, p) => n?.[p], d)
const exampleDate = (dates) => dates.format.replace('{weekday}', dates.weekdays[3]).replace('{day}', '7').replace('{month}', dates.months[9])

// Example values for {placeholders}, per language, so every line reads as the customer sees it
const common = { class: 'Basic', weekend: 'Sat 17 – Sun 18 Oct', slot: '9–11 AM', fee: '₹2,500', sat: '17', sun: '18', month2: 'Oct', reason: 'Customer asked to cancel', phone: site.phone.display, price: '₹1,700', count: '3', days: '2', max: '20', code: 'DK-261005-7Q4M', id: 'DK-261005-7Q4M', total: '₹2,100', grams: '250', n: '2', year: '2026', fssai: '12345678901234', h: '10', karnataka: '₹90', outside: '₹100', smallKa: '₹90', smallOut: '₹100', largeKa: '₹100', largeOut: '₹150', drawingPrice: '₹450', barPrice: '₹950', old: '₹999', new: '₹1,099', pincode: '400001', name: 'Asha', link: 'https://…', courier: 'DTDC', tracking: 'D12345678' }
const EXAMPLES = {
  en: { ...common, date: exampleDate(en.dates), first: en.checkout.errors.name.required, zone: en.checkout.zone.outside, state: 'Karnataka', weekday: en.dates.weekdays[3], day: '7', month: en.dates.months[9], opens: '10 am', closes: '8 pm' },
  kn: { ...common, date: exampleDate(kn.dates), first: kn.checkout.errors.name.required, zone: kn.checkout.zone.outside, state: 'ಕರ್ನಾಟಕ', weekday: kn.dates.weekdays[3], day: '7', month: kn.dates.months[9], opens: '10', closes: '8' },
}
const KEY_EXAMPLES = {
  'sheet.ragiExtra': { price: '₹50' },
  'sheet.drawingExtra': { price: '₹450' },
  'customize.box.text': { price: '₹450' },
  'customize.bar.cta': { price: '₹950' },
  'sheet.courierFrom': { price: '₹90' },
  'checkout.noteHint': { count: '0', max: '300' },
  'sheet.drawingTextHint': { count: '0', max: '200' },
}
const fill = (text, lang, key) => String(text).replace(/\{(\w+)\}/g, (m, k) => KEY_EXAMPLES[key]?.[k] ?? EXAMPLES[lang][k] ?? m)
const cell = (s) => String(s).replaceAll(' ', ' ').replaceAll('|', '\\|').replace(/\s*\n\s*/g, ' ')
const row = (e, k) => `| ${cell(e)} | ${cell(k)} | |`

// Part 1: what customers act on, screen by screen (all new or changed in Step 6)
const PRIORITY = [
  ['Every page', ['nav.home', 'nav.menu', 'nav.customize', 'nav.classes', 'nav.contact', 'home.orderNow', 'banner.closed']],
  ['Choosing an item', ['menu.from', 'menu.priceSoon', 'sheet.size', 'sheet.ragi', 'sheet.ragiExtra', 'sheet.name', 'sheet.nameHint', 'sheet.namePreview', 'sheet.drawing', 'sheet.drawingNote', 'sheet.drawingText', 'sheet.photo', 'sheet.photoAdd', 'sheet.courierFrom', 'sheet.add', 'sheet.contains', 'sheet.ragiGluten', 'sheet.errors.drawingText.required']],
  ['Cart', ['cart.added', 'cart.view', 'cart.courier', 'cart.courierRates', 'cart.courierHow', 'cart.totalPlusCourier', 'cart.dispatch', 'cart.checkout']],
  ['Checkout: your details', ['checkout.progress', 'checkout.welcomeBack', 'checkout.notYou', 'checkout.line1', 'checkout.line2', 'checkout.city', 'checkout.state', 'checkout.statePick', 'checkout.landmark', 'checkout.remember', 'checkout.stateMismatch', 'checkout.toReview', 'checkout.errors.pincode.format']],
  ['Checkout: review', ['checkout.reviewTitle', 'checkout.deliverTo', 'checkout.courierTo', 'checkout.dispatchTitle', 'checkout.dispatchHintDrawing', 'checkout.courierNote', 'checkout.placeOrder', 'checkout.paymentsSoon', 'checkout.paymentsSoonText']],
  ['Paying by UPI', ['pay.title', 'pay.orderSaved', 'pay.scan', 'pay.app', 'pay.copyUpi', 'pay.amountNote', 'pay.afterTitle', 'pay.utr', 'pay.utrHint', 'pay.screenshot', 'pay.submit', 'pay.check', 'pay.errors.utr.format']],
  ['After ordering, and Track Order', ['order.title', 'order.keep', 'order.paymentStatus.pending', 'order.paymentStatus.submitted', 'order.paymentStatus.confirmed', 'track.lead', 'track.steps.placed', 'track.steps.payment_confirmed', 'track.steps.shipped', 'track.awaitingCheck', 'track.trackingNo', 'track.cancelled']],
  ['Classes', ['classes.lead', 'classes.choose', 'classes.cardTitle', 'classes.beginner', 'classes.bookWhatsApp', 'classes.formTitle', 'classes.interest', 'classes.send', 'classes.sentTitle']],
  ['While online ordering is not open', ['checkout.paymentsSoonText', 'checkout.orderWhatsApp', 'track.soon', 'track.whatsapp']],
  ['When something goes wrong', ['errors.network', 'errors.priceChanged', 'errors.paymentsClosed']],
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
// Emails added on 10 Oct 2026 (status changes, class bookings) go in the "new" part below
const NEW_EMAILS = new Set(['hello', 'paidSubject', 'paidText', 'preparingSubject', 'preparingText', 'deliveredSubject', 'deliveredText', 'cancelledSubject', 'cancelledText', 'cancelledPaid', 'bookingSubject', 'bookingConfirmedSubject', 'bookingHello', 'bookingClass', 'bookingWhen', 'bookingFee', 'bookingPaid', 'bookingPay', 'bookingLink', 'bookingCancelledSubject', 'bookingCancelledText', 'weekend', 'weekendAcross', 'months'])
part1.push('| **Emails customers receive** | | |')
for (const [k, v] of Object.entries(customerText)) if (!NEW_EMAILS.has(k)) part1.push(row(fill(v.en, 'en', k), fill(v.kn, 'kn', k)))

// New on 10 Oct 2026: online class booking, paying through Razorpay, the Contact message form,
// and the emails customers get when Hema moves an order along
const NEW = [
  ['Booking a class', ['classes.leadBook', 'classes.bookNow', 'book.title', 'book.lead', 'book.stepWeekend', 'book.stepWeekendHint', 'book.stepSlot', 'book.full', 'book.closed', 'book.seatsLeft', 'book.emailHint', 'book.pay', 'book.summary', 'book.slotFull', 'book.noneOpen']],
  ['The booking page', ['book.payTitle', 'book.saved', 'book.confirmed', 'book.confirmedText', 'book.submittedTitle', 'book.submittedText', 'book.cancelledTitle', 'book.time', 'book.needPhone']],
  ['Paying online (Razorpay)', ['pay.payNow', 'pay.secure', 'pay.opening', 'pay.verifying', 'pay.notFinished', 'pay.failed', 'pay.checkLater', 'pay.onlineFailed']],
  ['Contact page message form', ['contact.formTitle', 'contact.message', 'contact.send', 'contact.sentTitle', 'contact.errors.message.required']],
]
const partNew = ['| English | ಕನ್ನಡ | Correct? |', '|---|---|---|']
for (const [screen, keys] of NEW) {
  partNew.push(`| **${screen}** | | |`)
  for (const k of keys) {
    if (get(en, k) == null || get(kn, k) == null) throw new Error(`kannada-list: ${k} is missing from en.json or kn.json`)
    partNew.push(row(fill(get(en, k), 'en', k), fill(get(kn, k), 'kn', k)))
    inPart1.add(k)
  }
}
partNew.push('| **Emails customers receive (new)** | | |')
for (const k of NEW_EMAILS) partNew.push(row(fill(customerText[k].en, 'en', k), fill(customerText[k].kn, 'kn', k)))

// Part 2: everything else, grouped by where it appears
const PLACES = {
  brand: 'Logo and tagline', nav: 'Navigation', common: 'Used on many pages', header: 'Top of every page', footer: 'Bottom of every page', banner: 'Notice under the header',
  units: 'Weights', dates: 'Dates', langError: 'If Kannada cannot load', hours: 'Call hours', seo: 'Titles shown in Google', home: 'Home page', menu: 'Menu page',
  sheet: 'Choosing an item', cart: 'Cart', checkout: 'Checkout', pay: 'Paying', order: 'After ordering', track: 'Track Order', customize: 'Customize page',
  classes: 'Classes page', story: 'Our story', contact: 'Contact', faq: 'Questions and answers', notFound: 'Page not found', errors: 'Error messages',
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
for (const k of leaves(kn)) if (!inPart1.has(k)) (groups[k.split('.')[0]] ||= []).push(k)
for (const [section, keys] of Object.entries(groups)) {
  part2.push('', `### ${PLACES[section] || section}`, '', '| English | ಕನ್ನಡ | Correct? |', '|---|---|---|')
  for (const k of keys) {
    part2.push(row(fill(get(en, k), 'en', k), fill(get(kn, k), 'kn', k)))
    part2Count++
  }
}
const dataRows = (title, list) => {
  const seen = new Set()
  const rows = list.filter((x) => x && x.en && x.kn && !seen.has(`${x.en}|${x.kn}`) && seen.add(`${x.en}|${x.kn}`))
  if (!rows.length) return
  part2.push('', `### ${title}`, '', '| English | ಕನ್ನಡ | Correct? |', '|---|---|---|')
  rows.forEach((x) => part2.push(row(x.en, x.kn)))
  part2Count += rows.length
}
dataRows('Menu: categories', categories.flatMap((c) => [c.name, c.tab, c.note]))
dataRows('Menu: items and descriptions', products.flatMap((p) => [p.name, p.description, p.topping]))
dataRows('Brownie ingredients', [...brownieInfo.base, brownieInfo.ragiSwap.to, brownieInfo.contains])
dataRows('States (checkout)', states.map((s) => s.name))

const intro = [
  '# Kannada for Hema to check',
  '',
  'Please read the ಕನ್ನಡ column and write ✓ or a better wording in “Correct?”. Numbers, prices, names and the phone number are examples of what the site fills in. Brand names (Ferrero Rocher, Nutella, Lotus Biscoff, Oreo) and “Dream Kitchen” stay in English on purpose.',
  '',
  'Step 6 (5 Oct 2026) replaced most of the site: everything below is new or changed, so it all needs a look. Part 1 first, please.',
  '',
  '## Please check first: what customers tap and read while ordering and paying, and their emails',
  '',
]
const head = [...intro, ...part1]
if (head.length > MAX_PART1_LINES) throw new Error(`kannada-list: Part 1 is ${head.length} lines; keep it under ${MAX_PART1_LINES}`)
const md = [...head, '', '## New on 10 October: class booking, paying online, and order emails', '', ...partNew, '', `## Later, if you have time (${part2Count} more)`, ...part2, ''].join('\n')
writeFileSync(OUT, md)
console.log(`${OUT}: Part 1 ${head.length} lines, new part ${partNew.length} lines (${inPart1.size} texts + ${Object.keys(customerText).length} email lines), Part 2 ${part2Count} texts`)
