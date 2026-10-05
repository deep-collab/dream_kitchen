// The real backend: Supabase over its REST APIs (PostgREST, Storage, Auth) with the service
// role key, which only ever lives in Netlify's environment variables. Same interface as the
// mock store (memory.mjs). No SDK: plain fetch keeps the functions small and fast to start.
import { DbError } from './memory.mjs'

export function createSupabaseStore({ url, serviceKey, anonKey, fetchImpl = globalThis.fetch } = {}) {
  const base = url.replace(/\/$/, '')
  const service = { apikey: serviceKey, authorization: `Bearer ${serviceKey}` }

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
      const constraint = /orders_order_code_key/.test(message) ? 'orders_order_code_key' : /idempotency/.test(message) ? 'orders_idempotency_key_key' : ''
      throw new DbError(code, constraint || message.trim().slice(0, 200))
    }
    return data
  }
  const rest = (path, opts) => call(`/rest/v1/${path}`, opts)
  const rpc = (fn, args) => call(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args })
  const one = (rows) => (Array.isArray(rows) ? rows[0] || null : rows)
  const eq = (v) => `eq.${encodeURIComponent(v)}`
  const returning = { prefer: 'return=representation' }
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
    listOrders: ({ limit = 200 } = {}) => rest(`orders?select=*&order=created_at.desc&limit=${Number(limit) || 200}`),
    submitPayment: async (code, phone, utr, screenshot) => rowOrNull(await rpc('submit_payment', { p_code: code, p_phone: phone, p_utr: utr, p_screenshot: screenshot || null })),
    adminUpdateOrder: async (code, patch, event) => rowOrNull(await rpc('admin_update_order', { p_code: code, p_patch: patch, p_event: event || null })),
    setRazorpayOrderId: async (code, razorpayOrderId) =>
      one(await rest(`orders?order_code=${eq(code)}`, { method: 'PATCH', body: { razorpay_order_id: razorpayOrderId }, headers: returning })),
    findOrderByRazorpayId: async (razorpayOrderId) => one(await rest(`orders?razorpay_order_id=${eq(razorpayOrderId)}&select=*`)),

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
          headers: { apikey: anonKey || serviceKey, 'content-type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        return res.ok ? res.json() : null
      },
      async refresh(refreshToken) {
        const res = await fetchImpl(`${base}/auth/v1/token?grant_type=refresh_token`, {
          method: 'POST',
          headers: { apikey: anonKey || serviceKey, 'content-type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })
        return res.ok ? res.json() : null
      },
      async getUser(accessToken) {
        const res = await fetchImpl(`${base}/auth/v1/user`, { headers: { apikey: anonKey || serviceKey, authorization: `Bearer ${accessToken}` } })
        if (!res.ok) return null
        const u = await res.json()
        return u?.id ? { id: u.id, email: u.email } : null
      },
      async isAdmin(userId) {
        const rows = await rest(`admin_users?user_id=${eq(userId)}&select=user_id`)
        return Array.isArray(rows) && rows.length === 1
      },
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
