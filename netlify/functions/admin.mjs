// POST /api/admin { action, ... }: everything Hema's admin pages do. Only "login" and "refresh"
// work without a token; every other action needs a valid Supabase Auth token for a user listed in
// admin_users. Each answer comes after the database has saved, so the page shows "Saved" only
// when it is true.
import { products as CONFIG_PRODUCTS } from '../../src/config/shop.js'
import { applyOverrides, applySettings, isUpiId } from '../../src/lib/pricing.js'
import { sizeLabel } from '../../src/lib/weights.js'
import { stateName } from '../../src/data/states.js'
import { checkOrigin, clientIp, handle, HttpError, json, readJson } from '../lib/http.mjs'
import { getStore } from '../lib/store/index.mjs'
import { limit } from '../lib/limits.mjs'
import { requireAdmin } from '../lib/auth.mjs'
import { loadCatalog, productRow, rowToOverride, rowToSettings, settingsBase } from '../lib/catalog.mjs'
import { adminAction, adminSummary, NEXT_ACTIONS, TABS } from '../lib/orders.mjs'
import { customerShipped, sendAll } from '../lib/email.mjs'
import { fromDataUrl } from '../lib/images.mjs'
import { backendMode, config as env } from '../lib/env.mjs'

const session = (s, email) => ({ accessToken: s.access_token, refreshToken: s.refresh_token, expiresAt: Date.now() + (s.expires_in || 3600) * 1000, email: email || s.user?.email })
const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
const bool = (v) => (typeof v === 'boolean' ? v : undefined)

async function login(store, body, req, context) {
  await limit(store, 'loginIp', clientIp(req, context))
  const s = await store.auth.signIn(clean(body.email, 120), String(body.password ?? '').slice(0, 200))
  if (!s?.access_token) throw new HttpError(401, 'credentials')
  const user = s.user?.id ? s.user : await store.auth.getUser(s.access_token)
  if (!user || !(await store.auth.isAdmin(user.id))) throw new HttpError(403, 'notAdmin')
  return session(s, user.email)
}

async function refresh(store, body) {
  const s = await store.auth.refresh(String(body.refreshToken ?? '').slice(0, 4096))
  if (!s?.access_token) throw new HttpError(401, 'login')
  return session(s)
}

/** Things Hema must know about, shown as a red bar on every admin page */
function warnings(catalog) {
  const w = []
  if (!catalog.settings.payment.upiId) w.push('upiMissing')
  if (!env.hemaEmail) w.push('emailMissing')
  if (backendMode() === 'mock') w.push('mockBackend')
  return w
}

async function orderDetail(store, code) {
  const row = await store.getOrder(String(code || ''))
  if (!row) throw new HttpError(404, 'notFound')
  const events = await store.getOrderEvents(row.id)
  const items = await Promise.all(
    (row.items || []).map(async (i) => ({ ...i, drawingRefUrl: i.drawingRef ? await store.signedUrl(i.drawingRef) : null })),
  )
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
    utr: row.utr,
    paymentSubmittedAt: row.payment_submitted_at,
    screenshotUrl: row.payment_screenshot ? await store.signedUrl(row.payment_screenshot) : null,
    razorpayPaymentId: row.razorpay_payment_id,
    courierName: row.courier_name,
    trackingNo: row.tracking_no,
    trackingUrl: row.tracking_url,
    cancelReason: row.cancel_reason,
    lang: row.lang,
    events,
    actions: NEXT_ACTIONS[row.status] || [],
  }
}

/** The admin menu list: what customers see now, and what came from the config */
async function menu(store) {
  const rows = await store.listProducts()
  const byId = Object.fromEntries((rows || []).map((r) => [r.id, r]))
  const effective = applyOverrides(CONFIG_PRODUCTS, (rows || []).map(rowToOverride))
  return effective.map((p) => {
    const base = CONFIG_PRODUCTS.find((c) => c.id === p.id)
    return {
      id: p.id,
      name: p.name.en,
      category: p.category,
      sizes: (p.sizes || []).map((s) => ({ id: s.id, label: sizeLabel(s).en, price: s.price, grams: s.grams || null })),
      price: p.price ?? null,
      ragiPrice: p.ragiPrice ?? null,
      soldOut: Boolean(p.soldOut),
      active: p.active !== false,
      priceStatus: p.priceStatus,
      toConfirm: base.toConfirm || null,
      changed: Boolean(byId[p.id] && Object.keys(rowToOverride(byId[p.id])).length > 1),
    }
  })
}

/** Hema's menu edit -> the override columns (null = back to the config value) */
function productPatch(body) {
  const base = CONFIG_PRODUCTS.find((p) => p.id === body.id)
  if (!base) throw new HttpError(404, 'notFound')
  const patch = {}
  const fields = {}
  const price = (v, key) => {
    if (v === null) return (patch[key] = null)
    if (v === undefined) return
    if (!Number.isInteger(v) || v <= 0 || v > 100000) fields[key] = 'price'
    else patch[key] = v
  }
  if (body.reset === true) return { sizes: null, price: null, ragi_price: null, sold_out: null, active: null, price_status: null }
  price(body.price, 'price')
  price(body.ragiPrice, 'ragi_price')
  if (Array.isArray(body.sizes)) {
    const sizes = body.sizes.slice(0, 6).map((s, i) => ({
      id: clean(s.id || `size-${i + 1}`, 20).toLowerCase().replace(/[^a-z0-9-]/g, '-') || `size-${i + 1}`,
      ...(clean(s.label, 24) ? { label: clean(s.label, 24) } : {}),
      ...(Number.isInteger(s.grams) && s.grams > 0 && s.grams < 10000 ? { grams: s.grams } : {}),
      price: s.price,
    }))
    if (!sizes.length || sizes.some((s) => !Number.isInteger(s.price) || s.price <= 0 || s.price > 100000)) fields.sizes = 'price'
    else if (new Set(sizes.map((s) => s.id)).size !== sizes.length) fields.sizes = 'duplicate'
    else patch.sizes = sizes
  }
  if (bool(body.soldOut) !== undefined) patch.sold_out = body.soldOut
  if (bool(body.active) !== undefined) patch.active = body.active
  if (body.priceStatus === 'live' || body.priceStatus === 'coming-soon') patch.price_status = body.priceStatus
  if (Object.keys(fields).length) throw new HttpError(400, 'fields', { fields })
  // Turning a tub on needs prices for every size
  const after = applyOverrides([base], [rowToOverride({ id: base.id, ...patch })])[0]
  if (after.priceStatus === 'live' && !(after.sizes?.length ? after.sizes.every((s) => s.price > 0) : after.price > 0)) throw new HttpError(400, 'fields', { fields: { sizes: 'needPrices' } })
  return patch
}

function settingsPatch(body) {
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
    const ok = r && ['small', 'large'].every((t) => ['karnataka', 'outside'].every((z) => Number.isInteger(r[t]?.[z]) && r[t][z] >= 0 && r[t][z] <= 2000))
    if (r === null) patch.courier_rates = null
    else if (!ok) fields.courierRates = 'rates'
    else patch.courier_rates = { small: { karnataka: r.small.karnataka, outside: r.small.outside }, large: { karnataka: r.large.karnataka, outside: r.large.outside } }
  }
  if (bool(body.storeOpen) !== undefined) patch.store_open = body.storeOpen
  if ('closedMessage' in body) patch.closed_message = clean(body.closedMessage, 200) || null
  if ('announcement' in body) patch.announcement = clean(body.announcement, 200) || null
  if (Object.keys(fields).length) throw new HttpError(400, 'fields', { fields })
  return patch
}

function settingsView(row) {
  const s = applySettings(rowToSettings(row || {}), settingsBase())
  return {
    upiId: row?.upi_id || '',
    upiIdFromEnv: !row?.upi_id && Boolean(s.payment.upiId),
    effectiveUpiId: s.payment.upiId,
    upiName: s.payment.upiName,
    hasQr: Boolean(row?.upi_qr),
    qrUrl: s.payment.upiQr || null,
    leadStandard: s.leadTimes.standardBusinessDays,
    leadDrawingExtra: s.leadTimes.drawingExtraBusinessDays,
    courierRates: s.courier.rates,
    storeOpen: s.store.open,
    closedMessage: s.store.closedMessage,
    announcement: s.store.announcement,
  }
}

export default handle(async (req, context) => {
  checkOrigin(req)
  const body = await readJson(req, 600_000) // a QR image fits
  const store = getStore()
  const action = String(body.action || '')
  if (action === 'login') return json(200, await login(store, body, req, context))
  if (action === 'refresh') return json(200, await refresh(store, body))

  const user = await requireAdmin(req, store)
  switch (action) {
    case 'me':
      return json(200, { email: user.email, warnings: warnings(await loadCatalog(store)) })

    case 'orders': {
      const rows = await store.listOrders({ limit: 300 })
      const tab = TABS[body.tab] ? body.tab : 'new'
      const counts = Object.fromEntries(Object.entries(TABS).map(([k, f]) => [k, rows.filter(f).length]))
      const list = rows.filter(TABS[tab])
      // What to make next comes first: by dispatch date while preparing, newest first elsewhere
      if (tab === 'preparing') list.sort((a, b) => (a.dispatch_date < b.dispatch_date ? -1 : a.dispatch_date > b.dispatch_date ? 1 : 0))
      return json(200, { tab, counts, orders: list.map(adminSummary) })
    }

    case 'order':
      return json(200, { order: await orderDetail(store, body.code) })

    case 'orderAction': {
      const row = await store.getOrder(String(body.code || ''))
      if (!row) throw new HttpError(404, 'notFound')
      // body.step: 'paymentReceived' | 'preparing' | 'shipped' | 'delivered' | 'cancel' | 'notes'
      const { patch, event } = adminAction(row, { ...body, action: body.step }, user.email || 'admin')
      const updated = await store.adminUpdateOrder(row.order_code, patch, event)
      if (!updated) throw new HttpError(409, 'transition')
      if (body.step === 'shipped' && updated.customer_email) await sendAll([customerShipped(updated)])
      return json(200, { order: await orderDetail(store, updated.order_code) })
    }

    case 'menu':
      return json(200, { products: await menu(store) })

    case 'updateProduct': {
      const patch = productPatch(body)
      const base = CONFIG_PRODUCTS.find((p) => p.id === body.id)
      const existing = (await store.listProducts()).some((r) => r.id === base.id)
      if (!existing) await store.upsertProducts([productRow(base)])
      const saved = await store.updateProduct(base.id, patch)
      if (!saved) throw new HttpError(500, 'server')
      return json(200, { products: await menu(store) })
    }

    case 'settings':
      return json(200, { settings: settingsView(await store.getSettings()) })

    case 'updateSettings': {
      const saved = await store.updateSettings(settingsPatch(body))
      return json(200, { settings: settingsView(saved), warnings: warnings(await loadCatalog(store)) })
    }

    case 'enquiries':
      return json(200, { enquiries: await store.listEnquiries({ limit: 300 }) })

    case 'updateEnquiry': {
      if (!['new', 'contacted', 'closed'].includes(body.status)) throw new HttpError(400, 'badRequest')
      const saved = await store.updateEnquiry(String(body.id || ''), { status: body.status })
      if (!saved) throw new HttpError(404, 'notFound')
      return json(200, { enquiry: saved })
    }

    default:
      throw new HttpError(400, 'badRequest')
  }
})

export const config = { path: '/api/admin' }
