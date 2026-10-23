// Cloudflare D1 Store: complete SQLite implementation for Cloudflare Workers & D1.
// Satisfies the exact same store contract interface as Supabase and Memory stores.

export class DbError extends Error {
  constructor(code, message, details = null) {
    super(message)
    this.code = code
    this.details = details
  }
}

// Hex and byte helpers using Web APIs
const bytesToHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
const hexToBytes = (hex) => new Uint8Array(hex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let c = 0
  for (let i = 0; i < a.length; i++) c |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return c === 0
}

export async function hashPassword(password, saltHex = null) {
  const enc = new TextEncoder()
  const salt = saltHex ? hexToBytes(saltHex) : crypto.getRandomValues(new Uint8Array(16))
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'])
  const key = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  )
  return {
    salt: bytesToHex(salt),
    hash: bytesToHex(new Uint8Array(key)),
  }
}

export async function verifyPassword(password, saltHex, expectedHashHex) {
  const { hash } = await hashPassword(password, saltHex)
  return timingSafeEqualStr(hash, expectedHashHex)
}

const json = (v) => (v ? (typeof v === 'string' ? JSON.parse(v) : v) : null)

function parseProduct(row) {
  if (!row) return null
  return {
    ...row,
    sizes: row.sizes ? JSON.parse(row.sizes) : null,
    options: row.options ? JSON.parse(row.options) : {},
    active: row.active === null || row.active === undefined ? null : Boolean(row.active),
    sold_out: row.sold_out === null || row.sold_out === undefined ? null : Boolean(row.sold_out),
    // Hema's own products and her names / descriptions (d1/migrations/0002)
    custom: Boolean(row.custom),
    display_name: json(row.display_name),
    description: json(row.description),
  }
}

// How each products column is stored: JSON text, 1/0 or as it is
const PRODUCT_JSON = ['sizes', 'options', 'display_name', 'description']
const PRODUCT_BOOL = ['active', 'sold_out', 'custom']
const PRODUCT_PLAIN = ['slug', 'category', 'name_en', 'name_kn', 'price', 'ragi_price', 'courier_tier', 'price_status', 'sort', 'image', 'photo_url']
const productValue = (k, v) => (PRODUCT_JSON.includes(k) ? (v ? JSON.stringify(v) : null) : PRODUCT_BOOL.includes(k) ? (v == null ? null : v ? 1 : 0) : (v ?? null))

function parseOffer(row) {
  if (!row) return null
  return { ...row, title: json(row.title), message: json(row.message), button: json(row.button), active: Boolean(row.active) }
}
const OFFER_JSON = ['title', 'message', 'button']
const OFFER_PLAIN = ['link', 'photo_url', 'starts_on', 'ends_on']
const offerValue = (k, v) => (OFFER_JSON.includes(k) ? (v ? JSON.stringify(v) : null) : k === 'active' ? (v ? 1 : 0) : (v ?? null))

function parseSettings(row) {
  if (!row) return null
  return {
    ...row,
    courier_rates: row.courier_rates ? JSON.parse(row.courier_rates) : null,
    class_settings: row.class_settings ? JSON.parse(row.class_settings) : null,
    store_open: Boolean(row.store_open),
  }
}

function parseOrder(row) {
  if (!row) return null
  return {
    ...row,
    items: row.items ? (typeof row.items === 'string' ? JSON.parse(row.items) : row.items) : [],
    has_drawing: Boolean(row.has_drawing),
  }
}

function parseBooking(row) {
  if (!row) return null
  return { ...row }
}

const isoNow = () => new Date().toISOString()

export function createD1Store(db, { r2Bucket = null, siteUrl = '' } = {}) {
  if (!db) throw new Error('D1 database instance is required')

  const store = {
    kind: 'd1',

    /* ---------- menu & catalog ---------- */
    async listProducts() {
      const res = await db.prepare('SELECT * FROM products ORDER BY sort ASC, id ASC').all()
      return (res.results || []).map(parseProduct)
    },

    /** Insert, or update only the columns given (like Supabase's merge): a row with just the
     *  reference columns (ensureProductRow, the seed) never wipes Hema's prices, names or photo */
    async upsertProducts(rows) {
      if (!rows.length) return
      const stmts = rows.map((r) => {
        const row = { name_kn: '', options: {}, courier_tier: 'small', sort: 0, ...r }
        const cols = [...PRODUCT_PLAIN, ...PRODUCT_JSON, ...PRODUCT_BOOL].filter((k) => k in row)
        const given = cols.filter((k) => k in r)
        return db
          .prepare(
            `INSERT INTO products (id, ${cols.join(', ')}, updated_at)
             VALUES (?, ${cols.map(() => '?').join(', ')}, ?)
             ON CONFLICT (id) DO UPDATE SET ${[...given.map((k) => `${k} = excluded.${k}`), 'updated_at = excluded.updated_at'].join(', ')}`,
          )
          .bind(r.id, ...cols.map((k) => productValue(k, row[k])), isoNow())
      })
      await db.batch(stmts)
    },

    async updateProduct(id, patch) {
      const existing = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()
      if (!existing) return null
      const fields = []
      const values = []
      for (const [k, v] of Object.entries(patch)) {
        if (![...PRODUCT_PLAIN, ...PRODUCT_JSON, ...PRODUCT_BOOL].includes(k)) continue
        fields.push(`${k} = ?`)
        values.push(productValue(k, v))
      }
      fields.push('updated_at = ?')
      values.push(isoNow())
      values.push(id)

      await db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
      const updated = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()
      return parseProduct(updated)
    },

    /* ---------- offers and the Customize tiles' photos (d1/migrations/0002) ---------- */
    async listOffers() {
      const res = await db.prepare('SELECT * FROM offers ORDER BY starts_on DESC').all()
      return (res.results || []).map(parseOffer)
    },

    async insertOffer(row) {
      const id = crypto.randomUUID()
      const offer = { active: true, link: '', ...row }
      const cols = [...OFFER_JSON, ...OFFER_PLAIN, 'active'].filter((k) => k in offer)
      await db
        .prepare(`INSERT INTO offers (id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`)
        .bind(id, ...cols.map((k) => offerValue(k, offer[k])))
        .run()
      return parseOffer(await db.prepare('SELECT * FROM offers WHERE id = ?').bind(id).first())
    },

    async updateOffer(id, patch) {
      const cols = Object.keys(patch).filter((k) => [...OFFER_JSON, ...OFFER_PLAIN, 'active'].includes(k))
      const res = await db
        .prepare(`UPDATE offers SET ${[...cols.map((k) => `${k} = ?`), 'updated_at = ?'].join(', ')} WHERE id = ?`)
        .bind(...cols.map((k) => offerValue(k, patch[k])), isoNow(), id)
        .run()
      if (!res.meta?.changes) return null
      return parseOffer(await db.prepare('SELECT * FROM offers WHERE id = ?').bind(id).first())
    },

    async deleteOffer(id) {
      const res = await db.prepare('DELETE FROM offers WHERE id = ?').bind(id).run()
      return (res.meta?.changes || 0) > 0
    },

    async listPagePhotos() {
      const res = await db.prepare('SELECT * FROM page_photos').all()
      return res.results || []
    },

    async setPagePhoto(id, photoUrl) {
      await db
        .prepare('INSERT INTO page_photos (id, photo_url, updated_at) VALUES (?, ?, ?) ON CONFLICT (id) DO UPDATE SET photo_url = excluded.photo_url, updated_at = excluded.updated_at')
        .bind(id, photoUrl ?? null, isoNow())
        .run()
      return db.prepare('SELECT * FROM page_photos WHERE id = ?').bind(id).first()
    },

    /* ---------- settings ---------- */
    async getSettings() {
      const row = await db.prepare('SELECT * FROM settings WHERE id = 1').first()
      return parseSettings(row)
    },

    async updateSettings(patch) {
      const existing = await db.prepare('SELECT * FROM settings WHERE id = 1').first()
      const fields = []
      const values = []
      for (const [k, v] of Object.entries(patch)) {
        if (['upi_id', 'upi_name', 'upi_qr', 'lead_standard', 'lead_drawing_extra', 'closed_message', 'announcement', 'alert_email'].includes(k)) {
          fields.push(`${k} = ?`)
          values.push(v ?? null)
        } else if (k === 'store_open') {
          fields.push('store_open = ?')
          values.push(v ? 1 : 0)
        } else if (['courier_rates', 'class_settings'].includes(k)) {
          fields.push(`${k} = ?`)
          values.push(v ? JSON.stringify(v) : null)
        }
      }
      fields.push('updated_at = ?')
      values.push(isoNow())

      if (!existing) {
        await db.prepare('INSERT INTO settings (id, store_open, updated_at) VALUES (1, 1, ?)').bind(isoNow()).run()
      }
      await db.prepare(`UPDATE settings SET ${fields.join(', ')} WHERE id = 1`).bind(...values).run()
      const row = await db.prepare('SELECT * FROM settings WHERE id = 1').first()
      return parseSettings(row)
    },

    /* ---------- orders ---------- */
    async createOrder(record) {
      // 1. Idempotency check
      const existing = await db.prepare('SELECT * FROM orders WHERE idempotency_key = ?').bind(record.idempotency_key).first()
      if (existing) return { row: parseOrder(existing), created: false }

      // 2. Order code collision check
      const codeClash = await db.prepare('SELECT id FROM orders WHERE order_code = ?').bind(record.order_code).first()
      if (codeClash) throw new DbError('23505', 'orders_order_code_key')

      // 3. Totals check
      if (record.total !== record.subtotal + record.courier) {
        throw new DbError('23514', 'orders_total_check')
      }

      const id = crypto.randomUUID()
      const now = isoNow()
      const orderInsert = db
        .prepare(
          `INSERT INTO orders (
            id, order_code, idempotency_key, created_at, updated_at,
            customer_name, customer_phone, customer_email,
            address_line1, address_line2, city, landmark, pincode, state, zone,
            items, subtotal, courier, total, courier_tier, has_drawing, dispatch_date, notes, lang,
            payment_method, payment_status, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          record.order_code,
          record.idempotency_key,
          now,
          now,
          record.customer_name,
          record.customer_phone,
          record.customer_email || null,
          record.address_line1,
          record.address_line2,
          record.city,
          record.landmark || null,
          record.pincode,
          record.state,
          record.zone,
          typeof record.items === 'string' ? record.items : JSON.stringify(record.items || []),
          record.subtotal,
          record.courier,
          record.total,
          record.courier_tier,
          record.has_drawing ? 1 : 0,
          record.dispatch_date,
          record.notes || null,
          record.lang || 'en',
          record.payment_method || 'upi',
          record.payment_status || 'pending',
          record.status || 'placed',
        )

      const eventInsert = db
        .prepare('INSERT INTO order_events (order_id, at, kind, from_status, to_status, by) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, now, 'status', null, 'placed', 'customer')

      await db.batch([orderInsert, eventInsert])

      const createdRow = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first()
      return { row: parseOrder(createdRow), created: true }
    },

    async getOrder(code) {
      const row = await db.prepare('SELECT * FROM orders WHERE order_code = ?').bind(code).first()
      return parseOrder(row)
    },

    async getOrderEvents(orderId) {
      const res = await db.prepare('SELECT at, kind, from_status, to_status, by, note FROM order_events WHERE order_id = ? ORDER BY at ASC, id ASC').bind(orderId).all()
      return res.results || []
    },

    async listOrders({ limit = 100, from, to, statuses } = {}) {
      const clauses = []
      const bindings = []
      if (from) {
        clauses.push('created_at >= ?')
        bindings.push(from)
      }
      if (to) {
        clauses.push('created_at <= ?')
        bindings.push(to)
      }
      if (statuses?.length) {
        clauses.push(`status IN (${statuses.map(() => '?').join(', ')})`)
        bindings.push(...statuses)
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const sql = `SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT ?`
      bindings.push(limit)
      const res = await db.prepare(sql).bind(...bindings).all()
      return (res.results || []).map(parseOrder)
    },

    async searchOrders(q, { limit = 20 } = {}) {
      const term = `%${String(q).replace(/[%_]/g, '\\$&')}%`
      const sql = `SELECT * FROM orders WHERE order_code LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\' OR customer_phone LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT ?`
      const res = await db.prepare(sql).bind(term, term, term, limit).all()
      return (res.results || []).map(parseOrder)
    },

    async orderStats() {
      const res = await db.prepare('SELECT status, payment_status, created_at, paid_at, total FROM orders').all()
      return res.results || []
    },

    async submitPayment(code, phone, utr, screenshot = null) {
      const now = isoNow()
      const existing = await db
        .prepare("SELECT * FROM orders WHERE order_code = ? AND customer_phone = ? AND status = 'placed' AND payment_status IN ('pending', 'submitted')")
        .bind(code, phone)
        .first()
      if (!existing) return null

      const updateStmt = db
        .prepare(
          `UPDATE orders
           SET utr = ?, payment_screenshot = COALESCE(?, payment_screenshot), payment_status = 'submitted', payment_submitted_at = ?, updated_at = ?
           WHERE id = ?`,
        )
        .bind(utr, screenshot, now, now, existing.id)

      const eventStmt = db
        .prepare('INSERT INTO order_events (order_id, at, kind, from_status, to_status, by, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(existing.id, now, 'payment', existing.payment_status, 'submitted', 'customer', `UTR: ${utr}`)

      await db.batch([updateStmt, eventStmt])
      const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(existing.id).first()
      return parseOrder(updated)
    },

    async adminUpdateOrder(code, patch, event = null) {
      const existing = await db.prepare('SELECT * FROM orders WHERE order_code = ?').bind(code).first()
      if (!existing) return null

      const fields = []
      const values = []
      const ALLOWED = [
        'status', 'payment_status', 'payment_method', 'razorpay_payment_id', 'utr', 'payment_screenshot', 'courier_name', 'tracking_no',
        'tracking_url', 'cancel_reason', 'admin_notes', 'refund_note', 'dispatch_date'
      ]

      for (const k of ALLOWED) {
        if (k in patch) {
          fields.push(`${k} = ?`)
          values.push(patch[k] === '' ? null : patch[k])
        }
      }
      if (patch.payment_status === 'confirmed' && !existing.paid_at) {
        fields.push('paid_at = ?')
        values.push(isoNow())
      }
      fields.push('updated_at = ?')
      values.push(isoNow())
      values.push(existing.id)

      const updateStmt = db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).bind(...values)
      const stmts = [updateStmt]

      if (event) {
        stmts.push(
          db
            .prepare('INSERT INTO order_events (order_id, at, kind, from_status, to_status, by, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(existing.id, isoNow(), event.kind || 'status', existing.status, event.to_status || existing.status, event.by || 'admin', event.note || null),
        )
      }

      await db.batch(stmts)
      const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(existing.id).first()
      return parseOrder(updated)
    },

    async setRazorpayOrderId(code, razorpayOrderId) {
      await db.prepare('UPDATE orders SET razorpay_order_id = ?, updated_at = ? WHERE order_code = ?').bind(razorpayOrderId, isoNow(), code).run()
      const row = await db.prepare('SELECT * FROM orders WHERE order_code = ?').bind(code).first()
      return parseOrder(row)
    },

    async findOrderByRazorpayId(razorpayOrderId) {
      const row = await db.prepare('SELECT * FROM orders WHERE razorpay_order_id = ?').bind(razorpayOrderId).first()
      return parseOrder(row)
    },

    /* ---------- class bookings ---------- */
    async createBooking(record, maxSeats = null) {
      // 1. Idempotency check
      const existing = await db.prepare('SELECT * FROM class_bookings WHERE idempotency_key = ?').bind(record.idempotency_key).first()
      if (existing) return { row: parseBooking(existing), created: false }

      // 2. Booking code uniqueness
      const clash = await db.prepare('SELECT id FROM class_bookings WHERE booking_code = ?').bind(record.booking_code).first()
      if (clash) throw new DbError('23505', 'class_bookings_booking_code_key')

      // 3. Seat reservation check
      if (maxSeats != null) {
        const countRes = await db
          .prepare(
            `SELECT count(*) as taken FROM class_bookings
             WHERE weekend = ? AND slot = ?
               AND (status = 'confirmed' OR (status = 'pending' AND (payment_status = 'submitted' OR datetime(created_at) > datetime('now', '-30 minutes'))))`,
          )
          .bind(record.weekend, record.slot)
          .first()
        const taken = Number(countRes?.taken || 0)
        if (taken >= maxSeats) {
          throw new DbError('P0001', 'slot_full')
        }
      }

      const id = crypto.randomUUID()
      const now = isoNow()
      const bookingInsert = db
        .prepare(
          `INSERT INTO class_bookings (
            id, booking_code, idempotency_key, created_at, updated_at,
            class_id, weekend, slot, name, phone, email, fee, lang,
            payment_method, payment_status, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          record.booking_code,
          record.idempotency_key,
          now,
          now,
          record.class_id,
          record.weekend,
          record.slot,
          record.name,
          record.phone,
          record.email || null,
          record.fee,
          record.lang || 'en',
          record.payment_method || 'razorpay',
          record.payment_status || 'pending',
          record.status || 'pending',
        )

      const eventInsert = db
        .prepare('INSERT INTO booking_events (booking_id, at, kind, from_status, to_status, by) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, now, 'status', null, 'pending', 'customer')

      await db.batch([bookingInsert, eventInsert])
      const createdRow = await db.prepare('SELECT * FROM class_bookings WHERE id = ?').bind(id).first()
      return { row: parseBooking(createdRow), created: true }
    },

    async getBooking(code) {
      const row = await db.prepare('SELECT * FROM class_bookings WHERE booking_code = ?').bind(code).first()
      return parseBooking(row)
    },

    async getBookingEvents(bookingId) {
      const res = await db.prepare('SELECT at, kind, from_status, to_status, by, note FROM booking_events WHERE booking_id = ? ORDER BY at ASC, id ASC').bind(bookingId).all()
      return res.results || []
    },

    async listBookings({ weekends, from, to, limit = 200 } = {}) {
      const clauses = []
      const bindings = []
      if (weekends?.length) {
        clauses.push(`weekend IN (${weekends.map(() => '?').join(', ')})`)
        bindings.push(...weekends)
      }
      if (from) {
        clauses.push('weekend >= ?')
        bindings.push(from)
      }
      if (to) {
        clauses.push('weekend <= ?')
        bindings.push(to)
      }
      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : ''
      const sql = `SELECT * FROM class_bookings ${where} ORDER BY created_at DESC LIMIT ?`
      bindings.push(limit)
      const res = await db.prepare(sql).bind(...bindings).all()
      return (res.results || []).map(parseBooking)
    },

    async searchBookings(q, { limit = 20 } = {}) {
      const term = `%${String(q).replace(/[%_]/g, '\\$&')}%`
      const sql = `SELECT * FROM class_bookings WHERE booking_code LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT ?`
      const res = await db.prepare(sql).bind(term, term, term, limit).all()
      return (res.results || []).map(parseBooking)
    },

    async bookingStats() {
      const res = await db.prepare('SELECT status, payment_status, created_at, paid_at, fee, weekend, slot FROM class_bookings').all()
      return res.results || []
    },

    async submitBookingPayment(code, phone, utr) {
      const now = isoNow()
      const existing = await db
        .prepare("SELECT * FROM class_bookings WHERE booking_code = ? AND phone = ? AND status = 'pending' AND payment_status IN ('pending', 'submitted')")
        .bind(code, phone)
        .first()
      if (!existing) return null

      const updateStmt = db
        .prepare("UPDATE class_bookings SET utr = ?, payment_status = 'submitted', updated_at = ? WHERE id = ?")
        .bind(utr, now, existing.id)

      const eventStmt = db
        .prepare('INSERT INTO booking_events (booking_id, at, kind, from_status, to_status, by, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(existing.id, now, 'payment', existing.payment_status, 'submitted', 'customer', `UTR: ${utr}`)

      await db.batch([updateStmt, eventStmt])
      const updated = await db.prepare('SELECT * FROM class_bookings WHERE id = ?').bind(existing.id).first()
      return parseBooking(updated)
    },

    async adminUpdateBooking(code, patch, event = null) {
      const existing = await db.prepare('SELECT * FROM class_bookings WHERE booking_code = ?').bind(code).first()
      if (!existing) return null

      const fields = []
      const values = []
      const ALLOWED = ['status', 'payment_status', 'payment_method', 'razorpay_payment_id', 'utr', 'cancel_reason', 'admin_notes']

      for (const k of ALLOWED) {
        if (k in patch) {
          fields.push(`${k} = ?`)
          values.push(patch[k] === '' ? null : patch[k])
        }
      }
      if (patch.payment_status === 'confirmed' && !existing.paid_at) {
        fields.push('paid_at = ?')
        values.push(isoNow())
      }
      fields.push('updated_at = ?')
      values.push(isoNow())
      values.push(existing.id)

      const updateStmt = db.prepare(`UPDATE class_bookings SET ${fields.join(', ')} WHERE id = ?`).bind(...values)
      const stmts = [updateStmt]

      if (event) {
        stmts.push(
          db
            .prepare('INSERT INTO booking_events (booking_id, at, kind, from_status, to_status, by, note) VALUES (?, ?, ?, ?, ?, ?, ?)')
            .bind(existing.id, isoNow(), event.kind || 'status', existing.status, event.to_status || existing.status, event.by || 'admin', event.note || null),
        )
      }

      await db.batch(stmts)
      const updated = await db.prepare('SELECT * FROM class_bookings WHERE id = ?').bind(existing.id).first()
      return parseBooking(updated)
    },

    async setBookingRazorpayOrderId(code, razorpayOrderId) {
      await db.prepare('UPDATE class_bookings SET razorpay_order_id = ?, updated_at = ? WHERE booking_code = ?').bind(razorpayOrderId, isoNow(), code).run()
      const row = await db.prepare('SELECT * FROM class_bookings WHERE booking_code = ?').bind(code).first()
      return parseBooking(row)
    },

    async findBookingByRazorpayId(razorpayOrderId) {
      const row = await db.prepare('SELECT * FROM class_bookings WHERE razorpay_order_id = ?').bind(razorpayOrderId).first()
      return parseBooking(row)
    },

    /* ---------- blocks & enquiries ---------- */
    async listBlocks({ from } = {}) {
      const sql = from ? 'SELECT * FROM class_blocks WHERE weekend >= ? ORDER BY weekend ASC' : 'SELECT * FROM class_blocks ORDER BY weekend ASC'
      const res = from ? await db.prepare(sql).bind(from).all() : await db.prepare(sql).all()
      return res.results || []
    },

    async setBlock(weekend, slot = '*', reason = null) {
      await db
        .prepare('INSERT INTO class_blocks (weekend, slot, reason, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (weekend, slot) DO UPDATE SET reason = excluded.reason')
        .bind(weekend, slot, reason || null, isoNow())
        .run()
    },

    async removeBlock(weekend, slot = '*') {
      await db.prepare('DELETE FROM class_blocks WHERE weekend = ? AND slot = ?').bind(weekend, slot).run()
    },

    async insertEnquiry(row) {
      const id = crypto.randomUUID()
      const now = isoNow()
      await db
        .prepare(
          `INSERT INTO class_enquiries (id, created_at, name, phone, interest, preferred_dates, message, lang, status, kind)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(id, now, row.name, row.phone, row.interest, row.preferred_dates || null, row.message || null, row.lang || 'en', row.status || 'new', row.kind || 'class')
        .run()

      const saved = await db.prepare('SELECT * FROM class_enquiries WHERE id = ?').bind(id).first()
      return saved
    },

    async listEnquiries({ limit = 200 } = {}) {
      const res = await db.prepare('SELECT * FROM class_enquiries ORDER BY created_at DESC LIMIT ?').bind(limit).all()
      return res.results || []
    },

    async updateEnquiry(id, patch) {
      const existing = await db.prepare('SELECT * FROM class_enquiries WHERE id = ?').bind(id).first()
      if (!existing) return null
      const fields = []
      const values = []
      for (const [k, v] of Object.entries(patch)) {
        if (['status', 'message', 'preferred_dates', 'interest'].includes(k)) {
          fields.push(`${k} = ?`)
          values.push(v)
        }
      }
      if (!fields.length) return existing
      values.push(id)
      await db.prepare(`UPDATE class_enquiries SET ${fields.join(', ')} WHERE id = ?`).bind(...values).run()
      return db.prepare('SELECT * FROM class_enquiries WHERE id = ?').bind(id).first()
    },

    /* ---------- rate limits ---------- */
    async hitRateLimit(key, windowSeconds, max) {
      const w = new Date(Math.floor(Date.now() / 1000 / windowSeconds) * windowSeconds * 1000).toISOString()
      const res = await db
        .prepare(
          `INSERT INTO rate_limits (key, window_start, hits)
           VALUES (?, ?, 1)
           ON CONFLICT (key, window_start) DO UPDATE SET hits = rate_limits.hits + 1
           RETURNING hits`,
        )
        .bind(key, w)
        .first()

      const hits = Number(res?.hits || 1)
      return hits <= max
    },

    /* ---------- storage (R2 or D1 BLOB fallback) ---------- */
    async putObject(path, bytes, contentType) {
      if (await this.hasObject(path)) throw new DbError('409', 'object_exists')
      if (r2Bucket) {
        await r2Bucket.put(path, bytes, { httpMetadata: { contentType } })
        return
      }
      // D1 BLOB storage
      await db
        .prepare('INSERT INTO objects (path, content_type, data, is_public, created_at) VALUES (?, ?, ?, 0, ?)')
        .bind(path, contentType, bytes, isoNow())
        .run()
    },

    async hasObject(path) {
      if (r2Bucket) {
        const head = await r2Bucket.head(path)
        return Boolean(head)
      }
      const row = await db.prepare('SELECT path FROM objects WHERE path = ?').bind(path).first()
      return Boolean(row)
    },

    async signedUrl(path, seconds = 600) {
      if (r2Bucket) {
        const exp = Math.floor(Date.now() / 1000) + seconds
        const token = bytesToHex(crypto.getRandomValues(new Uint8Array(16)))
        return `/api/photo/private?path=${encodeURIComponent(path)}&exp=${exp}&token=${token}`
      }
      const row = await db.prepare('SELECT content_type, data FROM objects WHERE path = ?').bind(path).first()
      if (!row) return null
      const base64 = typeof Buffer !== 'undefined' ? Buffer.from(row.data).toString('base64') : btoa(String.fromCharCode(...new Uint8Array(row.data)))
      return `data:${row.content_type};base64,${base64}`
    },

    async putPublicObject(path, bytes, contentType) {
      if (r2Bucket) {
        await r2Bucket.put(`public/${path}`, bytes, { httpMetadata: { contentType } })
      } else {
        await db
          .prepare('INSERT INTO objects (path, content_type, data, is_public, created_at) VALUES (?, ?, ?, 1, ?) ON CONFLICT (path) DO UPDATE SET content_type = excluded.content_type, data = excluded.data')
          .bind(path, contentType, bytes, isoNow())
          .run()
      }
      return `/api/photo/${path}`
    },

    async getPublicObject(path) {
      if (r2Bucket) {
        const obj = await r2Bucket.get(`public/${path}`)
        if (!obj) return null
        return {
          contentType: obj.httpMetadata?.contentType || 'image/webp',
          bytes: new Uint8Array(await obj.arrayBuffer()),
        }
      }
      const row = await db.prepare('SELECT content_type, data FROM objects WHERE path = ?').bind(path).first()
      if (!row) return null
      return {
        contentType: row.content_type,
        bytes: new Uint8Array(row.data),
      }
    },

    /* ---------- admin authentication ---------- */
    auth: {
      async signIn(email, password) {
        const cleanEmail = String(email || '').trim().toLowerCase()
        const user = await db.prepare('SELECT * FROM admin_users WHERE email = ?').bind(cleanEmail).first()
        if (!user) return null
        const ok = await verifyPassword(password, user.password_salt, user.password_hash)
        if (!ok) return null
        return this._session({ id: user.id, email: user.email })
      },

      async _session(user) {
        const access = bytesToHex(crypto.getRandomValues(new Uint8Array(24)))
        const refresh = bytesToHex(crypto.getRandomValues(new Uint8Array(24)))
        const expiresAt = new Date(Date.now() + 3600_000).toISOString()
        const now = isoNow()

        await db
          .prepare('INSERT INTO admin_sessions (token, refresh_token, user_id, email, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(access, refresh, user.id, user.email, expiresAt, now)
          .run()

        return { access_token: access, refresh_token: refresh, expires_in: 3600, user }
      },

      async refresh(refreshToken) {
        if (!refreshToken) return null
        const sess = await db.prepare('SELECT * FROM admin_sessions WHERE refresh_token = ?').bind(refreshToken).first()
        if (!sess) return null
        await db.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(sess.token).run()
        const user = await db.prepare('SELECT id, email FROM admin_users WHERE id = ?').bind(sess.user_id).first()
        if (!user) return null
        return this._session(user)
      },

      async getUser(accessToken) {
        if (!accessToken) return null
        const sess = await db.prepare('SELECT * FROM admin_sessions WHERE token = ?').bind(accessToken).first()
        if (!sess) return null
        if (new Date(sess.expires_at).getTime() < Date.now()) {
          await db.prepare('DELETE FROM admin_sessions WHERE token = ?').bind(accessToken).run()
          return null
        }
        return { id: sess.user_id, email: sess.email }
      },

      async isAdmin(userId) {
        if (!userId) return false
        const user = await db.prepare('SELECT id FROM admin_users WHERE id = ?').bind(userId).first()
        return Boolean(user)
      },

      async lastSeen(userId) {
        if (!userId) return null
        const user = await db.prepare('SELECT last_seen_at FROM admin_users WHERE id = ?').bind(userId).first()
        return user?.last_seen_at || null
      },

      async touch(userId) {
        if (!userId) return
        await db.prepare('UPDATE admin_users SET last_seen_at = ? WHERE id = ?').bind(isoNow(), userId).run()
      },

      async countAdmins() {
        const res = await db.prepare('SELECT count(*) as c FROM admin_users').first()
        return Number(res?.c || 0)
      },

      async recover(email, redirectTo = '') {
        const cleanEmail = String(email || '').trim().toLowerCase()
        const user = await db.prepare('SELECT id, email FROM admin_users WHERE email = ?').bind(cleanEmail).first()
        if (!user) return { ok: true }
        const token = bytesToHex(crypto.getRandomValues(new Uint8Array(24)))
        const expiresAt = new Date(Date.now() + 3600_000).toISOString()
        await db
          .prepare('INSERT INTO admin_password_resets (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)')
          .bind(token, user.id, expiresAt, isoNow())
          .run()
        return { ok: true, resetToken: token }
      },

      async updatePassword(accessTokenOrResetToken, newPassword) {
        if (!newPassword || newPassword.length < 8) return false
        let userId = null
        const sess = await db.prepare('SELECT user_id FROM admin_sessions WHERE token = ?').bind(accessTokenOrResetToken).first()
        if (sess) {
          userId = sess.user_id
        } else {
          const reset = await db.prepare('SELECT user_id, expires_at FROM admin_password_resets WHERE token = ?').bind(accessTokenOrResetToken).first()
          if (reset && new Date(reset.expires_at).getTime() >= Date.now()) {
            userId = reset.user_id
            await db.prepare('DELETE FROM admin_password_resets WHERE token = ?').bind(accessTokenOrResetToken).run()
          }
        }
        if (!userId) return false

        const { salt, hash } = await hashPassword(newPassword)
        await db
          .prepare('UPDATE admin_users SET password_salt = ?, password_hash = ? WHERE id = ?')
          .bind(salt, hash, userId)
          .run()
        await db.prepare('DELETE FROM admin_sessions WHERE user_id = ?').bind(userId).run()
        return true
      },

      async createAdmin(email, password, id = null) {
        const cleanEmail = String(email || '').trim().toLowerCase()
        const uid = id || crypto.randomUUID()
        const { salt, hash } = await hashPassword(password)
        const now = isoNow()
        await db
          .prepare(
            `INSERT INTO admin_users (id, email, password_salt, password_hash, created_at)
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT (email) DO UPDATE SET password_salt = excluded.password_salt, password_hash = excluded.password_hash`,
          )
          .bind(uid, cleanEmail, salt, hash, now)
          .run()
        return { id: uid, email: cleanEmail }
      },
    },

    /* ---------- health check ---------- */
    async health() {
      try {
        const prodCheck = await db.prepare('SELECT count(*) as c FROM products').first()
        const adminCheck = await db.prepare('SELECT count(*) as c FROM admin_users').first()
        const settCheck = await db.prepare('SELECT count(*) as c FROM settings').first()
        const tables = Boolean(prodCheck && adminCheck && settCheck)
        // The newest part (d1/migrations/0002): Hema's own products, offers and tile photos
        let update = false
        try {
          await db.prepare('SELECT custom, display_name, description FROM products LIMIT 1').all()
          await db.prepare('SELECT id FROM offers LIMIT 1').all()
          await db.prepare('SELECT id FROM page_photos LIMIT 1').all()
          update = tables
        } catch {
          /* the 0002 migration hasn't run: the setup check says so */
        }
        return {
          reachable: true,
          tables,
          update,
          bucket: true,
          adminCount: Number(adminCheck?.c || 0),
        }
      } catch (err) {
        console.error('[dk d1 health] check failed', err?.message)
        return { reachable: false, tables: false, update: false, bucket: false, adminCount: 0 }
      }
    },
  }

  return store
}
