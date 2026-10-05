// Emails: Hema gets one for every new order, payment reference and class enquiry; the customer
// gets a confirmation (if they gave an email) and a "shipped" email with tracking.
// Sent with Resend (free tier) when RESEND_API_KEY is set. Without it (local dev, tests) each
// email is kept in an outbox instead (and written to DK_DEV_DATA_DIR/outbox), so nothing leaves
// the machine and the QA scripts can read them. An email that fails never fails the order.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { site } from '../../src/config/site.js'
import { formatINR } from '../../src/lib/pricing.js'
import { formatPhone } from '../../src/lib/validation.js'
import { stateName } from '../../src/data/states.js'
import { config } from './env.mjs'
import { customerText } from './emailText.mjs'

export const outbox = []

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m))
const t = (key, lang, vars = {}) => fill(customerText[key][lang] || customerText[key].en, vars)
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const day = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number)
  return y ? `${d} ${MONTHS[m - 1]} ${y}` : String(iso)
}

/** "Red Velvet Delight Box, 500 g, name "Hema", drawing: a cat ×1 ₹1,700" */
function itemLines(order, lang) {
  return (order.items || []).map((i) => {
    const bits = [lang === 'kn' ? i.name.kn || i.name.en : i.name.en]
    if (i.size) bits.push(i.size.label || i.size)
    if (i.ragi) bits.push(t('ragi', lang))
    if (i.nameOnBox) bits.push(`${t('nameOnBox', lang)}: “${i.nameOnBox}”`)
    if (i.drawing) bits.push(`${t('drawing', lang)}: ${i.drawingText || ''}${i.drawingRef ? ' (+ photo)' : ''}`)
    return `${bits.join(', ')} × ${i.qty}  ${formatINR(i.lineTotal)}`
  })
}

function money(order, lang) {
  return [`${t('subtotal', lang)}: ${formatINR(order.subtotal)}`, `${t('courier', lang)}: ${formatINR(order.courier)}`, `${t('total', lang)}: ${formatINR(order.total)}`]
}

const asHtml = (lines) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#2a1d16">${lines
    .map((l) => (l === '' ? '<br>' : `<p style="margin:0 0 6px">${esc(l)}</p>`))
    .join('')}</div>`

/* ---------------- templates ---------------- */

export function hemaNewOrder(order) {
  const link = `${config.siteUrl}/admin/orders/${order.order_code}`
  const lines = [
    `New order ${order.order_code}: ${formatINR(order.total)} (${order.payment_method === 'razorpay' ? 'Razorpay' : 'UPI, payment not checked yet'})`,
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
    `Open in admin: ${link}`,
  ].filter((l) => l !== null)
  return { to: config.hemaEmail, subject: `New order ${order.order_code} – ${formatINR(order.total)}`, text: lines.join('\n'), html: asHtml(lines) }
}

export function hemaPaymentSubmitted(order) {
  const lines = [
    `${order.customer_name} says they paid ${formatINR(order.total)} for ${order.order_code}.`,
    `UPI reference (UTR): ${order.utr}${order.payment_screenshot ? ' (screenshot attached in admin)' : ''}`,
    'Check it in your bank or UPI app, then tap "Payment received" in admin.',
    '',
    `Open in admin: ${config.siteUrl}/admin/orders/${order.order_code}`,
  ]
  return { to: config.hemaEmail, subject: `Payment to check: ${order.order_code} – ${formatINR(order.total)}`, text: lines.join('\n'), html: asHtml(lines) }
}

export function hemaEnquiry(e) {
  const lines = [
    `New class enquiry from ${e.name}, ${formatPhone(e.phone)}`,
    `Interested in: ${e.interest}`,
    e.preferred_dates ? `Preferred dates: ${e.preferred_dates}` : null,
    e.message ? `Message: ${e.message}` : null,
    '',
    `Open in admin: ${config.siteUrl}/admin/enquiries`,
  ].filter((l) => l !== null)
  return { to: config.hemaEmail, subject: `Class enquiry: ${e.name}`, text: lines.join('\n'), html: asHtml(lines) }
}

export function customerPlaced(order) {
  const lang = order.lang === 'kn' ? 'kn' : 'en'
  const lines = [
    t('placedHello', lang, { name: order.customer_name }),
    '',
    `${order.order_code}`,
    ...itemLines(order, lang),
    '',
    ...money(order, lang),
    t('dispatch', lang, { date: day(order.dispatch_date) }),
    t('courierNote', lang),
    '',
    order.payment_status === 'confirmed' ? t('placedPaid', lang, { total: formatINR(order.total) }) : t('placedPay', lang, { total: formatINR(order.total) }),
    order.payment_status === 'confirmed' ? null : t('placedCheck', lang),
    t('track', lang, { link: `${config.siteUrl}/track?id=${order.order_code}` }),
    t('questions', lang, { phone: site.phone.display }),
    '',
    t('thanks', lang),
  ].filter((l) => l !== null)
  return { to: order.customer_email, subject: t('placedSubject', lang, { code: order.order_code }), text: lines.join('\n'), html: asHtml(lines) }
}

export function customerShipped(order) {
  const lang = order.lang === 'kn' ? 'kn' : 'en'
  const lines = [
    t('shippedHello', lang, { name: order.customer_name }),
    '',
    order.order_code,
    t('shippedCourier', lang, { courier: order.courier_name, tracking: order.tracking_no }),
    order.tracking_url ? t('shippedLink', lang, { link: order.tracking_url }) : null,
    t('track', lang, { link: `${config.siteUrl}/track?id=${order.order_code}` }),
    '',
    t('questions', lang, { phone: site.phone.display }),
    t('thanks', lang),
  ].filter((l) => l !== null)
  return { to: order.customer_email, subject: t('shippedSubject', lang, { code: order.order_code }), text: lines.join('\n'), html: asHtml(lines) }
}

/* ---------------- sending ---------------- */

/** Sends one email; never throws (an email problem must not lose an order). Returns true if sent or stored. */
export async function sendEmail(message, { fetchImpl = globalThis.fetch } = {}) {
  if (!message?.to) return false
  const entry = { ...message, from: config.emailFrom, at: new Date().toISOString() }
  if (!config.resendKey) {
    outbox.push(entry)
    if (config.devDataDir) {
      try {
        const dir = join(config.devDataDir, 'outbox')
        mkdirSync(dir, { recursive: true })
        writeFileSync(join(dir, `${Date.now()}-${message.subject.replace(/[^a-z0-9]+/gi, '-').slice(0, 60)}.json`), JSON.stringify(entry, null, 2))
      } catch {
        /* dev only */
      }
    }
    console.info(`[dk email] (not sent: no RESEND_API_KEY) to ${message.to}: ${message.subject}`)
    return true
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  try {
    const res = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${config.resendKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: config.emailFrom, to: [message.to], subject: message.subject, text: message.text, html: message.html }),
      signal: controller.signal,
    })
    if (!res.ok) console.error('[dk email] Resend refused', res.status, (await res.text()).slice(0, 300))
    return res.ok
  } catch (error) {
    console.error('[dk email] failed', error?.message)
    return false
  } finally {
    clearTimeout(timer)
  }
}

/** Sends several at once, waiting at most a few seconds in total */
export const sendAll = (messages) => Promise.all(messages.filter((m) => m?.to).map((m) => sendEmail(m)))
