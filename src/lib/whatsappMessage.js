/*
  Every WhatsApp message the site prepares. Covered by tests/order.test.js.
  Always plain English text (Hema reads them; one format also suits a future bot):
  no emoji, no *bold* markers, one fact per line. Customers' own words (names,
  notes, address) are kept as typed, on one line each.
*/
import { waLink } from '../config/site'
import en from '../i18n/en.json'
import { formatDay } from './dates'
import { formatINR } from './pricing'
import { formatPhone, oneLine } from './validation'

/**
 * "Ferrero Rocher Nutella (Brownie Tub)". The label tells same-named items apart
 * (a Dark Chocolate bar or Classic Favourites by weight) and is skipped when the
 * name already says it ("Colour Blast Bar", "Classic Favourite Assortment").
 */
function itemName(item) {
  const name = item.name.en
  const label = item.itemLabel?.en
  const stem = label?.toLowerCase().replace(/s$/, '')
  return label && !name.toLowerCase().includes(stem) ? `${name} (${label})` : name
}

function itemLines(item, n) {
  if (item.kind === 'combo') {
    return [`${n}) ${item.name.en} – ${item.bars.length} bars × ${item.qty} – ${formatINR(item.lineTotal)}`, `   Bars: ${item.bars.map((b) => b.en).join(', ')}`]
  }
  const size = item.size ? ` – ${item.size.en}` : ''
  const out = [`${n}) ${itemName(item)}${size} × ${item.qty} – ${formatINR(item.lineTotal)}`]
  if (item.flavour) out.push(`   Flavour: ${item.flavour.en}`)
  if (item.nameOnBox) out.push(`   Name on box: ${oneLine(item.nameOnBox)} (+${formatINR(item.namePrice)}${item.qty > 1 ? ' each' : ''})`)
  if (item.occasion) out.push(`   Occasion: ${item.occasion.en}`)
  if (item.note) out.push(`   Note: ${oneLine(item.note)}`)
  return out
}

/** The order as Hema receives it. */
export function orderMessage(order) {
  const c = order.customer
  return [
    `New order: ${order.id}`,
    `Name: ${oneLine(c.name)} | Phone: ${formatPhone(c.phone)}`,
    'Items:',
    ...order.items.flatMap((item, i) => itemLines(item, i + 1)),
    `Subtotal: ${formatINR(order.subtotal)} | Delivery: ${formatINR(order.deliveryCharge)} | Total: ${formatINR(order.total)}`,
    `Preferred date: ${formatDay(order.preferredDate, en.dates, { year: true })}`,
    `Address: ${[c.address, c.area].map(oneLine).filter(Boolean).join(', ')}, Pincode ${c.pincode}`,
    ...(order.note ? [`Note for Hema: ${oneLine(order.note)}`] : []),
    'Please confirm my order and share UPI details.',
  ].join('\n')
}

export const orderWhatsAppUrl = (order) => waLink(orderMessage(order))

/* ---------- call-back and voice message ---------- */

export const CALLBACK_TIMES = ['morning', 'afternoon', 'evening']

/** "Hi Dream Kitchen, please call me back on +91 98765 43210 (Asha) in the morning." */
export function callbackMessage({ phone, name, time }) {
  const who = oneLine(name) ? ` (${oneLine(name)})` : ''
  const when = CALLBACK_TIMES.includes(time) ? ` in the ${time}` : ''
  return `Hi Dream Kitchen, please call me back on ${formatPhone(phone)}${who}${when}.`
}
export const callbackWhatsAppUrl = (callback) => waLink(callbackMessage(callback))

/** Opens the chat with a greeting so the customer only has to hold the mic. */
export const VOICE_GREETING = 'Hi Dream Kitchen'
export const voiceMessageUrl = () => waLink(VOICE_GREETING)

/* ---------- Contact page enquiry (Step 4 rebuilds the Contact page) ---------- */

export function enquiryMessage(enquiry, typeLabel) {
  return [`New enquiry: ${typeLabel}`, `Name: ${enquiry.name}`, `Phone: ${formatPhone(enquiry.phone)}`, '', enquiry.message].join('\n')
}
