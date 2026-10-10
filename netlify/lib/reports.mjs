// Hema's reports: orders and class bookings as CSV (opens in Excel or Google Sheets), and a
// simple monthly total. Dates are Indian dates. Pure (the demo admin uses it too).
import { zonedNow } from '../../src/lib/dates.js'
import { applyClassSettings, slotLabel } from '../../src/lib/classes.js'
import { stateName } from '../../src/data/states.js'

export const istDate = (iso) => zonedNow(new Date(iso)).date
/** Midnight at the start of an Indian date, as an ISO moment */
export const istStart = (date) => new Date(`${date}T00:00:00+05:30`).toISOString()
const nextDay = (date) => new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)
const istTime = (iso) => (iso ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '')

/** A CSV cell: quoted, and never read as a formula by a spreadsheet (=, +, -, @ at the start) */
export function csvCell(v) {
  let s = v == null ? '' : String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}
const csv = (header, rows) => `﻿${[header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n` // BOM: Excel reads ₹ and Kannada right

/** { from, to } Indian dates (inclusive) -> the created_at range for the store */
export function dateRange(from, to) {
  return { from: istStart(from), to: istStart(nextDay(to)) }
}

const PAYMENT = { pending: 'Not paid', submitted: 'Payment to check', confirmed: 'Paid' }
const ORDER_STATUS = { placed: 'New', payment_confirmed: 'Paid', preparing: 'Preparing', shipped: 'Shipped', delivered: 'Delivered', cancelled: 'Cancelled' }
const itemText = (i) => `${i.name?.en || i.productId}${i.size ? ` ${i.size.label}` : ''}${i.ragi ? ' (ragi)' : ''}${i.nameOnBox ? ` [name: ${i.nameOnBox}]` : ''}${i.drawing ? ' + drawing' : ''} x${i.qty}`

export function ordersCsv(rows) {
  return csv(
    ['Order ID', 'Ordered (IST)', 'Status', 'Payment', 'Paid by', 'Razorpay payment ID', 'UPI reference', 'Name', 'Phone', 'Email', 'Address', 'City', 'Pincode', 'State', 'Items', 'Items (Rs)', 'Courier (Rs)', 'Total (Rs)', 'Dispatch date', 'Courier', 'Tracking no', 'Cancel reason', 'Refund note'],
    [...rows]
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map((o) => [
        o.order_code,
        istTime(o.created_at),
        ORDER_STATUS[o.status] || o.status,
        PAYMENT[o.payment_status] || o.payment_status,
        o.payment_method === 'razorpay' ? 'Razorpay' : 'UPI',
        o.razorpay_payment_id || '',
        o.utr || '',
        o.customer_name,
        o.customer_phone,
        o.customer_email || '',
        [o.address_line1, o.address_line2, o.landmark].filter(Boolean).join(', '),
        o.city,
        o.pincode,
        stateName(o.state)?.en || o.state,
        (o.items || []).map(itemText).join('; '),
        o.subtotal,
        o.courier,
        o.total,
        o.dispatch_date,
        o.courier_name || '',
        o.tracking_no || '',
        o.cancel_reason || '',
        o.refund_note || '',
      ]),
  )
}

export function bookingsCsv(rows, cfg = applyClassSettings()) {
  const cls = (id) => cfg.classes.find((c) => c.id === id)?.name.en || id
  const slot = (id) => {
    const s = cfg.slots.find((x) => x.id === id)
    return s ? slotLabel(s) : id
  }
  return csv(
    ['Booking ID', 'Booked (IST)', 'Status', 'Payment', 'Paid by', 'Razorpay payment ID', 'UPI reference', 'Class', 'Weekend (Saturday)', 'Slot', 'Fee (Rs)', 'Name', 'Phone', 'Email', 'Cancel reason'],
    [...rows]
      .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      .map((b) => [
        b.booking_code,
        istTime(b.created_at),
        { pending: 'Not paid', confirmed: 'Confirmed', cancelled: 'Cancelled' }[b.status] || b.status,
        PAYMENT[b.payment_status] || b.payment_status,
        b.payment_method === 'razorpay' ? 'Razorpay' : 'UPI',
        b.razorpay_payment_id || '',
        b.utr || '',
        cls(b.class_id),
        b.weekend,
        slot(b.slot),
        b.fee,
        b.name,
        b.phone,
        b.email || '',
        b.cancel_reason || '',
      ]),
  )
}

/** "2026-10" -> its first day and the first day of the next month */
export function monthRange(month) {
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  return { from: istStart(`${month}-01`), to: istStart(`${next}-01`) }
}

/**
 * The month in numbers. Counts paid orders (not cancelled) by the day they were placed.
 * -> { orders, revenue, courier, items, top: [{ name, qty, revenue }] (5), bookings, bookingRevenue, unpaid, cancelled }
 */
export function monthlySummary(orders, bookings) {
  const paid = orders.filter((o) => o.payment_status === 'confirmed' && o.status !== 'cancelled')
  const products = new Map()
  for (const o of paid)
    for (const i of o.items || []) {
      const name = `${i.name?.en || i.productId}${i.size ? ` ${i.size.label}` : ''}`
      const p = products.get(name) || { name, qty: 0, revenue: 0 }
      p.qty += i.qty
      p.revenue += i.lineTotal
      products.set(name, p)
    }
  const paidBookings = bookings.filter((b) => b.status === 'confirmed')
  return {
    orders: paid.length,
    revenue: paid.reduce((s, o) => s + o.total, 0),
    courier: paid.reduce((s, o) => s + o.courier, 0),
    items: paid.reduce((s, o) => s + (o.items || []).reduce((n, i) => n + i.qty, 0), 0),
    top: [...products.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 5),
    bookings: paidBookings.length,
    bookingRevenue: paidBookings.reduce((s, b) => s + b.fee, 0),
    unpaid: orders.filter((o) => o.payment_status !== 'confirmed' && o.status !== 'cancelled').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  }
}
