// The mock backend for local development and tests (DK_MOCK_BACKEND=1). Same interface and the
// same row shapes (snake_case columns) as the Supabase store, and it copies the database rules
// that matter: unique order codes, idempotency keys, total = subtotal + courier, the "placed"
// event, the payment and admin updates, rate-limit windows. Never used in production.
//
// With a data directory (DK_DEV_DATA_DIR, e.g. .dev-data) it keeps its data between dev-server
// restarts and writes uploads to files; without one it lives in memory (tests).
import { createHmac, randomBytes, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)))

export class DbError extends Error {
  constructor(code, constraint) {
    super(`${code} ${constraint}`)
    this.code = code
    this.constraint = constraint
  }
}

const ORDER_COLUMNS_FROM_RECORD = [
  'order_code', 'idempotency_key', 'customer_name', 'customer_phone', 'customer_email', 'address_line1', 'address_line2', 'city', 'landmark',
  'pincode', 'state', 'zone', 'items', 'subtotal', 'courier', 'total', 'courier_tier', 'has_drawing', 'dispatch_date', 'notes', 'lang', 'payment_method',
]
const ADMIN_PATCHABLE = ['status', 'payment_status', 'payment_method', 'razorpay_payment_id', 'courier_name', 'tracking_no', 'tracking_url', 'cancel_reason', 'admin_notes']

export function createMemoryStore({ dir = '', now = () => new Date(), admin = {} } = {}) {
  const file = dir ? join(dir, 'db.json') : ''
  const empty = () => ({
    products: {},
    settings: { id: 1, store_open: true },
    orders: [],
    events: [],
    enquiries: [],
    rateLimits: {},
    objects: {},
    sessions: {},
    nextEventId: 1,
  })
  let db = empty()
  if (file && existsSync(file)) {
    try {
      db = { ...empty(), ...JSON.parse(readFileSync(file, 'utf8')) }
    } catch {
      db = empty()
    }
  }
  const save = () => {
    if (!file) return
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(db, null, 1))
  }
  const iso = () => now().toISOString()
  const adminUser = admin.email ? { id: '00000000-0000-4000-8000-00000000a0a0', email: admin.email.toLowerCase() } : null
  const secret = randomBytes(16)

  return {
    kind: 'memory',

    /* ---------- menu and settings ---------- */
    async listProducts() {
      return clone(Object.values(db.products))
    },
    async upsertProducts(rows) {
      for (const r of rows) db.products[r.id] = { ...db.products[r.id], ...clone(r), updated_at: iso() }
      save()
    },
    async updateProduct(id, patch) {
      if (!db.products[id]) return null
      db.products[id] = { ...db.products[id], ...clone(patch), updated_at: iso() }
      save()
      return clone(db.products[id])
    },
    async getSettings() {
      return clone(db.settings)
    },
    async updateSettings(patch) {
      db.settings = { ...db.settings, ...clone(patch), id: 1, updated_at: iso() }
      save()
      return clone(db.settings)
    },

    /* ---------- orders ---------- */
    async createOrder(record) {
      const existing = db.orders.find((o) => o.idempotency_key === record.idempotency_key)
      if (existing) return { row: clone(existing), created: false }
      if (db.orders.some((o) => o.order_code === record.order_code)) throw new DbError('23505', 'orders_order_code_key')
      if (record.total !== record.subtotal + record.courier) throw new DbError('23514', 'orders_total_check')
      const row = {
        id: randomUUID(),
        created_at: iso(),
        updated_at: iso(),
        payment_status: 'pending',
        status: 'placed',
        utr: null,
        payment_screenshot: null,
        payment_submitted_at: null,
        razorpay_order_id: null,
        razorpay_payment_id: null,
        courier_name: null,
        tracking_no: null,
        tracking_url: null,
        cancel_reason: null,
        admin_notes: null,
        ...Object.fromEntries(ORDER_COLUMNS_FROM_RECORD.map((k) => [k, clone(record[k]) ?? null])),
      }
      row.payment_method ||= 'upi'
      row.lang ||= 'en'
      db.orders.push(row)
      db.events.push({ id: db.nextEventId++, order_id: row.id, at: iso(), kind: 'status', from_status: null, to_status: 'placed', by: 'customer', note: null })
      save()
      return { row: clone(row), created: true }
    },
    async getOrder(code) {
      return clone(db.orders.find((o) => o.order_code === code) || null)
    },
    async getOrderEvents(orderId) {
      return clone(db.events.filter((e) => e.order_id === orderId).sort((a, b) => a.id - b.id))
    },
    async listOrders({ limit = 200 } = {}) {
      return clone([...db.orders].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)).slice(0, limit))
    },
    async submitPayment(code, phone, utr, screenshot) {
      const o = db.orders.find((x) => x.order_code === code && x.customer_phone === phone && x.status === 'placed' && ['pending', 'submitted'].includes(x.payment_status))
      if (!o) return null
      Object.assign(o, { utr, payment_screenshot: screenshot || o.payment_screenshot, payment_status: 'submitted', payment_submitted_at: iso(), updated_at: iso() })
      db.events.push({ id: db.nextEventId++, order_id: o.id, at: iso(), kind: 'payment', from_status: 'pending', to_status: 'submitted', by: 'customer', note: `UTR ${utr}` })
      save()
      return clone(o)
    },
    async adminUpdateOrder(code, patch, event) {
      const o = db.orders.find((x) => x.order_code === code)
      if (!o) return null
      const before = o.status
      for (const k of ADMIN_PATCHABLE) if (k in patch) o[k] = patch[k] === '' && ['tracking_url', 'admin_notes'].includes(k) ? null : patch[k]
      o.updated_at = iso()
      if (event) db.events.push({ id: db.nextEventId++, order_id: o.id, at: iso(), kind: event.kind || 'status', from_status: before, to_status: event.to_status, by: event.by, note: event.note ?? null })
      save()
      return clone(o)
    },
    async setRazorpayOrderId(code, razorpayOrderId) {
      const o = db.orders.find((x) => x.order_code === code)
      if (!o) return null
      o.razorpay_order_id = razorpayOrderId
      save()
      return clone(o)
    },
    async findOrderByRazorpayId(razorpayOrderId) {
      return clone(db.orders.find((o) => o.razorpay_order_id === razorpayOrderId) || null)
    },

    /* ---------- class enquiries ---------- */
    async insertEnquiry(row) {
      const saved = { id: randomUUID(), created_at: iso(), status: 'new', ...clone(row) }
      db.enquiries.push(saved)
      save()
      return clone(saved)
    },
    async listEnquiries({ limit = 200 } = {}) {
      return clone([...db.enquiries].reverse().slice(0, limit))
    },
    async updateEnquiry(id, patch) {
      const e = db.enquiries.find((x) => x.id === id)
      if (!e) return null
      Object.assign(e, clone(patch))
      save()
      return clone(e)
    },

    /* ---------- rate limits ---------- */
    async hitRateLimit(key, windowSeconds, max) {
      const w = Math.floor(now().getTime() / 1000 / windowSeconds) * windowSeconds
      const k = `${key}|${w}`
      db.rateLimits[k] = (db.rateLimits[k] || 0) + 1
      return db.rateLimits[k] <= max
    },

    /* ---------- files (drawing references, payment screenshots) ---------- */
    async putObject(path, bytes, contentType) {
      if (db.objects[path]) throw new DbError('409', 'object_exists')
      if (dir) {
        const target = join(dir, 'uploads', path)
        mkdirSync(dirname(target), { recursive: true })
        writeFileSync(target, Buffer.from(bytes))
        db.objects[path] = { contentType, file: target }
      } else db.objects[path] = { contentType, base64: Buffer.from(bytes).toString('base64') }
      save()
    },
    async hasObject(path) {
      return Boolean(db.objects[path])
    },
    /** Supabase returns a short-lived signed URL; the mock returns the image itself as a data URL */
    async signedUrl(path) {
      const o = db.objects[path]
      if (!o) return null
      const b64 = o.base64 || readFileSync(o.file).toString('base64')
      return `data:${o.contentType};base64,${b64}`
    },

    /* ---------- admin login (mock: one account from DK_DEV_ADMIN_EMAIL / _PASSWORD) ---------- */
    auth: {
      async signIn(email, password) {
        if (!adminUser || !admin.password || String(email).toLowerCase() !== adminUser.email || password !== admin.password) return null
        const access = randomBytes(24).toString('hex')
        const refresh = randomBytes(24).toString('hex')
        db.sessions[access] = { user: adminUser, exp: now().getTime() + 3600_000, refresh }
        save()
        return { access_token: access, refresh_token: refresh, expires_in: 3600, user: adminUser }
      },
      async refresh(refreshToken) {
        const entry = Object.entries(db.sessions).find(([, s]) => s.refresh === refreshToken)
        if (!entry) return null
        delete db.sessions[entry[0]]
        save()
        const access = randomBytes(24).toString('hex')
        const refresh = randomBytes(24).toString('hex')
        db.sessions[access] = { user: entry[1].user, exp: now().getTime() + 3600_000, refresh }
        save()
        return { access_token: access, refresh_token: refresh, expires_in: 3600, user: entry[1].user }
      },
      async getUser(accessToken) {
        const s = db.sessions[accessToken]
        if (!s || s.exp < now().getTime()) return null
        return s.user
      },
      async isAdmin(userId) {
        return Boolean(adminUser && userId === adminUser.id)
      },
    },

    /** Tests: sign a value the same way every time within this store */
    _sign: (v) => createHmac('sha256', secret).update(v).digest('hex'),
    _dump: () => clone(db),
  }
}
