// Orders on the server: check and re-price a request, build the record, show it to the customer,
// and Hema's status actions. The prices come ONLY from the shared pricing module and the menu
// (catalog.mjs); the numbers the browser sends are compared, never trusted.
import { limits } from '../../src/config/shop.js'
import { normaliseSelection, quote, selectionErrors, sizeOf, stateMismatch, zoneForPincode } from '../../src/lib/pricing.js'
import { dispatchRules, isISODate, preferredDateError, earliestDate } from '../../src/lib/dates.js'
import { cleanDetails, detailsErrors } from '../../src/lib/checkout.js'
import { makeOrderId } from '../../src/lib/orderId.js'
import { sizeLabel } from '../../src/lib/weights.js'
import { stateName } from '../../src/data/states.js'
import { HttpError } from './http.mjs'

const IDEMPOTENCY = /^[A-Za-z0-9-]{16,64}$/

/**
 * Checks and prices an order request against the current menu.
 *   body: { idempotencyKey, items: [{ productId, selection, qty, unitPrice }], customer: {...},
 *           dispatchDate, expectedTotal, lang }
 * Returns the parts of the record; throws HttpError with a code the website explains.
 */
export function priceRequest(body, catalog, now = new Date()) {
  if (!IDEMPOTENCY.test(String(body.idempotencyKey || ''))) throw new HttpError(400, 'badRequest')

  // Details first, so a mistyped phone number is reported like on the page
  const fields = detailsErrors(body.customer || {})
  if (Object.keys(fields).length) throw new HttpError(400, 'details', { fields })
  const details = cleanDetails(body.customer)
  const zone = zoneForPincode(details.pincode, catalog.settings.courier)

  // Items: known, for sale, allowed choices, sane quantities
  const raw = Array.isArray(body.items) ? body.items : []
  if (!raw.length) throw new HttpError(400, 'emptyCart')
  if (raw.length > limits.maxLines) throw new HttpError(400, 'tooManyItems')
  const problems = []
  const items = raw.map((it, index) => {
    const product = catalog.productsById[it?.productId]
    const qty = Number(it?.qty)
    if (!product || product.active === false) {
      problems.push({ index, error: 'removed' })
      return null
    }
    if (product.soldOut) {
      problems.push({ index, error: 'soldOut' })
      return null
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > limits.maxQtyPerItem) {
      problems.push({ index, error: 'qty' })
      return null
    }
    const errors = selectionErrors(product, it.selection || {})
    if (Object.keys(errors).length) {
      problems.push({ index, error: errors.product ? 'unavailable' : 'choices', fields: errors })
      return null
    }
    return { product, selection: normaliseSelection(product, it.selection), qty, sentPrice: Number(it.unitPrice) }
  })
  if (problems.length) throw new HttpError(422, 'items', { lines: problems })

  // Re-price everything here and compare with what the customer saw
  const q = quote(items, zone, catalog.settings.courier)
  const changed = items.map((it, index) => ({ index, unitPrice: q.lines[index].unitPrice })).filter((l, i) => l.unitPrice !== items[i].sentPrice)
  if (changed.length) throw new HttpError(409, 'priceChanged', { lines: changed, total: q.total })
  if (q.total !== Number(body.expectedTotal)) throw new HttpError(409, 'totalChanged', { total: q.total, courier: q.courier })

  // Dispatch date: the earliest allowed date moves later when there's a drawing
  const rules = dispatchRules({ drawing: q.hasDrawing, leadTimes: catalog.settings.leadTimes })
  const dateError = preferredDateError(body.dispatchDate, now, rules)
  if (dateError) throw new HttpError(422, 'dispatchDate', { reason: dateError, earliest: earliestDate(now, rules) })

  return {
    details,
    zone,
    stateWarning: stateMismatch(details.state, zone),
    quote: q,
    dispatchDate: body.dispatchDate,
    lang: body.lang === 'kn' ? 'kn' : 'en',
    items: items.map((it, i) => snapshotItem(it, q.lines[i])),
  }
}

/** What the order remembers about one item: names in both languages, choices and prices */
export function snapshotItem({ product, selection, qty }, line) {
  const size = selection.size ? sizeOf(product, selection.size) : null
  return {
    productId: product.id,
    category: product.category,
    name: { en: product.name.en, kn: product.name.kn || product.name.en },
    size: size ? { id: size.id, label: sizeLabel(size).en } : null,
    ragi: selection.ragi,
    nameOnBox: selection.name || null,
    drawing: selection.drawing,
    drawingText: selection.drawingText || null,
    drawingRef: selection.drawingRef || null,
    qty,
    unitPrice: line.unitPrice,
    lineTotal: line.lineTotal,
    tier: line.tier,
  }
}

/** The database row for a priced request */
export function orderRecord(priced, { idempotencyKey, paymentMethod = 'upi' }) {
  const d = priced.details
  return {
    idempotency_key: idempotencyKey,
    customer_name: d.name,
    customer_phone: d.phone,
    customer_email: d.email || null,
    address_line1: d.line1,
    address_line2: d.line2,
    city: d.city,
    landmark: d.landmark || null,
    pincode: d.pincode,
    state: d.state,
    zone: priced.zone,
    items: priced.items,
    subtotal: priced.quote.subtotal,
    courier: priced.quote.courier,
    total: priced.quote.total,
    courier_tier: priced.quote.courierTier,
    has_drawing: priced.quote.hasDrawing,
    dispatch_date: priced.dispatchDate,
    notes: d.note || null,
    lang: priced.lang,
    payment_method: paymentMethod,
  }
}

/** Saves the order with a fresh DK- code; a code clash (about one in a million) just tries another */
export async function saveOrder(store, record, now = new Date()) {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await store.createOrder({ ...record, order_code: makeOrderId(now) })
    } catch (error) {
      if (error?.constraint === 'orders_order_code_key') continue
      throw error
    }
  }
  throw new HttpError(500, 'server')
}

/** When each step happened, from the order's events */
export function timeline(row, events = []) {
  const at = {}
  for (const e of events) {
    if (e.kind === 'status' && !at[e.to_status]) at[e.to_status] = e.at
  }
  at.placed ||= row.created_at
  return at
}

/**
 * What the customer sees (confirmation page, Track Order): never the address, the UTR in
 * full, Hema's notes or the reference photos.
 */
export function publicOrder(row, events = []) {
  return {
    code: row.order_code,
    createdAt: row.created_at,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    utrLast4: row.utr ? row.utr.slice(-4) : null,
    items: (row.items || []).map((i) => ({
      name: i.name,
      size: i.size?.label || null,
      ragi: Boolean(i.ragi),
      nameOnBox: i.nameOnBox || null,
      drawing: Boolean(i.drawing),
      drawingText: i.drawingText || null,
      hasDrawingRef: Boolean(i.drawingRef),
      qty: i.qty,
      unitPrice: i.unitPrice,
      lineTotal: i.lineTotal,
    })),
    subtotal: row.subtotal,
    courier: row.courier,
    total: row.total,
    zone: row.zone,
    city: row.city,
    dispatchDate: row.dispatch_date,
    hasDrawing: row.has_drawing,
    courierName: row.courier_name,
    trackingNo: row.tracking_no,
    trackingUrl: row.tracking_url,
    cancelReason: row.status === 'cancelled' ? row.cancel_reason : null,
    timeline: timeline(row, events),
  }
}

/* ---------------- Hema's actions (admin) ---------------- */

const clean = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
const isHttps = (v) => {
  try {
    return new URL(v).protocol === 'https:' && v.length <= 300
  } catch {
    return false
  }
}

/** Which actions each status allows (the admin shows only these buttons) */
export const NEXT_ACTIONS = {
  placed: ['paymentReceived', 'cancel'],
  payment_confirmed: ['preparing', 'shipped', 'cancel'],
  preparing: ['shipped', 'cancel'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

/**
 * One tap in the admin -> { patch, event } for store.adminUpdateOrder. Throws 409 'transition'
 * when the order isn't at a step that allows it, 400 'fields' when a required answer is missing.
 *   input: { action, courierName, trackingNo, trackingUrl, reason, notes }
 */
export function adminAction(row, input, by) {
  const action = input?.action
  if (action === 'notes') {
    const notes = String(input.notes ?? '').trim().slice(0, 1000)
    return { patch: { admin_notes: notes }, event: null }
  }
  if (!(NEXT_ACTIONS[row.status] || []).includes(action)) throw new HttpError(409, 'transition', { status: row.status })
  const event = (to, note = null, kind = 'status') => ({ kind, to_status: to, by, note })
  switch (action) {
    case 'paymentReceived':
      return { patch: { status: 'payment_confirmed', payment_status: 'confirmed' }, event: event('payment_confirmed', row.utr ? `UTR ${row.utr}` : null) }
    case 'preparing':
      return { patch: { status: 'preparing' }, event: event('preparing') }
    case 'shipped': {
      const courierName = clean(input.courierName)
      const trackingNo = clean(input.trackingNo)
      const trackingUrl = clean(input.trackingUrl)
      const fields = {}
      if (courierName.length < 2 || courierName.length > 40) fields.courierName = 'required'
      if (trackingNo.length < 3 || trackingNo.length > 40) fields.trackingNo = 'required'
      if (trackingUrl && !isHttps(trackingUrl)) fields.trackingUrl = 'invalid'
      if (Object.keys(fields).length) throw new HttpError(400, 'fields', { fields })
      return {
        patch: { status: 'shipped', courier_name: courierName, tracking_no: trackingNo, tracking_url: trackingUrl || '' },
        event: event('shipped', `${courierName} ${trackingNo}`),
      }
    }
    case 'delivered':
      return { patch: { status: 'delivered' }, event: event('delivered') }
    case 'cancel': {
      const reason = clean(input.reason)
      if (reason.length < 3 || reason.length > 200) throw new HttpError(400, 'fields', { fields: { reason: 'required' } })
      return { patch: { status: 'cancelled', cancel_reason: reason }, event: event('cancelled', reason) }
    }
    default:
      throw new HttpError(400, 'badRequest')
  }
}

/** Admin list tabs */
export const TABS = {
  new: (o) => o.status === 'placed' && o.payment_status === 'pending',
  payment: (o) => o.status === 'placed' && o.payment_status === 'submitted',
  preparing: (o) => o.status === 'payment_confirmed' || o.status === 'preparing',
  shipped: (o) => o.status === 'shipped',
  done: (o) => o.status === 'delivered' || o.status === 'cancelled',
}

/** The admin order card */
export function adminSummary(row) {
  return {
    code: row.order_code,
    createdAt: row.created_at,
    name: row.customer_name,
    city: row.city,
    total: row.total,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    dispatchDate: row.dispatch_date,
    hasDrawing: row.has_drawing,
    itemCount: (row.items || []).reduce((n, i) => n + (i.qty || 0), 0),
  }
}

export { isISODate, stateName }
