// The emails, as { to, subject, text, html }. Pure (no Node-only code), so Hema's demo admin can
// run the same admin logic in the browser. Sending: email.mjs.
//   Hema (English):   a new paid order (or a UPI payment to check), a class booking, an enquiry.
//   Customer (their language, only if they gave an email): order confirmation, every status
//   change Hema makes (payment received, preparing, shipped, delivered, cancelled), and the
//   class booking and its confirmation or cancellation.
import { site } from '../../src/config/site.js'
import { formatINR } from '../../src/lib/pricing.js'
import { orderSavings } from '../../src/lib/offers.js'
import { formatPhone } from '../../src/lib/validation.js'
import { stateName } from '../../src/data/states.js'
import { applyClassSettings, slotLabel } from '../../src/lib/classes.js'
import { addDaysISO } from '../../src/lib/dates.js'
import { config } from './env.mjs'
import { customerText } from './emailText.mjs'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))
const t = (key, lang, vars = {}) => fill(customerText[key][lang] || customerText[key].en, vars)
const langOf = (row) => (row.lang === 'kn' ? 'kn' : 'en')
const MONTHS = customerText.months.en.split(',')
const day = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number)
  return y ? `${d} ${MONTHS[m - 1]} ${y}` : String(iso)
}

/** "Sat 17 – Sun 18 Oct 2026" (or "Sat 31 Oct – Sun 1 Nov 2026") in the customer's language */
export function weekendText(saturday, lang = 'en') {
  const months = customerText.months[lang].split(',')
  const sunday = addDaysISO(saturday, 1)
  const [y, m1, d1] = saturday.split('-').map(Number)
  const [, m2, d2] = sunday.split('-').map(Number)
  const vars = { sat: d1, sun: d2, month: months[m1 - 1], month2: months[m2 - 1], year: y }
  return t(m1 === m2 ? 'weekend' : 'weekendAcross', lang, vars)
}

const asHtml = (lines) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#2a1d16">${lines
    .map((l) => (l === '' ? '<br>' : `<p style="margin:0 0 6px">${esc(l)}</p>`))
    .join('')}</div>`
const message = (to, subject, lines) => {
  const clean = lines.filter((l) => l !== null && l !== undefined)
  return { to, subject, text: clean.join('\n'), html: asHtml(clean) }
}

/* ---------------- orders ---------------- */

/** "Red Velvet Delight Box, 500 g, name "Hema", drawing: a cat ×1 ₹1,700" */
function itemLines(order, lang) {
  return (order.items || []).map((i) => {
    const bits = [lang === 'kn' ? i.name.kn || i.name.en : i.name.en]
    if (i.size) bits.push(i.size.label || i.size)
    if (i.ragi) bits.push(t('ragi', lang))
    if (i.nameOnBox) bits.push(`${t('nameOnBox', lang)}: “${i.nameOnBox}”`)
    if (i.drawing) bits.push(`${t('drawing', lang)}: ${i.drawingText || ''}${i.drawingRef ? ' (+ photo)' : ''}`)
    // An offer line: the regular price, the offer's name and the price paid ("₹1,250 → Rajyotsava 50% off → ₹625")
    const price = i.offer ? `${formatINR(i.regularLineTotal)} → ${offerWords(i.offer.label, lang)} → ${formatINR(i.lineTotal)}` : formatINR(i.lineTotal)
    return `${bits.join(', ')} × ${i.qty}  ${price}`
  })
}
const offerWords = (label, lang) => (lang === 'kn' ? label?.kn || label?.en : label?.en) || 'Offer'
function money(order, lang) {
  const saved = orderSavings(order.items)
  return [
    ...(saved ? [`${t('regular', lang)}: ${formatINR(saved.regularSubtotal)}`, `${saved.labels.map((l) => offerWords(l, lang)).join(', ')}: −${formatINR(saved.saved)}`] : []),
    `${t('subtotal', lang)}: ${formatINR(order.subtotal)}`,
    `${t('courier', lang)}: ${formatINR(order.courier)}`,
    `${t('total', lang)}: ${formatINR(order.total)}`,
  ]
}
const adminLink = (path) => `${config.siteUrl}/admin/${path}`
const trackLink = (order) => t('track', langOf(order), { link: `${config.siteUrl}/track?id=${order.order_code}` })

/**
 * Hema: a new order that is paid (Razorpay) or has a UPI reference to check. Unpaid orders
 * (a customer who left before paying) send nothing.
 */
export function hemaNewOrder(order, to) {
  const paid = order.payment_status === 'confirmed'
  const how = paid ? `paid online${order.razorpay_payment_id ? ` (Razorpay ${order.razorpay_payment_id})` : ''}` : `UPI reference ${order.utr || '–'}: check it in your bank app, then tap "Payment received"`
  return message(to, `${paid ? 'New paid order' : 'New order, payment to check'} ${order.order_code} – ${formatINR(order.total)}`, [
    `New order ${order.order_code}: ${formatINR(order.total)}, ${how}`,
    '',
    ...itemLines(order, 'en'),
    '',
    ...money(order, 'en'),
    `Courier tier: ${order.courier_tier}, zone: ${order.zone === 'karnataka' ? 'Karnataka' : 'outside Karnataka'}`,
    `Dispatch date: ${day(order.dispatch_date)}${order.has_drawing ? ' (has a drawing)' : ''}`,
    '',
    `${order.customer_name}, ${formatPhone(order.customer_phone)}${order.customer_email ? `, ${order.customer_email}` : ''}`,
    order.address_line1,
    order.address_line2,
    `${order.city} ${order.pincode}, ${stateName(order.state)?.en || order.state}`,
    order.landmark ? `Landmark: ${order.landmark}` : null,
    order.notes ? `Note: ${order.notes}` : null,
    '',
    `Open in admin: ${adminLink(`orders/${order.order_code}`)}`,
  ])
}

/** Customer: the order is placed (UPI: how to pay) or paid (Razorpay) */
export function customerPlaced(order) {
  const lang = langOf(order)
  const paid = order.payment_status === 'confirmed'
  return message(order.customer_email, t(paid ? 'paidSubject' : 'placedSubject', lang, { code: order.order_code }), [
    t('placedHello', lang, { name: order.customer_name }),
    '',
    order.order_code,
    ...itemLines(order, lang),
    '',
    ...money(order, lang),
    t('dispatch', lang, { date: day(order.dispatch_date) }),
    t('courierNote', lang),
    '',
    paid ? t('placedPaid', lang, { total: formatINR(order.total) }) : t('placedPay', lang, { total: formatINR(order.total) }),
    paid ? null : t('placedCheck', lang),
    trackLink(order),
    t('questions', lang, { phone: site.phone.display }),
    '',
    t('thanks', lang),
  ])
}

/** Customer: a status change Hema made in the admin. status: payment_confirmed | preparing | shipped | delivered | cancelled */
export function customerStatus(order, status) {
  const lang = langOf(order)
  const code = order.order_code
  const vars = { code, total: formatINR(order.total), name: order.customer_name, reason: order.cancel_reason || '', courier: order.courier_name, tracking: order.tracking_no }
  const body = {
    payment_confirmed: ['paidSubject', [t('paidText', lang, vars)]],
    preparing: ['preparingSubject', [t('preparingText', lang, vars)]],
    shipped: ['shippedSubject', [t('shippedHello', lang, vars), '', t('shippedCourier', lang, vars), order.tracking_url ? t('shippedLink', lang, { link: order.tracking_url }) : null]],
    delivered: ['deliveredSubject', [t('deliveredText', lang, vars)]],
    cancelled: ['cancelledSubject', [t('cancelledText', lang, vars), t('cancelledPaid', lang)]],
  }[status]
  if (!body || !order.customer_email) return null
  const [subject, lines] = body
  return message(order.customer_email, t(subject, lang, vars), [
    status === 'shipped' ? null : t('hello', lang, vars),
    status === 'shipped' ? null : '',
    code,
    ...lines,
    '',
    trackLink(order),
    t('questions', lang, { phone: site.phone.display }),
    t('thanks', lang),
  ])
}

/** The old "shipped" email (kept for callers that only ship) */
export const customerShipped = (order) => customerStatus(order, 'shipped')

/* ---------------- class bookings ---------------- */

function bookingFacts(b, lang, cfg) {
  const c = cfg.classes.find((x) => x.id === b.class_id)
  const slot = cfg.slots.find((s) => s.id === b.slot)
  return [
    t('bookingClass', lang, { class: c ? c.name[lang] || c.name.en : b.class_id }),
    t('bookingWhen', lang, { weekend: weekendText(b.weekend, lang), slot: slot ? slotLabel(slot, lang) : b.slot }),
    t('bookingFee', lang, { fee: formatINR(b.fee) }),
  ]
}

/** Hema: a class booking that is paid, or has a UPI reference to check */
export function hemaBooking(b, to, cfg = applyClassSettings()) {
  const paid = b.payment_status === 'confirmed'
  return message(to, `${paid ? 'New class booking' : 'Class booking, payment to check'} ${b.booking_code}: ${b.name}`, [
    `${b.name}, ${formatPhone(b.phone)}${b.email ? `, ${b.email}` : ''}`,
    ...bookingFacts(b, 'en', cfg),
    paid ? `Paid online${b.razorpay_payment_id ? ` (Razorpay ${b.razorpay_payment_id})` : ''}.` : `UPI reference ${b.utr || '–'}: check it in your bank app, then tap "Payment received".`,
    '',
    `Open in admin: ${adminLink(`classes/bookings/${b.booking_code}`)}`,
  ])
}

/** Customer: the booking (UPI: how to pay; Razorpay or checked: confirmed) */
export function customerBooking(b, cfg = applyClassSettings()) {
  if (!b.email) return null
  const lang = langOf(b)
  const paid = b.payment_status === 'confirmed'
  return message(b.email, t(paid ? 'bookingConfirmedSubject' : 'bookingSubject', lang, { code: b.booking_code }), [
    t('bookingHello', lang, { name: b.name }),
    '',
    b.booking_code,
    ...bookingFacts(b, lang, cfg),
    '',
    paid ? t('bookingPaid', lang, { fee: formatINR(b.fee) }) : t('bookingPay', lang, { fee: formatINR(b.fee) }),
    t('bookingLink', lang, { link: `${config.siteUrl}/classes/booking/${b.booking_code}` }),
    t('questions', lang, { phone: site.phone.display }),
    '',
    t('thanks', lang),
  ])
}

export function customerBookingCancelled(b) {
  if (!b.email) return null
  const lang = langOf(b)
  return message(b.email, t('bookingCancelledSubject', lang, { code: b.booking_code }), [
    b.booking_code,
    t('bookingCancelledText', lang, { reason: b.cancel_reason || '' }),
    t('cancelledPaid', lang),
    t('questions', lang, { phone: site.phone.display }),
    t('thanks', lang),
  ])
}

/* ---------------- enquiries ---------------- */

export function hemaEnquiry(e, to) {
  const general = e.kind === 'general'
  return message(to, `${general ? 'Message' : 'Class enquiry'}: ${e.name}`, [
    `${general ? 'New message' : 'New class enquiry'} from ${e.name}, ${formatPhone(e.phone)}`,
    general ? null : `Interested in: ${e.interest}`,
    e.preferred_dates ? `Preferred dates: ${e.preferred_dates}` : null,
    e.message ? `Message: ${e.message}` : null,
    '',
    `Open in admin: ${adminLink('enquiries')}`,
  ])
}
