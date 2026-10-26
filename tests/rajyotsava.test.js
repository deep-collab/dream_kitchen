// The Rajyotsava request (26 Oct 2026), called exactly as the website and the admin call the
// functions, against the practice store: offers holding products with a badge and a special price
// (shown by /api/menu, charged by create-order only on the offer's dates), the banner photo in its
// two shapes, the hidden developer options (only the developer, or Hema once switched on, checked
// on the server) and the site background with its dates.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { allLiveOffers, applyOfferPrices, cleanDeal, cleanItems, cleanOffer, istToday, regularFrom, regularVersion } from '../src/lib/offers.js'
import { activeBackground, backgroundErrors, cleanBackground } from '../src/lib/siteConfig.js'
import { applyOverrides, quote, unitPrice } from '../src/lib/pricing.js'
import { products as CONFIG } from '../src/config/shop.js'
import { createMemoryStore } from '../netlify/lib/store/memory.mjs'
import { setStore } from '../netlify/lib/store/index.mjs'
import createOrder from '../netlify/functions/create-order.mjs'
import admin from '../netlify/functions/admin.mjs'
import menuFn from '../netlify/functions/menu.mjs'

const HEMA = { email: 'hema@example.com', password: 'test-only-password', id: '00000000-0000-4000-8000-0000000000a1' }
const DEV = { email: 'dev@example.com', password: 'test-only-password-2', id: '00000000-0000-4000-8000-0000000000a2', role: 'developer' }
const OFF = { email: 'old@example.com', password: 'test-only-password-3', id: '00000000-0000-4000-8000-0000000000a3', role: 'disabled' }
let store
let ip = 10
let nowMs

function call(fn, body, { method = 'POST', headers = {}, path = '/api/x' } = {}) {
  const init = { method, headers: { 'content-type': 'application/json', ...headers } }
  if (method !== 'GET') init.body = JSON.stringify(body)
  return fn(new Request(`http://localhost${path}`, init), { ip: `10.3.0.${ip}` }).then(async (res) => ({ status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : null }))
}
const login = async (who = HEMA) => (await call(admin, { action: 'login', email: who.email, password: who.password })).body
const act = (s, action, body = {}) => call(admin, { action, ...body }, { headers: { authorization: `Bearer ${s.accessToken}` } })
const menu = async () => (await call(menuFn, null, { method: 'GET' })).body
const webpOf = (n) => `data:image/webp;base64,${Buffer.from([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8 '), n, n]).toString('base64')}`
const setNow = (iso) => {
  nowMs = Date.parse(iso)
  vi.setSystemTime(nowMs)
}

let k = 0
const customer = { name: 'Asha Rao', phone: '98450 12345', email: '', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' }
const order = (items, expectedTotal) =>
  call(createOrder, { idempotencyKey: `raj-test-${Date.now()}-${k++}-abcdefgh`, items, customer, dispatchDate: dateChoices(new Date(), 1, dispatchRules())[0], expectedTotal, lang: 'en', website: '' })

const rajyotsava = (over = {}) => ({
  title: { en: 'Kannada Rajyotsava: 10% off', kn: 'ಕನ್ನಡ ರಾಜ್ಯೋತ್ಸವ' },
  message: { en: 'Delight Boxes and Pista Bars.' },
  badge: { en: 'Rajyotsava offer', kn: 'ರಾಜ್ಯೋತ್ಸವ ಆಫರ್' },
  link: '',
  items: { categories: ['delight-boxes'], products: ['pista-bar'] },
  deal: { kind: 'percent', value: 10 },
  startsOn: '2026-11-01',
  endsOn: '2026-11-03',
  ...over,
})

beforeEach(async () => {
  process.env.DK_MOCK_BACKEND = '1'
  vi.useFakeTimers({ toFake: ['Date'] })
  setNow('2026-10-26T06:00:00Z') // 11:30 am in India, 26 Oct
  store = createMemoryStore({ admins: [HEMA, DEV, OFF], now: () => new Date(nowMs) })
  await store.updateSettings({ upi_id: 'hema@okaxis' })
  setStore(store)
  ip++
})
afterEach(() => {
  setStore(null)
  vi.useRealTimers()
})

describe('offer prices (src/lib/offers.js): the same on the website and the server', () => {
  const products = applyOverrides(CONFIG, [])
  const byId = (list, id) => list.find((p) => p.id === id)
  const offer = (over) => cleanOffer({ id: 'o1', title: { en: 'T' }, startsOn: '2026-11-01', endsOn: '2026-11-03', items: { categories: ['delight-boxes'], products: ['pista-bar'] }, ...over })

  it('% off lowers every size and fixed price of the products in the offer; others are untouched', () => {
    const list = applyOfferPrices(products, [offer({ deal: { kind: 'percent', value: 10 }, badge: { en: 'Rajyotsava offer' } })])
    const box = byId(list, 'red-velvet-delight-box')
    expect(box.sizes.map((s) => s.price)).toEqual([585, 1125, 1710])
    expect(box.offer).toMatchObject({ id: 'o1', badge: { en: 'Rajyotsava offer', kn: 'Rajyotsava offer' }, was: { sizes: { '250g': 650, '500g': 1250, '700g': 1900 } } })
    expect(byId(list, 'pista-bar').price).toBe(405)
    expect(regularFrom(byId(list, 'pista-bar'))).toBe(450)
    expect(byId(list, 'almond-bar')).toBe(byId(products, 'almond-bar'))
    // the size the customer picks: offer price, with its regular price for the crossed-out line
    expect(unitPrice(box, { size: '500g' })).toBe(1125)
    expect(unitPrice(regularVersion(box), { size: '500g' })).toBe(1250)
  })

  it('₹ off, exact prices per product and size, a badge alone, and never a higher or zero price', () => {
    expect(byId(applyOfferPrices(products, [offer({ deal: { kind: 'amount', value: 100 } })]), 'pista-bar').price).toBe(350)
    const exact = applyOfferPrices(products, [offer({ deal: { kind: 'prices', prices: { 'pista-bar': 399, 'mango-delight-box': { '250g': 599, '700g': 9999 } } } })])
    expect(byId(exact, 'pista-bar').price).toBe(399)
    expect(byId(exact, 'mango-delight-box').sizes.map((s) => s.price)).toEqual([599, 1250, 1900]) // 9999 is not a discount
    expect(byId(exact, 'chocolate-delight-box').offer).toEqual({ id: 'o1', badge: null, was: null }) // in the offer, no exact price: badge only
    const badgeOnly = byId(applyOfferPrices(products, [offer({ deal: null })]), 'pista-bar')
    expect(badgeOnly).toMatchObject({ price: 450, offer: { was: null } })
    expect(byId(applyOfferPrices(products, [offer({ deal: { kind: 'amount', value: 5000 } })]), 'pista-bar').price).toBe(1)
  })

  it('two offers on one product: the lower price wins', () => {
    const a = offer({ id: 'a', deal: { kind: 'percent', value: 10 } })
    const b = offer({ id: 'b', deal: { kind: 'amount', value: 100 } })
    expect(byId(applyOfferPrices(products, [a, b]), 'pista-bar')).toMatchObject({ price: 350, offer: { id: 'b' } })
  })

  it('bad data is dropped, never shown', () => {
    expect(cleanItems({ categories: ['delight-boxes', '<script>'], products: 'x' })).toEqual({ categories: ['delight-boxes'], products: [] })
    expect(cleanItems({ categories: [], products: [] })).toBeNull()
    expect(cleanDeal({ kind: 'percent', value: 95 })).toBeNull()
    expect(cleanDeal({ kind: 'percent', value: 2.5 })).toBeNull()
    expect(cleanDeal({ kind: 'prices', prices: { 'pista-bar': -1, BAD: 5 } })).toBeNull()
    // a deal without products does nothing
    expect(offer({ items: null, deal: { kind: 'percent', value: 10 } }).deal).toBeNull()
    // an offer with products always has a button, to the menu showing only them
    expect(offer({}).href).toBe('/menu?offer=o1')
    expect(allLiveOffers([{ id: 'o', title: { en: 'T' }, startsOn: '2026-11-01', endsOn: '2026-11-03' }], '2026-11-04')).toEqual([])
  })
})

describe('admin -> Offers with products and a special price', () => {
  it('saves products, badge and price; refuses unknown products and prices for products not in the offer', async () => {
    const s = await login()
    const bad = await act(s, 'saveOffer', rajyotsava({ items: { categories: ['delight-boxes'], products: ['no-such-cake'] } }))
    expect(bad.body.fields).toEqual({ items: 'invalid' })
    expect((await act(s, 'saveOffer', rajyotsava({ items: null }))).body.fields).toEqual({ deal: 'noItems' })
    expect((await act(s, 'saveOffer', rajyotsava({ deal: { kind: 'prices', prices: { 'almond-bar': 99 } } }))).body.fields).toEqual({ deal: 'notInOffer' })
    expect((await act(s, 'saveOffer', rajyotsava({ deal: { kind: 'percent', value: 120 } }))).body.fields).toEqual({ deal: 'invalid' })

    const r = await act(s, 'saveOffer', rajyotsava())
    expect(r.status).toBe(200)
    const o = r.body.offers.find((x) => x.id === r.body.id)
    expect(o).toMatchObject({ status: 'scheduled', badgeEn: 'Rajyotsava offer', badgeKn: 'ರಾಜ್ಯೋತ್ಸವ ಆಫರ್', items: { categories: ['delight-boxes'], products: ['pista-bar'] }, deal: { kind: 'percent', value: 10 } })
    expect(r.body.choices.categories.map((c) => c.id)).toContain('delight-boxes')
    expect(r.body.choices.products.find((p) => p.id === 'red-velvet-delight-box').sizes).toHaveLength(3)

    // The price can be taken away again (badge only)
    const plain = await act(s, 'saveOffer', rajyotsava({ id: r.body.id, deal: null }))
    expect(plain.body.offers.find((x) => x.id === r.body.id).deal).toBeNull()
  })

  it('the banner photo in its two shapes (wide 3:1 and phone 16:9), and taking both away', async () => {
    const s = await login()
    const { id } = (await act(s, 'saveOffer', rajyotsava())).body
    await act(s, 'offerPhoto', { id, variant: 'wide', image: webpOf(1), imageSmall: webpOf(2) })
    const r = await act(s, 'offerPhoto', { id, variant: 'phone', image: webpOf(3), imageSmall: webpOf(4) })
    const o = r.body.offers[0]
    expect(o.photo).toMatch(new RegExp(`^/api/photo/offer-${id}/\\d+-1200\\.webp$`))
    expect(o.photoPhone).toMatch(new RegExp(`^/api/photo/offer-${id}-phone/\\d+-1200\\.webp$`))
    expect((await act(s, 'offerPhoto', { id, image: null })).body.offers[0]).toMatchObject({ photo: null, photoPhone: null })
  })
})

describe('the website and the orders on the offer’s dates (Indian time)', () => {
  it('before: regular price; 1–3 Nov: offer price, badge and products in /api/menu; from 4 Nov: regular again', async () => {
    const s = await login()
    await act(s, 'saveOffer', rajyotsava())
    // 26 Oct: scheduled, not sent, regular price charged
    expect((await menu()).offers).toEqual([])
    expect((await order([{ productId: 'pista-bar', selection: {}, qty: 1, unitPrice: 450 }], 540)).status).toBe(201)

    // 1 Nov, just after midnight in India (18:35 UTC on 31 Oct)
    setNow('2026-10-31T18:35:00Z')
    const m = await menu()
    expect(m.offers).toHaveLength(1)
    expect(m.offers[0]).toMatchObject({ items: { categories: ['delight-boxes'], products: ['pista-bar'] }, deal: { kind: 'percent', value: 10 }, badge: { en: 'Rajyotsava offer' } })
    // the website applies the same rules to the same data
    const site = applyOfferPrices(applyOverrides(CONFIG, m.overrides), allLiveOffers(m.offers, istToday(new Date(nowMs))))
    expect(site.find((p) => p.id === 'pista-bar').price).toBe(405)
    // the server charges the offer price, and refuses the regular one as "price changed"
    const cheap = await order([{ productId: 'pista-bar', selection: {}, qty: 2, unitPrice: 405 }], 900)
    expect(cheap.status).toBe(201)
    expect(cheap.body.order.total).toBe(900)
    const stale = await order([{ productId: 'pista-bar', selection: {}, qty: 1, unitPrice: 450 }], 540)
    expect(stale.status).toBe(409)
    expect(stale.body.lines).toEqual([{ index: 0, unitPrice: 405 }])
    // a Delight Box size, with the free name: 10% off the box only
    const box = await order([{ productId: 'red-velvet-delight-box', selection: { size: '500g' }, qty: 1, unitPrice: 1125 }], 1225)
    expect(box.status).toBe(201)
    // a product outside the offer keeps its price
    expect((await order([{ productId: 'almond-bar', selection: {}, qty: 1, unitPrice: 150 }], 240)).status).toBe(201)

    // 4 Nov in India: over by itself, regular prices for everyone
    setNow('2026-11-03T18:31:00Z')
    expect((await menu()).offers).toEqual([])
    expect((await order([{ productId: 'pista-bar', selection: {}, qty: 1, unitPrice: 405 }], 495)).status).toBe(409)
    expect((await order([{ productId: 'pista-bar', selection: {}, qty: 1, unitPrice: 450 }], 540)).status).toBe(201)
  })

  it('a switched-off offer charges the regular price even on its dates', async () => {
    const s = await login()
    const { id } = (await act(s, 'saveOffer', rajyotsava())).body
    await act(s, 'setOfferActive', { id, active: false })
    setNow('2026-11-02T06:00:00Z')
    expect((await order([{ productId: 'pista-bar', selection: {}, qty: 1, unitPrice: 405 }], 495)).status).toBe(409)
  })
})

describe('the hidden developer options are checked on the server', () => {
  it('Hema (owner) can’t use them until the developer switches “Show to Hema” on; helpers never', async () => {
    const hema = await login()
    expect((await act(hema, 'me')).body).toMatchObject({ role: 'owner', dev: false })
    for (const action of ['devConfig', 'saveBackground', 'backgroundImage', 'setDevAccess']) expect((await act(hema, action, { background: {}, owner: true })).status).toBe(403)

    const dev = await login(DEV)
    expect((await act(dev, 'me')).body).toMatchObject({ role: 'developer', dev: true })
    const cfg = await act(dev, 'devConfig')
    expect(cfg.body).toMatchObject({ isDeveloper: true, devAccess: { owner: false } })
    expect(cfg.body.themes.map((t) => t.id)).toEqual(['default', 'rajyotsava', 'diwali', 'christmas', 'newyear', 'valentine', 'custom'])

    await act(dev, 'setDevAccess', { owner: true })
    expect((await act(hema, 'me')).body.dev).toBe(true)
    expect((await act(hema, 'devConfig')).status).toBe(200)
    // …but only the developer decides who sees them
    expect((await act(hema, 'setDevAccess', { owner: true })).status).toBe(403)
    await act(dev, 'setDevAccess', { owner: false })
    expect((await act(hema, 'devConfig')).status).toBe(403)
  })

  it('a switched-off account can’t log in at all', async () => {
    const r = await call(admin, { action: 'login', email: OFF.email, password: OFF.password })
    expect(r.status).toBe(403)
  })
})

describe('developer options -> Site background', () => {
  it('saves a festival theme for its dates; the website gets it in /api/menu and goes back to the default after', async () => {
    const dev = await login(DEV)
    const bad = await act(dev, 'saveBackground', { background: { themes: { rajyotsava: { on: true, startsOn: '2026-11-03', endsOn: '2026-11-01' } } } })
    expect(bad.body.fields).toEqual({ rajyotsava: 'dates' })
    expect((await act(dev, 'saveBackground', { background: { themes: { custom: { on: true } } } })).body.fields).toEqual({ custom: 'image' })

    const saved = await act(dev, 'saveBackground', { background: { themes: { rajyotsava: { on: true, opacity: 8, animate: true, startsOn: '2026-11-01', endsOn: '2026-11-03' } } } })
    expect(saved.status).toBe(200)
    expect(saved.body.background.themes.rajyotsava).toEqual({ on: true, opacity: 8, animate: true, startsOn: '2026-11-01', endsOn: '2026-11-03' })

    const bg = (await menu()).config.background
    expect(activeBackground(bg, '2026-10-31').id).toBe('default')
    expect(activeBackground(bg, '2026-11-01')).toEqual({ id: 'rajyotsava', opacity: 0.08, animate: true, image: null })
    expect(activeBackground(bg, '2026-11-04').id).toBe('default')
  })

  it('an uploaded picture is stored first and used only once saved', async () => {
    const dev = await login(DEV)
    const up = await act(dev, 'backgroundImage', { image: webpOf(5), imageSmall: webpOf(6) })
    expect(up.body.url).toMatch(/^\/api\/photo\/background\/\d+-1200\.webp$/)
    expect((await menu()).config.background.customImage).toBeNull()
    await act(dev, 'saveBackground', { background: { customImage: up.body.url, themes: { custom: { on: true, opacity: 6 } } } })
    expect(activeBackground((await menu()).config.background, '2026-10-26')).toEqual({ id: 'custom', opacity: 0.06, animate: true, image: up.body.url })
  })

  it('a bad or missing value never breaks the website: it falls back to the default', () => {
    expect(activeBackground(undefined, '2026-11-01')).toEqual({ id: 'default', opacity: 0.045, animate: true, image: null })
    expect(activeBackground({ themes: { diwali: { on: true, opacity: 900 } } }, '2026-11-01')).toMatchObject({ id: 'diwali', opacity: 0.2 })
    expect(cleanBackground({ themes: { custom: { on: true } } }).themes.custom.on).toBe(false) // no picture: off
    expect(backgroundErrors({ themes: { diwali: { startsOn: 'tomorrow' } } })).toEqual({ diwali: 'dates' })
    // two themes on the same day: the one that started last
    const both = { themes: { diwali: { on: true, startsOn: '2026-10-20', endsOn: '2026-11-10' }, rajyotsava: { on: true, startsOn: '2026-11-01', endsOn: '2026-11-03' } } }
    expect(activeBackground(both, '2026-11-02').id).toBe('rajyotsava')
    expect(activeBackground(both, '2026-11-05').id).toBe('diwali')
  })

  it('quote() with offer prices gives the same totals as the server', () => {
    const list = applyOfferPrices(applyOverrides(CONFIG, []), [cleanOffer({ id: 'x', title: { en: 'T' }, startsOn: '2026-11-01', endsOn: '2026-11-03', items: { categories: [], products: ['pista-bar'] }, deal: { kind: 'percent', value: 10 } })])
    const q = quote([{ product: list.find((p) => p.id === 'pista-bar'), selection: {}, qty: 2 }], 'karnataka')
    expect(q).toMatchObject({ subtotal: 810, courier: 90, total: 900 })
  })
})

describe('Cloudflare D1: the new migration and store methods (SQLite)', () => {
  it('offers keep products, price, badge and both photos; settings save and clear; roles are read', async () => {
    const { default: Database } = await import('better-sqlite3')
    const { readFileSync } = await import('node:fs')
    const { createD1SqliteAdapter } = await import('../netlify/lib/store/d1SqliteAdapter.mjs')
    const { createD1Store } = await import('../netlify/lib/store/d1.mjs')
    const sqlite = new Database(':memory:')
    sqlite.exec(readFileSync('d1/setup-all.sql', 'utf8'))
    const d1 = createD1Store(createD1SqliteAdapter(sqlite))

    const o = await d1.insertOffer({ title: { en: 'Rajyotsava' }, link: '', starts_on: '2026-11-01', ends_on: '2026-11-03', items: { categories: ['delight-boxes'], products: [] }, deal: { kind: 'percent', value: 10 }, badge: { en: 'Rajyotsava offer' } })
    expect(o).toMatchObject({ items: { categories: ['delight-boxes'], products: [] }, deal: { kind: 'percent', value: 10 }, badge: { en: 'Rajyotsava offer' }, active: true })
    const u = await d1.updateOffer(o.id, { photo_url: '/api/photo/offer-x/1-1200.webp', photo_phone_url: '/api/photo/offer-x-phone/1-1200.webp', deal: null })
    expect(u).toMatchObject({ deal: null, photo_phone_url: '/api/photo/offer-x-phone/1-1200.webp' })
    // the database refuses junk too
    expect(() => sqlite.prepare(`UPDATE offers SET items = 'not json' WHERE id = ?`).run(o.id)).toThrow()

    expect(await d1.getConfig()).toEqual({})
    await d1.setConfig('background', { themes: { diwali: { on: true } } }, 'dev@example.com')
    await d1.setConfig('background', { themes: { rajyotsava: { on: true } } }, 'dev@example.com')
    expect(await d1.getConfig()).toEqual({ background: { themes: { rajyotsava: { on: true } } } })
    await d1.setConfig('background', null)
    expect(await d1.getConfig()).toEqual({})

    const a = await d1.auth.createAdmin('hema@example.com', 'a-long-password')
    expect(await d1.auth.role(a.id)).toBe('owner')
    sqlite.prepare(`UPDATE admin_users SET role = 'developer' WHERE id = ?`).run(a.id)
    expect(await d1.auth.role(a.id)).toBe('developer')
    sqlite.prepare(`UPDATE admin_users SET role = 'disabled' WHERE id = ?`).run(a.id)
    expect(await d1.auth.isAdmin(a.id)).toBe(false)
    expect(() => sqlite.prepare(`UPDATE admin_users SET role = 'boss' WHERE id = ?`).run(a.id)).toThrow()
  })
})

describe('“every product on the website” (e.g. 50% off everything)', () => {
  it('the percentage applies to every product, and the server charges it', async () => {
    const all = cleanOffer({ id: 'all', title: { en: 'Half price' }, startsOn: '2026-11-01', endsOn: '2026-11-03', items: { all: true, categories: ['x-ignored'] }, deal: { kind: 'percent', value: 50 } })
    expect(all.items).toEqual({ all: true, categories: [], products: [] })
    const list = applyOfferPrices(applyOverrides(CONFIG, []), [all])
    const priced = list.filter((p) => p.price || p.sizes?.length)
    expect(priced.every((p) => p.offer?.was)).toBe(true)
    expect(list.find((p) => p.id === 'almond-bar').price).toBe(75)
    expect(list.find((p) => p.id === 'red-velvet-delight-box').sizes.map((s) => s.price)).toEqual([325, 625, 950])

    const s = await login()
    const r = await act(s, 'saveOffer', rajyotsava({ items: { all: true }, deal: { kind: 'percent', value: 50 }, startsOn: '2026-10-26', endsOn: '2026-10-27' }))
    expect(r.body.offers.find((o) => o.id === r.body.id).items).toMatchObject({ all: true })
    expect((await order([{ productId: 'almond-bar', selection: {}, qty: 1, unitPrice: 75 }], 165)).status).toBe(201)
    expect((await order([{ productId: 'walnut-brownies', selection: { ragi: true }, qty: 1, unitPrice: 375 }], 465)).status).toBe(201) // 650/2 + ragi 50
  })
})
