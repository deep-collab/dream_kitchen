// The complete admin (10 Oct 2026), called exactly as Netlify calls the functions, against the
// practice store: login security (30 days, forgot password), the home screen, order tabs and
// search, status emails, refund notes, class bookings end to end (full slots, blocked weekends,
// fees from the server), Razorpay as the main payment (retry, duplicate and tampered webhooks),
// reports, product photos, general enquiries and the setup check.
import { createHmac } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { bookableSaturdays, makeBookingId, normaliseBookingId } from '../src/lib/classes.js'
import { createMemoryStore } from '../netlify/lib/store/memory.mjs'
import { setStore } from '../netlify/lib/store/index.mjs'
import { outbox } from '../netlify/lib/email.mjs'
import { csvCell } from '../netlify/lib/reports.mjs'
import { smallPhoto, uploadedPhotoFiles } from '../src/lib/productPhoto.js'
import createOrder from '../netlify/functions/create-order.mjs'
import orderFn from '../netlify/functions/order.mjs'
import submitPayment from '../netlify/functions/submit-payment.mjs'
import admin from '../netlify/functions/admin.mjs'
import menuFn from '../netlify/functions/menu.mjs'
import classesFn from '../netlify/functions/classes.mjs'
import createBooking from '../netlify/functions/create-booking.mjs'
import bookingFn from '../netlify/functions/booking.mjs'
import enquiry from '../netlify/functions/class-enquiry.mjs'
import setupCheck from '../netlify/functions/setup-check.mjs'
import keepAlive from '../netlify/functions/keep-alive.mjs'
import photoFn from '../netlify/functions/photo.mjs'
import razorpayOrder from '../netlify/functions/razorpay-order.mjs'
import razorpayVerify from '../netlify/functions/razorpay-verify.mjs'
import razorpayWebhook from '../netlify/functions/razorpay-webhook.mjs'

const HEMA = { email: 'hema@example.com', password: 'test-only-password', id: '00000000-0000-4000-8000-0000000000a1' }
const OWNER = { email: 'owner@example.com', password: 'owner-test-pass', id: '00000000-0000-4000-8000-0000000000a2' }
let store
let ip = 100
let nowMs

function call(fn, body, { method = 'POST', headers = {}, query = '', raw, path = '/api/x' } = {}) {
  const init = { method, headers: { 'content-type': 'application/json', ...headers } }
  if (method !== 'GET') init.body = raw ?? JSON.stringify(body)
  return fn(new Request(`http://localhost${path}${query}`, init), { ip: `10.1.0.${ip}` }).then(async (res) => ({ status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.arrayBuffer() }))
}
const login = async (who = HEMA) => {
  const r = await call(admin, { action: 'login', email: who.email, password: who.password })
  expect(r.status).toBe(200)
  return r.body
}
const auth = (session) => ({ authorization: `Bearer ${session.accessToken}` })
const act = (session, action, body = {}) => call(admin, { action, ...body }, { headers: auth(session) })

let n = 0
const key = () => `t-key-${Date.now()}-${n++}-abcdefgh`
const customer = { name: 'Asha Rao', phone: '98450 12345', email: 'asha@example.com', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' }
const orderBody = (over = {}) => ({
  idempotencyKey: key(),
  items: [{ productId: 'almond-bar', selection: {}, qty: 2, unitPrice: 150 }],
  customer,
  dispatchDate: dateChoices(new Date(), 1, dispatchRules())[0],
  expectedTotal: 300 + 90,
  lang: 'en',
  website: '',
  ...over,
})
const SAT = () => bookableSaturdays(new Date())[0]
const bookingBody = (over = {}) => ({ idempotencyKey: key(), classId: 'basic', weekend: SAT(), slot: 'morning', name: 'Meera K', phone: '9000012345', email: 'meera@example.com', expectedFee: 2500, lang: 'en', website: '', ...over })

const razorpayOn = () => {
  process.env.RAZORPAY_KEY_ID = 'rzp_test_123'
  process.env.RAZORPAY_KEY_SECRET = 'secret_abc'
  process.env.RAZORPAY_WEBHOOK_SECRET = 'whsec_xyz'
}
/** Razorpay's API, faked: every new order gets order_RZP<n> */
function fakeRazorpay() {
  const real = globalThis.fetch
  const created = []
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body)
    created.push(body)
    return new Response(JSON.stringify({ id: `order_RZP${created.length}`, amount: body.amount }), { status: 200 })
  }
  return { created, restore: () => (globalThis.fetch = real) }
}
const webhook = (evt) => {
  const raw = JSON.stringify(evt)
  return call(razorpayWebhook, null, { raw, headers: { 'x-razorpay-signature': createHmac('sha256', 'whsec_xyz').update(raw).digest('hex') } })
}
const captured = (orderId, amount, id = 'pay_W1') => ({ event: 'payment.captured', payload: { payment: { entity: { id, order_id: orderId, amount } } } })

beforeEach(async () => {
  process.env.DK_MOCK_BACKEND = '1'
  process.env.HEMA_EMAIL = 'hema@example.com'
  for (const k of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'RESEND_API_KEY']) delete process.env[k]
  nowMs = Date.now()
  store = createMemoryStore({ admins: [HEMA, OWNER], now: () => new Date(nowMs) })
  await store.updateSettings({ upi_id: 'hema@okaxis' })
  setStore(store)
  outbox.length = 0
  ip++
})
afterEach(() => setStore(null))

describe('login security', () => {
  it('Hema and the owner can both log in; nobody else', async () => {
    await login(HEMA)
    await login(OWNER)
    expect((await call(admin, { action: 'login', email: 'stranger@example.com', password: 'x' })).status).toBe(401)
  })

  it('after 30 days without using the admin, the saved login stops working (and can’t be refreshed)', async () => {
    const s = await login()
    expect((await act(s, 'me')).status).toBe(200)
    nowMs += 31 * 86_400_000
    // her access token would have run out anyway; the refresh is refused for being idle
    const refreshed = await call(admin, { action: 'refresh', refreshToken: s.refreshToken })
    expect(refreshed.body.error).toBe('expired')
    // a fresh login works again
    const again = await login()
    expect((await act(again, 'me')).status).toBe(200)
  })

  it('29 days later the refresh still works', async () => {
    const s = await login()
    nowMs += 29 * 86_400_000
    expect((await call(admin, { action: 'refresh', refreshToken: s.refreshToken })).status).toBe(200)
  })

  it('forgot password: the same answer for any email, a link to /admin/reset, then a new password', async () => {
    const a = await call(admin, { action: 'forgot', email: 'hema@example.com' })
    const b = await call(admin, { action: 'forgot', email: 'nobody@example.com' })
    expect([a.status, a.body, b.status, b.body]).toEqual([200, { ok: true }, 200, { ok: true }])
    const link = store._dump().lastRecovery
    expect(link.email).toBe('hema@example.com')
    expect(link.link).toMatch(/\/admin\/reset#access_token=/)
    const token = /access_token=([^&]+)/.exec(link.link)[1]
    expect((await call(admin, { action: 'setPassword', accessToken: token, password: 'short' })).body.fields).toEqual({ password: 'length' })
    expect((await call(admin, { action: 'setPassword', accessToken: 'bogus', password: 'a-new-password-1' })).body.error).toBe('linkExpired')
    expect((await call(admin, { action: 'setPassword', accessToken: token, password: 'a-new-password-1' })).status).toBe(200)
    expect((await call(admin, { action: 'login', email: HEMA.email, password: HEMA.password })).status).toBe(401)
    expect((await call(admin, { action: 'login', email: HEMA.email, password: 'a-new-password-1' })).status).toBe(200)
  })

  it('"Forgot password" is rate limited', async () => {
    const r = []
    for (let i = 0; i < 6; i++) r.push((await call(admin, { action: 'forgot', email: `x${i}@example.com` })).status)
    expect(r).toEqual([200, 200, 200, 200, 200, 429])
  })
})

describe('home screen, order tabs, search', () => {
  it('cards: new orders today, payments today, to pack, to ship, this weekend’s classes, new enquiries', async () => {
    const s = await login()
    const a = (await call(createOrder, orderBody())).body.order.code
    const b = (await call(createOrder, orderBody())).body.order.code
    await call(createOrder, orderBody()) // left unpaid
    await call(submitPayment, { code: a, phone: '9845012345', utr: '412356789012' })
    await call(submitPayment, { code: b, phone: '9845012345', utr: '412356789013' })
    await act(s, 'orderAction', { code: a, step: 'paymentReceived' })
    await act(s, 'orderAction', { code: b, step: 'paymentReceived' })
    await act(s, 'orderAction', { code: b, step: 'preparing' })
    await call(enquiry, { kind: 'general', name: 'Ravi', phone: '9000099999', message: 'Do you deliver to Hubli?' })
    const r = (await act(s, 'summary')).body.summary
    expect(r).toMatchObject({ newOrdersToday: 2, unpaidToday: 1, paymentsToday: 780, toPack: 1, toShip: 1, newEnquiries: 1, toCheck: 0 })
  })

  it('tabs New · Paid · Preparing · Shipped · Delivered · Cancelled, and search by ID, name or phone', async () => {
    const s = await login()
    const a = (await call(createOrder, orderBody())).body.order.code
    await call(createOrder, orderBody({ customer: { ...customer, name: 'Kavya Nair', phone: '9886512345' } }))
    let r = (await act(s, 'orders', { tab: 'new' })).body
    expect(r.counts).toMatchObject({ new: 2, paid: 0, preparing: 0, shipped: 0, delivered: 0, cancelled: 0, today: 2 })
    expect((await act(s, 'orders', { q: 'kavya' })).body.orders.map((o) => o.name)).toEqual(['Kavya Nair'])
    expect((await act(s, 'orders', { q: '98865' })).body.orders).toHaveLength(1)
    expect((await act(s, 'orders', { q: a.slice(-4).toLowerCase() })).body.orders.map((o) => o.code)).toEqual([a])
    await act(s, 'orderAction', { code: a, step: 'cancel', reason: 'Customer changed their mind' })
    r = (await act(s, 'orders', { tab: 'cancelled' })).body
    expect(r.orders.map((o) => o.code)).toEqual([a])
    expect(r.counts.cancelled).toBe(1)
    expect(outbox.at(-1)).toMatchObject({ to: 'asha@example.com', subject: `Your order ${a} has been cancelled` })
  })

  it('refund note: saved, in the history, and in the order detail', async () => {
    const s = await login()
    const code = (await call(createOrder, orderBody())).body.order.code
    const r = await act(s, 'orderAction', { code, step: 'refundNote', refundNote: 'Refunded ₹390 in Razorpay on 12 Oct' })
    expect(r.body.order.refundNote).toBe('Refunded ₹390 in Razorpay on 12 Oct')
    expect(r.body.order.events.at(-1)).toMatchObject({ kind: 'note', note: 'Refund note: Refunded ₹390 in Razorpay on 12 Oct', by: HEMA.email })
  })

  it('no email for customers who gave none, and Track Order still shows each step', async () => {
    const s = await login()
    const code = (await call(createOrder, orderBody({ customer: { ...customer, email: '' } }))).body.order.code
    await call(submitPayment, { code, phone: '9845012345', utr: '412356789012' })
    outbox.length = 0
    expect((await act(s, 'orderAction', { code, step: 'paymentReceived' })).body.emailed).toBe(false)
    expect(outbox).toHaveLength(0)
    expect((await call(orderFn, { code, phone: '9845012345' })).body.order.status).toBe('payment_confirmed')
  })
})

describe('class bookings', () => {
  it('booking IDs: DK-CL-YYMMDD-XXXX in Indian time, typed any way', () => {
    expect(makeBookingId(new Date('2026-10-09T19:00:00Z'), () => new Uint8Array([0, 1, 2, 3]))).toBe('DK-CL-261010-2345')
    expect(normaliseBookingId(' dk cl 261010 ab2c ')).toBe('DK-CL-261010-AB2C')
  })

  it('the next 8 weekends, from the Saturday after today; a weekend closes the day before', () => {
    expect(bookableSaturdays(new Date('2026-10-09T06:00:00Z'))[0]).toBe('2026-10-10') // Friday -> tomorrow
    expect(bookableSaturdays(new Date('2026-10-10T06:00:00Z'))[0]).toBe('2026-10-17') // Saturday -> next week
    expect(bookableSaturdays(new Date('2026-10-11T06:00:00Z'))).toHaveLength(8)
  })

  it('the customer flow with UPI (Razorpay not set): book -> pay -> Hema checks -> confirmed, with emails', async () => {
    const cls = (await call(classesFn, null, { method: 'GET' })).body
    expect(cls).toMatchObject({ ready: true, open: true, showSeats: false })
    expect(cls.classes).toEqual([
      { id: 'basic', price: 2500 },
      { id: 'advanced', price: 3500 },
      { id: 'brownie', price: 3500 },
    ])
    expect(cls.weekends).toHaveLength(8)
    const r = await call(createBooking, bookingBody())
    expect(r.status).toBe(201)
    const b = r.body.booking
    expect(b.code).toMatch(/^DK-CL-\d{6}-[2-9A-HJ-NP-Z]{4}$/)
    expect(b).toMatchObject({ status: 'pending', paymentStatus: 'pending', fee: 2500, paymentMethod: 'upi' })
    expect(outbox.map((m) => m.to)).toEqual(['meera@example.com'])
    expect(outbox[0].text).toContain('Basic class')
    expect(outbox[0].text).toContain('9–11 AM')
    // a double tap: the same booking
    expect((await call(createBooking, { ...bookingBody(), idempotencyKey: r.body.booking && (await store.getBooking(b.code)).idempotency_key })).body.booking.code).toBe(b.code)

    const paid = await call(submitPayment, { code: b.code, phone: '9000012345', utr: '512345678901' })
    expect(paid.body.booking.paymentStatus).toBe('submitted')
    expect(outbox.at(-1)).toMatchObject({ to: 'hema@example.com' })
    expect(outbox.at(-1).subject).toContain('Class booking, payment to check')

    const s = await login()
    const list = (await act(s, 'bookings', { weekend: SAT() })).body
    expect(list.bookings.map((x) => x.code)).toEqual([b.code])
    const done = await act(s, 'bookingAction', { code: b.code, step: 'paymentReceived' })
    expect(done.body.booking).toMatchObject({ status: 'confirmed', paymentStatus: 'confirmed', actions: ['cancel'] })
    expect(outbox.at(-1)).toMatchObject({ to: 'meera@example.com', subject: `Your class seat is confirmed: ${b.code}` })
    expect((await call(bookingFn, { code: b.code, phone: '9000012345' })).body.booking.status).toBe('confirmed')
    expect((await call(bookingFn, { code: b.code, phone: '9000099999' })).status).toBe(404)

    const att = (await act(s, 'attendees', { weekend: SAT() })).body
    expect(att.slots.find((x) => x.id === 'morning').people.map((p) => [p.name, p.paid])).toEqual([['Meera K', true]])
    expect((await act(s, 'summary')).body.summary.paymentsToday).toBe(2500)
  })

  it('seats per slot: hidden until set; then the last seat goes to one person only', async () => {
    const s = await login()
    expect((await act(s, 'updateClassSettings', { seats: 0 })).body.fields).toEqual({ seats: 'seats' })
    await act(s, 'updateClassSettings', { seats: 1 })
    const cls = (await call(classesFn, null, { method: 'GET' })).body
    expect(cls.showSeats).toBe(true)
    expect(cls.weekends[0].slots[0]).toMatchObject({ id: 'morning', open: true, seatsLeft: 1 })
    const [a, b] = await Promise.all([call(createBooking, bookingBody()), call(createBooking, bookingBody({ phone: '9000054321' }))])
    expect([a.status, b.status].sort()).toEqual([201, 409])
    expect([a.body.error, b.body.error]).toContain('slotFull')
    // the other slot is still open
    expect((await call(createBooking, bookingBody({ slot: 'midday', phone: '9000054321' }))).status).toBe(201)
  })

  it('Hema blocks a weekend or one slot (holiday / full): no bookings there', async () => {
    const s = await login()
    const sat = SAT()
    let r = await act(s, 'setBlock', { weekend: sat, slot: 'midday', blocked: true, reason: 'Full' })
    expect(r.body.weekends.find((w) => w.weekend === sat).slots.find((x) => x.id === 'midday')).toMatchObject({ blocked: true, reason: 'Full', open: false })
    expect((await call(createBooking, bookingBody({ slot: 'midday' }))).body.error).toBe('slotGone')
    await act(s, 'setBlock', { weekend: sat, slot: '*', blocked: true, reason: 'Diwali' })
    const cls = (await call(classesFn, null, { method: 'GET' })).body
    expect(cls.weekends[0]).toMatchObject({ weekend: sat, open: false })
    expect((await call(createBooking, bookingBody())).body.error).toBe('slotGone')
    r = await act(s, 'setBlock', { weekend: sat, slot: '*', blocked: false })
    expect((await call(createBooking, bookingBody())).status).toBe(201)
  })

  it('fees and times come from Hema’s settings; a changed fee is refused with the new one', async () => {
    const s = await login()
    const r = await act(s, 'updateClassSettings', { fees: { basic: 2800 }, slots: { morning: { start: '10:00', end: '12:00' } } })
    expect(r.body.classes.find((c) => c.id === 'basic').price).toBe(2800)
    expect(r.body.slots[0]).toMatchObject({ start: '10:00', end: '12:00', label: '10 AM–12 PM' })
    expect((await call(createBooking, bookingBody())).body).toMatchObject({ error: 'feeChanged', fee: 2800 })
    expect((await call(createBooking, bookingBody({ expectedFee: 2800 }))).status).toBe(201)
    expect((await act(s, 'updateClassSettings', { slots: { morning: { start: '12:00', end: '10:00' } } })).body.fields).toEqual({ 'slot.morning': 'time' })
  })

  it('refuses a weekend that isn’t bookable, a made-up class, and bad details', async () => {
    expect((await call(createBooking, bookingBody({ weekend: '2020-01-04' }))).body.error).toBe('slotGone')
    expect((await call(createBooking, bookingBody({ classId: 'magic' }))).body.error).toBe('badRequest')
    expect((await call(createBooking, bookingBody({ name: '', phone: '12' }))).body).toMatchObject({ error: 'details', fields: { name: 'required', phone: 'invalid' } })
  })

  it('no payment set up at all: bookings stay on WhatsApp', async () => {
    await store.updateSettings({ upi_id: null })
    expect((await call(classesFn, null, { method: 'GET' })).body.open).toBe(false)
    expect((await call(createBooking, bookingBody())).body.error).toBe('paymentsClosed')
  })

  it('cancel asks for a reason and tells the customer', async () => {
    const s = await login()
    const code = (await call(createBooking, bookingBody())).body.booking.code
    expect((await act(s, 'bookingAction', { code, step: 'cancel' })).body.fields).toEqual({ reason: 'required' })
    await act(s, 'bookingAction', { code, step: 'cancel', reason: 'Class moved' })
    expect(outbox.at(-1)).toMatchObject({ to: 'meera@example.com', subject: `Your class booking ${code} has been cancelled` })
  })
})

describe('Razorpay (the main way to pay), in test mode', () => {
  it('turns on by itself when the keys exist: the menu says so and new orders are Razorpay orders', async () => {
    expect((await call(menuFn, null, { method: 'GET' })).body.razorpay).toEqual({ enabled: false })
    razorpayOn()
    expect((await call(menuFn, null, { method: 'GET' })).body.razorpay).toEqual({ enabled: true, keyId: 'rzp_test_123' })
    const r = await call(createOrder, orderBody())
    expect(r.body.order.paymentMethod).toBe('razorpay')
    expect(outbox).toHaveLength(0) // nothing until it is paid
  })

  it('success: the signature checks out, the order is Paid, Hema and the customer are emailed once', async () => {
    razorpayOn()
    const code = (await call(createOrder, orderBody())).body.order.code
    const rz = fakeRazorpay()
    try {
      const start = await call(razorpayOrder, { code, phone: '9845012345' })
      expect(start.body).toMatchObject({ razorpayOrderId: 'order_RZP1', amount: 39000, keyId: 'rzp_test_123' })
      expect(rz.created[0]).toMatchObject({ amount: 39000, receipt: code })
    } finally {
      rz.restore()
    }
    const signature = createHmac('sha256', 'secret_abc').update('order_RZP1|pay_1').digest('hex')
    const v = await call(razorpayVerify, { code, phone: '9845012345', razorpayOrderId: 'order_RZP1', razorpayPaymentId: 'pay_1', signature })
    expect(v.body.order).toMatchObject({ status: 'payment_confirmed', paymentStatus: 'confirmed' })
    expect(outbox.map((m) => m.to).sort()).toEqual(['asha@example.com', 'hema@example.com'])
    expect(outbox.find((m) => m.to === 'hema@example.com').subject).toBe(`New paid order ${code} – ₹390`)
    // the webhook for the same payment arrives too: nothing changes, no second email
    await webhook(captured('order_RZP1', 39000, 'pay_1'))
    await webhook(captured('order_RZP1', 39000, 'pay_1'))
    expect(outbox).toHaveLength(2)
    const s = await login()
    const o = (await act(s, 'order', { code })).body.order
    expect(o).toMatchObject({ razorpayPaymentId: 'pay_1', paymentMethod: 'razorpay' })
    expect(o.events.filter((e) => e.to_status === 'payment_confirmed')).toHaveLength(1)
  })

  it('failure or a closed window: the order stays unpaid, and trying again reuses the same Razorpay order', async () => {
    razorpayOn()
    const code = (await call(createOrder, orderBody())).body.order.code
    const rz = fakeRazorpay()
    try {
      const first = await call(razorpayOrder, { code, phone: '9845012345' })
      // payment.failed (or the customer closed the window): accepted, nothing changes
      expect((await webhook({ event: 'payment.failed', payload: { payment: { entity: { id: 'pay_F', order_id: 'order_RZP1', amount: 39000 } } } })).status).toBe(200)
      expect((await store.getOrder(code)).payment_status).toBe('pending')
      const again = await call(razorpayOrder, { code, phone: '9845012345' })
      expect(again.body.razorpayOrderId).toBe(first.body.razorpayOrderId)
      expect(rz.created).toHaveLength(1)
    } finally {
      rz.restore()
    }
    await webhook(captured('order_RZP1', 39000, 'pay_OK'))
    expect((await store.getOrder(code)).payment_status).toBe('confirmed')
    // paid: no more Razorpay starts
    expect((await call(razorpayOrder, { code, phone: '9845012345' })).body.error).toBe('notPending')
  })

  it('a tampered amount never counts, and a forged signature is refused', async () => {
    razorpayOn()
    const code = (await call(createOrder, orderBody())).body.order.code
    await store.setRazorpayOrderId(code, 'order_RZPX')
    await webhook(captured('order_RZPX', 100))
    expect((await store.getOrder(code)).payment_status).toBe('pending')
    const raw = JSON.stringify(captured('order_RZPX', 39000))
    expect((await call(razorpayWebhook, null, { raw, headers: { 'x-razorpay-signature': createHmac('sha256', 'wrong').update(raw).digest('hex') } })).status).toBe(400)
    expect((await call(razorpayVerify, { code, phone: '9845012345', razorpayOrderId: 'order_RZPX', razorpayPaymentId: 'p', signature: 'f'.repeat(64) })).status).toBe(400)
    // the browser can't choose the amount: the Razorpay order is made from the saved total
    const rz = fakeRazorpay()
    try {
      const code2 = (await call(createOrder, orderBody())).body.order.code
      await call(razorpayOrder, { code: code2, phone: '9845012345', amount: 1 })
      expect(rz.created[0].amount).toBe(39000)
    } finally {
      rz.restore()
    }
  })

  it('class bookings pay the same way (verify and webhook), for the class fee', async () => {
    razorpayOn()
    const code = (await call(createBooking, bookingBody())).body.booking.code
    expect(outbox).toHaveLength(0)
    const rz = fakeRazorpay()
    try {
      const r = await call(razorpayOrder, { code, phone: '9000012345' })
      expect(r.body).toMatchObject({ amount: 250000, description: code })
    } finally {
      rz.restore()
    }
    await webhook(captured('order_RZP1', 250000, 'pay_B'))
    expect((await call(bookingFn, { code, phone: '9000012345' })).body.booking).toMatchObject({ status: 'confirmed', paymentStatus: 'confirmed' })
    expect(outbox.map((m) => m.subject).sort()).toEqual([`New class booking ${code}: Meera K`, `Your class seat is confirmed: ${code}`].sort())
  })
})

describe('menu photos, settings, enquiries, reports, setup check', () => {
  it('a product photo from Hema’s phone: saved, shown on the website, and replaceable', async () => {
    const s = await login()
    const webp = `data:image/webp;base64,${Buffer.from([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8 '), 1, 2]).toString('base64')}`
    const r = await act(s, 'productPhoto', { id: 'almond-bar', image: webp })
    const p = r.body.products.find((x) => x.id === 'almond-bar')
    expect(p).toMatchObject({ ownPhoto: true })
    expect(p.photo).toMatch(/^\/api\/photo\/almond-bar\/\d+\.webp$/)
    const menu = (await call(menuFn, null, { method: 'GET' })).body
    expect(menu.overrides).toContainEqual({ id: 'almond-bar', photo: p.photo })
    const img = await call(photoFn, null, { method: 'GET', path: p.photo })
    expect(img.status).toBe(200)
    expect((await act(s, 'productPhoto', { id: 'almond-bar', image: 'data:image/png;base64,PGh0bWw+' })).body.fields).toEqual({ photo: 'image' })
    const back = await act(s, 'productPhoto', { id: 'almond-bar', image: null })
    expect(back.body.products.find((x) => x.id === 'almond-bar').ownPhoto).toBe(false)
  })

  const webpOf = (n) => `data:image/webp;base64,${Buffer.from([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8 '), n, n]).toString('base64')}`

  it('Change photo stores the 1200px and the 600px file, and the website finds both', async () => {
    const s = await login()
    const r = await act(s, 'productPhoto', { id: 'pista-bar', image: webpOf(1), imageSmall: webpOf(2) })
    const p = r.body.products.find((x) => x.id === 'pista-bar')
    expect(p.photo).toMatch(/^\/api\/photo\/pista-bar\/\d+-1200\.webp$/)
    expect((await call(menuFn, null, { method: 'GET' })).body.overrides).toContainEqual({ id: 'pista-bar', photo: p.photo })
    const big = await call(photoFn, null, { method: 'GET', path: p.photo })
    const small = await call(photoFn, null, { method: 'GET', path: smallPhoto(p.photo) })
    expect([big.status, small.status]).toEqual([200, 200])
    expect(new Uint8Array(big.body).at(-1)).toBe(1)
    expect(new Uint8Array(small.body).at(-1)).toBe(2)
    // Two sizes of different kinds (or a small one that isn't a photo) are refused, nothing changes
    expect((await act(s, 'productPhoto', { id: 'pista-bar', image: webpOf(3), imageSmall: 'data:image/png;base64,PGh0bWw+' })).body.fields).toEqual({ photo: 'image' })
    expect((await act(s, 'menu')).body.products.find((x) => x.id === 'pista-bar').photo).toBe(p.photo)
  })

  it('if the upload fails, the current photo stays on the website', async () => {
    const s = await login()
    const first = (await act(s, 'productPhoto', { id: 'walnut-brownies', image: webpOf(1), imageSmall: webpOf(2) })).body.products.find((x) => x.id === 'walnut-brownies').photo
    const put = store.putPublicObject
    let n = 0
    store.putPublicObject = (...a) => (++n === 2 ? Promise.reject(new Error('storage down')) : put(...a)) // the 1200px file fails
    try {
      const r = await act(s, 'productPhoto', { id: 'walnut-brownies', image: webpOf(5), imageSmall: webpOf(6) })
      expect(r.status).toBe(500)
    } finally {
      store.putPublicObject = put
    }
    expect((await act(s, 'menu')).body.products.find((x) => x.id === 'walnut-brownies').photo).toBe(first)
    expect((await call(menuFn, null, { method: 'GET' })).body.overrides).toContainEqual(expect.objectContaining({ id: 'walnut-brownies', photo: first }))
  })

  it('the 600px address of a photo (older one-size photos keep their own address)', () => {
    expect(smallPhoto('https://x.supabase.co/storage/v1/object/public/product-photos/a/17-1200.webp')).toBe('https://x.supabase.co/storage/v1/object/public/product-photos/a/17-600.webp')
    expect(smallPhoto('/api/photo/a/17-1200.jpg')).toBe('/api/photo/a/17-600.jpg')
    expect(smallPhoto('/api/photo/a/17.webp')).toBe('/api/photo/a/17.webp')
    expect(uploadedPhotoFiles('/api/photo/a/17-1200.webp', '50vw')).toEqual({ src: '/api/photo/a/17-600.webp', srcSet: '/api/photo/a/17-600.webp 600w, /api/photo/a/17-1200.webp 1200w', sizes: '50vw' })
    expect(uploadedPhotoFiles('/api/photo/a/17.webp', '50vw')).toEqual({ src: '/api/photo/a/17.webp' })
  })

  it('settings: the order-alert email and the 750 g courier rate', async () => {
    const s = await login()
    expect((await act(s, 'updateSettings', { alertEmail: 'not-an-email' })).body.fields).toEqual({ alertEmail: 'invalid' })
    const r = await act(s, 'updateSettings', { alertEmail: 'orders@dreamkitchen.example' })
    expect(r.body.settings.alertEmail).toBe('orders@dreamkitchen.example')
    const code = (await call(createOrder, orderBody())).body.order.code
    await call(submitPayment, { code, phone: '9845012345', utr: '412356789012' })
    expect(outbox.at(-1).to).toBe('orders@dreamkitchen.example')
    expect((await act(s, 'updateSettings', { courierRates: { small: { karnataka: 90, outside: 100 }, large: { karnataka: 100, outside: 150 } } })).body.fields).toEqual({ courierRates: 'rates' })
  })

  it('general messages from the Contact page: saved, emailed, marked handled', async () => {
    expect((await call(enquiry, { kind: 'general', name: 'Ravi', phone: '9000099999', message: '' })).body.fields).toEqual({ message: 'required' })
    expect((await call(enquiry, { kind: 'general', name: 'Ravi', phone: '9000099999', message: 'Do you deliver to Hubli?' })).status).toBe(201)
    expect(outbox.at(-1)).toMatchObject({ to: 'hema@example.com', subject: 'Message: Ravi' })
    const s = await login()
    const e = (await act(s, 'enquiries')).body.enquiries[0]
    expect(e).toMatchObject({ kind: 'general', status: 'new', handled: false, message: 'Do you deliver to Hubli?' })
    expect((await act(s, 'updateEnquiry', { id: e.id, status: 'handled' })).body.enquiry.handled).toBe(true)
  })

  it('reports: orders and bookings as CSV for a date range, and the month in numbers with the top 5', async () => {
    const s = await login()
    for (const [id, qty, price] of [
      ['almond-bar', 3, 150],
      ['pista-bar', 1, 450],
    ]) {
      const code = (await call(createOrder, orderBody({ items: [{ productId: id, selection: {}, qty, unitPrice: price }], expectedTotal: qty * price + 90, customer: { ...customer, name: '=HYPERLINK("x")' } }))).body.order.code
      await call(submitPayment, { code, phone: '9845012345', utr: '412356789012' })
      await act(s, 'orderAction', { code, step: 'paymentReceived' })
    }
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
    const r = (await act(s, 'report', { kind: 'orders', from: today, to: today })).body
    expect(r.count).toBe(2)
    expect(r.filename).toBe(`dream-kitchen-orders-${today}-to-${today}.csv`)
    expect(r.csv.split('\r\n')[0]).toContain('"Order ID","Ordered (IST)","Status"')
    expect(r.csv).toContain(`"'=HYPERLINK(""x"")"`) // never runs as a formula in Excel
    expect((await act(s, 'report', { kind: 'orders', from: today, to: '2020-01-01' })).body.fields).toEqual({ range: 'invalid' })
    const m = (await act(s, 'monthly', { month: today.slice(0, 7) })).body
    expect(m).toMatchObject({ orders: 2, revenue: 450 + 90 + 450 + 90, items: 4 })
    expect(m.top.map((t) => [t.name, t.qty])).toEqual([
      ['Almond Bar', 3],
      ['Pista Bar', 1],
    ])
    expect(csvCell('+91 98450')).toBe(`"'+91 98450"`)
  })

  it('setup check: green and red per part, never a key or an email address', async () => {
    let r = (await call(setupCheck, null, { method: 'GET' })).body
    expect(r).toMatchObject({ mode: 'mock', supabase: { ok: true }, resend: { ok: false, problem: 'noKey' }, razorpay: { ok: false, problem: 'noKeys' }, email: { ok: true }, upi: { ok: true } })
    expect(r).toMatchObject({ keepAlive: { ok: false, problem: 'never' }, address: { ok: true }, allGood: false })
    process.env.RESEND_API_KEY = 're_test_123'
    razorpayOn()
    r = (await call(setupCheck, null, { method: 'GET' })).body
    // Resend's test sender reaches no customer: not ready until EMAIL_FROM is on the own domain
    expect(r).toMatchObject({ resend: { ok: false, problem: 'noFrom' }, razorpay: { ok: true, on: true, testMode: true } })
    process.env.EMAIL_FROM = 'Dream Kitchen <orders@dreamkitchen.example>'
    await keepAlive()
    r = (await call(setupCheck, null, { method: 'GET' })).body
    expect(r).toMatchObject({ resend: { ok: true }, keepAlive: { ok: true, runs: 1 }, allGood: true })
    // Netlify serves another main address than the code's site.url
    process.env.URL = 'https://dreamkitchen.example'
    r = (await call(setupCheck, null, { method: 'GET' })).body
    expect(r).toMatchObject({ address: { ok: false, problem: 'mismatch', served: 'https://dreamkitchen.example' }, allGood: false })
    delete process.env.URL
    delete process.env.EMAIL_FROM
    const text = JSON.stringify(r)
    expect(text).not.toMatch(/re_test_123|secret_abc|whsec|hema@example\.com|hema@okaxis/)
    delete process.env.RESEND_API_KEY
    setStore(null)
    delete process.env.DK_MOCK_BACKEND
    r = (await call(setupCheck, null, { method: 'GET' })).body
    expect(r.supabase).toMatchObject({ ok: false, problem: 'noUrl' })
  })
})

describe('final launch: Hema adds products and edits names', () => {
  it('a new product with one price: on the website menu, priced by the server, hidden (never deleted)', async () => {
    const s = await login()
    expect((await act(s, 'addProduct', { category: 'chocolates', name: { en: '' }, courierTier: 'small', price: 0 })).body.fields).toEqual({ name: 'required', price: 'price' })
    expect((await act(s, 'addProduct', { category: 'customize', name: { en: 'Nope' }, courierTier: 'small', price: 100 })).body.fields).toEqual({ category: 'required' })
    const r = await act(s, 'addProduct', { category: 'chocolates', name: { en: 'Coconut Bar', kn: 'ತೆಂಗಿನಕಾಯಿ ಬಾರ್' }, description: { en: 'Dark chocolate with coconut.' }, courierTier: 'small', price: 200 })
    expect(r.status).toBe(200)
    expect(r.body.id).toBe('coconut-bar')
    expect(r.body.products.find((p) => p.id === 'coconut-bar')).toMatchObject({ name: 'Coconut Bar', nameKn: 'ತೆಂಗಿನಕಾಯಿ ಬಾರ್', description: 'Dark chocolate with coconut.', custom: true, price: 200, active: true, changed: false })
    // The same name again gets its own id, so old orders keep their product
    expect((await act(s, 'addProduct', { category: 'chocolates', name: { en: 'Coconut Bar' }, courierTier: 'small', price: 210 })).body.id).toBe('coconut-bar-2')

    const menu = (await call(menuFn, null, { method: 'GET' })).body
    expect(menu.overrides).toContainEqual(expect.objectContaining({ id: 'coconut-bar', custom: true, category: 'chocolates', price: 200, name: { en: 'Coconut Bar', kn: 'ತೆಂಗಿನಕಾಯಿ ಬಾರ್' } }))

    // The server prices it (1 × ₹200 + ₹90 courier within Karnataka); a wrong browser price is refused
    const ok = await call(createOrder, orderBody({ items: [{ productId: 'coconut-bar', selection: {}, qty: 1, unitPrice: 200 }], expectedTotal: 290 }))
    expect(ok.status).toBe(201)
    expect(ok.body.order.total).toBe(290)

    // Edit its name and description; Hide it; it can't be ordered while hidden
    const e = await act(s, 'updateProduct', { id: 'coconut-bar', name: { en: 'Coconut Dream Bar', kn: '' }, description: { en: '', kn: '' } })
    expect(e.body.products.find((p) => p.id === 'coconut-bar')).toMatchObject({ name: 'Coconut Dream Bar', nameKn: 'Coconut Dream Bar', description: '' })
    expect((await act(s, 'updateProduct', { id: 'coconut-bar', name: { en: '' } })).body.fields).toEqual({ name: 'required' })
    await act(s, 'updateProduct', { id: 'coconut-bar', active: false })
    const hidden = await call(createOrder, orderBody({ items: [{ productId: 'coconut-bar', selection: {}, qty: 1, unitPrice: 200 }], expectedTotal: 290 }))
    expect(hidden.status).toBe(422)
    expect(hidden.body.error).toBe('items')
    // There is no delete action
    expect((await act(s, 'deleteProduct', { id: 'coconut-bar' })).status).toBe(400)
  })

  it('a new product with sizes: each size needs a name and a price; its courier tier is the one Hema chose', async () => {
    const s = await login()
    expect((await act(s, 'addProduct', { category: 'brownie-tubs', name: { en: 'Big Tub' }, courierTier: 'xl', sizes: [{ label: '', price: 999 }] })).body.fields).toEqual({ sizes: 'needLabels' })
    const r = await act(s, 'addProduct', { category: 'brownie-tubs', name: { en: 'Big Tub' }, courierTier: 'xl', sizes: [{ label: '1 kg', price: 1999 }, { label: '2 kg', price: 3499 }] })
    const p = r.body.products.find((x) => x.id === 'big-tub')
    expect(p).toMatchObject({ courierTier: 'xl', sizes: [{ label: '1 kg', price: 1999 }, { label: '2 kg', price: 3499 }] })
    // xl courier within Karnataka is the 500–700 g rate until Hema sets it: ₹100
    const order = await call(createOrder, orderBody({ items: [{ productId: 'big-tub', selection: { size: p.sizes[0].id }, qty: 1, unitPrice: 1999 }], expectedTotal: 2099 }))
    expect(order.status).toBe(201)
    expect(order.body.order.total).toBe(2099)
  })

  it('a menu product’s name and description: Hema’s own, then Back to original', async () => {
    const s = await login()
    const r = await act(s, 'updateProduct', { id: 'pista-bar', name: { en: 'Pista Chocolate Bar', kn: 'ಪಿಸ್ತಾ ಚಾಕೊಲೇಟ್ ಬಾರ್' }, description: { en: 'Loaded with pistachios.' } })
    expect(r.body.products.find((p) => p.id === 'pista-bar')).toMatchObject({ name: 'Pista Chocolate Bar', nameKn: 'ಪಿಸ್ತಾ ಚಾಕೊಲೇಟ್ ಬಾರ್', description: 'Loaded with pistachios.', changed: true })
    const back = await act(s, 'updateProduct', { id: 'pista-bar', reset: true })
    expect(back.body.products.find((p) => p.id === 'pista-bar')).toMatchObject({ name: 'Pista Bar', description: '', changed: false })
  })
})
