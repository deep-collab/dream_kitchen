// Hema's admin work since 10 Oct 2026 on Cloudflare (the Worker + D1, here a real SQLite database
// through d1SqliteAdapter): her own products (with a ragi version), names and descriptions, photos,
// offers and the Customize tiles' photos, and the Razorpay payment ID. Every request goes through
// src/worker/index.mjs, as on Cloudflare. Also: d1/migrations/0002 on a database that already has
// orders and Hema's prices keeps them.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { readFileSync } from 'node:fs'
import worker from '../src/worker/index.mjs'
import { createD1SqliteAdapter } from '../netlify/lib/store/d1SqliteAdapter.mjs'
import { createD1Store } from '../netlify/lib/store/d1.mjs'
import { setD1Instance, setStore } from '../netlify/lib/store/index.mjs'
import { setWorkerEnv } from '../netlify/lib/env.mjs'
import { markOrderPaid } from '../netlify/lib/paid.mjs'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { istToday } from '../src/lib/offers.js'

const HEMA = { email: 'hema@example.com', password: 'test-only-password' }
let sqlite
let env
let n = 0
const webpOf = (b) => `data:image/webp;base64,${Buffer.from([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8 '), b, b]).toString('base64')}`

async function call(path, body, { method = 'POST', headers = {} } = {}) {
  const init = { method, headers: { 'content-type': 'application/json', 'cf-connecting-ip': `10.9.0.${++n % 250}`, ...headers } }
  if (method !== 'GET') init.body = JSON.stringify(body)
  const res = await worker.fetch(new Request(`https://dream-kitchen.test${path}`, init), env, {})
  return { status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.arrayBuffer() }
}
const login = async () => (await call('/api/admin', { action: 'login', ...HEMA })).body
const act = (s, action, body = {}) => call('/api/admin', { action, ...body }, { headers: { authorization: `Bearer ${s.accessToken}` } })
const menu = async () => (await call('/api/menu', null, { method: 'GET' })).body
const customer = { name: 'Asha Rao', phone: '98450 12345', email: '', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' }
const order = (items, expectedTotal) =>
  call('/api/create-order', { idempotencyKey: `d1-features-${Date.now()}-${++n}-abcdefgh`, items, customer, dispatchDate: dateChoices(new Date(), 1, dispatchRules())[0], expectedTotal, lang: 'en', website: '' })

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(Date.parse('2026-10-23T06:00:00Z'))
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

describe('Hema’s menu work on Cloudflare D1', () => {
  it('a new product with a ragi version: saved, on /api/menu, ordered at the server’s price', async () => {
    const s = await login()
    expect(s.accessToken).toBeTruthy()
    const r = await act(s, 'addProduct', { category: 'brownies', name: { en: 'Choco Chip Brownies', kn: 'ಚಾಕೊ ಚಿಪ್ ಬ್ರೌನಿಗಳು' }, description: { en: 'Five fudgy brownies.' }, courierTier: 'small', price: 450, ragiPrice: 60 })
    expect(r.status).toBe(200)
    expect(r.body.products.find((p) => p.id === 'choco-chip-brownies')).toMatchObject({ custom: true, price: 450, ragiPrice: 60, name: 'Choco Chip Brownies', nameKn: 'ಚಾಕೊ ಚಿಪ್ ಬ್ರೌನಿಗಳು', description: 'Five fudgy brownies.' })
    expect((await menu()).overrides).toContainEqual(expect.objectContaining({ id: 'choco-chip-brownies', custom: true, price: 450, ragiPrice: 60 }))
    const ok = await order([{ productId: 'choco-chip-brownies', selection: { ragi: true }, qty: 2, unitPrice: 510 }], 1110)
    expect(ok.status).toBe(201)
    expect(ok.body.order.total).toBe(1110)
    // The database itself refuses an incomplete product of hers
    expect(() => sqlite.prepare(`INSERT INTO products (id, slug, category, name_en, custom) VALUES ('x', 'x', 'brownies', 'x', 1)`).run()).toThrow(/CHECK/)
  })

  it('Edit name and Description are saved (same product ID); Back to original undoes them', async () => {
    const s = await login()
    await act(s, 'updateProduct', { id: 'almond-bar', price: 175 })
    const r = await act(s, 'updateProduct', { id: 'almond-bar', name: { en: 'Roasted Almond Bar', kn: 'ಹುರಿದ ಬಾದಾಮಿ ಬಾರ್' }, description: { en: 'Crunchy almonds.' } })
    expect(r.body.products.find((p) => p.id === 'almond-bar')).toMatchObject({ name: 'Roasted Almond Bar', nameKn: 'ಹುರಿದ ಬಾದಾಮಿ ಬಾರ್', description: 'Crunchy almonds.', price: 175, changed: true })
    // Saving the name kept her price (a row update never wipes the other columns)
    expect((await menu()).overrides).toContainEqual(expect.objectContaining({ id: 'almond-bar', price: 175, name: { en: 'Roasted Almond Bar', kn: 'ಹುರಿದ ಬಾದಾಮಿ ಬಾರ್' } }))
    const back = await act(s, 'updateProduct', { id: 'almond-bar', reset: true })
    expect(back.body.products.find((p) => p.id === 'almond-bar')).toMatchObject({ name: 'Almond Bar', price: 150, changed: false })
  })

  it('product photos, tile photos and offer photos are stored in two sizes and served at /api/photo/', async () => {
    const s = await login()
    const p = (await act(s, 'productPhoto', { id: 'pista-bar', image: webpOf(1), imageSmall: webpOf(2) })).body.products.find((x) => x.id === 'pista-bar').photo
    expect(p).toMatch(/^\/api\/photo\/pista-bar\/\d+-1200\.webp$/)
    const tile = (await act(s, 'pagePhoto', { id: 'customize-box', image: webpOf(3), imageSmall: webpOf(4) })).body.photos.find((t) => t.id === 'customize-box')
    expect(tile).toMatchObject({ ownPhoto: true })
    expect((await menu()).pagePhotos).toEqual({ 'customize-box': tile.photo })
    for (const url of [p, p.replace('-1200', '-600'), tile.photo, tile.photo.replace('-1200', '-600')]) {
      const served = await call(url, null, { method: 'GET' })
      expect(served.status).toBe(200)
    }
    expect(new Uint8Array((await call(tile.photo.replace('-1200', '-600'), null, { method: 'GET' })).body).at(-1)).toBe(4)
    expect((await act(s, 'pagePhoto', { id: 'customize-box', image: null })).body.photos.find((t) => t.id === 'customize-box').ownPhoto).toBe(false)
  })

  it('offers: add, schedule, turn off, edit, photo, delete; the website gets only what is live', async () => {
    const s = await login()
    const today = istToday()
    const body = { title: { en: 'Diwali boxes', kn: 'ದೀಪಾವಳಿ ಬಾಕ್ಸ್' }, message: { en: 'Order by Sunday.' }, button: { en: 'See boxes' }, link: 'category:delight-boxes', startsOn: today, endsOn: '2026-10-28' }
    expect((await act(s, 'saveOffer', { ...body, title: { en: '' } })).body.fields).toEqual({ title: 'required' })
    const live = await act(s, 'saveOffer', body)
    expect(live.status).toBe(200)
    const later = await act(s, 'saveOffer', { ...body, title: { en: 'Next week' }, link: 'product:walnut-brownies', startsOn: '2026-10-30', endsOn: '2026-11-02' })
    expect(later.body.offers.map((o) => [o.titleEn, o.status])).toEqual([
      ['Diwali boxes', 'live'],
      ['Next week', 'scheduled'],
    ])
    expect(later.body.offers[0]).toMatchObject({ titleKn: 'ದೀಪಾವಳಿ ಬಾಕ್ಸ್', messageEn: 'Order by Sunday.', buttonEn: 'See boxes', active: true })
    let m = await menu()
    expect(m.offers.map((o) => o.title.en)).toEqual(['Diwali boxes'])
    expect(m.offers[0]).toMatchObject({ link: 'category:delight-boxes', startsOn: today, endsOn: '2026-10-28', title: { en: 'Diwali boxes', kn: 'ದೀಪಾವಳಿ ಬಾಕ್ಸ್' } })

    const photo = (await act(s, 'offerPhoto', { id: live.body.id, image: webpOf(5), imageSmall: webpOf(6) })).body.offers.find((o) => o.id === live.body.id).photo
    expect((await call(photo, null, { method: 'GET' })).status).toBe(200)
    expect((await act(s, 'setOfferActive', { id: live.body.id, active: false })).body.offers.find((o) => o.id === live.body.id).status).toBe('off')
    expect((await menu()).offers).toEqual([])
    const edited = await act(s, 'saveOffer', { ...body, id: later.body.id, title: { en: 'Walnut week' }, link: 'product:walnut-brownies', startsOn: today, endsOn: '2026-11-02', active: true })
    expect(edited.body.offers.find((o) => o.id === later.body.id)).toMatchObject({ titleEn: 'Walnut week', status: 'live' })
    m = await menu()
    expect(m.offers.map((o) => o.title.en)).toEqual(['Walnut week'])
    expect((await act(s, 'deleteOffer', { id: later.body.id })).body.offers.map((o) => o.id)).toEqual([live.body.id])
    expect((await act(s, 'deleteOffer', { id: later.body.id })).status).toBe(404)
    // An end date before the start is refused by the database too
    expect(() => sqlite.prepare(`INSERT INTO offers (id, title, starts_on, ends_on) VALUES ('x', '{"en":"x"}', '2026-11-05', '2026-11-01')`).run()).toThrow(/CHECK/)
  })

  it('a Razorpay payment keeps its payment ID and method', async () => {
    const placed = await order([{ productId: 'almond-bar', selection: {}, qty: 1, unitPrice: 150 }], 240)
    expect(placed.status).toBe(201)
    const d1 = createD1Store(env.DB)
    await markOrderPaid(d1, await d1.getOrder(placed.body.order.code), 'pay_TEST123')
    const row = sqlite.prepare('SELECT status, payment_method, razorpay_payment_id FROM orders WHERE order_code = ?').get(placed.body.order.code)
    expect(row).toEqual({ status: 'payment_confirmed', payment_method: 'razorpay', razorpay_payment_id: 'pay_TEST123' })
  })

  it('the setup check says the database is up to date', async () => {
    const r = await call('/api/setup-check', null, { method: 'GET' })
    expect(r.body.database).toMatchObject({ ok: true, d1: true, problem: null })
    expect(r.body.keepAlive).toMatchObject({ ok: true, notNeeded: true })
  })
})

describe('d1/migrations/0002 on a database already in use', () => {
  it('keeps orders and Hema’s prices, and the setup check asks for it until it has run', async () => {
    const old = new Database(':memory:')
    old.exec(readFileSync('d1/migrations/0001_init.sql', 'utf8'))
    old.exec(readFileSync('d1/seed.sql', 'utf8'))
    old.prepare(`UPDATE products SET price = 199 WHERE id = 'almond-bar'`).run()
    const store = createD1Store(createD1SqliteAdapter(old))
    expect((await store.health()).update).toBe(false)
    old.exec(readFileSync('d1/migrations/0002_products_text_offers_page_photos.sql', 'utf8'))
    expect((await store.health()).update).toBe(true)
    expect(old.prepare(`SELECT price, custom, display_name FROM products WHERE id = 'almond-bar'`).get()).toEqual({ price: 199, custom: 0, display_name: null })
  })
})
