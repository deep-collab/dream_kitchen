// The practice database: the same interface and row shapes (snake_case columns) as the Supabase
// store, copying the database rules that matter: unique codes, idempotency keys, total =
// subtotal + courier, the first history event, payment and admin updates, seats per class slot,
// rate-limit windows. Never used in production.
//
// No Node-only code here, so the same store runs in three places:
//   - tests and the local dev server (memory.mjs adds saving to .dev-data/ and upload files),
//   - Hema's demo admin in the browser (/admin/demo, src/admin/demo), with sample data only.
// Hooks: persist(db) after every change; writeFile / readFile for uploads; publicUrl(path) for
// product photos.

import { rajyotsavaRow } from '../../../src/lib/rajyotsava.js'

const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)))
const uuid = () => globalThis.crypto.randomUUID()
const hex = (n) => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('')
const b64 = (bytes) => {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}

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
const ORDER_PATCHABLE = ['status', 'payment_status', 'payment_method', 'razorpay_payment_id', 'courier_name', 'tracking_no', 'tracking_url', 'cancel_reason', 'admin_notes', 'refund_note']
const BOOKING_COLUMNS_FROM_RECORD = ['booking_code', 'idempotency_key', 'class_id', 'weekend', 'slot', 'name', 'phone', 'email', 'fee', 'lang', 'payment_method']
const BOOKING_PATCHABLE = ['status', 'payment_status', 'payment_method', 'razorpay_payment_id', 'cancel_reason', 'admin_notes']
const EMPTY_TO_NULL = ['tracking_url', 'admin_notes', 'refund_note']

const newest = (a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0)
const between = (iso, from, to) => (!from || iso >= from) && (!to || iso < to)

export function createMemoryCore({ initial = null, now = () => new Date(), admin = {}, admins = null, persist = () => {}, writeFile = null, readFile = null, publicUrl = (path) => `/api/photo/${path}` } = {}) {
  const empty = () => ({
    products: {},
    settings: { id: 1, store_open: true },
    orders: [],
    events: [],
    enquiries: [],
    bookings: [],
    bookingEvents: [],
    blocks: [],
    rateLimits: {},
    heartbeat: { last_run_at: null, runs: 0 },
    // A new database has the Rajyotsava offer, as the migration gives D1 and Supabase (d1/migrations/0004)
    offers: [{ ...rajyotsavaRow(), created_at: '2026-10-27T00:00:00.000Z', updated_at: '2026-10-27T00:00:00.000Z' }],
    pagePhotos: {},
    config: {},
    roles: {},
    objects: {},
    publicObjects: {},
    sessions: {},
    adminSeen: {},
    passwords: {},
    nextEventId: 1,
  })
  let db = { ...empty(), ...(initial || {}) }
  const save = () => persist(db)
  const iso = () => now().toISOString()
  // Admin accounts: one from DK_DEV_ADMIN_* (dev), or a list (demo/tests). role: 'owner' unless given
  const accounts = (admins || (admin.email ? [{ ...admin, id: '00000000-0000-4000-8000-00000000a0a0' }] : [])).map((a, i) => ({
    id: a.id || `00000000-0000-4000-8000-0000000000${String(i).padStart(2, '0')}`,
    email: String(a.email).toLowerCase(),
    password: a.password,
    role: a.role || 'owner',
  }))
  const roleOf = (id) => db.roles[id] || accounts.find((a) => a.id === id)?.role || 'owner'
  const passwordOf = (a) => db.passwords[a.id] ?? a.password
  const event = (list, ownerKey, ownerId, e) => {
    list.push({ id: db.nextEventId++, [ownerKey]: ownerId, at: iso(), kind: e.kind || 'status', from_status: e.from_status ?? null, to_status: e.to_status, by: e.by, note: e.note ?? null })
  }
  const holds = (b) => b.status === 'confirmed' || (b.status === 'pending' && (b.payment_status === 'submitted' || now().getTime() - Date.parse(b.created_at) < 30 * 60_000))

  const store = {
    kind: 'memory',
    /** The store's clock in ms (tests move it forward to check the 30-day rule) */
    clock: () => now().getTime(),

    /* ---------- keep-alive ---------- */
    async beat(at) {
      db.heartbeat = { last_run_at: at, runs: (db.heartbeat?.runs || 0) + 1 }
      save()
      return clone(db.heartbeat)
    },
    async lastBeat() {
      return clone(db.heartbeat || { last_run_at: null, runs: 0 })
    },

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

    /* ---------- offers and the Customize tiles' photos ---------- */
    async listOffers() {
      return clone([...db.offers].sort((a, b) => (a.starts_on < b.starts_on ? 1 : a.starts_on > b.starts_on ? -1 : 0)))
    },
    async insertOffer(row) {
      if (!row.starts_on || !row.ends_on || row.ends_on < row.starts_on) throw new DbError('23514', 'offers_dates')
      const offer = { id: uuid(), message: null, button: null, link: '', photo_url: null, active: true, ...clone(row), created_at: iso(), updated_at: iso() }
      db.offers.push(offer)
      save()
      return clone(offer)
    },
    async updateOffer(id, patch) {
      const i = db.offers.findIndex((o) => o.id === id)
      if (i < 0) return null
      const next = { ...db.offers[i], ...clone(patch), updated_at: iso() }
      if (next.ends_on < next.starts_on) throw new DbError('23514', 'offers_dates')
      db.offers[i] = next
      save()
      return clone(next)
    },
    async deleteOffer(id) {
      const before = db.offers.length
      db.offers = db.offers.filter((o) => o.id !== id)
      save()
      return db.offers.length < before
    },
    async listPagePhotos() {
      return clone(Object.values(db.pagePhotos))
    },
    async setPagePhoto(id, photoUrl) {
      db.pagePhotos[id] = { id, photo_url: photoUrl, updated_at: iso() }
      save()
      return clone(db.pagePhotos[id])
    },

    /* ---------- site settings of the developer options ---------- */
    async getConfig() {
      return clone(Object.fromEntries(Object.entries(db.config || {}).map(([k, r]) => [k, r.value])))
    },
    async setConfig(key, value, by = null) {
      db.config ||= {}
      if (value === null || value === undefined) delete db.config[key]
      else db.config[key] = { value: clone(value), updated_at: iso(), updated_by: by }
      save()
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
        id: uuid(),
        created_at: iso(),
        updated_at: iso(),
        payment_status: 'pending',
        status: 'placed',
        utr: null,
        payment_screenshot: null,
        payment_submitted_at: null,
        razorpay_order_id: null,
        razorpay_payment_id: null,
        paid_at: null,
        courier_name: null,
        tracking_no: null,
        tracking_url: null,
        cancel_reason: null,
        admin_notes: null,
        refund_note: null,
        ...Object.fromEntries(ORDER_COLUMNS_FROM_RECORD.map((k) => [k, clone(record[k]) ?? null])),
      }
      row.payment_method ||= 'upi'
      row.lang ||= 'en'
      db.orders.push(row)
      event(db.events, 'order_id', row.id, { to_status: 'placed', by: 'customer' })
      save()
      return { row: clone(row), created: true }
    },
    async getOrder(code) {
      return clone(db.orders.find((o) => o.order_code === code) || null)
    },
    async getOrderEvents(orderId) {
      return clone(db.events.filter((e) => e.order_id === orderId).sort((a, b) => a.id - b.id))
    },
    /** Newest first. from/to: created_at range (ISO), statuses: only these */
    async listOrders({ limit = 200, from, to, statuses } = {}) {
      return clone(
        [...db.orders]
          .filter((o) => between(o.created_at, from, to) && (!statuses || statuses.includes(o.status)))
          .sort(newest)
          .slice(0, limit),
      )
    },
    /** Order ID, name or phone (part of it) */
    async searchOrders(q, { limit = 50 } = {}) {
      const s = String(q).toLowerCase()
      return clone(db.orders.filter((o) => o.order_code.toLowerCase().includes(s) || o.customer_name.toLowerCase().includes(s) || o.customer_phone.includes(s)).sort(newest).slice(0, limit))
    },
    /** The few columns the counts and the home screen need, for every order */
    async orderStats() {
      return db.orders.map(({ status, payment_status, created_at, paid_at, total }) => ({ status, payment_status, created_at, paid_at, total }))
    },
    async submitPayment(code, phone, utr, screenshot) {
      const o = db.orders.find((x) => x.order_code === code && x.customer_phone === phone && x.status === 'placed' && ['pending', 'submitted'].includes(x.payment_status))
      if (!o) return null
      Object.assign(o, { utr, payment_screenshot: screenshot || o.payment_screenshot, payment_status: 'submitted', payment_submitted_at: iso(), updated_at: iso() })
      event(db.events, 'order_id', o.id, { kind: 'payment', from_status: 'pending', to_status: 'submitted', by: 'customer', note: `UTR ${utr}` })
      save()
      return clone(o)
    },
    async adminUpdateOrder(code, patch, e) {
      const o = db.orders.find((x) => x.order_code === code)
      if (!o) return null
      const before = o.status
      for (const k of ORDER_PATCHABLE) if (k in patch) o[k] = patch[k] === '' && EMPTY_TO_NULL.includes(k) ? null : patch[k]
      if (patch.payment_status === 'confirmed' && !o.paid_at) o.paid_at = iso()
      o.updated_at = iso()
      if (e) event(db.events, 'order_id', o.id, { ...e, from_status: before })
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

    /* ---------- class bookings ---------- */
    /** maxSeats: null = no limit. Throws DbError 'slot_full' when the slot has no seat left. */
    async createBooking(record, maxSeats = null) {
      const existing = db.bookings.find((b) => b.idempotency_key === record.idempotency_key)
      if (existing) return { row: clone(existing), created: false }
      if (db.bookings.some((b) => b.booking_code === record.booking_code)) throw new DbError('23505', 'class_bookings_booking_code_key')
      if (maxSeats != null && db.bookings.filter((b) => b.weekend === record.weekend && b.slot === record.slot && holds(b)).length >= maxSeats) throw new DbError('P0001', 'slot_full')
      const row = {
        id: uuid(),
        created_at: iso(),
        updated_at: iso(),
        payment_status: 'pending',
        status: 'pending',
        utr: null,
        razorpay_order_id: null,
        razorpay_payment_id: null,
        paid_at: null,
        cancel_reason: null,
        admin_notes: null,
        ...Object.fromEntries(BOOKING_COLUMNS_FROM_RECORD.map((k) => [k, clone(record[k]) ?? null])),
      }
      row.payment_method ||= 'razorpay'
      row.lang ||= 'en'
      row.email ||= null
      db.bookings.push(row)
      event(db.bookingEvents, 'booking_id', row.id, { to_status: 'pending', by: 'customer' })
      save()
      return { row: clone(row), created: true }
    },
    async getBooking(code) {
      return clone(db.bookings.find((b) => b.booking_code === code) || null)
    },
    async getBookingEvents(bookingId) {
      return clone(db.bookingEvents.filter((e) => e.booking_id === bookingId).sort((a, b) => a.id - b.id))
    },
    /** Newest first. weekends: only these Saturdays; from/to: created_at range */
    async listBookings({ weekends, from, to, limit = 500 } = {}) {
      return clone(
        [...db.bookings]
          .filter((b) => (!weekends || weekends.includes(b.weekend)) && between(b.created_at, from, to))
          .sort(newest)
          .slice(0, limit),
      )
    },
    async searchBookings(q, { limit = 50 } = {}) {
      const s = String(q).toLowerCase()
      return clone(db.bookings.filter((b) => b.booking_code.toLowerCase().includes(s) || b.name.toLowerCase().includes(s) || b.phone.includes(s)).sort(newest).slice(0, limit))
    },
    async bookingStats() {
      return db.bookings.map(({ status, payment_status, created_at, paid_at, fee, weekend }) => ({ status, payment_status, created_at, paid_at, fee, weekend }))
    },
    async submitBookingPayment(code, phone, utr) {
      const b = db.bookings.find((x) => x.booking_code === code && x.phone === phone && x.status === 'pending' && ['pending', 'submitted'].includes(x.payment_status))
      if (!b) return null
      Object.assign(b, { utr, payment_status: 'submitted', updated_at: iso() })
      event(db.bookingEvents, 'booking_id', b.id, { kind: 'payment', from_status: 'pending', to_status: 'submitted', by: 'customer', note: `UTR ${utr}` })
      save()
      return clone(b)
    },
    async adminUpdateBooking(code, patch, e) {
      const b = db.bookings.find((x) => x.booking_code === code)
      if (!b) return null
      const before = b.status
      for (const k of BOOKING_PATCHABLE) if (k in patch) b[k] = patch[k] === '' && EMPTY_TO_NULL.includes(k) ? null : patch[k]
      if (patch.payment_status === 'confirmed' && !b.paid_at) b.paid_at = iso()
      b.updated_at = iso()
      if (e) event(db.bookingEvents, 'booking_id', b.id, { ...e, from_status: before })
      save()
      return clone(b)
    },
    async setBookingRazorpayOrderId(code, razorpayOrderId) {
      const b = db.bookings.find((x) => x.booking_code === code)
      if (!b) return null
      b.razorpay_order_id = razorpayOrderId
      save()
      return clone(b)
    },
    async findBookingByRazorpayId(razorpayOrderId) {
      return clone(db.bookings.find((b) => b.razorpay_order_id === razorpayOrderId) || null)
    },

    /* ---------- blocked weekends and slots ---------- */
    async listBlocks({ from } = {}) {
      return clone(db.blocks.filter((b) => !from || b.weekend >= from).sort((a, b) => (a.weekend < b.weekend ? -1 : 1)))
    },
    async setBlock(weekend, slot, reason) {
      db.blocks = db.blocks.filter((b) => !(b.weekend === weekend && b.slot === slot))
      db.blocks.push({ weekend, slot, reason: reason || null, created_at: iso() })
      save()
    },
    async removeBlock(weekend, slot) {
      db.blocks = db.blocks.filter((b) => !(b.weekend === weekend && b.slot === slot))
      save()
    },

    /* ---------- enquiries (classes and general) ---------- */
    async insertEnquiry(row) {
      const saved = { id: uuid(), created_at: iso(), status: 'new', kind: 'class', ...clone(row) }
      db.enquiries.push(saved)
      save()
      return clone(saved)
    },
    async listEnquiries({ limit = 200 } = {}) {
      return clone([...db.enquiries].sort(newest).slice(0, limit))
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

    /* ---------- files ---------- */
    /** Private files (drawing references, payment screenshots) */
    async putObject(path, bytes, contentType) {
      if (db.objects[path]) throw new DbError('409', 'object_exists')
      db.objects[path] = writeFile ? { contentType, file: writeFile(`uploads/${path}`, bytes) } : { contentType, base64: b64(bytes) }
      save()
    },
    async hasObject(path) {
      return Boolean(db.objects[path])
    },
    /** Supabase returns a short-lived signed URL; the practice store returns the image itself */
    async signedUrl(path) {
      const o = db.objects[path]
      if (!o) return null
      return `data:${o.contentType};base64,${o.base64 || b64(readFile(o.file))}`
    },
    /** Public files (product photos): returns the address the website shows */
    async putPublicObject(path, bytes, contentType) {
      db.publicObjects[path] = writeFile ? { contentType, file: writeFile(`public/${path}`, bytes) } : { contentType, base64: b64(bytes) }
      save()
      return publicUrl(path, contentType, db.publicObjects[path])
    },
    async getPublicObject(path) {
      const o = db.publicObjects[path]
      if (!o) return null
      return { contentType: o.contentType, bytes: o.file ? readFile(o.file) : Uint8Array.from(atob(o.base64), (c) => c.charCodeAt(0)) }
    },

    /* ---------- admin login ---------- */
    auth: {
      async signIn(email, password) {
        const a = accounts.find((x) => x.email === String(email).toLowerCase())
        if (!a || !passwordOf(a) || password !== passwordOf(a)) return null
        return store.auth._session({ id: a.id, email: a.email })
      },
      _session(user) {
        const access = hex(24)
        const refresh = hex(24)
        db.sessions[access] = { user, exp: now().getTime() + 3600_000, refresh }
        save()
        return { access_token: access, refresh_token: refresh, expires_in: 3600, user }
      },
      async refresh(refreshToken) {
        const entry = Object.entries(db.sessions).find(([, s]) => s.refresh === refreshToken)
        if (!entry) return null
        delete db.sessions[entry[0]]
        return store.auth._session(entry[1].user)
      },
      async getUser(accessToken) {
        const s = db.sessions[accessToken]
        if (!s || s.exp < now().getTime()) return null
        return s.user
      },
      async isAdmin(userId) {
        return accounts.some((a) => a.id === userId) && roleOf(userId) !== 'disabled'
      },
      async role(userId) {
        return roleOf(userId)
      },
      async lastSeen(userId) {
        return db.adminSeen[userId] || null
      },
      async touch(userId) {
        db.adminSeen[userId] = iso()
        save()
      },
      async countAdmins() {
        return accounts.length
      },
      /** "Forgot password": the practice store keeps the link where the QA can read it */
      async recover(email, redirectTo) {
        const a = accounts.find((x) => x.email === String(email).toLowerCase())
        if (!a) return
        const s = store.auth._session({ id: a.id, email: a.email })
        db.lastRecovery = { email: a.email, link: `${redirectTo}#access_token=${s.access_token}&refresh_token=${s.refresh_token}&type=recovery` }
        save()
      },
      async updatePassword(accessToken, password) {
        const s = db.sessions[accessToken]
        if (!s || s.exp < now().getTime()) return false
        db.passwords[s.user.id] = password
        save()
        return true
      },
      /** Tests: make a session look this old */
      _age(accessToken, ms) {
        if (db.sessions[accessToken]) db.sessions[accessToken].exp -= ms
      },
    },

    /** Setup check: the practice store is always "set up" */
    async health() {
      return { reachable: true, tables: true, update: true, bucket: true }
    },

    _dump: () => clone(db),
    _replace: (next) => {
      db = { ...empty(), ...clone(next) }
      save()
    },
  }
  return store
}
