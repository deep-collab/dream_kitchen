// Kannada Rajyotsava (27 Oct 2026): 50% off everything, 1 to 30 November, online orders only; any
// number of sizes per product; the Cookie Tins section. Every request goes through the Worker
// (src/worker/index.mjs) on a real SQLite copy of the Cloudflare D1 database (d1/setup-all.sql:
// every migration incl. 0004 + the menu seed), with the clock set to each day that matters, as
// on Cloudflare. Also: d1/migrations/0004 on a database already in use keeps every order, product
// and price, and the website code works before it has run.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import worker from '../src/worker/index.mjs'
import { createD1SqliteAdapter } from '../netlify/lib/store/d1SqliteAdapter.mjs'
import { createD1Store } from '../netlify/lib/store/d1.mjs'
import { setD1Instance, setStore } from '../netlify/lib/store/index.mjs'
import { setWorkerEnv } from '../netlify/lib/env.mjs'
import { customerPlaced, hemaNewOrder } from '../netlify/lib/emailTemplates.mjs'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { bookableSaturdays } from '../src/lib/classes.js'
import { allLiveOffers, applyOfferPrices, istToday, orderSavings, percentOff, RAJYOTSAVA, rajyotsavaLive } from '../src/lib/offers.js'
import { festivalBackground } from '../src/lib/siteConfig.js'
import { applyOverrides, isForSale, unitPrice } from '../src/lib/pricing.js'
import { products as CONFIG } from '../src/config/shop.js'

const HEMA = { email: 'hema@example.com', password: 'test-only-password' }
let sqlite
let env
let n = 0
let nowMs
const setNow = (iso) => {
  nowMs = Date.parse(iso)
  vi.setSystemTime(nowMs)
}

// The Indian times that matter (India is UTC + 5:30)
const OCT_31_2359 = '2026-10-31T18:29:00Z'
const NOV_1_0000 = '2026-10-31T18:30:00Z'
const NOV_30_2359 = '2026-11-30T18:29:00Z'
const DEC_1_0000 = '2026-11-30T18:30:00Z'

async function call(path, body, { method = 'POST', headers = {} } = {}) {
  const init = { method, headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.11.0.${++n % 250}`, ...headers } }
  if (method !== 'GET') init.body = JSON.stringify(body)
  const res = await worker.fetch(new Request(`https://dream-kitchen.test${path}`, init), env, {})
  return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.arrayBuffer() }
}
const login = async () => (await call('/api/admin', { action: 'login', ...HEMA })).body
const act = (s, action, body = {}) => call('/api/admin', { action, ...body }, { headers: { authorization: `Bearer ${s.accessToken}` } })
const menu = async () => (await call('/api/menu', null, { method: 'GET' })).body
const customer = { name: 'Asha Rao', phone: '98450 12345', email: 'asha@example.com', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' }
const line = (productId, unitPrice, selection = {}, qty = 1) => ({ productId, selection, qty, unitPrice })
const order = (items, expectedTotal, rules = dispatchRules()) =>
  call('/api/create-order', { idempotencyKey: `raj-nov-${nowMs}-${++n}-abcdefgh`, items, customer, dispatchDate: dateChoices(new Date(), 1, rules)[0], expectedTotal, lang: 'en', website: '' })

/** The menu exactly as the website builds it from /api/menu (MenuProvider) */
async function siteMenu() {
  const m = await menu()
  const live = allLiveOffers(m.offers, istToday(new Date(nowMs)))
  return { m, live, products: applyOfferPrices(applyOverrides(CONFIG, m.overrides), live) }
}
const byId = (list, id) => list.find((p) => p.id === id)
const rajOn = (s, over = {}) => act(s, 'saveRajyotsava', { active: true, startsOn: '2026-11-01', endsOn: '2026-11-30', percent: 50, drawing: false, ...over })

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  setNow('2026-10-27T06:00:00Z')
  sqlite = new Database(':memory:')
  sqlite.exec(readFileSync('d1/setup-all.sql', 'utf8'))
  const db = createD1SqliteAdapter(sqlite)
  env = { DB: db, UPI_ID: 'hema@okaxis', SITE_URL: 'https://dream-kitchen.test' }
  setStore(null)
  await createD1Store(db).auth.createAdmin(HEMA.email, HEMA.password)
})
afterEach(() => {
  setWorkerEnv(null)
  setD1Instance(null)
  vi.useRealTimers()
})

describe('the Rajyotsava offer in the database (d1/migrations/0004)', () => {
  it('is there, switched on, for 1–30 November, 50% off every product, the drawing at full price', () => {
    const row = sqlite.prepare('SELECT * FROM offers WHERE id = ?').get(RAJYOTSAVA.id)
    expect(row).toMatchObject({ starts_on: '2026-11-01', ends_on: '2026-11-30', active: 1, link: '' })
    expect(JSON.parse(row.items)).toEqual({ all: true, categories: [], products: [] })
    expect(JSON.parse(row.deal)).toEqual({ kind: 'percent', value: 50 })
    expect(JSON.parse(row.badge)).toEqual({ en: '50% OFF', kn: '50% ರಿಯಾಯಿತಿ' })
    expect(JSON.parse(row.title).en).toBe('Happy Kannada Rajyotsava')
  })
})

describe('prices on the days that matter (server and website agree)', () => {
  it('31 Oct 23:59: normal · 1 Nov 00:00: 50% off · 30 Nov 23:59: 50% off · 1 Dec 00:00: normal', async () => {
    // 27 Oct and the last minute of 31 Oct: not live, regular prices, and nothing on the website
    for (const at of ['2026-10-27T06:00:00Z', OCT_31_2359]) {
      setNow(at)
      const { live, products } = await siteMenu()
      expect(rajyotsavaLive(live)).toBeNull()
      expect(byId(products, 'pista-bar').price).toBe(450)
      expect((await order([line('pista-bar', 450)], 540)).status).toBe(201)
      expect((await order([line('pista-bar', 225)], 315)).status).toBe(409)
    }
    // 1 Nov, the first minute, and 30 Nov, the last minute: 50% off, charged by the server
    for (const at of [NOV_1_0000, NOV_30_2359]) {
      setNow(at)
      const { live, products } = await siteMenu()
      expect(rajyotsavaLive(live)).toMatchObject({ id: RAJYOTSAVA.id, deal: { kind: 'percent', value: 50 } })
      expect(byId(products, 'pista-bar')).toMatchObject({ price: 225, offer: { id: RAJYOTSAVA.id, badge: { en: '50% OFF' }, deal: { kind: 'percent', value: 50 }, was: { price: 450 } } })
      const ok = await order([line('pista-bar', 225)], 315)
      expect(ok.status).toBe(201)
      expect(ok.body.order.total).toBe(315) // ₹225 + ₹90 courier (not discounted)
      // the regular price is refused as "price changed", with the offer price to show
      const stale = await order([line('pista-bar', 450)], 540)
      expect(stale.status).toBe(409)
      expect(stale.body.lines).toEqual([{ index: 0, unitPrice: 225 }])
    }
    // 1 Dec, the first minute: over by itself
    setNow(DEC_1_0000)
    const { live, products } = await siteMenu()
    expect(rajyotsavaLive(live)).toBeNull()
    expect(byId(products, 'pista-bar').price).toBe(450)
    expect((await menu()).offers.some((o) => o.id === RAJYOTSAVA.id)).toBe(false)
    expect((await order([line('pista-bar', 450)], 540)).status).toBe(201)
    expect((await order([line('pista-bar', 225)], 315)).status).toBe(409)
  })

  it('every product, every section and size, ragi versions too: half price, rounded to the nearest rupee', async () => {
    setNow('2026-11-14T06:00:00Z')
    const { products } = await siteMenu()
    const regular = applyOverrides(CONFIG, [])
    for (const r of regular.filter(isForSale)) {
      const p = byId(products, r.id)
      if (r.sizes?.length) expect(p.sizes.map((s) => s.price)).toEqual(r.sizes.map((s) => Math.round(s.price / 2)))
      else expect(p.price).toBe(Math.round(r.price / 2))
      if (Number.isFinite(r.ragiPrice)) expect(p.ragiPrice).toBe(Math.round(r.ragiPrice / 2))
      expect(p.offer.id).toBe(RAJYOTSAVA.id)
    }
    // the rounding: ₹549 -> ₹275 (274.50 rounds up), ₹449 -> ₹225, ₹1,499 -> ₹750, ragi ₹50 -> ₹25, ₹80 -> ₹40
    expect(percentOff(549, 50)).toBe(275)
    expect(byId(products, 'nutty-brownies').price).toBe(275)
    expect(byId(products, 'lotus-biscoff-tub').sizes[0].price).toBe(225)
    expect(byId(products, 'ferrero-rocher-nutella-tub').sizes[2].price).toBe(750)
    expect(unitPrice(byId(products, 'nutty-brownies'), { ragi: true })).toBe(300)
    expect(unitPrice(byId(products, 'assorted-brownies'), { ragi: true })).toBe(390)

    // The server charges exactly that for one of everything on the menu (first size each)
    const lines = products
      .filter((p) => isForSale(p) && p.menu !== false)
      .map((p) => line(p.id, unitPrice(p, p.sizes?.length ? { size: p.sizes[0].id } : {}), p.sizes?.length ? { size: p.sizes[0].id } : {}))
    expect(lines.length).toBeGreaterThan(12)
    const sum = lines.reduce((t, l) => t + l.unitPrice, 0)
    const r = await order(lines, sum + 90)
    expect(r.status).toBe(201)
    expect(r.body.order.subtotal).toBe(sum)
    // and the ragi version, at its offer price
    expect((await order([line('walnut-brownies', 350, { ragi: true })], 440)).status).toBe(201) // 325 + 25
  })

  it('never discounted: courier charges, class fees, the drawing add-on (unless Hema says so); the name on the box stays free', async () => {
    setNow('2026-11-10T06:00:00Z')
    // courier: a 500 g Delight Box pays the full ₹100 (Karnataka) on top of its half price
    expect((await order([line('red-velvet-delight-box', 625, { size: '500g' })], 725)).body.order).toMatchObject({ subtotal: 625, courier: 100, total: 725 })
    // the name on the box: free, as always
    expect((await order([line('red-velvet-delight-box', 325, { size: '250g', name: 'Hema' })], 415)).status).toBe(201)
    // the drawing add-on: +₹450 at full price
    const drawingRules = dispatchRules({ drawing: true })
    const drawing = { size: '250g', drawing: true, drawingText: 'A small cat' }
    expect((await order([line('red-velvet-delight-box', 775, drawing)], 865, drawingRules)).status).toBe(201)
    // ...unless Hema ticks "also take 50% off the drawing add-on": then ₹225
    const s = await login()
    expect((await rajOn(s, { drawing: true })).status).toBe(200)
    expect((await order([line('red-velvet-delight-box', 550, drawing)], 640, drawingRules)).status).toBe(201)
    expect((await order([line('red-velvet-delight-box', 775, drawing)], 865, drawingRules)).status).toBe(409)

    // class fees: a class booked in November costs the full fee
    const weekend = bookableSaturdays(new Date())[0]
    const booking = { classId: 'basic', weekend, slot: 'morning', name: 'Meera K', phone: '9000012345', email: '', lang: 'en', website: '' }
    const full = await call('/api/create-booking', { ...booking, idempotencyKey: `raj-class-${++n}-abcdefghijkl`, expectedFee: 2500 })
    expect(full.status).toBe(201)
    expect(full.body.booking.fee).toBe(2500)
    const half = await call('/api/create-booking', { ...booking, phone: '9000054321', idempotencyKey: `raj-class-${++n}-abcdefghijkl`, expectedFee: 1250 })
    expect(half.status).toBe(409)
    expect(half.body.error).toBe('feeChanged')
  })
})

describe('admin -> Offers: the Rajyotsava card', () => {
  it('Turn off this offer: normal prices, and nothing on the website (no popup, Offer Zone or flag); on again: back', async () => {
    const s = await login()
    const list = (await act(s, 'offers')).body
    expect(list.rajyotsava).toMatchObject({ id: RAJYOTSAVA.id, exists: true, active: true, startsOn: '2026-11-01', endsOn: '2026-11-30', percent: 50, drawing: false, status: 'scheduled' })
    expect(list.offers.some((o) => o.id === RAJYOTSAVA.id)).toBe(false) // its own card, not in the list

    setNow('2026-11-05T06:00:00Z')
    const s2 = await login() // a new day: the admin page would have refreshed its short-lived token
    expect((await act(s2, 'offers')).body.rajyotsava.status).toBe('live')
    const off = await rajOn(s2, { active: false })
    expect(off.status).toBe(200)
    expect(off.body.rajyotsava).toMatchObject({ active: false, status: 'off' })
    const m = await menu()
    expect(m.offers.some((o) => o.id === RAJYOTSAVA.id)).toBe(false)
    const { live } = await siteMenu()
    // what the popup, the Offer Zone button and the flag background all wait for
    expect(rajyotsavaLive(live)).toBeNull()
    expect(festivalBackground(m.config.background, istToday(new Date(nowMs)), Boolean(rajyotsavaLive(live))).id).toBe('default')
    expect((await order([line('pista-bar', 450)], 540)).status).toBe(201)
    expect((await order([line('pista-bar', 225)], 315)).status).toBe(409)

    expect((await rajOn(s2, { active: true })).body.rajyotsava.status).toBe('live')
    const on = await siteMenu()
    expect(festivalBackground(on.m.config.background, istToday(new Date(nowMs)), Boolean(rajyotsavaLive(on.live)))).toMatchObject({ id: 'rajyotsava', opacity: 0.07, animate: true })
    expect((await order([line('pista-bar', 225)], 315)).status).toBe(201)
  })

  it('dates and percent are Hema’s to change; the words follow the percent; bad values are refused', async () => {
    const s = await login()
    const r = await rajOn(s, { startsOn: '2026-11-01', endsOn: '2026-11-15', percent: 40 })
    expect(r.status).toBe(200)
    expect(r.body.rajyotsava).toMatchObject({ endsOn: '2026-11-15', percent: 40 })
    setNow('2026-11-15T12:00:00Z')
    const { m, products } = await siteMenu()
    expect(m.offers.find((o) => o.id === RAJYOTSAVA.id)).toMatchObject({ badge: { en: '40% OFF', kn: '40% ರಿಯಾಯಿತಿ' }, deal: { kind: 'percent', value: 40 } })
    expect(byId(products, 'pista-bar')).toMatchObject({ price: 270, offer: { deal: { value: 40 } } })
    const forty = await order([line('pista-bar', 270)], 360)
    expect(forty.status).toBe(201)
    expect(forty.body.order.items[0]).toMatchObject({ regularUnitPrice: 450, unitPrice: 270, offer: { label: { en: 'Rajyotsava 40% off', kn: 'ರಾಜ್ಯೋತ್ಸವ 40% ರಿಯಾಯಿತಿ' } } })
    setNow('2026-11-16T06:00:00Z') // after her new end date
    expect((await order([line('pista-bar', 450)], 540)).status).toBe(201)

    setNow('2026-10-27T06:00:00Z')
    const bad = async (over) => (await rajOn(s, over)).body.fields
    expect(await bad({ percent: 0 })).toEqual({ percent: 'percent' })
    expect(await bad({ percent: 95 })).toEqual({ percent: 'percent' })
    expect(await bad({ percent: '50' })).toEqual({ percent: 'percent' })
    expect(await bad({ endsOn: '2026-10-30' })).toEqual({ endsOn: 'beforeStart' })
    expect(await bad({ startsOn: '2026-10-01', endsOn: '2026-10-20' })).toEqual({ endsOn: 'past' })
    expect(await bad({ startsOn: 'soon' })).toEqual({ startsOn: 'required' })
    // switched off, a past end date is fine (it isn't going anywhere)
    expect((await rajOn(s, { active: false, startsOn: '2026-10-01', endsOn: '2026-10-20' })).status).toBe(200)
  })

  it('is switched off, never deleted; if its row is ever missing, saving puts it back', async () => {
    const s = await login()
    expect((await act(s, 'deleteOffer', { id: RAJYOTSAVA.id })).body.fields).toEqual({ offer: 'fixed' })
    sqlite.prepare('DELETE FROM offers WHERE id = ?').run(RAJYOTSAVA.id)
    expect((await act(s, 'offers')).body.rajyotsava).toMatchObject({ exists: false, active: false, status: 'off' })
    expect((await rajOn(s)).body.rajyotsava).toMatchObject({ exists: true, active: true, percent: 50 })
    expect(sqlite.prepare('SELECT count(*) AS c FROM offers WHERE id = ?').get(RAJYOTSAVA.id).c).toBe(1)
  })
})

describe('one order through to the admin, the packing slip, Track Order and the emails', () => {
  it('shows the regular price, “Rajyotsava 50% off” and the price paid, everywhere', async () => {
    setNow('2026-11-03T06:00:00Z')
    const r = await order([line('red-velvet-delight-box', 625, { size: '500g', name: 'Asha' }, 2), line('almond-bar', 75), line('walnut-brownies', 350, { ragi: true })], 1250 + 75 + 350 + 100)
    expect(r.status).toBe(201)
    const code = r.body.order.code
    // what the order remembers (D1 row)
    const row = sqlite.prepare('SELECT items, subtotal, courier, total FROM orders WHERE order_code = ?').get(code)
    const items = JSON.parse(row.items)
    expect(items[0]).toMatchObject({ productId: 'red-velvet-delight-box', qty: 2, unitPrice: 625, lineTotal: 1250, regularUnitPrice: 1250, regularLineTotal: 2500, offer: { id: RAJYOTSAVA.id, label: { en: 'Rajyotsava 50% off', kn: 'ರಾಜ್ಯೋತ್ಸವ 50% ರಿಯಾಯಿತಿ' } } })
    expect(items[2]).toMatchObject({ productId: 'walnut-brownies', ragi: true, unitPrice: 350, regularUnitPrice: 700 })
    expect(row).toMatchObject({ subtotal: 1675, courier: 100, total: 1775 })
    expect(orderSavings(items)).toEqual({ regularSubtotal: 3350, saved: 1675, labels: [{ en: 'Rajyotsava 50% off', kn: 'ರಾಜ್ಯೋತ್ಸವ 50% ರಿಯಾಯಿತಿ' }] })

    // the admin's order page (the packing slip reads the same answer)
    const s = await login()
    const detail = (await act(s, 'order', { code })).body.order
    expect(detail.items[0]).toMatchObject({ regularLineTotal: 2500, lineTotal: 1250, offer: { label: { en: 'Rajyotsava 50% off' } } })
    expect(detail.savings).toMatchObject({ regularSubtotal: 3350, saved: 1675 })
    expect(detail).toMatchObject({ subtotal: 1675, courier: 100, total: 1775 })

    // Track Order (any device, order ID + phone)
    const track = await call('/api/order', { code, phone: '9845012345' })
    expect(track.status).toBe(200)
    expect(track.body.order.items[0]).toMatchObject({ regularUnitPrice: 1250, unitPrice: 625, regularLineTotal: 2500, lineTotal: 1250, offer: { label: { en: 'Rajyotsava 50% off' } } })
    expect(track.body.order.items[1]).toMatchObject({ unitPrice: 75, regularUnitPrice: 150 })

    // the emails (Hema's and the customer's)
    const dbRow = sqlite.prepare('SELECT * FROM orders WHERE order_code = ?').get(code)
    const full = { ...dbRow, items, payment_status: 'confirmed' }
    const hema = hemaNewOrder(full, 'hema@example.com').text
    expect(hema).toContain('₹2,500 → Rajyotsava 50% off → ₹1,250')
    expect(hema).toContain('Regular price: ₹3,350')
    expect(hema).toContain('Rajyotsava 50% off: −₹1,675')
    expect(hema).toContain('Courier: ₹100')
    expect(hema).toContain('Total: ₹1,775')
    const kn = customerPlaced({ ...full, lang: 'kn' }).text
    expect(kn).toContain('ರಾಜ್ಯೋತ್ಸವ 50% ರಿಯಾಯಿತಿ')

    // an order from before November has no offer lines and shows as before
    setNow('2026-10-28T06:00:00Z')
    const before = await order([line('almond-bar', 150)], 240)
    const plain = JSON.parse(sqlite.prepare('SELECT items FROM orders WHERE order_code = ?').get(before.body.order.code).items)
    expect(plain[0].offer).toBeUndefined()
    expect(orderSavings(plain)).toBeNull()
  })
})

describe('admin -> Menu: any weight or size', () => {
  const TRUFFLES = [
    { label: '100 g', price: 199, courierTier: 'small' },
    { label: '250 g', price: 449, courierTier: 'small' },
    { label: '500 g', price: 849, courierTier: 'large' },
    { label: '1 kg', price: 1599, courierTier: 'xl' },
    { label: '12 pieces', price: 999, courierTier: 'large' },
  ]
  const add = (s, over = {}) => act(s, 'addProduct', { category: 'chocolates', name: { en: 'Truffle Box', kn: 'ಟ್ರಫಲ್ ಬಾಕ್ಸ್' }, description: { en: 'Hand-rolled truffles.' }, sizes: TRUFFLES, ...over })

  it('a product with 5 sizes, each with its own price and courier charge; two different sizes ordered', async () => {
    const s = await login()
    const r = await add(s)
    expect(r.status).toBe(200)
    const p = r.body.products.find((x) => x.id === 'truffle-box')
    expect(p.sizes.map((x) => [x.label, x.price, x.courierTier])).toEqual(TRUFFLES.map((x) => [x.label, x.price, x.courierTier]))
    // the website's product sheet shows these sizes, in this order
    const { products } = await siteMenu()
    const site = byId(products, 'truffle-box')
    expect(site.sizes.map((x) => x.label)).toEqual(['100 g', '250 g', '500 g', '1 kg', '12 pieces'])
    const [small, , , kilo] = site.sizes
    // 100 g + 1 kg: each at its own price, one courier charge at the 1 kg's (larger) rate
    const both = await order([line('truffle-box', 199, { size: small.id }), line('truffle-box', 1599, { size: kilo.id })], 199 + 1599 + 100)
    expect(both.status).toBe(201)
    expect(both.body.order).toMatchObject({ subtotal: 1798, courier: 100 })
    expect(both.body.order.items.map((i) => i.size)).toEqual(['100 g', '1 kg'])
    expect((await order([line('truffle-box', 199, { size: small.id })], 289)).body.order.courier).toBe(90) // small parcel
    // a price the browser made up is refused
    expect((await order([line('truffle-box', 99, { size: kilo.id })], 189)).status).toBe(409)

    // in November: 50% off every size
    setNow('2026-11-20T06:00:00Z')
    const nov = byId((await siteMenu()).products, 'truffle-box')
    expect(nov.sizes.map((x) => x.price)).toEqual([100, 225, 425, 800, 500])
    expect((await order([line('truffle-box', 100, { size: small.id }), line('truffle-box', 800, { size: kilo.id })], 1000)).status).toBe(201)
  })

  it('checks every size: a name, a price above ₹0, no two the same, at most 12', async () => {
    const s = await login()
    const fields = async (sizes) => (await add(s, { sizes })).body.fields
    expect(await fields([{ label: '', price: 100, courierTier: 'small' }])).toEqual({ sizes: 'needLabels' })
    expect(await fields([{ label: '1 kg', price: 0, courierTier: 'small' }])).toEqual({ sizes: 'price' })
    expect(await fields([{ label: '250 g', price: 100, courierTier: 'small' }, { label: '250G', price: 200, courierTier: 'small' }])).toEqual({ sizes: 'duplicate' })
    expect(await fields([{ label: 'Small tin', price: 100, courierTier: 'small' }, { label: 'small  tin', price: 200, courierTier: 'large' }])).toEqual({ sizes: 'duplicate' })
    // each size needs its courier charge (the admin always sends one)
    expect(await fields([{ label: 'Small tin', price: 100 }])).toEqual({ courierTier: 'required' })
    expect(await fields(Array.from({ length: 13 }, (_, i) => ({ label: `${i + 1} pieces`, price: 100 + i, courierTier: 'small' })))).toEqual({ sizes: 'tooMany' })
    expect((await add(s, { sizes: Array.from({ length: 12 }, (_, i) => ({ label: `${i + 1} pieces`, price: 100 + i, courierTier: 'small' })) })).status).toBe(200)
  })

  it('edit: reorder, add and remove sizes (ids kept, so carts still match); change to “No sizes” and back', async () => {
    const s = await login()
    await add(s)
    const sizes = (await act(s, 'menu')).body.products.find((x) => x.id === 'truffle-box').sizes
    // reversed, the 250 g removed, a 2 kg added
    const next = [...sizes].reverse().filter((x) => x.label !== '250 g')
    next.push({ id: 'size-new', label: '2 kg', price: 2999, courierTier: 'xl' })
    const r = await act(s, 'updateProduct', { id: 'truffle-box', sizes: next })
    expect(r.status).toBe(200)
    const after = r.body.products.find((x) => x.id === 'truffle-box').sizes
    expect(after.map((x) => x.label)).toEqual(['12 pieces', '1 kg', '500 g', '100 g', '2 kg'])
    expect(after.find((x) => x.label === '1 kg').id).toBe(sizes.find((x) => x.label === '1 kg').id)
    expect((await act(s, 'updateProduct', { id: 'truffle-box', sizes: [...next, { label: '1 KG', price: 5 }] })).body.fields).toEqual({ sizes: 'duplicate' })

    // No sizes: one fixed price
    const one = await act(s, 'updateProduct', { id: 'truffle-box', sizes: null, price: 499 })
    expect(one.status).toBe(200)
    expect(one.body.products.find((x) => x.id === 'truffle-box')).toMatchObject({ sizes: [], price: 499 })
    expect(byId((await siteMenu()).products, 'truffle-box')).toMatchObject({ price: 499 })
    expect((await order([line('truffle-box', 499)], 589)).status).toBe(201)
    expect((await act(s, 'updateProduct', { id: 'truffle-box', sizes: null })).body.fields).toEqual({ price: 'price' })
    // and back to sizes
    const back = await act(s, 'updateProduct', { id: 'truffle-box', sizes: [{ label: 'Box of 6', price: 300, courierTier: 'small' }, { label: 'Box of 12', price: 550, courierTier: 'large' }] })
    expect(back.body.products.find((x) => x.id === 'truffle-box')).toMatchObject({ price: null, sizes: [{ label: 'Box of 6' }, { label: 'Box of 12' }] })
  })

  it('a config product with sizes gets Hema’s sizes too (a 1 kg Delight Box with its own courier charge)', async () => {
    const s = await login()
    const sizes = (await act(s, 'menu')).body.products.find((x) => x.id === 'mango-delight-box').sizes
    const r = await act(s, 'updateProduct', { id: 'mango-delight-box', sizes: [...sizes, { id: 'size-1kg', label: '1 kg', price: 2600, courierTier: 'xl' }] })
    expect(r.status).toBe(200)
    const { products } = await siteMenu()
    expect(byId(products, 'mango-delight-box').sizes.map((x) => [x.id, x.price, x.courierTier])).toEqual([
      ['250g', 650, 'small'],
      ['500g', 1250, 'large'],
      ['700g', 1900, 'large'],
      ['size-1kg', 2600, 'xl'],
    ])
    expect((await order([line('mango-delight-box', 2600, { size: 'size-1kg' })], 2700)).status).toBe(201)
  })
})

describe('Cookie Tins', () => {
  it('Hema adds a cookie tin with sizes, price, description and courier tier; it is on the menu and in the Rajyotsava offer', async () => {
    const s = await login()
    const r = await act(s, 'addProduct', {
      category: 'cookie-tins',
      name: { en: 'Choco Chip Cookie Tin', kn: 'ಚಾಕೊ ಚಿಪ್ ಕುಕೀ ಟಿನ್' },
      description: { en: 'Crunchy cookies in a gift tin.' },
      sizes: [
        { label: 'Small tin', price: 399, courierTier: 'small' },
        { label: 'Large tin', price: 999, courierTier: 'large' },
      ],
    })
    expect(r.status).toBe(200)
    expect(r.body.products.find((x) => x.id === 'choco-chip-cookie-tin')).toMatchObject({ custom: true, category: 'cookie-tins', name: 'Choco Chip Cookie Tin' })
    // stored as Hema's own product in a section added after 0002 (d1/migrations/0004)
    expect(sqlite.prepare("SELECT custom, added, category FROM products WHERE id = 'choco-chip-cookie-tin'").get()).toEqual({ custom: 0, added: 1, category: 'cookie-tins' })
    const m = await menu()
    expect(m.overrides).toContainEqual(expect.objectContaining({ id: 'choco-chip-cookie-tin', custom: true, category: 'cookie-tins' }))
    const tin = byId((await siteMenu()).products, 'choco-chip-cookie-tin')
    expect(tin).toMatchObject({ category: 'cookie-tins', art: 'cookie-tin' })
    const large = tin.sizes[1]
    expect((await order([line('choco-chip-cookie-tin', 999, { size: large.id })], 1099)).status).toBe(201)
    // its photo, name and sold out work like any product's
    expect((await act(s, 'updateProduct', { id: 'choco-chip-cookie-tin', soldOut: true })).status).toBe(200)
    expect((await act(s, 'updateProduct', { id: 'choco-chip-cookie-tin', soldOut: false })).status).toBe(200)
    // in November: 50% off, courier at full price
    setNow('2026-11-02T06:00:00Z')
    expect((await order([line('choco-chip-cookie-tin', 500, { size: large.id })], 600)).body.order).toMatchObject({ subtotal: 500, courier: 100 })
  })
})

describe('the live database on 27 Oct 2026: 0003 and 0004 never run (Save gave “Something went wrong”)', () => {
  function liveDatabase() {
    const live = new Database(':memory:')
    live.exec(readFileSync('d1/migrations/0001_init.sql', 'utf8'))
    live.exec(readFileSync('d1/seed.sql', 'utf8'))
    live.exec(readFileSync('d1/migrations/0002_products_text_offers_page_photos.sql', 'utf8'))
    return live
  }

  it('before the update: Save and Turn on say the database needs an update, logged in full; after it: saved, scheduled from 1 Nov, 50% off on 1 Nov, off again', async () => {
    const live = liveDatabase()
    env = { ...env, DB: createD1SqliteAdapter(live) }
    await createD1Store(env.DB).auth.createAdmin(HEMA.email, HEMA.password)
    const s = await login()
    expect((await act(s, 'updateProduct', { id: 'almond-bar', price: 199 })).status).toBe(200)
    const placed = await order([line('almond-bar', 199)], 289)
    expect(placed.status).toBe(201)
    // what Hema saw: the card with "Turn on this offer" (no row), and Save failing
    expect((await act(s, 'offers')).body.rajyotsava).toMatchObject({ exists: false, active: false, status: 'off' })
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failed = await rajOn(s)
    expect(failed.status).toBe(503)
    expect(failed.body).toMatchObject({ error: 'dbUpdate', ref: expect.stringMatching(/^[A-Z0-9]{4,6}$/) })
    const line0 = logged.mock.calls.map((c) => c.join(' ')).find((t) => t.includes(failed.body.ref))
    expect(line0).toMatch(/database needs a migration .* POST \/api\/admin action=saveRajyotsava/)
    expect(line0).toMatch(/no column named items/)
    logged.mockRestore()
    expect(live.prepare('SELECT count(*) AS c FROM offers').get().c).toBe(0) // nothing half-saved
    expect((await menu()).ready).toBe(true) // the website kept working

    // the fix: `npm run d1:migrate -- --remote` runs 0003 then 0004; nothing else changes
    const dump = (sql) => JSON.stringify(live.prepare(sql).all())
    const before = { orders: dump('SELECT * FROM orders ORDER BY id'), settings: dump('SELECT * FROM settings'), products: dump('SELECT * FROM products ORDER BY id') }
    live.exec(readFileSync('d1/migrations/0003_offer_items_site_config.sql', 'utf8'))
    live.exec(readFileSync('d1/migrations/0004_rajyotsava_cookie_tins.sql', 'utf8'))
    expect(dump('SELECT * FROM orders ORDER BY id')).toBe(before.orders)
    expect(dump('SELECT * FROM settings')).toBe(before.settings)
    expect(JSON.parse(dump('SELECT * FROM products ORDER BY id'))).toEqual(JSON.parse(before.products).map((p) => ({ ...p, added: 0 })))
    expect((await createD1Store(env.DB).health()).update).toBe(true)

    // Save (the drawing ticked), then Turn off, then Turn on: "On / Scheduled from 1 Nov"
    const saved = await rajOn(s, { drawing: true })
    expect(saved.status).toBe(200)
    expect(saved.body.rajyotsava).toMatchObject({ exists: true, active: true, startsOn: '2026-11-01', endsOn: '2026-11-30', percent: 50, drawing: true, status: 'scheduled' })
    expect((await rajOn(s, { active: false })).body.rajyotsava).toMatchObject({ active: false, status: 'off' })
    expect((await rajOn(s, { active: true })).body.rajyotsava).toMatchObject({ active: true, status: 'scheduled', startsOn: '2026-11-01' })
    // the dates are stored as the Indian dates typed in (the date box shows 11/01/2026 on a US phone)
    expect(live.prepare('SELECT starts_on, ends_on, active FROM offers WHERE id = ?').get(RAJYOTSAVA.id)).toEqual({ starts_on: '2026-11-01', ends_on: '2026-11-30', active: 1 })

    // 31 Oct 23:59 IST: normal price; 1 Nov 00:00 IST: half price
    setNow(OCT_31_2359)
    expect(byId((await siteMenu()).products, 'pista-bar').price).toBe(450)
    setNow(NOV_1_0000)
    const nov = await siteMenu()
    expect(rajyotsavaLive(nov.live)).toBeTruthy()
    expect(byId(nov.products, 'pista-bar').price).toBe(225)
    expect((await order([line('pista-bar', 225)], 315)).status).toBe(201)
  })

  it('the admin says what failed instead of “Something went wrong”', async () => {
    const { problem } = await import('../src/admin/api.js')
    expect(problem({ ok: false, status: 503, error: 'dbUpdate', ref: 'AB12CD' }, { saving: true })).toMatch(/^Couldn’t save: the website’s database hasn’t been updated .*ref AB12CD/)
    expect(problem({ ok: false, status: 500, error: 'server', ref: 'ZZ9' }, { saving: true })).toMatch(/^Couldn’t save: the server hit an unexpected error \(ref ZZ9\)/)
    expect(problem({ ok: false, status: 418, error: 'teapot' })).toMatch(/“teapot” \(418\)/)
    expect(problem({ ok: false, error: 'fields' }, { saving: true })).toBe('Please check the boxes marked in red.')
    for (const e of ['dbUpdate', 'server', 'unknown']) expect(problem({ ok: false, error: e })).not.toMatch(/Something went wrong/)
  })
})

describe('d1/migrations/0004 on a database already in use', () => {
  function oldDatabase() {
    const old = new Database(':memory:')
    old.exec(readFileSync('d1/migrations/0001_init.sql', 'utf8'))
    old.exec(readFileSync('d1/seed.sql', 'utf8'))
    old.exec(readFileSync('d1/migrations/0002_products_text_offers_page_photos.sql', 'utf8'))
    old.exec(readFileSync('d1/migrations/0003_offer_items_site_config.sql', 'utf8'))
    return old
  }

  it('the website and ordering work before it has run; after it, every order, product and price is as it was', async () => {
    const old = oldDatabase()
    env = { ...env, DB: createD1SqliteAdapter(old) }
    await createD1Store(env.DB).auth.createAdmin(HEMA.email, HEMA.password)
    const s = await login()
    // Hema's data before the migration: a changed price, her own product, an offer, an order
    expect((await act(s, 'updateProduct', { id: 'almond-bar', price: 199 })).status).toBe(200)
    expect((await act(s, 'addProduct', { category: 'brownies', name: { en: 'Choco Chip Brownies' }, courierTier: 'small', price: 450 })).status).toBe(200)
    expect((await menu()).ready).toBe(true)
    const placed = await order([line('almond-bar', 199)], 289)
    expect(placed.status).toBe(201)
    expect((await act(s, 'offers')).body.rajyotsava).toMatchObject({ exists: false })
    expect((await call('/api/setup-check', null, { method: 'GET' })).body).toBeTruthy()
    const dump = (sql) => JSON.stringify(old.prepare(sql).all())
    const before = { orders: dump('SELECT * FROM orders ORDER BY id'), events: dump('SELECT * FROM order_events ORDER BY id'), products: dump('SELECT * FROM products ORDER BY id'), settings: dump('SELECT * FROM settings'), offers: dump('SELECT * FROM offers ORDER BY id') }
    expect(JSON.parse(before.products).length).toBeGreaterThan(10)

    old.exec(readFileSync('d1/migrations/0004_rajyotsava_cookie_tins.sql', 'utf8'))
    expect(dump('SELECT * FROM orders ORDER BY id')).toBe(before.orders)
    expect(dump('SELECT * FROM order_events ORDER BY id')).toBe(before.events)
    expect(dump('SELECT * FROM settings')).toBe(before.settings)
    // every product row the same, with the new column 0
    expect(JSON.parse(dump('SELECT * FROM products ORDER BY id'))).toEqual(JSON.parse(before.products).map((p) => ({ ...p, added: 0 })))
    expect(old.prepare("SELECT price FROM products WHERE id = 'almond-bar'").get().price).toBe(199)
    // the offers: the old ones as they were, plus the Rajyotsava offer
    const offers = JSON.parse(dump('SELECT * FROM offers ORDER BY id'))
    expect(offers.filter((o) => o.id !== RAJYOTSAVA.id)).toEqual(JSON.parse(before.offers))
    expect(offers.filter((o) => o.id === RAJYOTSAVA.id)).toHaveLength(1)
    // its row again changes nothing (INSERT OR IGNORE)
    const insert = readFileSync('d1/migrations/0004_rajyotsava_cookie_tins.sql', 'utf8').slice(readFileSync('d1/migrations/0004_rajyotsava_cookie_tins.sql', 'utf8').lastIndexOf('INSERT OR IGNORE'))
    old.exec(insert)
    expect(old.prepare('SELECT count(*) AS c FROM offers').get().c).toBe(offers.length)
    // and the setup check is happy
    expect((await createD1Store(env.DB).health()).update).toBe(true)
    // a cookie tin can be added now
    expect((await act(s, 'addProduct', { category: 'cookie-tins', name: { en: 'Gift Tin' }, sizes: [{ label: 'Small tin', price: 399, courierTier: 'small' }] })).status).toBe(200)
  })
})
