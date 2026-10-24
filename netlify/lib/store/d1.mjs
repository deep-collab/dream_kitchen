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

const EXTRA_COLUMNS = ['name_en', 'name_kn', 'description_en', 'description_kn']

function parseProduct(row) {
  if (!row) return null
  // product_extras columns come joined in as x_*: Hema's name and description, and `added`
  const { x_id, x_name_en, x_name_kn, x_description_en, x_description_kn, x_added, ...rest } = row
  return {
    ...rest,
    sizes: row.sizes ? JSON.parse(row.sizes) : null,
    options: row.options ? JSON.parse(row.options) : {},
    active: row.active === null || row.active === undefined ? null : Boolean(row.active),
    sold_out: row.sold_out === null || row.sold_out === undefined ? null : Boolean(row.sold_out),
    extras: x_id ? { name_en: x_name_en ?? null, name_kn: x_name_kn ?? null, description_en: x_description_en ?? null, description_kn: x_description_kn ?? null, added: Boolean(x_added) } : null,
  }
}

const OFFER_COLUMNS = ['title_en', 'title_kn', 'message_en', 'message_kn', 'photo_url', 'button_en', 'button_kn', 'link_type', 'link_id', 'starts_on', 'ends_on', 'active']

function parseOffer(row) {
  if (!row) return null
  return { ...row, active: Boolean(row.active) }
}

// Until migration 0002 has run, the new tables don't exist: the shop keeps working without them
const missingTable = (err) => /no such table/i.test(String(err?.message || err))

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
      let res
      try {
        res = await db
          .prepare(
            `SELECT p.*, x.product_id AS x_id, x.name_en AS x_name_en, x.name_kn AS x_name_kn, x.description_en AS x_description_en,
                    x.description_kn AS x_description_kn, x.added AS x_added
             FROM products p LEFT JOIN product_extras x ON x.product_id = p.id ORDER BY p.sort ASC, p.id ASC`,
          )
          .all()
      } catch (err) {
        if (!missingTable(err)) throw err
        res = await db.prepare('SELECT * FROM products ORDER BY sort ASC, id ASC').all()
      }
      return (res.results || []).map(parseProduct)
    },

    /** A product Hema added in the admin: its products row and its product_extras row (added = 1). null if the id is taken */
    async insertProduct(row, extras) {
      const taken = await db.prepare('SELECT id FROM products WHERE id = ? OR slug = ?').bind(row.id, row.slug).first()
      if (taken) return null
      const now = isoNow()
      await db.batch([
        db
          .prepare(
            `INSERT INTO products (id, slug, category, name_en, name_kn, sizes, price, ragi_price, options, courier_tier, price_status, active, sold_out, sort, image, photo_url, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            row.id,
            row.slug,
            row.category,
            row.name_en,
            row.name_kn || '',
            row.sizes ? JSON.stringify(row.sizes) : null,
            row.price ?? null,
            row.ragi_price ?? null,
            JSON.stringify(row.options || {}),
            row.courier_tier || 'small',
            row.price_status || null,
            row.active == null ? null : row.active ? 1 : 0,
            row.sold_out == null ? null : row.sold_out ? 1 : 0,
            row.sort ?? 0,
            row.image || null,
            row.photo_url || null,
            now,
          ),
        db
          .prepare('INSERT INTO product_extras (product_id, name_en, name_kn, description_en, description_kn, added, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?)')
          .bind(row.id, extras.name_en ?? null, extras.name_kn ?? null, extras.description_en ?? null, extras.description_kn ?? null, now),
      ])
      return (await store.listProducts()).find((p) => p.id === row.id) || null
    },

    async upsertProducts(rows) {
      if (!rows.length) return
      const stmts = rows.map((r) =>
        db
          .prepare(
            `INSERT INTO products (id, slug, category, name_en, name_kn, sizes, price, ragi_price, options, courier_tier, price_status, active, sold_out, sort, image, photo_url, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET
               slug = excluded.slug, category = excluded.category, name_en = excluded.name_en, name_kn = excluded.name_kn,
               sizes = excluded.sizes, price = excluded.price, ragi_price = excluded.ragi_price, options = excluded.options,
               courier_tier = excluded.courier_tier, price_status = excluded.price_status, active = excluded.active,
               sold_out = excluded.sold_out, sort = excluded.sort, image = excluded.image, photo_url = excluded.photo_url,
               updated_at = excluded.updated_at`,
          )
          .bind(
            r.id,
            r.slug,
            r.category,
            r.name_en,
            r.name_kn || '',
            r.sizes ? JSON.stringify(r.sizes) : null,
            r.price ?? null,
            r.ragi_price ?? null,
            JSON.stringify(r.options || {}),
            r.courier_tier || 'small',
            r.price_status || null,
            r.active == null ? null : r.active ? 1 : 0,
            r.sold_out == null ? null : r.sold_out ? 1 : 0,
            r.sort ?? 0,
            r.image || null,
            r.photo_url || null,
            isoNow(),
          ),
      )
      await db.batch(stmts)
    },

    async updateProduct(id, patch) {
      const existing = await db.prepare('SELECT * FROM products WHERE id = ?').bind(id).first()
      if (!existing) return null
      const fields = []
      const values = []
      for (const [k, v] of Object.entries(patch)) {
        if (['price', 'ragi_price', 'price_status', 'sort', 'image', 'photo_url'].includes(k)) {
          fields.push(`${k} = ?`)
          values.push(v ?? null)
        } else if (['name_en', 'name_kn', 'courier_tier'].includes(k) && typeof v === 'string') {
          fields.push(`${k} = ?`)
          values.push(v)
        } else if (['active', 'sold_out'].includes(k)) {
          fields.push(`${k} = ?`)
          values.push(v == null ? null : v ? 1 : 0)
        } else if (['sizes', 'options'].includes(k)) {
          fields.push(`${k} = ?`)
          values.push(v ? JSON.stringify(v) : null)
        }
      }
      fields.push('updated_at = ?')
      values.push(isoNow())
      values.push(id)

      const stmts = [db.prepare(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`).bind(...values)]
      // Hema's name / description: product_extras (NULL = the config's)
      const extraCols = EXTRA_COLUMNS.filter((k) => patch.extras && k in patch.extras)
      if (extraCols.length) {
        stmts.push(
          db
            .prepare(
              `INSERT INTO product_extras (product_id, ${extraCols.join(', ')}, updated_at) VALUES (?, ${extraCols.map(() => '?').join(', ')}, ?)
               ON CONFLICT (product_id) DO UPDATE SET ${extraCols.map((k) => `${k} = excluded.${k}`).join(', ')}, updated_at = excluded.updated_at`,
            )
            .bind(id, ...extraCols.map((k) => patch.extras[k] ?? null), isoNow()),
        )
      }
      await db.batch(stmts)
      return (await store.listProducts()).find((p) => p.id === id) || null
    },

    /* ---------- offers (display only) ---------- */
    async listOffers() {
      try {
        const res = await db.prepare('SELECT * FROM offers ORDER BY starts_on DESC, created_at DESC').all()
        return (res.results || []).map(parseOffer)
      } catch (err) {
        if (missingTable(err)) return []
        throw err
      }
    },

    async insertOffer(row) {
      const id = row.id || crypto.randomUUID()
      const cols = OFFER_COLUMNS.filter((k) => k in row)
      const now = isoNow()
      await db
        .prepare(`INSERT INTO offers (id, ${cols.join(', ')}, created_at, updated_at) VALUES (?, ${cols.map(() => '?').join(', ')}, ?, ?)`)
        .bind(id, ...cols.map((k) => (k === 'active' ? (row[k] ? 1 : 0) : (row[k] ?? null))), now, now)
        .run()
      return parseOffer(await db.prepare('SELECT * FROM offers WHERE id = ?').bind(id).first())
    },

    async updateOffer(id, patch) {
      const cols = OFFER_COLUMNS.filter((k) => k in patch)
      const values = cols.map((k) => (k === 'active' ? (patch[k] ? 1 : 0) : (patch[k] ?? null)))
      const res = await db
        .prepare(`UPDATE offers SET ${[...cols.map((k) => `${k} = ?`), 'updated_at = ?'].join(', ')} WHERE id = ?`)
        .bind(...values, isoNow(), id)
        .run()
      if (!res.meta?.changes) return null
      return parseOffer(await db.prepare('SELECT * FROM offers WHERE id = ?').bind(id).first())
    },

    async deleteOffer(id) {
      const res = await db.prepare('DELETE FROM offers WHERE id = ?').bind(id).run()
      return Boolean(res.meta?.changes)
    },

    /* ---------- Customize page tile photos ---------- */
    async listTilePhotos() {
      try {
        return (await db.prepare('SELECT tile, photo_url, updated_at FROM tile_photos ORDER BY tile').all()).results || []
      } catch (err) {
        if (missingTable(err)) return []
        throw err
      }
    },

    async setTilePhoto(tile, photoUrl) {
      if (!photoUrl) await db.prepare('DELETE FROM tile_photos WHERE tile = ?').bind(tile).run()
      else
        await db
          .prepare('INSERT INTO tile_photos (tile, photo_url, updated_at) VALUES (?, ?, ?) ON CONFLICT (tile) DO UPDATE SET photo_url = excluded.photo_url, updated_at = excluded.updated_at')
          .bind(tile, photoUrl, isoNow())
          .run()
      return store.listTilePhotos()
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
        'status', 'payment_status', 'utr', 'payment_screenshot', 'courier_name', 'tracking_no',
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
      const ALLOWED = ['status', 'payment_status', 'utr', 'cancel_reason', 'admin_notes']

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
        return {
          reachable: true,
          tables,
          update: tables,
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
