// Everything Hema's admin can do, as one function: runAdminAction(store, user, action, body, ctx).
// The real admin calls it from netlify/functions/admin.mjs after checking her login; the demo
// admin (/admin/demo) calls it in the browser with a practice store full of sample data. No
// Node-only code here, so both run exactly the same rules.
//   ctx: { send(messages), env: { hemaEmail, razorpay: { enabled, keyId }, resend, mode }, now() }
// Every answer comes after the store has saved, so the page shows "Saved" only when it is true.
import { products as CONFIG_PRODUCTS, courier as COURIER } from '../../src/config/shop.js'
import { applyOverrides, applySettings, CUSTOM_CATEGORIES, isUpiId, PRODUCT_TEXT_MAX } from '../../src/lib/pricing.js'
import { sizeLabel } from '../../src/lib/weights.js'
import { stateName } from '../../src/data/states.js'
import { photos } from '../../src/data/photos.js'
import { isEmail } from '../../src/lib/validation.js'
import { addDaysISO, isISODate, zonedNow } from '../../src/lib/dates.js'
import { bookableSaturdays, classSettingsErrors, currentOrNextSaturday, holdsSeat, slotLabel, weekendOf } from '../../src/lib/classes.js'
import { classSlots, classes as CLASSES } from '../../src/data/classInfo.js'
import { HttpError } from './http.mjs'
import { productRow, rowToOverride, rowToSettings, settingsBase } from './catalog.mjs'
import { adminAction, adminSummary, NEXT_ACTIONS, TAB_STATUS } from './orders.mjs'
import { BOOKING_NEXT, bookingAction, bookingSummary, classAvailability, classConfig } from './bookings.mjs'
import { bookingsCsv, dateRange, istDate, istStart, monthlySummary, monthRange, ordersCsv } from './reports.mjs'
import { customerBooking, customerBookingCancelled, customerStatus } from './emailTemplates.mjs'
import { fromDataUrl, MIME } from './images.mjs'

export const IDLE_DAYS = 30
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const bool = (v) => (typeof v === 'boolean' ? v : undefined)

/* ---------------- warnings (the red bar) ---------------- */

export function warnings(settingsRow, ctx) {
  const s = applySettings(rowToSettings(settingsRow || {}), settingsBase())
  const w = []
  if (!ctx.env.razorpay?.enabled && !s.payment.upiId) w.push('paymentsOff')
  if (ctx.env.razorpay?.enabled && /^rzp_test_/.test(ctx.env.razorpay.keyId || '')) w.push('razorpayTest')
  if (!(settingsRow?.alert_email || ctx.env.hemaEmail)) w.push('emailMissing')
  if (ctx.env.mode === 'mock') w.push('mockBackend')
  return w
}

/* ---------------- home screen ---------------- */

async function summary(store, ctx) {
  const now = ctx.now()
  const today = zonedNow(now).date
  const [orders, bookings, enquiries] = await Promise.all([store.orderStats(), store.bookingStats(), store.listEnquiries({ limit: 500 })])
  const isToday = (iso) => Boolean(iso) && istDate(iso) === today
  const weekend = currentOrNextSaturday(now)
  return {
    today,
    newOrdersToday: orders.filter((o) => isToday(o.created_at) && o.status !== 'cancelled' && o.payment_status !== 'pending').length,
    unpaidToday: orders.filter((o) => isToday(o.created_at) && o.status === 'placed' && o.payment_status === 'pending').length,
    paymentsToday: orders.filter((o) => isToday(o.paid_at)).reduce((s, o) => s + o.total, 0) + bookings.filter((b) => isToday(b.paid_at)).reduce((s, b) => s + b.fee, 0),
    toCheck: orders.filter((o) => o.status === 'placed' && o.payment_status === 'submitted').length + bookings.filter((b) => b.status === 'pending' && b.payment_status === 'submitted').length,
    toPack: orders.filter((o) => o.status === 'payment_confirmed').length,
    toShip: orders.filter((o) => o.status === 'preparing').length,
    weekend,
    weekendBookings: bookings.filter((b) => b.weekend === weekend && (b.status === 'confirmed' || (b.status === 'pending' && b.payment_status === 'submitted'))).length,
    newEnquiries: enquiries.filter((e) => e.status === 'new').length,
  }
}

/* ---------------- orders ---------------- */

async function orderList(store, body, ctx) {
  const stats = await store.orderStats()
  const today = zonedNow(ctx.now()).date
  const counts = Object.fromEntries(Object.entries(TAB_STATUS).map(([tab, status]) => [tab, stats.filter((o) => o.status === status).length]))
  counts.today = stats.filter((o) => istDate(o.created_at) === today).length
  const q = clean(body.q, 40)
  if (q) return { tab: 'search', q, counts, orders: (await store.searchOrders(q)).map(adminSummary) }
  const tab = TAB_STATUS[body.tab] || body.tab === 'today' ? body.tab : 'new'
  const rows = tab === 'today' ? await store.listOrders({ from: istStart(today), limit: 300 }) : await store.listOrders({ statuses: [TAB_STATUS[tab]], limit: 300 })
  // What to make next comes first: by dispatch date while paid or preparing, newest first elsewhere
  if (tab === 'paid' || tab === 'preparing') rows.sort((a, b) => (a.dispatch_date < b.dispatch_date ? -1 : a.dispatch_date > b.dispatch_date ? 1 : 0))
  return { tab, counts, orders: rows.map(adminSummary) }
}

async function orderDetail(store, code) {
  const row = await store.getOrder(String(code || ''))
  if (!row) throw new HttpError(404, 'notFound')
  const events = await store.getOrderEvents(row.id)
  const items = await Promise.all((row.items || []).map(async (i) => ({ ...i, drawingRefUrl: i.drawingRef ? await store.signedUrl(i.drawingRef) : null })))
  return {
    ...adminSummary(row),
    phone: row.customer_phone,
    email: row.customer_email,
    address: { line1: row.address_line1, line2: row.address_line2, city: row.city, landmark: row.landmark, pincode: row.pincode, state: stateName(row.state)?.en || row.state },
    zone: row.zone,
    courierTier: row.courier_tier,
    items,
    subtotal: row.subtotal,
    courier: row.courier,
    notes: row.notes,
    adminNotes: row.admin_notes,
    refundNote: row.refund_note || '',
    utr: row.utr,
    paymentSubmittedAt: row.payment_submitted_at,
    screenshotUrl: row.payment_screenshot ? await store.signedUrl(row.payment_screenshot) : null,
    razorpayPaymentId: row.razorpay_payment_id,
    razorpayOrderId: row.razorpay_order_id,
    courierName: row.courier_name,
    trackingNo: row.tracking_no,
    trackingUrl: row.tracking_url,
    cancelReason: row.cancel_reason,
    lang: row.lang,
    events,
    actions: NEXT_ACTIONS[row.status] || [],
  }
}

// The customer hears about every status change Hema makes (if they gave an email)
const STEP_STATUS = { paymentReceived: 'payment_confirmed', preparing: 'preparing', shipped: 'shipped', delivered: 'delivered', cancel: 'cancelled' }

async function orderAction(store, user, body, ctx) {
  const row = await store.getOrder(String(body.code || ''))
  if (!row) throw new HttpError(404, 'notFound')
  const { patch, event } = adminAction(row, { ...body, action: body.step }, user.email || 'admin')
  const updated = await store.adminUpdateOrder(row.order_code, patch, event)
  if (!updated) throw new HttpError(409, 'transition')
  const status = STEP_STATUS[body.step]
  let emailed = false
  if (status && updated.customer_email) emailed = (await ctx.send([customerStatus(updated, status)]))?.[0] !== false
  return { order: await orderDetail(store, updated.order_code), emailed }
}

/* ---------------- menu ---------------- */

const builtInPhoto = (slug) => (photos[slug] ? `/products/${slug}-600.webp?v=${photos[slug]}` : null)

// What counts as "Changed by you" (and is undone by "Back to original"): everything but the photo
const changedKeys = (row) => Object.keys(rowToOverride(row)).filter((k) => !['id', 'photo', 'custom', 'category', 'courierTier', 'sort'].includes(k))

async function menu(store) {
  const rows = await store.listProducts()
  const byId = Object.fromEntries((rows || []).map((r) => [r.id, r]))
  const effective = applyOverrides(CONFIG_PRODUCTS, (rows || []).map(rowToOverride))
  return effective.map((p) => {
    const base = CONFIG_PRODUCTS.find((c) => c.id === p.id)
    const row = byId[p.id]
    return {
      id: p.id,
      name: p.name.en,
      nameKn: p.name.kn || '',
      description: p.description?.en || '',
      descriptionKn: p.description?.kn && p.description.kn !== p.description.en ? p.description.kn : '',
      custom: Boolean(p.custom),
      courierTier: p.courierTier,
      category: p.category,
      sizes: (p.sizes || []).map((s) => ({ id: s.id, label: sizeLabel(s).en, price: s.price, grams: s.grams || null })),
      price: p.price ?? null,
      ragiPrice: p.ragiPrice ?? null,
      soldOut: Boolean(p.soldOut),
      active: p.active !== false,
      priceStatus: p.priceStatus,
      toConfirm: base?.toConfirm || null,
      photo: row?.photo_url || builtInPhoto(p.slug),
      ownPhoto: Boolean(row?.photo_url),
      changed: Boolean(!p.custom && row && changedKeys(row).length),
    }
  })
}

/**
 * Hema's name and description for a product: { name?: { en, kn }, description?: { en, kn } } ->
 * the display_name / description columns. A product she added always keeps an English name; for
 * the others an empty name or description means "back to the original" (null).
 */
function textPatch(body, custom, patch, fields) {
  const pair = (v, max) => ({ en: clean(v?.en, max), kn: clean(v?.kn, max) })
  if (body.name !== undefined) {
    const name = pair(body.name, PRODUCT_TEXT_MAX.name)
    if (!name.en && (custom || name.kn)) fields.name = 'required'
    else patch.display_name = name.en ? { en: name.en, ...(name.kn ? { kn: name.kn } : {}) } : null
  }
  if (body.description !== undefined) {
    const d = pair(body.description, PRODUCT_TEXT_MAX.description)
    if (!d.en && d.kn) fields.description = 'required'
    else patch.description = d.en ? { en: d.en, ...(d.kn ? { kn: d.kn } : {}) } : null
  }
}

/** The product as it is now (config, or one Hema added), for an edit */
async function productBase(store, id) {
  const config = CONFIG_PRODUCTS.find((p) => p.id === id)
  if (config) return config
  const row = (await store.listProducts()).find((r) => r.id === id && r.custom)
  const product = row && applyOverrides([], [rowToOverride(row)])[0]
  if (!product) throw new HttpError(404, 'notFound')
  return product
}

/** Hema's menu edit -> the override columns (null = back to the config value) */
export function productPatch(body, base = CONFIG_PRODUCTS.find((p) => p.id === body.id)) {
  if (!base) throw new HttpError(404, 'notFound')
  const patch = {}
  const fields = {}
  const price = (v, key) => {
    if (v === null) return (patch[key] = null)
    if (v === undefined) return
    if (!Number.isInteger(v) || v <= 0 || v > 100000) fields[key] = 'price'
    else patch[key] = v
  }
  if (body.reset === true && !base.custom) return { sizes: null, price: null, ragi_price: null, sold_out: null, active: null, price_status: null, display_name: null, description: null }
  textPatch(body, base.custom, patch, fields)
  price(body.price, 'price')
  price(body.ragiPrice, 'ragi_price')
  if (Array.isArray(body.sizes)) {
    const sizes = sizesFrom(body.sizes)
    if (!sizes.length || sizes.some((s) => !Number.isInteger(s.price) || s.price <= 0 || s.price > 100000)) fields.sizes = 'price'
    else if (base.custom && sizes.some((s) => !s.label)) fields.sizes = 'needLabels'
    else if (new Set(sizes.map((s) => s.id)).size !== sizes.length) fields.sizes = 'duplicate'
    else patch.sizes = sizes
  }
  if (bool(body.soldOut) !== undefined) patch.sold_out = body.soldOut
  if (bool(body.active) !== undefined) patch.active = body.active
  if (!base.custom && (body.priceStatus === 'live' || body.priceStatus === 'coming-soon')) patch.price_status = body.priceStatus
  if (Object.keys(fields).length) throw new HttpError(400, 'fields', { fields })
  // Turning a tub on needs prices for every size
  const after = applyOverrides([base], [rowToOverride({ id: base.id, ...patch })])[0]
  if (after.priceStatus === 'live' && !(after.sizes?.length ? after.sizes.every((s) => s.price > 0) : after.price > 0)) throw new HttpError(400, 'fields', { fields: { sizes: 'needPrices' } })
  return patch
}

/** Sizes from the admin page: [{ id?, label, grams?, price }] -> the sizes column */
function sizesFrom(list) {
  return list.slice(0, 6).map((s, i) => ({
    id: clean(s.id || `size-${i + 1}`, 20).toLowerCase().replace(/[^a-z0-9-]/g, '-') || `size-${i + 1}`,
    ...(clean(s.label, 24) ? { label: clean(s.label, 24) } : {}),
    ...(Number.isInteger(s.grams) && s.grams > 0 && s.grams < 10000 ? { grams: s.grams } : {}),
    price: s.price,
  }))
}

/**
 * A product Hema adds: { category, name: { en, kn }, description?: { en, kn }, courierTier, price? | sizes? }.
 * It goes on the menu straight away, after the config's products in its category. Its id comes
 * from the English name (never the same as another product's, so old orders keep their names).
 */
async function addProduct(store, body) {
  const fields = {}
  const patch = {}
  if (!CUSTOM_CATEGORIES.includes(body.category)) fields.category = 'required'
  if (!COURIER.tiers.includes(body.courierTier)) fields.courierTier = 'required'
  textPatch({ name: body.name || {}, description: body.description }, true, patch, fields)
  const hasSizes = Array.isArray(body.sizes) && body.sizes.length > 0
  if (hasSizes) {
    const sizes = sizesFrom(body.sizes)
    if (sizes.some((s) => !Number.isInteger(s.price) || s.price <= 0 || s.price > 100000)) fields.sizes = 'price'
    else if (sizes.some((s) => !s.label)) fields.sizes = 'needLabels'
    else if (new Set(sizes.map((s) => s.id)).size !== sizes.length) fields.sizes = 'duplicate'
    else patch.sizes = sizes
  } else if (!Number.isInteger(body.price) || body.price <= 0 || body.price > 100000) fields.price = 'price'
  else patch.price = body.price
  if (Object.keys(fields).length) throw new HttpError(400, 'fields', { fields })

  const rows = await store.listProducts()
  const taken = new Set([...CONFIG_PRODUCTS.map((p) => p.id), ...rows.map((r) => r.id)])
  const stem = patch.display_name.en.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'product'
  let id = stem.length >= 2 ? stem : `product-${stem}`
  for (let n = 2; taken.has(id); n++) id = `${stem}-${n}`
  const sort = rows.filter((r) => r.custom && r.category === body.category).reduce((max, r) => Math.max(max, r.sort || 0), 0) + 1
  await store.upsertProducts([
    {
      id,
      slug: id,
      category: body.category,
      name_en: patch.display_name.en,
      name_kn: patch.display_name.kn || '',
      options: {},
      courier_tier: body.courierTier,
      sort,
      image: null,
      custom: true,
      display_name: patch.display_name,
      description: patch.description ?? null,
      sizes: patch.sizes ?? null,
      price: patch.price ?? null,
      price_status: 'live',
      active: true,
      sold_out: false,
    },
  ])
  return id
}

async function ensureProductRow(store, id) {
  const base = await productBase(store, id)
  if (!(await store.listProducts()).some((r) => r.id === base.id)) await store.upsertProducts([productRow(base)])
  return base
}

/** A new photo from Hema's phone (already shrunk by the admin page to about 1000px) */
async function productPhoto(store, body, ctx) {
  const base = await ensureProductRow(store, body.id)
  if (body.image === null) return store.updateProduct(base.id, { photo_url: null })
  const image = fromDataUrl(body.image, 700_000)
  if (!image) throw new HttpError(400, 'fields', { fields: { photo: 'image' } })
  const url = await store.putPublicObject(`${base.id}/${ctx.now().getTime()}.${image.type}`, image.bytes, MIME[image.type])
  return store.updateProduct(base.id, { photo_url: url })
}

/* ---------------- settings ---------------- */

export function settingsPatch(body) {
  const patch = {}
  const fields = {}
  if ('upiId' in body) {
    const v = clean(body.upiId, 100)
    if (v && !isUpiId(v)) fields.upiId = 'invalid'
    else patch.upi_id = v || null
  }
  if ('upiName' in body) patch.upi_name = clean(body.upiName, 40) || null
  if ('upiQr' in body) {
    if (body.upiQr === null) patch.upi_qr = null
    else if (!fromDataUrl(body.upiQr)) fields.upiQr = 'image'
    else patch.upi_qr = body.upiQr
  }
  for (const [key, col] of [
    ['leadStandard', 'lead_standard'],
    ['leadDrawingExtra', 'lead_drawing_extra'],
  ]) {
    if (!(key in body)) continue
    if (body[key] === null) patch[col] = null
    else if (!Number.isInteger(body[key]) || body[key] < 0 || body[key] > 30) fields[key] = 'days'
    else patch[col] = body[key]
  }
  if ('courierRates' in body) {
    const r = body.courierRates
    const ok = r && COURIER.tiers.every((t) => ['karnataka', 'outside'].every((z) => Number.isInteger(r[t]?.[z]) && r[t][z] >= 0 && r[t][z] <= 2000))
    if (r === null) patch.courier_rates = null
    else if (!ok) fields.courierRates = 'rates'
    else patch.courier_rates = Object.fromEntries(COURIER.tiers.map((t) => [t, { karnataka: r[t].karnataka, outside: r[t].outside }]))
  }
  if (bool(body.storeOpen) !== undefined) patch.store_open = body.storeOpen
  if ('closedMessage' in body) patch.closed_message = clean(body.closedMessage, 200) || null
  if ('announcement' in body) patch.announcement = clean(body.announcement, 200) || null
  if ('alertEmail' in body) {
    const v = clean(body.alertEmail, 120).toLowerCase()
    if (v && !isEmail(v)) fields.alertEmail = 'invalid'
    else patch.alert_email = v || null
  }
  if (Object.keys(fields).length) throw new HttpError(400, 'fields', { fields })
  return patch
}

function settingsView(row, ctx) {
  const s = applySettings(rowToSettings(row || {}), settingsBase())
  return {
    upiId: row?.upi_id || '',
    upiIdFromEnv: !row?.upi_id && Boolean(s.payment.upiId),
    effectiveUpiId: s.payment.upiId,
    upiName: s.payment.upiName,
    hasQr: Boolean(row?.upi_qr),
    qrUrl: row?.upi_qr || null,
    razorpayOn: Boolean(ctx.env.razorpay?.enabled),
    leadStandard: s.leadTimes.standardBusinessDays,
    leadDrawingExtra: s.leadTimes.drawingExtraBusinessDays,
    courierRates: s.courier.rates,
    tierNames: COURIER.tierNames,
    storeOpen: s.store.open,
    closedMessage: s.store.closedMessage,
    announcement: s.store.announcement,
    alertEmail: row?.alert_email || '',
    alertEmailFromEnv: !row?.alert_email && ctx.env.hemaEmail ? ctx.env.hemaEmail : '',
  }
}

/* ---------------- classes ---------------- */

async function bookingDetail(store, code, cfg) {
  const row = await store.getBooking(String(code || ''))
  if (!row) throw new HttpError(404, 'notFound')
  const slot = cfg.slots.find((s) => s.id === row.slot)
  return {
    ...bookingSummary(row, cfg),
    email: row.email,
    slotText: slot ? slotLabel(slot) : row.slot,
    utr: row.utr,
    razorpayPaymentId: row.razorpay_payment_id,
    cancelReason: row.cancel_reason,
    adminNotes: row.admin_notes,
    lang: row.lang,
    events: await store.getBookingEvents(row.id),
    actions: BOOKING_NEXT[row.status] || [],
  }
}

const classView = (cfg) => ({
  classes: cfg.classes.map((c) => ({ id: c.id, name: c.name.en, price: c.price, beginnerFriendly: Boolean(c.beginnerFriendly) })),
  slots: cfg.slots.map((s) => ({ id: s.id, start: s.start, end: s.end, label: slotLabel(s) })),
  seats: cfg.seats,
})

/** The weekends Hema sees: this weekend (if it's on now), the next 12, and older ones with bookings */
function scheduleSaturdays(now) {
  const current = currentOrNextSaturday(now)
  const next = bookableSaturdays(now, 12)
  return [...new Set([current, ...next])].sort()
}

async function bookingList(store, body, cfg, ctx) {
  const q = clean(body.q, 40)
  const weekend = isISODate(body.weekend) ? weekendOf(body.weekend) : null
  let rows = q ? await store.searchBookings(q) : await store.listBookings(weekend ? { weekends: [weekend] } : { limit: 300 })
  if (body.slot && body.slot !== 'all') rows = rows.filter((b) => b.slot === body.slot)
  if (body.status === 'active') rows = rows.filter((b) => b.status !== 'cancelled')
  const all = await store.bookingStats()
  const today = zonedNow(ctx.now()).date
  const weekends = [...new Set([...scheduleSaturdays(ctx.now()), ...all.map((b) => b.weekend).filter((w) => w >= addDaysISO(today, -84))])].sort()
  return { bookings: rows.map((r) => bookingSummary(r, cfg)), weekends, ...classView(cfg) }
}

async function attendees(store, body, cfg, ctx) {
  const weekend = isISODate(body.weekend) ? weekendOf(body.weekend) : currentOrNextSaturday(ctx.now())
  if (!weekend) throw new HttpError(400, 'badRequest')
  const rows = await store.listBookings({ weekends: [weekend] })
  const [week] = await classAvailability(store, [weekend], cfg, ctx.now())
  return {
    weekend,
    seats: cfg.seats,
    slots: cfg.slots.map((s) => {
      const list = rows
        .filter((b) => b.slot === s.id && b.status !== 'cancelled' && (b.status === 'confirmed' || b.payment_status === 'submitted'))
        .sort((a, b) => (a.name < b.name ? -1 : 1))
      return {
        id: s.id,
        label: slotLabel(s),
        blocked: week.slots.find((x) => x.id === s.id)?.blocked || false,
        people: list.map((b) => ({ ...bookingSummary(b, cfg), paid: b.status === 'confirmed' })),
        unpaid: rows.filter((b) => b.slot === s.id && b.status === 'pending' && b.payment_status === 'pending' && holdsSeat(b, ctx.now())).length,
      }
    }),
  }
}

async function bookingActionRun(store, user, body, cfg, ctx) {
  const row = await store.getBooking(String(body.code || ''))
  if (!row) throw new HttpError(404, 'notFound')
  const { patch, event } = bookingAction(row, body, user.email || 'admin')
  const updated = await store.adminUpdateBooking(row.booking_code, patch, event)
  if (!updated) throw new HttpError(409, 'transition')
  if (body.step === 'paymentReceived') await ctx.send([customerBooking(updated, cfg)])
  if (body.step === 'cancel') await ctx.send([customerBookingCancelled(updated)])
  return { booking: await bookingDetail(store, updated.booking_code, cfg) }
}

async function setBlock(store, body, ctx) {
  const weekend = isISODate(body.weekend) ? weekendOf(body.weekend) : null
  const slot = body.slot === '*' ? '*' : classSlots.some((s) => s.id === body.slot) ? body.slot : null
  if (!weekend || !slot || weekend < currentOrNextSaturday(ctx.now())) throw new HttpError(400, 'badRequest')
  if (body.blocked) await store.setBlock(weekend, slot, clean(body.reason, 120) || null)
  else await store.removeBlock(weekend, slot)
}

async function schedule(store, cfg, ctx) {
  const saturdays = scheduleSaturdays(ctx.now())
  return { weekends: await classAvailability(store, saturdays, cfg, ctx.now()), ...classView(cfg) }
}

function classSettingsPatch(body, current) {
  const next = { ...(current || {}) }
  if (body.fees) next.fees = Object.fromEntries(CLASSES.map((c) => [c.id, body.fees[c.id]]).filter(([, v]) => v !== undefined && v !== ''))
  if (body.slots) next.slots = Object.fromEntries(classSlots.map((s) => [s.id, body.slots[s.id]]).filter(([, v]) => v && v.start && v.end))
  if ('seats' in body) next.seats = body.seats === '' || body.seats === null ? null : body.seats
  const errors = classSettingsErrors(next)
  if (Object.keys(errors).length) throw new HttpError(400, 'fields', { fields: errors })
  return next
}

/* ---------------- enquiries ---------------- */

const enquiryView = (e) => ({ ...e, kind: e.kind || 'class', handled: e.status !== 'new' })

/* ---------------- reports ---------------- */

async function report(store, body, cfg) {
  const { from, to } = body
  if (!isISODate(from) || !isISODate(to) || from > to) throw new HttpError(400, 'fields', { fields: { range: 'invalid' } })
  const range = dateRange(from, to)
  if (body.kind === 'bookings') {
    const rows = await store.listBookings({ ...range, limit: 20000 })
    return { filename: `dream-kitchen-class-bookings-${from}-to-${to}.csv`, csv: bookingsCsv(rows, cfg), count: rows.length }
  }
  const rows = await store.listOrders({ ...range, limit: 20000 })
  return { filename: `dream-kitchen-orders-${from}-to-${to}.csv`, csv: ordersCsv(rows), count: rows.length }
}

async function monthly(store, body, ctx) {
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(body.month || '') ? body.month : zonedNow(ctx.now()).date.slice(0, 7)
  const range = monthRange(month)
  const [orders, bookings] = await Promise.all([store.listOrders({ ...range, limit: 20000 }), store.listBookings({ ...range, limit: 20000 })])
  return { month, ...monthlySummary(orders, bookings) }
}

/* ---------------- the dispatcher ---------------- */

export async function runAdminAction(store, user, action, body, ctx) {
  const settingsRow = () => store.getSettings()
  switch (action) {
    case 'me':
      return { email: user.email, warnings: warnings(await settingsRow(), ctx), mode: ctx.env.mode }

    case 'summary':
      return { summary: await summary(store, ctx), warnings: warnings(await settingsRow(), ctx) }

    case 'orders':
      return orderList(store, body, ctx)
    case 'order':
      return { order: await orderDetail(store, body.code) }
    case 'orderAction':
      return orderAction(store, user, body, ctx)

    case 'menu':
      return { products: await menu(store) }
    case 'addProduct': {
      const id = await addProduct(store, body)
      return { id, products: await menu(store) }
    }
    case 'updateProduct': {
      const patch = productPatch(body, await productBase(store, body.id))
      const base = await ensureProductRow(store, body.id)
      if (!(await store.updateProduct(base.id, patch))) throw new HttpError(500, 'server')
      return { products: await menu(store) }
    }
    case 'productPhoto':
      if (!(await productPhoto(store, body, ctx))) throw new HttpError(500, 'server')
      return { products: await menu(store) }

    case 'settings':
      return { settings: settingsView(await settingsRow(), ctx) }
    case 'updateSettings': {
      const saved = await store.updateSettings(settingsPatch(body))
      return { settings: settingsView(saved, ctx), warnings: warnings(saved, ctx) }
    }

    case 'enquiries':
      return { enquiries: (await store.listEnquiries({ limit: 300 })).map(enquiryView) }
    case 'updateEnquiry': {
      const status = body.status === 'new' ? 'new' : body.status === 'handled' ? 'handled' : null
      if (!status) throw new HttpError(400, 'badRequest')
      const saved = await store.updateEnquiry(String(body.id || ''), { status })
      if (!saved) throw new HttpError(404, 'notFound')
      return { enquiry: enquiryView(saved) }
    }

    case 'bookings':
      return bookingList(store, body, classConfig(await settingsRow()), ctx)
    case 'booking':
      return { booking: await bookingDetail(store, body.code, classConfig(await settingsRow())) }
    case 'bookingAction':
      return bookingActionRun(store, user, body, classConfig(await settingsRow()), ctx)
    case 'attendees':
      return attendees(store, body, classConfig(await settingsRow()), ctx)
    case 'schedule':
      return schedule(store, classConfig(await settingsRow()), ctx)
    case 'setBlock':
      await setBlock(store, body, ctx)
      return schedule(store, classConfig(await settingsRow()), ctx)
    case 'updateClassSettings': {
      const row = await settingsRow()
      const saved = await store.updateSettings({ class_settings: classSettingsPatch(body, row?.class_settings) })
      return schedule(store, classConfig(saved), ctx)
    }

    case 'report':
      return report(store, body, classConfig(await settingsRow()))
    case 'monthly':
      return monthly(store, body, ctx)

    default:
      throw new HttpError(400, 'badRequest')
  }
}
