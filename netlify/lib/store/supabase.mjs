// The real backend: Supabase over its REST APIs (PostgREST, Storage, Auth) with the service
// role key, which only ever lives in Netlify's environment variables. Same interface as the
// mock store (memory.mjs). No SDK: plain fetch keeps the functions small and fast to start.
import { DbError } from './memory.mjs'

export function createSupabaseStore({ url, serviceKey, anonKey, fetchImpl = globalThis.fetch } = {}) {
  const base = url.replace(/\/$/, '')
  // Legacy keys (long "eyJ…" JWTs) go in both headers. The newer secret keys ("sb_secret_…") are
  // not JWTs and must be sent on the apikey header only (Supabase docs, "API keys").
  const isJwt = (k) => /^eyJ/.test(String(k || ''))
  const service = isJwt(serviceKey) ? { apikey: serviceKey, authorization: `Bearer ${serviceKey}` } : { apikey: serviceKey }
  const publicKey = anonKey || serviceKey

  async function call(path, { method = 'GET', body, headers = {}, raw = false } = {}) {
    const res = await fetchImpl(`${base}${path}`, {
      method,
      headers: { ...service, ...(body !== undefined && !raw ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : raw ? body : JSON.stringify(body),
    })
    const text = await res.text()
    const data = text ? safeJson(text) : null
    if (!res.ok) {
      const code = data?.code || String(res.status)
      const message = `${data?.message || ''} ${data?.details || ''}`
      const constraint = /orders_order_code_key/.test(message)
        ? 'orders_order_code_key'
        : /class_bookings_booking_code_key/.test(message)
          ? 'class_bookings_booking_code_key'
          : /slot_full/.test(message)
            ? 'slot_full'
            : /idempotency/.test(message)
              ? 'idempotency_key'
              : ''
      throw new DbError(code, constraint || message.trim().slice(0, 200))
    }
    return data
  }
  const rest = (path, opts) => call(`/rest/v1/${path}`, opts)
  const rpc = (fn, args) => call(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args })
  const one = (rows) => (Array.isArray(rows) ? rows[0] || null : rows)
  const eq = (v) => `eq.${encodeURIComponent(v)}`
  const returning = { prefer: 'return=representation' }
  const range = (from, to, col = 'created_at') => `${from ? `&${col}=gte.${encodeURIComponent(from)}` : ''}${to ? `&${col}=lt.${encodeURIComponent(to)}` : ''}`
  const inList = (values) => `in.(${values.map((v) => encodeURIComponent(v)).join(',')})`
  // Search text: letters, digits, spaces and dashes only (it goes into a PostgREST filter)
  const term = (q) => String(q).replace(/[^\p{L}\p{N} -]/gu, '').trim().slice(0, 40)
  // PostgREST answers a function that returns a row type with its fields all null when nothing matched
  const rowOrNull = (r) => (r && r.id ? r : null)

  return {
    kind: 'supabase',

    /* ---------- menu and settings ---------- */
    listProducts: () => rest('products?select=*&order=category.asc,sort.asc'),
    upsertProducts: (rows) => rest('products?on_conflict=id', { method: 'POST', body: rows, headers: { prefer: 'resolution=merge-duplicates,return=minimal' } }),
    updateProduct: async (id, patch) => one(await rest(`products?id=${eq(id)}`, { method: 'PATCH', body: patch, headers: returning })),
    getSettings: async () => one(await rest('settings?id=eq.1&select=*')),
    updateSettings: async (patch) => one(await rest('settings?id=eq.1', { method: 'PATCH', body: patch, headers: returning })),

    /* ---------- orders ---------- */
    async createOrder(record) {
      const before = one(await rest(`orders?idempotency_key=${eq(record.idempotency_key)}&select=id`))
      const row = await rpc('create_order', { p: record })
      return { row, created: !before }
    },
    getOrder: async (code) => one(await rest(`orders?order_code=${eq(code)}&select=*`)),
    getOrderEvents: (orderId) => rest(`order_events?order_id=${eq(orderId)}&select=*&order=at.asc,id.asc`),
    listOrders: ({ limit = 200, from, to, statuses } = {}) =>
      rest(`orders?select=*&order=created_at.desc&limit=${Number(limit) || 200}${range(from, to)}${statuses ? `&status=${inList(statuses)}` : ''}`),
    async searchOrders(q, { limit = 50 } = {}) {
      const t = term(q)
      if (!t) return []
      const like = encodeURIComponent(`*${t}*`)
      return rest(`orders?select=*&order=created_at.desc&limit=${limit}&or=(order_code.ilike.${like},customer_name.ilike.${like},customer_phone.like.${like})`)
    },
    orderStats: () => rest('orders?select=status,payment_status,created_at,paid_at,total&limit=20000'),
    submitPayment: async (code, phone, utr, screenshot) => rowOrNull(await rpc('submit_payment', { p_code: code, p_phone: phone, p_utr: utr, p_screenshot: screenshot || null })),
    adminUpdateOrder: async (code, patch, event) => rowOrNull(await rpc('admin_update_order', { p_code: code, p_patch: patch, p_event: event || null })),
    setRazorpayOrderId: async (code, razorpayOrderId) =>
      one(await rest(`orders?order_code=${eq(code)}`, { method: 'PATCH', body: { razorpay_order_id: razorpayOrderId }, headers: returning })),
    findOrderByRazorpayId: async (razorpayOrderId) => one(await rest(`orders?razorpay_order_id=${eq(razorpayOrderId)}&select=*`)),

    /* ---------- class bookings ---------- */
    async createBooking(record, maxSeats = null) {
      const before = one(await rest(`class_bookings?idempotency_key=${eq(record.idempotency_key)}&select=id`))
      const row = await rpc('create_booking', { p: record, p_max_seats: maxSeats })
      return { row, created: !before }
    },
    getBooking: async (code) => one(await rest(`class_bookings?booking_code=${eq(code)}&select=*`)),
    getBookingEvents: (bookingId) => rest(`booking_events?booking_id=${eq(bookingId)}&select=*&order=at.asc,id.asc`),
    listBookings: ({ weekends, from, to, limit = 500 } = {}) =>
      rest(`class_bookings?select=*&order=created_at.desc&limit=${Number(limit) || 500}${range(from, to)}${weekends ? `&weekend=${inList(weekends)}` : ''}`),
    async searchBookings(q, { limit = 50 } = {}) {
      const t = term(q)
      if (!t) return []
      const like = encodeURIComponent(`*${t}*`)
      return rest(`class_bookings?select=*&order=created_at.desc&limit=${limit}&or=(booking_code.ilike.${like},name.ilike.${like},phone.like.${like})`)
    },
    bookingStats: () => rest('class_bookings?select=status,payment_status,created_at,paid_at,fee,weekend&limit=20000'),
    submitBookingPayment: async (code, phone, utr) => rowOrNull(await rpc('submit_booking_payment', { p_code: code, p_phone: phone, p_utr: utr })),
    adminUpdateBooking: async (code, patch, event) => rowOrNull(await rpc('admin_update_booking', { p_code: code, p_patch: patch, p_event: event || null })),
    setBookingRazorpayOrderId: async (code, razorpayOrderId) =>
      one(await rest(`class_bookings?booking_code=${eq(code)}`, { method: 'PATCH', body: { razorpay_order_id: razorpayOrderId }, headers: returning })),
    findBookingByRazorpayId: async (razorpayOrderId) => one(await rest(`class_bookings?razorpay_order_id=${eq(razorpayOrderId)}&select=*`)),

    /* ---------- blocked weekends and slots ---------- */
    listBlocks: ({ from } = {}) => rest(`class_blocks?select=*&order=weekend.asc${from ? `&weekend=gte.${from}` : ''}`),
    setBlock: (weekend, slot, reason) =>
      rest('class_blocks?on_conflict=weekend,slot', { method: 'POST', body: { weekend, slot, reason: reason || null }, headers: { prefer: 'resolution=merge-duplicates,return=minimal' } }),
    removeBlock: (weekend, slot) => rest(`class_blocks?weekend=${eq(weekend)}&slot=${eq(slot)}`, { method: 'DELETE' }),

    /* ---------- class enquiries ---------- */
    insertEnquiry: async (row) => one(await rest('class_enquiries', { method: 'POST', body: row, headers: returning })),
    listEnquiries: ({ limit = 200 } = {}) => rest(`class_enquiries?select=*&order=created_at.desc&limit=${Number(limit) || 200}`),
    updateEnquiry: async (id, patch) => one(await rest(`class_enquiries?id=${eq(id)}`, { method: 'PATCH', body: patch, headers: returning })),

    /* ---------- rate limits ---------- */
    hitRateLimit: (key, windowSeconds, max) => rpc('hit_rate_limit', { p_key: key, p_window_seconds: windowSeconds, p_max: max }),

    /* ---------- files: private bucket "uploads" ---------- */
    putObject: (path, bytes, contentType) =>
      call(`/storage/v1/object/uploads/${path}`, { method: 'POST', body: bytes, raw: true, headers: { 'content-type': contentType, 'x-upsert': 'false', 'cache-control': 'private, max-age=0' } }),
    async hasObject(path) {
      const slash = path.lastIndexOf('/')
      const list = await call('/storage/v1/object/list/uploads', { method: 'POST', body: { prefix: path.slice(0, slash), search: path.slice(slash + 1), limit: 1 } })
      return Array.isArray(list) && list.some((o) => o.name === path.slice(slash + 1))
    },
    /** Product photos: the public bucket "product-photos"; returns the photo's public address */
    async putPublicObject(path, bytes, contentType) {
      await call(`/storage/v1/object/product-photos/${path}`, { method: 'POST', body: bytes, raw: true, headers: { 'content-type': contentType, 'x-upsert': 'true', 'cache-control': 'public, max-age=31536000' } })
      return `${base}/storage/v1/object/public/product-photos/${path}`
    },
    async getPublicObject() {
      return null // served by Supabase itself
    },
    /** A link Hema's admin page can show for 10 minutes; nobody else ever gets one */
    async signedUrl(path, seconds = 600) {
      const data = await call(`/storage/v1/object/sign/uploads/${path}`, { method: 'POST', body: { expiresIn: seconds } })
      return data?.signedURL ? `${base}/storage/v1${data.signedURL}` : null
    },

    /* ---------- admin login: Supabase Auth (email + password) ---------- */
    auth: {
      async signIn(email, password) {
        const res = await fetchImpl(`${base}/auth/v1/token?grant_type=password`, {
          method: 'POST',
          headers: { apikey: publicKey, 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        return res.ok ? res.json() : null
      },
      async refresh(refreshToken) {
        const res = await fetchImpl(`${base}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { apikey: publicKey, 'content-type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
        return res.ok ? res.json() : null
      },
      async getUser(accessToken) {
        const res = await fetchImpl(`${base}/auth/v1/user`, { headers: { apikey: publicKey, authorization: `Bearer ${accessToken}` } })
        if (!res.ok) return null
        const u = await res.json()
        return u?.id ? { id: u.id, email: u.email } : null
      },
      async isAdmin(userId) {
        const rows = await rest(`admin_users?user_id=${eq(userId)}&select=user_id`)
        return Array.isArray(rows) && rows.length === 1
      },
      lastSeen: async (userId) => one(await rest(`admin_users?user_id=${eq(userId)}&select=last_seen_at`))?.last_seen_at || null,
      touch: (userId) => rest(`admin_users?user_id=${eq(userId)}`, { method: 'PATCH', body: { last_seen_at: new Date().toISOString() }, headers: { prefer: 'return=minimal' } }),
      async countAdmins() {
        const rows = await rest('admin_users?select=user_id')
        return Array.isArray(rows) ? rows.length : 0
      },
      /** Supabase emails a "reset your password" link that opens `redirectTo` */
      async recover(email, redirectTo) {
        const res = await fetchImpl(`${base}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
          method: 'POST',
          headers: { apikey: publicKey, 'content-type': 'application/json' },
          body: JSON.stringify({ email }),
        })
        if (!res.ok) console.error('[dk auth] recover failed', res.status, (await res.text()).slice(0, 200))
      },
      async updatePassword(accessToken, password) {
        const res = await fetchImpl(`${base}/auth/v1/user`, {
          method: 'PUT',
          headers: { apikey: publicKey, authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
          body: JSON.stringify({ password }),
        })
        return res.ok
      },
    },

    /** Setup check: can we reach the project and read the tables of both setup files? */
    async health() {
      const out = { reachable: false, tables: false, update: false, bucket: false }
      try {
        await rest('settings?id=eq.1&select=id')
        out.reachable = true
        out.tables = true
        await rest('settings?id=eq.1&select=class_settings')
        await rest('class_bookings?select=id&limit=1')
        out.update = true
        const buckets = await call('/storage/v1/bucket')
        out.bucket = Array.isArray(buckets) && ['uploads', 'product-photos'].every((id) => buckets.some((b) => b.id === id))
      } catch (e) {
        out.error = String(e?.code || e?.message || '').slice(0, 80)
        if (/^(401|403)$/.test(String(e?.code))) out.keyRefused = true
      }
      return out
    },
  }
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return { message: text.slice(0, 200) }
  }
}
