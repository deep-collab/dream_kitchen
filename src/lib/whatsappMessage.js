/*
  Every WhatsApp message the site prepares. Covered by tests/order.test.js.
  Always plain English text (Hema reads them; one format also suits a future bot):
  no emoji, no *bold* markers, one fact per line. Customers' own words (names,
  notes, address) are kept as typed, on one line each.
*/
import { waLink } from '../config/site'
import { english as en } from '../i18n/strings' // only en.dates (core) is used here
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
    order.deliveryCharge == null
      ? `Subtotal: ${formatINR(order.subtotal)} | Delivery: to be confirmed | Total: ${formatINR(order.total)} + delivery`
      : `Subtotal: ${formatINR(order.subtotal)} | Delivery: ${formatINR(order.deliveryCharge)} | Total: ${formatINR(order.total)}`,
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

/* ---------- class booking ---------- */

/** 11 -> "11 am", 16 -> "4 pm", 12 -> "12 noon" */
export const englishHour = (h) => (h === 12 ? '12 noon' : `${h % 12 || 12} ${h < 12 ? 'am' : 'pm'}`)
/** 180 -> "3 hours", 90 -> "1 hour 30 minutes" */
export function englishDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h && `${h} hour${h === 1 ? '' : 's'}`, m && `${m} minutes`].filter(Boolean).join(' ')
}

/** A class booking as Hema receives it (lib/classes.js buildBooking). */
export function bookingMessage(b) {
  const ages = b.ages ? `, ages ${b.ages.min}–${b.ages.max}` : ''
  const mode = b.mode === 'online' ? 'live online' : 'in person'
  return [
    `New class booking: ${b.id}`,
    `Class: ${b.className.en}${ages} (${mode}, ${englishDuration(b.durationMinutes)})`,
    `Batch: ${formatDay(b.date, en.dates, { year: true })}, ${englishHour(b.startHour)}`,
    `People: ${b.people} × ${formatINR(b.pricePerPerson)} = ${formatINR(b.total)}`,
    `Name: ${oneLine(b.customer.name)} | Phone: ${formatPhone(b.customer.phone)}`,
    'Please confirm my seats and share the payment details.',
  ].join('\n')
}

export const bookingWhatsAppUrl = (booking) => waLink(bookingMessage(booking))
