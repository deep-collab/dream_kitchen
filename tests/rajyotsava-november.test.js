// Kannada Rajyotsava, DISPLAY ONLY since 28 Oct 2026 (src/config/rajyotsava.js): Hema lowered her
// menu prices by hand, so in November the website takes nothing off. Customers pay exactly the menu
// prices; the "50% OFF" badges, popup, Offer Zone and flag only show, 1 to 30 November (IST). The
// database's Rajyotsava offer row (d1/migrations/0004) stays but is ignored. Also: any number of
// sizes per product; the Cookie Tins section. Every request goes through the Worker
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
import { allLiveOffers, applyOfferPrices, istToday, orderSavings, RAJYOTSAVA, rajyotsavaDisplay, rajyotsavaLive } from '../src/lib/offers.js'
import { rajyotsava as RAJ_CONFIG } from '../src/config/rajyotsava.js'
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

/** The menu exactly as the website builds it from /api/menu (MenuProvider): Rajyotsava from the config, first */
async function siteMenu() {
  const m = await menu()
  const today = istToday(new Date(nowMs))
  const raj = rajyotsavaDisplay(today)
  const live = [...(raj ? [raj] : []), ...allLiveOffers(m.offers, today)]
  return { m, live, raj, products: applyOfferPrices(applyOverrides(CONFIG, m.overrides), live) }
}
/** An order line as it is stored: the menu price, nothing taken off, no offer words */
const noDiscount = (item) => {
  expect(item.regularUnitPrice).toBeUndefined()
  expect(item.regularLineTotal).toBeUndefined()
  expect(item.offer).toBeUndefined()
  expect(item.lineTotal).toBe(item.unitPrice * item.qty)
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

describe('the config file (src/config/rajyotsava.js)', () => {
  it('display only, 1–30 November, 50%, the flag at 7%, switched on', () => {
    expect(RAJ_CONFIG).toEqual({ enabled: true, startsOn: '2026-11-01', endsOn: '2026-11-30', percent: 50, flagOpacity: 7 })
  })

  it('shows from 1 Nov 00:00 to 30 Nov 23:59 IST and never outside; enabled: false shows nothing', () => {
    const on = (iso) => rajyotsavaDisplay(istToday(new Date(iso)))
    expect(on(OCT_31_2359)).toBeNull()
    expect(on(NOV_1_0000)).toMatchObject({ id: RAJYOTSAVA.id, percent: 50, deal: null, items: { all: true }, display: true })
    expect(on('2026-11-15T06:00:00Z')).toBeTruthy()
    expect(on(NOV_30_2359)).toBeTruthy()
    expect(on(DEC_1_0000)).toBeNull()
    expect(rajyotsavaDisplay('2026-11-15', { ...RAJ_CONFIG, enabled: false })).toBeNull()
    expect(rajyotsavaDisplay('2027-11-15')).toBeNull() // not next year by itself
  })

  it('the flag: 7% behind the page, gently waving (still with reduce motion, in the theme), only on its dates', () => {
    const bg = {}
    expect(festivalBackground(bg, '2026-10-31', rajyotsavaDisplay('2026-10-31')).id).toBe('default')
    expect(festivalBackground(bg, '2026-11-01', rajyotsavaDisplay('2026-11-01'))).toEqual({ id: 'rajyotsava', opacity: 0.07, animate: true, image: null })
    const last = festivalBackground(bg, '2026-11-30', rajyotsavaDisplay('2026-11-30')).opacity
    expect(last).toBeGreaterThanOrEqual(0.06)
    expect(last).toBeLessThanOrEqual(0.08)
    expect(festivalBackground(bg, '2026-12-01', rajyotsavaDisplay('2026-12-01')).id).toBe('default')
  })
})

describe('prices on the days that matter: never anything off (server and website agree)', () => {
  it('31 Oct 23:59 · 1 Nov 00:00 · 30 Nov 23:59 · 1 Dec 00:00: the menu price, every time; the badge only in November', async () => {
    for (const [at, shows] of [
      ['2026-10-27T06:00:00Z', false],
      [OCT_31_2359, false],
      [NOV_1_0000, true],
      [NOV_30_2359, true],
      [DEC_1_0000, false],
    ]) {
      setNow(at)
      const { m, live, products } = await siteMenu()
      // the database's Rajyotsava row (50% off) never reaches a price, even on the website's side
      expect(allLiveOffers(m.offers, istToday(new Date(nowMs))).some((o) => o.id === RAJYOTSAVA.id)).toBe(false)
      expect(Boolean(rajyotsavaLive(live)), at).toBe(shows)
      const bar = byId(products, 'pista-bar')
      expect(bar.price, at).toBe(450)
      if (shows) expect(bar.offer).toMatchObject({ id: RAJYOTSAVA.id, deal: null, was: null })
      else expect(bar.offer).toBeUndefined()
      // the server charges the menu price: ₹450 + ₹90 courier
      const ok = await order([line('pista-bar', 450)], 540)
      expect(ok.status, at).toBe(201)
      expect(ok.body.order).toMatchObject({ subtotal: 450, courier: 90, total: 540 })
      noDiscount(ok.body.order.items[0])
      // yesterday's half price is refused: the price to show is the menu price
      const half = await order([line('pista-bar', 225)], 315)
      expect(half.status, at).toBe(409)
      expect(half.body.lines).toEqual([{ index: 0, unitPrice: 450 }])
    }
  })

  it('every product, every section and size, ragi versions too: exactly the menu price, with the badge on each', async () => {
    setNow('2026-11-14T06:00:00Z')
    const { products } = await siteMenu()
    const regular = applyOverrides(CONFIG, [])
    for (const r of regular.filter(isForSale)) {
      const p = byId(products, r.id)
      if (r.sizes?.length) expect(p.sizes.map((x) => x.price)).toEqual(r.sizes.map((x) => x.price))
      else expect(p.price).toBe(r.price)
      if (Number.isFinite(r.ragiPrice)) expect(p.ragiPrice).toBe(r.ragiPrice)
      expect(p.drawingPrice).toBeUndefined()
      expect(p.offer).toMatchObject({ id: RAJYOTSAVA.id, was: null })
    }
    expect(byId(products, 'nutty-brownies').price).toBe(549)
    expect(unitPrice(byId(products, 'assorted-brownies'), { ragi: true })).toBe(780)

    // The server charges exactly the menu prices for one of everything (first size each): the cart total
    const first = (p) => (p.sizes?.length ? { size: p.sizes[0].id } : {})
    const lines = products.filter((p) => isForSale(p) && p.menu !== false).map((p) => line(p.id, unitPrice(p, first(p)), first(p)))
    expect(lines.length).toBeGreaterThan(12)
    const sum = lines.reduce((t, l) => t + l.unitPrice, 0)
    const menuSum = regular.filter((p) => isForSale(p) && p.menu !== false).reduce((t, p) => t + unitPrice(p, first(p)), 0)
    expect(sum).toBe(menuSum)
    const r = await order(lines, sum + 90)
    expect(r.status).toBe(201)
    expect(r.body.order).toMatchObject({ subtotal: menuSum, total: menuSum + 90 })
    r.body.order.items.forEach(noDiscount)
    expect(orderSavings(r.body.order.items)).toBeNull()
    // and the ragi version: ₹650 + ₹50
    expect((await order([line('walnut-brownies', 700, { ragi: true })], 790)).status).toBe(201)
  })

  it('courier, class fees, the drawing add-on and the name on the box: as always; the old admin switches change nothing', async () => {
    setNow('2026-11-10T06:00:00Z')
    expect((await order([line('red-velvet-delight-box', 1250, { size: '500g' })], 1350)).body.order).toMatchObject({ subtotal: 1250, courier: 100, total: 1350 })
    expect((await order([line('red-velvet-delight-box', 650, { size: '250g', name: 'Hema' })], 740)).status).toBe(201)
    const drawingRules = dispatchRules({ drawing: true })
    const drawing = { size: '250g', drawing: true, drawingText: 'A small cat' }
    expect((await order([line('red-velvet-delight-box', 1100, drawing)], 1190, drawingRules)).status).toBe(201)
    // the old card's "Save" with "also the drawing" and 40%: still the menu prices
    const s = await login()
    expect((await rajOn(s, { drawing: true, percent: 40 })).status).toBe(200)
    expect((await order([line('red-velvet-delight-box', 1100, drawing)], 1190, drawingRules)).status).toBe(201)
    expect((await order([line('red-velvet-delight-box', 550, drawing)], 640, drawingRules)).status).toBe(409)
    expect((await order([line('pista-bar', 270)], 360)).status).toBe(409)
    const { products } = await siteMenu()
    expect(byId(products, 'pista-bar')).toMatchObject({ price: 450, offer: { id: RAJYOTSAVA.id, was: null } })

    // class fees: the full fee
    const weekend = bookableSaturdays(new Date())[0]
    const booking = { classId: 'basic', weekend, slot: 'morning', name: 'Meera K', phone: '9000012345', email: '', lang: 'en', website: '' }
    const full = await call('/api/create-booking', { ...booking, idempotencyKey: `raj-class-${++n}-abcdefghijkl`, expectedFee: 2500 })
    expect(full.status).toBe(201)
    expect(full.body.booking.fee).toBe(2500)
  })
})

describe('admin -> Offers: the old Rajyotsava card controls nothing now', () => {
  it('Turn off / Turn on in the database: the website still shows the display on its dates, and charges the menu prices', async () => {
    setNow('2026-11-05T06:00:00Z')
    const s = await login()
    for (const active of [false, true]) {
      expect((await rajOn(s, { active })).status).toBe(200)
      const { m, live, raj, products } = await siteMenu()
      expect(rajyotsavaLive(live)).toBe(raj)
      expect(raj).toMatchObject({ percent: 50 })
      expect(festivalBackground(m.config.background, istToday(new Date(nowMs)), raj)).toMatchObject({ id: 'rajyotsava', opacity: 0.07 })
      expect(byId(products, 'pista-bar').price).toBe(450)
      expect((await order([line('pista-bar', 450)], 540)).status).toBe(201)
    }
  })

  it('is switched off, never deleted; if its row is ever missing, saving puts it back (the tables stay)', async () => {
    const s = await login()
    expect((await act(s, 'deleteOffer', { id: RAJYOTSAVA.id })).body.fields).toEqual({ offer: 'fixed' })
    sqlite.prepare('DELETE FROM offers WHERE id = ?').run(RAJYOTSAVA.id)
    expect((await act(s, 'offers')).body.rajyotsava).toMatchObject({ exists: false, active: false, status: 'off' })
    expect((await rajOn(s)).body.rajyotsava).toMatchObject({ exists: true, active: true, percent: 50 })
    expect(sqlite.prepare('SELECT count(*) AS c FROM offers WHERE id = ?').get(RAJYOTSAVA.id).c).toBe(1)
  })
})

describe('one order through to the admin, the packing slip, Track Order and the emails', () => {
  it('in November: the menu prices everywhere, no regular price, no “Rajyotsava 50% off”, no saving', async () => {
    setNow('2026-11-03T06:00:00Z')
    const r = await order([line('red-velvet-delight-box', 1250, { size: '500g', name: 'Asha' }, 2), line('almond-bar', 150), line('walnut-brownies', 700, { ragi: true })], 2500 + 150 + 700 + 100)
    expect(r.status).toBe(201)
    const code = r.body.order.code
    // what the order remembers (D1 row)
    const row = sqlite.prepare('SELECT items, subtotal, courier, total FROM orders WHERE order_code = ?').get(code)
    const items = JSON.parse(row.items)
    expect(items[0]).toMatchObject({ productId: 'red-velvet-delight-box', qty: 2, unitPrice: 1250, lineTotal: 2500 })
    expect(items[2]).toMatchObject({ productId: 'walnut-brownies', ragi: true, unitPrice: 700 })
    items.forEach(noDiscount)
    expect(row).toMatchObject({ subtotal: 3350, courier: 100, total: 3450 })
    expect(orderSavings(items)).toBeNull()

    // the admin's order page (the packing slip reads the same answer)
    const s = await login()
    const detail = (await act(s, 'order', { code })).body.order
    detail.items.forEach(noDiscount)
    expect(detail.savings).toBeNull()
    expect(detail).toMatchObject({ subtotal: 3350, courier: 100, total: 3450 })

    // Track Order (any device, order ID + phone)
    const track = await call('/api/order', { code, phone: '9845012345' })
    expect(track.status).toBe(200)
    track.body.order.items.forEach(noDiscount)
    expect(track.body.order).toMatchObject({ subtotal: 3350, total: 3450 })

    // the emails (Hema's and the customer's, both languages)
    const dbRow = sqlite.prepare('SELECT * FROM orders WHERE order_code = ?').get(code)
    const full = { ...dbRow, items, payment_status: 'confirmed' }
    const hema = hemaNewOrder(full, 'hema@example.com').text
    for (const text of [hema, customerPlaced(full).text, customerPlaced({ ...full, lang: 'kn' }).text]) {
      expect(text).not.toMatch(/Rajyotsava|ರಾಜ್ಯೋತ್ಸವ|Regular price|ಸಾಮಾನ್ಯ ಬೆಲೆ|−₹/)
      expect(text).toContain('₹3,450')
    }
    expect(hema).toContain('Courier: ₹100')
    expect(hema).toContain('Total: ₹3,450')
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

    // in November: every size at its own price (the badge shows, nothing comes off)
    setNow('2026-11-20T06:00:00Z')
    const nov = byId((await siteMenu()).products, 'truffle-box')
    expect(nov.sizes.map((x) => x.price)).toEqual([199, 449, 849, 1599, 999])
    expect(nov.offer).toMatchObject({ id: RAJYOTSAVA.id, was: null })
    expect((await order([line('truffle-box', 199, { size: small.id }), line('truffle-box', 1599, { size: kilo.id })], 1898)).status).toBe(201)
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
  it('Hema adds a cookie tin with sizes, price, description and courier tier; it is on the menu, with the Rajyotsava badge in November', async () => {
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
    // in November: the badge, and its own price
    setNow('2026-11-02T06:00:00Z')
    expect(byId((await siteMenu()).products, 'choco-chip-cookie-tin').offer).toMatchObject({ id: RAJYOTSAVA.id, was: null })
    expect((await order([line('choco-chip-cookie-tin', 999, { size: large.id })], 1099)).body.order).toMatchObject({ subtotal: 999, courier: 100 })
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

  it('before the update: Save and Turn on say the database needs an update, logged in full; after it: saved, scheduled from 1 Nov; either way 1 Nov charges the menu price', async () => {
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

    // 31 Oct 23:59 IST and 1 Nov 00:00 IST: the menu price (the display shows from 1 Nov)
    setNow(OCT_31_2359)
    expect(byId((await siteMenu()).products, 'pista-bar').price).toBe(450)
    setNow(NOV_1_0000)
    const nov = await siteMenu()
    expect(rajyotsavaLive(nov.live)).toBeTruthy()
    expect(byId(nov.products, 'pista-bar').price).toBe(450)
    expect((await order([line('pista-bar', 450)], 540)).status).toBe(201)
    expect((await order([line('pista-bar', 225)], 315)).status).toBe(409)
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
