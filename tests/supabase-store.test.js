// The Supabase store talks to Supabase's REST APIs. No real project here, so these check that
// each call goes to the right address with the service key, the right method and body, and that
// errors come back in the shape the functions handle (e.g. an order-code clash is retried).
import { describe, expect, it } from 'vitest'
import { createSupabaseStore } from '../netlify/lib/store/supabase.mjs'

function fakeFetch(responses) {
  const calls = []
  const impl = async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', headers: init.headers, body: init.body })
    const [status, body] = responses.shift() || [200, []]
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
  }
  return { impl, calls }
}
const make = (responses) => {
  const f = fakeFetch(responses)
  return { store: createSupabaseStore({ url: 'https://abc.supabase.co/', serviceKey: 'service-key', anonKey: 'anon-key', fetchImpl: f.impl }), calls: f.calls }
}

describe('Supabase store', () => {
  it('reads with the service key on every request (a new "sb_secret_" key on the apikey header only)', async () => {
    const { store, calls } = make([[200, [{ id: 'almond-bar', price: 175 }]]])
    expect(await store.listProducts()).toEqual([{ id: 'almond-bar', price: 175 }])
    expect(calls[0].url).toBe('https://abc.supabase.co/rest/v1/products?select=*&order=category.asc,sort.asc')
    expect(calls[0].headers).toMatchObject({ apikey: 'service-key' })
    expect(calls[0].headers.authorization).toBeUndefined()
  })

  it('a legacy service_role key (a JWT, "eyJ…") goes in both headers', async () => {
    const f = fakeFetch([[200, []]])
    const store = createSupabaseStore({ url: 'https://abc.supabase.co', serviceKey: 'eyJhbGciOi.legacy', anonKey: 'eyJanon', fetchImpl: f.impl })
    await store.listProducts()
    expect(f.calls[0].headers).toMatchObject({ apikey: 'eyJhbGciOi.legacy', authorization: 'Bearer eyJhbGciOi.legacy' })
  })

  it('class bookings: create_booking with the seat limit, and a full slot comes back as "slot_full"', async () => {
    const { store, calls } = make([
      [200, []],
      [200, { id: 'b1', booking_code: 'DK-CL-261010-AB2C' }],
      [200, []],
      [400, { code: 'P0001', message: 'slot_full' }],
    ])
    expect(await store.createBooking({ idempotency_key: 'k'.repeat(20), booking_code: 'DK-CL-261010-AB2C' }, 8)).toEqual({ row: { id: 'b1', booking_code: 'DK-CL-261010-AB2C' }, created: true })
    expect(JSON.parse(calls[1].body)).toEqual({ p: { idempotency_key: 'k'.repeat(20), booking_code: 'DK-CL-261010-AB2C' }, p_max_seats: 8 })
    await expect(store.createBooking({ idempotency_key: 'j'.repeat(20) }, 8)).rejects.toMatchObject({ constraint: 'slot_full' })
  })

  it('search only sends letters, digits, spaces and dashes into the filter', async () => {
    const { store, calls } = make([[200, []]])
    await store.searchOrders('asha),status.eq.(x')
    expect(decodeURIComponent(calls[0].url)).toContain('or=(order_code.ilike.*ashastatuseqx*,')
  })

  it('product photos go to the public bucket and come back as their public address', async () => {
    const { store, calls } = make([[200, { Key: 'x' }]])
    const url = await store.putPublicObject('almond-bar/1.webp', new Uint8Array([1]), 'image/webp')
    expect(calls[0]).toMatchObject({ url: 'https://abc.supabase.co/storage/v1/object/product-photos/almond-bar/1.webp', method: 'POST' })
    expect(url).toBe('https://abc.supabase.co/storage/v1/object/public/product-photos/almond-bar/1.webp')
  })

  it('"Forgot password" asks Supabase to email a link back to /admin/reset', async () => {
    const { store, calls } = make([[200, {}]])
    await store.auth.recover('hema@example.com', 'https://dk.example/admin/reset')
    expect(calls[0].url).toBe('https://abc.supabase.co/auth/v1/recover?redirect_to=https%3A%2F%2Fdk.example%2Fadmin%2Freset')
    expect(calls[0].headers).toMatchObject({ apikey: 'anon-key' })
  })

  it('creates orders through the create_order function and reports whether it was new', async () => {
    const { store, calls } = make([
      [200, []],
      [200, { id: 'u1', order_code: 'DK-261005-7Q4M' }],
    ])
    const r = await store.createOrder({ idempotency_key: 'key-0000000000000001', order_code: 'DK-261005-7Q4M' })
    expect(r).toEqual({ row: { id: 'u1', order_code: 'DK-261005-7Q4M' }, created: true })
    expect(calls[1]).toMatchObject({ url: 'https://abc.supabase.co/rest/v1/rpc/create_order', method: 'POST' })
    expect(JSON.parse(calls[1].body)).toEqual({ p: { idempotency_key: 'key-0000000000000001', order_code: 'DK-261005-7Q4M' } })
  })

  it('turns an order-code clash into the error the function retries on', async () => {
    const { store } = make([
      [200, []],
      [409, { code: '23505', message: 'duplicate key value violates unique constraint "orders_order_code_key"' }],
    ])
    await expect(store.createOrder({ idempotency_key: 'k'.repeat(20), order_code: 'DK-261005-7Q4M' })).rejects.toMatchObject({ code: '23505', constraint: 'orders_order_code_key' })
  })

  it('escapes values in filters', async () => {
    const { store, calls } = make([[200, []]])
    await store.getOrder('DK-261005-7Q4M&or=(id.neq.0)')
    expect(calls[0].url).toBe('https://abc.supabase.co/rest/v1/orders?order_code=eq.DK-261005-7Q4M%26or%3D(id.neq.0)&select=*')
  })

  it('a function that matched nothing gives null, not an empty row', async () => {
    const { store } = make([[200, { id: null, order_code: null }]])
    expect(await store.submitPayment('DK-261005-7Q4M', '9000000000', '123456789012', null)).toBeNull()
  })

  it('uploads to the private bucket and signs a short-lived link', async () => {
    const { store, calls } = make([
      [200, { Key: 'uploads/refs/x.webp' }],
      [200, { signedURL: '/object/sign/uploads/refs/x.webp?token=t' }],
    ])
    await store.putObject('refs/x.webp', new Uint8Array([1, 2]), 'image/webp')
    expect(calls[0]).toMatchObject({ url: 'https://abc.supabase.co/storage/v1/object/uploads/refs/x.webp', method: 'POST' })
    expect(calls[0].headers).toMatchObject({ 'content-type': 'image/webp', 'x-upsert': 'false' })
    expect(await store.signedUrl('refs/x.webp')).toBe('https://abc.supabase.co/storage/v1/object/sign/uploads/refs/x.webp?token=t')
    expect(JSON.parse(calls[1].body)).toEqual({ expiresIn: 600 })
  })

  it('logs Hema in with Supabase Auth (email + password) and checks admin_users', async () => {
    const { store, calls } = make([
      [200, { access_token: 'a', refresh_token: 'r', expires_in: 3600, user: { id: 'u', email: 'hema@example.com' } }],
      [200, [{ user_id: 'u' }]],
    ])
    expect((await store.auth.signIn('hema@example.com', 'pw')).access_token).toBe('a')
    expect(calls[0].url).toBe('https://abc.supabase.co/auth/v1/token?grant_type=password')
    expect(calls[0].headers).toMatchObject({ apikey: 'anon-key' })
    expect(await store.auth.isAdmin('u')).toBe(true)
  })

  it('a wrong password is null, not an error', async () => {
    const { store } = make([[400, { error: 'invalid_grant' }]])
    expect(await store.auth.signIn('hema@example.com', 'nope')).toBeNull()
  })
})
