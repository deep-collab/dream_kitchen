// Hema's requests of 24 Oct 2026, called exactly as the website and the admin call the server, on
// the practice store (and the real D1 SQL for the database parts): names and descriptions in
// English and Kannada, products she adds herself (priced by the server from the database),
// Customize page tile photos, and offers (display only), plus migration 0002 on a live-like database.
import { readFileSync } from 'node:fs'
import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { products as CONFIG_PRODUCTS } from '../src/config/shop.js'
import { applyOverrides, isForSale, quote, unitPrice } from '../src/lib/pricing.js'
import { addDaysISO, dateChoices, dispatchRules, zonedNow } from '../src/lib/dates.js'
import { createMemoryStore } from '../netlify/lib/store/memory.mjs'
import { setStore } from '../netlify/lib/store/index.mjs'
import { createD1SqliteAdapter } from '../netlify/lib/store/d1SqliteAdapter.mjs'
import { createD1Store } from '../netlify/lib/store/d1.mjs'
import { loadCatalog, publicShowcase } from '../netlify/lib/catalog.mjs'
import { runAdminAction } from '../netlify/lib/adminCore.mjs'
import createOrder from '../netlify/functions/create-order.mjs'
import orderFn from '../netlify/functions/order.mjs'
import admin from '../netlify/functions/admin.mjs'
import menuFn from '../netlify/functions/menu.mjs'

const HEMA = { email: 'hema@example.com', password: 'test-only-password', id: '00000000-0000-4000-8000-0000000000a1' }
let store
let ip = 200

function call(fn, body, { method = 'POST', headers = {} } = {}) {
  const init = { method, headers: { 'content-type': 'application/json', ...headers } }
  if (method !== 'GET') init.body = JSON.stringify(body)
  return fn(new Request('http://localhost/api/x', init), { ip: `10.2.0.${ip}` }).then(async (res) => ({ status: res.status, body: await res.json() }))
}
let session
const act = (action, body = {}) => call(admin, { action, ...body }, { headers: { authorization: `Bearer ${session.accessToken}` } })
const menu = async () => (await call(menuFn, null, { method: 'GET' })).body

let n = 0
const key = () => `t-key-${Date.now()}-${n++}-offers00`
const customer = { name: 'Asha Rao', phone: '98450 12345', email: '', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' }
const orderBody = (items, expectedTotal) => ({ idempotencyKey: key(), items, customer, dispatchDate: dateChoices(new Date(), 1, dispatchRules())[0], expectedTotal, lang: 'en', website: '' })
const today = () => zonedNow(new Date()).date
const webp = `data:image/webp;base64,${Buffer.from([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8 '), 1, 2]).toString('base64')}`

beforeEach(async () => {
  process.env.DK_MOCK_BACKEND = '1'
  for (const k of ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'RESEND_API_KEY']) delete process.env[k]
  store = createMemoryStore({ admins: [HEMA] })
  await store.updateSettings({ upi_id: 'hema@okaxis' })
  setStore(store)
  ip++
  session = (await call(admin, { action: 'login', email: HEMA.email, password: HEMA.password })).body
})
afterEach(() => setStore(null))

/* ---------------------------------------------------------------------------------------------- */

describe('shared pricing: names, descriptions and added products', () => {
  it('a new name and description keep the same product (id, prices, sizes); an empty description hides it', () => {
    const [box] = applyOverrides(CONFIG_PRODUCTS, [{ id: 'pista-delight-box', name: { en: 'Royal Pista Box', kn: 'ರಾಯಲ್ ಪಿಸ್ತಾ ಬಾಕ್ಸ್' }, description: { en: 'Pista cream and white chocolate.', kn: '' } }]).filter((p) => p.id === 'pista-delight-box')
    expect(box).toMatchObject({ id: 'pista-delight-box', slug: 'pista-delight-box', name: { en: 'Royal Pista Box', kn: 'ರಾಯಲ್ ಪಿಸ್ತಾ ಬಾಕ್ಸ್' }, description: { en: 'Pista cream and white chocolate.', kn: '' } })
    expect(box.sizes.map((s) => s.price)).toEqual([750, 1500, 2250])
    const [tub] = applyOverrides(CONFIG_PRODUCTS, [{ id: 'lotus-biscoff-tub', description: { en: '', kn: '' } }]).filter((p) => p.id === 'lotus-biscoff-tub')
    expect(tub.description).toBeNull()
    // Too short a name is ignored, never a blank product
    const [bar] = applyOverrides(CONFIG_PRODUCTS, [{ id: 'almond-bar', name: { en: ' ', kn: '' } }]).filter((p) => p.id === 'almond-bar')
    expect(bar.name.en).toBe('Almond Bar')
  })

  it('an added product goes after the config ones, priced by the same rules; a bad one is ignored', () => {
    const all = applyOverrides(CONFIG_PRODUCTS, [
      { id: 'kaju-bar', added: true, category: 'chocolates', courierTier: 'small', sort: 101, name: { en: 'Kaju Bar', kn: '' }, price: 300, ragiPrice: 40 },
      { id: 'big-gift-box', added: true, category: 'delight-boxes', courierTier: 'large', sort: 101, name: { en: 'Big Gift Box', kn: '' }, sizes: [{ id: 'small', label: 'Small', price: 900 }, { id: 'big', label: 'Big', price: 1600 }] },
      { id: 'bad-category', added: true, category: 'cakes', name: { en: 'Cake', kn: '' }, price: 100 },
      { id: 'almond-bar', added: true, category: 'chocolates', name: { en: 'Almond Bar', kn: '' }, price: 150 }, // a config id: never a second product
      { id: 'BAD ID', added: true, category: 'chocolates', name: { en: 'Bad', kn: '' }, price: 100 },
    ])
    expect(all).toHaveLength(CONFIG_PRODUCTS.length + 2)
    const kaju = all.find((p) => p.id === 'kaju-bar')
    expect(kaju).toMatchObject({ added: true, art: 'bar', courierTier: 'small', priceStatus: 'live', price: 300, ragiPrice: 40 })
    expect(isForSale(kaju)).toBe(true)
    expect(unitPrice(kaju, { ragi: true })).toBe(340)
    const big = all.find((p) => p.id === 'big-gift-box')
    expect(big.sizes).toEqual([
      { id: 'small', label: 'Small', price: 900, courierTier: 'large' },
      { id: 'big', label: 'Big', price: 1600, courierTier: 'large' },
    ])
    expect(quote([{ product: big, selection: { size: 'small' }, qty: 1 }], 'outside')).toMatchObject({ subtotal: 900, courier: 150, total: 1050 })
    expect(all.filter((p) => p.id === 'almond-bar')).toHaveLength(1)
    expect(all.find((p) => p.id === 'almond-bar').added).toBeUndefined()
  })

  it('a product added to the Customize page is not listed on the menu', () => {
    const [p] = applyOverrides([], [{ id: 'photo-bar', added: true, category: 'customize', courierTier: 'small', name: { en: 'Photo Bar', kn: '' }, price: 800 }])
    expect(p).toMatchObject({ menu: false, art: 'drawing-bar' })
  })
})

/* ---------------------------------------------------------------------------------------------- */

describe('admin -> Menu: Edit name and Description', () => {
  it('saves English and Kannada, shows on the website, keeps the id and the price', async () => {
    const r = await act('updateProduct', { id: 'almond-bar', name: { en: 'Almond Crunch Bar', kn: 'ಬಾದಾಮಿ ಕ್ರಂಚ್ ಬಾರ್' } })
    expect(r.status).toBe(200)
    await act('updateProduct', { id: 'almond-bar', description: { en: 'Roasted almonds in milk chocolate.', kn: 'ಮಿಲ್ಕ್ ಚಾಕೊಲೇಟ್‌ನಲ್ಲಿ ಹುರಿದ ಬಾದಾಮಿ.' } })
    const view = (await act('menu')).body.products.find((p) => p.id === 'almond-bar')
    expect(view).toMatchObject({ name: 'Almond Crunch Bar', nameKn: 'ಬಾದಾಮಿ ಕ್ರಂಚ್ ಬಾರ್', description: { en: 'Roasted almonds in milk chocolate.' }, price: 150, changed: true })
    const o = (await menu()).overrides.find((x) => x.id === 'almond-bar')
    expect(o).toMatchObject({ name: { en: 'Almond Crunch Bar', kn: 'ಬಾದಾಮಿ ಕ್ರಂಚ್ ಬಾರ್' }, description: { en: 'Roasted almonds in milk chocolate.' } })
    // The website builds the same product from it
    const site = applyOverrides(CONFIG_PRODUCTS, (await menu()).overrides).find((p) => p.id === 'almond-bar')
    expect(site).toMatchObject({ id: 'almond-bar', slug: 'almond-bar', price: 150, name: { en: 'Almond Crunch Bar' } })
  })

  it('saving the original words changes nothing; "Back to original" undoes a rename', async () => {
    await act('updateProduct', { id: 'pista-bar', name: { en: 'Pista Bar', kn: 'ಪಿಸ್ತಾ ಬಾರ್' } })
    expect((await act('menu')).body.products.find((p) => p.id === 'pista-bar').changed).toBe(false)
    await act('updateProduct', { id: 'pista-bar', name: { en: 'Pistachio Bar', kn: '' } })
    expect((await act('menu')).body.products.find((p) => p.id === 'pista-bar').name).toBe('Pistachio Bar')
    const back = (await act('updateProduct', { id: 'pista-bar', reset: true })).body.products.find((p) => p.id === 'pista-bar')
    expect(back).toMatchObject({ name: 'Pista Bar', nameKn: 'ಪಿಸ್ತಾ ಬಾರ್', changed: false })
  })

  it('refuses a missing name, over 200 letters of description, and Kannada without English', async () => {
    expect((await act('updateProduct', { id: 'almond-bar', name: { en: 'A', kn: '' } })).body.fields).toEqual({ nameEn: 'required' })
    expect((await act('updateProduct', { id: 'almond-bar', description: { en: 'x'.repeat(201), kn: '' } })).body.fields).toEqual({ descriptionEn: 'long' })
    expect((await act('updateProduct', { id: 'almond-bar', description: { en: '', kn: 'ಬಾದಾಮಿ' } })).body.fields).toEqual({ descriptionEn: 'required' })
    expect((await act('updateProduct', { id: 'almond-bar', description: { en: 'x'.repeat(200), kn: '' } })).status).toBe(200)
  })

  it('old orders keep the name they were placed with', async () => {
    const placed = await call(createOrder, orderBody([{ productId: 'almond-bar', selection: {}, qty: 1, unitPrice: 150 }], 240))
    expect(placed.status).toBe(201)
    await act('updateProduct', { id: 'almond-bar', name: { en: 'Almond Crunch Bar', kn: '' } })
    const order = (await call(orderFn, { code: placed.body.order.code, phone: '9845012345' })).body.order
    expect(order.items[0].name).toEqual({ en: 'Almond Bar', kn: 'ಬಾದಾಮಿ ಬಾರ್' })
    // A new order carries the new name
    const next = await call(createOrder, orderBody([{ productId: 'almond-bar', selection: {}, qty: 1, unitPrice: 150 }], 240))
    expect((await call(orderFn, { code: next.body.order.code, phone: '9845012345' })).body.order.items[0].name.en).toBe('Almond Crunch Bar')
  })
})

/* ---------------------------------------------------------------------------------------------- */

describe('admin -> Menu: + Add new product', () => {
  const kaju = (over = {}) => ({ category: 'chocolates', name: { en: 'Kaju Bar', kn: 'ಗೋಡಂಬಿ ಬಾರ್' }, description: { en: 'Cashews in dark chocolate.', kn: '' }, price: 300, ragiPrice: null, courierTier: 'small', ...over })

  it('is on the website straight away, after the others in its category, with the gold drawing until a photo', async () => {
    const r = await act('addProduct', kaju())
    expect(r.status).toBe(200)
    expect(r.body.addedId).toBe('kaju-bar')
    const view = r.body.products.find((p) => p.id === 'kaju-bar')
    expect(view).toMatchObject({ name: 'Kaju Bar', nameKn: 'ಗೋಡಂಬಿ ಬಾರ್', category: 'chocolates', price: 300, added: true, photo: null, changed: false, courierTier: 'small' })
    const site = applyOverrides(CONFIG_PRODUCTS, (await menu()).overrides)
    const chocolates = site.filter((p) => p.category === 'chocolates').sort((a, b) => a.sort - b.sort)
    expect(chocolates.map((p) => p.id)).toEqual(['pista-bar', 'almond-bar', 'kaju-bar'])
    expect(chocolates[2]).toMatchObject({ art: 'bar', description: { en: 'Cashews in dark chocolate.' } })
  })

  it('order totals are checked on the server from the database: right price accepted, tampered or stale refused', async () => {
    await act('addProduct', kaju({ ragiPrice: 40 }))
    const ok = await call(createOrder, orderBody([{ productId: 'kaju-bar', selection: { ragi: true }, qty: 2, unitPrice: 340 }], 680 + 90))
    expect(ok.status).toBe(201)
    expect(ok.body.order).toMatchObject({ subtotal: 680, courier: 90, total: 770 })
    const tampered = await call(createOrder, orderBody([{ productId: 'kaju-bar', selection: {}, qty: 1, unitPrice: 1 }], 91))
    expect(tampered.body).toMatchObject({ error: 'priceChanged', lines: [{ index: 0, unitPrice: 300 }] })
    // Hema changes the price: the old one no longer goes through
    await act('updateProduct', { id: 'kaju-bar', price: 350 })
    const stale = await call(createOrder, orderBody([{ productId: 'kaju-bar', selection: {}, qty: 1, unitPrice: 300 }], 390))
    expect(stale.body).toMatchObject({ error: 'priceChanged', lines: [{ index: 0, unitPrice: 350 }] })
    // Hidden or sold out: refused like any product
    await act('updateProduct', { id: 'kaju-bar', soldOut: true })
    expect((await call(createOrder, orderBody([{ productId: 'kaju-bar', selection: {}, qty: 1, unitPrice: 350 }], 440))).body).toMatchObject({ error: 'items', lines: [{ index: 0, error: 'soldOut' }] })
  })

  it('sizes with prices and the large courier size', async () => {
    const r = await act('addProduct', kaju({ category: 'delight-boxes', name: { en: 'Festive Box', kn: '' }, price: undefined, sizes: [{ label: '500 g', price: 1200 }, { label: '1 kg', price: 2200 }], courierTier: 'large' }))
    expect(r.status).toBe(200)
    const catalog = await loadCatalog(store)
    const box = catalog.productsById['festive-box']
    expect(box.sizes).toEqual([
      { id: '500-g', label: '500 g', price: 1200, courierTier: 'large' },
      { id: '1-kg', label: '1 kg', price: 2200, courierTier: 'large' },
    ])
    const ok = await call(createOrder, orderBody([{ productId: 'festive-box', selection: { size: '1-kg' }, qty: 1, unitPrice: 2200 }], 2200 + 100))
    expect(ok.body.order).toMatchObject({ courier: 100, total: 2300 })
  })

  it('a name already on the menu gets a new id; the photo is optional and can come with it', async () => {
    const r = await act('addProduct', kaju({ name: { en: 'Almond Bar', kn: '' }, image: webp }))
    expect(r.body.addedId).toBe('almond-bar-2')
    const p = r.body.products.find((x) => x.id === 'almond-bar-2')
    expect(p.photo).toMatch(/^\/api\/photo\/almond-bar-2\/\d+\.webp$/)
    expect(r.body.products.find((x) => x.id === 'almond-bar')).toMatchObject({ added: false, price: 150 })
  })

  it('says what is missing: name, price, size names, courier size, category, photo', async () => {
    const fields = async (body) => (await act('addProduct', body)).body.fields
    expect(await fields(kaju({ name: { en: '', kn: '' } }))).toEqual({ nameEn: 'required' })
    expect(await fields(kaju({ price: 0 }))).toEqual({ price: 'price' })
    expect(await fields(kaju({ price: undefined, sizes: [{ label: '', price: 100 }] }))).toEqual({ sizes: 'label' })
    expect(await fields(kaju({ price: undefined, sizes: [{ label: 'Big', price: 100 }, { label: 'big', price: 200 }] }))).toEqual({ sizes: 'duplicate' })
    expect(await fields(kaju({ courierTier: 'xl' }))).toEqual({ courierTier: 'required' })
    expect(await fields(kaju({ category: 'cakes' }))).toEqual({ category: 'required' })
    expect(await fields(kaju({ ragiPrice: -5 }))).toEqual({ ragiPrice: 'price' })
    expect(await fields(kaju({ image: 'data:image/png;base64,PGh0bWw+' }))).toEqual({ photo: 'image' })
    expect((await act('menu')).body.products.some((p) => p.added)).toBe(false)
  })

  it('can be renamed, re-priced and given a large courier size later; "Back to original" isn’t offered', async () => {
    await act('addProduct', kaju())
    const r = await act('updateProduct', { id: 'kaju-bar', name: { en: 'Cashew Bar', kn: '' }, courierTier: 'large', price: 320 })
    expect(r.body.products.find((p) => p.id === 'kaju-bar')).toMatchObject({ name: 'Cashew Bar', courierTier: 'large', price: 320 })
    expect((await act('updateProduct', { id: 'kaju-bar', reset: true })).status).toBe(400)
    const catalog = await loadCatalog(store)
    expect(catalog.productsById['kaju-bar']).toMatchObject({ courierTier: 'large', price: 320, name: { en: 'Cashew Bar' } })
  })

  it('added to the Customize page: orderable, not on the menu', async () => {
    await act('addProduct', kaju({ category: 'customize', name: { en: 'Photo Print Bar', kn: '' }, price: 800 }))
    const catalog = await loadCatalog(store)
    expect(catalog.productsById['photo-print-bar']).toMatchObject({ menu: false, category: 'customize' })
    expect((await call(createOrder, orderBody([{ productId: 'photo-print-bar', selection: {}, qty: 1, unitPrice: 800 }], 890))).status).toBe(201)
  })
})

/* ---------------------------------------------------------------------------------------------- */

describe('admin -> Menu: Customize page tile photos', () => {
  it('a tile gets its own photo, shown on the website, and can go back to the product’s', async () => {
    let r = await act('menu')
    expect(r.body.tiles.map((t) => t.id)).toEqual(['delight-box', 'drawing-bar'])
    expect(r.body.tiles[0]).toMatchObject({ ownPhoto: false, photo: expect.stringMatching(/^\/products\/red-velvet-delight-box-600\.webp/) })
    r = await act('tilePhoto', { tile: 'delight-box', image: webp })
    const tile = r.body.tiles.find((t) => t.id === 'delight-box')
    expect(tile).toMatchObject({ ownPhoto: true, photo: expect.stringMatching(/^\/api\/photo\/tile-delight-box\/\d+\.webp$/) })
    expect((await menu()).tilePhotos).toEqual({ 'delight-box': tile.photo })
    // The product itself keeps its photo
    expect(r.body.products.find((p) => p.id === 'red-velvet-delight-box').ownPhoto).toBe(false)
    r = await act('tilePhoto', { tile: 'delight-box', image: null })
    expect(r.body.tiles[0].ownPhoto).toBe(false)
    expect((await menu()).tilePhotos).toEqual({})
    expect((await act('tilePhoto', { tile: 'nope', image: webp })).status).toBe(404)
    expect((await act('tilePhoto', { tile: 'drawing-bar', image: 'data:image/png;base64,PGh0bWw+' })).body.fields).toEqual({ photo: 'image' })
  })
})

/* ---------------------------------------------------------------------------------------------- */

describe('admin -> Offers', () => {
  const offer = (over = {}) => ({ titleEn: 'Diwali gift boxes', titleKn: 'ದೀಪಾವಳಿ ಉಡುಗೊರೆ', messageEn: 'Names on the box are free.', messageKn: '', buttonEn: 'See Delight Boxes', buttonKn: '', link: 'category:delight-boxes', startsOn: today(), endsOn: addDaysISO(today(), 7), active: true, ...over })

  it('a live offer shows on the website with its button; scheduled, ended and switched-off ones don’t', async () => {
    await act('saveOffer', offer())
    await act('saveOffer', offer({ titleEn: 'Later', startsOn: addDaysISO(today(), 3) }))
    await act('saveOffer', offer({ titleEn: 'Over', startsOn: addDaysISO(today(), -10), endsOn: addDaysISO(today(), -1) }))
    await act('saveOffer', offer({ titleEn: 'Off', active: false }))
    await act('saveOffer', offer({ titleEn: 'Last day', startsOn: addDaysISO(today(), -5), endsOn: today(), link: 'product:pista-delight-box', buttonEn: 'Order now' }))
    const list = (await act('offers')).body
    expect(list.offers.map((o) => [o.titleEn, o.status]).sort()).toEqual([
      ['Diwali gift boxes', 'live'],
      ['Last day', 'live'],
      ['Later', 'scheduled'],
      ['Off', 'off'],
      ['Over', 'ended'],
    ])
    const live = (await menu()).offers
    expect(live).toEqual([
      { id: expect.any(String), title: { en: 'Last day', kn: 'ದೀಪಾವಳಿ ಉಡುಗೊರೆ' }, message: { en: 'Names on the box are free.', kn: '' }, photo: null, button: { en: 'Order now', kn: '' }, link: '/menu?item=pista-delight-box' },
      { id: expect.any(String), title: { en: 'Diwali gift boxes', kn: 'ದೀಪಾವಳಿ ಉಡುಗೊರೆ' }, message: { en: 'Names on the box are free.', kn: '' }, photo: null, button: { en: 'See Delight Boxes', kn: '' }, link: '/menu#delight-boxes' },
    ])
  })

  it('no offers = nothing to show', async () => {
    expect((await menu()).offers).toEqual([])
    expect((await act('offers')).body.offers).toEqual([])
  })

  it('edit, turn off and on, and delete', async () => {
    const id = (await act('saveOffer', offer())).body.savedId
    let r = await act('saveOffer', { id, titleEn: 'Diwali specials', link: 'category:customize', buttonEn: 'Make it yours' })
    expect(r.body.offers[0]).toMatchObject({ titleEn: 'Diwali specials', link: 'category:customize', messageEn: 'Names on the box are free.', status: 'live' })
    expect((await menu()).offers[0]).toMatchObject({ link: '/customize', button: { en: 'Make it yours' } })
    r = await act('saveOffer', { id, active: false })
    expect(r.body.offers[0].status).toBe('off')
    expect((await menu()).offers).toEqual([])
    await act('saveOffer', { id, active: true })
    expect((await menu()).offers).toHaveLength(1)
    r = await act('deleteOffer', { id })
    expect(r.body.offers).toEqual([])
    expect((await act('deleteOffer', { id })).status).toBe(404)
  })

  it('a banner photo: saved, shown, removable', async () => {
    const id = (await act('saveOffer', offer({ image: webp }))).body.savedId
    const photo = (await menu()).offers[0].photo
    expect(photo).toMatch(new RegExp(`^/api/photo/offer-${id}/\\d+\\.webp$`))
    await act('saveOffer', { id, titleEn: 'New title' }) // no image sent = keep it
    expect((await menu()).offers[0].photo).toBe(photo)
    await act('saveOffer', { id, image: null })
    expect((await menu()).offers[0].photo).toBeNull()
  })

  it('a hidden product: the offer stays, its button goes', async () => {
    await act('saveOffer', offer({ link: 'product:almond-bar', buttonEn: 'Order now' }))
    await act('updateProduct', { id: 'almond-bar', active: false })
    expect((await menu()).offers[0]).toMatchObject({ link: null, button: null, title: { en: 'Diwali gift boxes' } })
    expect((await act('offers')).body.offers[0].linkOk).toBe(false)
  })

  it('says what is wrong: title, dates, button without a place to go (and the reverse), unknown target', async () => {
    const fields = async (body) => (await act('saveOffer', body)).body.fields
    expect(await fields(offer({ titleEn: '' }))).toEqual({ titleEn: 'required' })
    expect(await fields(offer({ titleEn: 'x'.repeat(61) }))).toEqual({ titleEn: 'long' })
    expect(await fields(offer({ endsOn: addDaysISO(today(), -1) }))).toEqual({ endsOn: 'beforeStart' })
    expect(await fields(offer({ startsOn: '2026-02-30' }))).toEqual({ startsOn: 'date' })
    expect(await fields(offer({ buttonEn: '' }))).toEqual({ buttonEn: 'required' })
    expect(await fields(offer({ link: '' }))).toEqual({ link: 'required' })
    expect(await fields(offer({ link: 'product:no-such-thing' }))).toEqual({ link: 'invalid' })
    expect(await fields(offer({ image: 'data:image/png;base64,PGh0bWw+' }))).toEqual({ photo: 'image' })
    expect((await act('offers')).body.offers).toEqual([])
    // No button at all is fine
    expect((await act('saveOffer', offer({ link: '', buttonEn: '' }))).status).toBe(200)
  })

  it('offers never change a price: the same order costs the same with an offer live', async () => {
    await act('saveOffer', offer({ link: 'product:almond-bar', buttonEn: 'Order now' }))
    const r = await call(createOrder, orderBody([{ productId: 'almond-bar', selection: {}, qty: 2, unitPrice: 150 }], 390))
    expect(r.body.order).toMatchObject({ subtotal: 300, courier: 90, total: 390 })
  })

  it('IST dates: an offer ending today still shows at 11 pm in India, not after midnight', () => {
    const rows = [{ id: 'a', title_en: 'Ends today', active: true, starts_on: '2026-10-20', ends_on: '2026-10-24', created_at: '' }]
    const catalog = { productsById: {} }
    // 24 Oct, 23:00 IST = 17:30 UTC; 25 Oct, 00:30 IST = 24 Oct 19:00 UTC
    expect(publicShowcase(rows, [], catalog, new Date('2026-10-24T17:30:00Z')).offers).toHaveLength(1)
    expect(publicShowcase(rows, [], catalog, new Date('2026-10-24T19:00:00Z')).offers).toHaveLength(0)
  })

  it('needs a login like everything in the admin', async () => {
    expect((await call(admin, { action: 'saveOffer', ...offer() })).status).toBe(401)
  })
})

/* ---------------------------------------------------------------------------------------------- */

describe('Cloudflare D1: migration 0002 and the store', () => {
  const MIGRATION_1 = readFileSync('d1/migrations/0001_init.sql', 'utf8')
  const MIGRATION_2 = readFileSync('d1/migrations/0002_menu_text_offers.sql', 'utf8')
  const SEED = readFileSync('d1/seed.sql', 'utf8')

  it('only adds: no DROP, DELETE, UPDATE, ALTER or INSERT anywhere in the migration', () => {
    const sql = MIGRATION_2.replace(/--.*$/gm, '')
    expect(sql).not.toMatch(/\b(DROP|DELETE|UPDATE|ALTER|INSERT|REPLACE)\b/i)
    expect(sql.match(/CREATE (TABLE|INDEX) IF NOT EXISTS/g)).toHaveLength(4)
  })

  it('on a database with live orders, prices and photos: everything stays; running it twice is harmless', async () => {
    const sqlite = new Database(':memory:')
    sqlite.exec(MIGRATION_1)
    sqlite.exec(SEED)
    const before = createD1Store(createD1SqliteAdapter(sqlite))
    await before.updateProduct('almond-bar', { price: 175, photo_url: '/api/photo/almond-bar/1.webp' })
    await before.updateSettings({ upi_id: 'hema@okaxis', announcement: 'Diwali orders open' })
    await before.createOrder({
      order_code: 'DK-261020-AB12', idempotency_key: 'live-order-0001', customer_name: 'Asha Rao', customer_phone: '9845012345', customer_email: null,
      address_line1: '12, 3rd Cross', address_line2: 'Jayanagar', city: 'Bengaluru', landmark: null, pincode: '560011', state: 'karnataka', zone: 'karnataka',
      items: [{ productId: 'almond-bar', name: { en: 'Almond Bar', kn: 'ಬಾದಾಮಿ ಬಾರ್' }, qty: 1, unitPrice: 175, lineTotal: 175 }], subtotal: 175, courier: 90, total: 265,
      courier_tier: 'small', has_drawing: false, dispatch_date: '2026-10-23', notes: null, lang: 'en', payment_method: 'upi',
    })
    const snapshot = () => ['products', 'settings', 'orders', 'order_events'].map((t) => sqlite.prepare(`SELECT * FROM ${t} ORDER BY 1`).all())
    const was = JSON.stringify(snapshot())

    sqlite.exec(MIGRATION_2)
    sqlite.exec(MIGRATION_2)
    expect(JSON.stringify(snapshot())).toBe(was)

    const after = createD1Store(createD1SqliteAdapter(sqlite))
    const catalog = await loadCatalog(after)
    expect(catalog.productsById['almond-bar']).toMatchObject({ price: 175, photo: '/api/photo/almond-bar/1.webp', name: { en: 'Almond Bar' } })
    expect((await after.getOrder('DK-261020-AB12')).total).toBe(265)
  })

  it('before the migration has run, the shop still works (no offers, no extras)', async () => {
    const sqlite = new Database(':memory:')
    sqlite.exec(MIGRATION_1)
    sqlite.exec(SEED)
    const d1 = createD1Store(createD1SqliteAdapter(sqlite))
    expect(await d1.listProducts()).toHaveLength(17)
    expect(await d1.listOffers()).toEqual([])
    expect(await d1.listTilePhotos()).toEqual([])
  })

  it('the admin actions on real SQL: rename, describe, add, tile photo, offers', async () => {
    const sqlite = new Database(':memory:')
    sqlite.exec(readFileSync('d1/setup-all.sql', 'utf8'))
    const d1 = createD1Store(createD1SqliteAdapter(sqlite))
    const ctx = { send: async () => [], now: () => new Date(), env: { razorpay: { enabled: false } } }
    const run = (action, body) => runAdminAction(d1, { email: 'hema@example.com' }, action, body, ctx)

    await run('updateProduct', { id: 'mango-delight-box', name: { en: 'Alphonso Mango Box', kn: 'ಆಲ್ಫೋನ್ಸೋ ಮಾವಿನ ಬಾಕ್ಸ್' }, description: { en: 'Fresh Alphonso mango cream.', kn: '' } })
    await run('addProduct', { category: 'brownies', name: { en: 'Coffee Brownies', kn: '' }, description: { en: '', kn: '' }, price: 600, ragiPrice: 50, courierTier: 'small' })
    await run('tilePhoto', { tile: 'drawing-bar', image: webp })
    await run('saveOffer', { titleEn: 'Mango season', link: 'product:mango-delight-box', buttonEn: 'Order now', startsOn: today(), endsOn: today() })

    const catalog = await loadCatalog(d1)
    expect(catalog.productsById['mango-delight-box']).toMatchObject({ name: { en: 'Alphonso Mango Box', kn: 'ಆಲ್ಫೋನ್ಸೋ ಮಾವಿನ ಬಾಕ್ಸ್' }, description: { en: 'Fresh Alphonso mango cream.' } })
    expect(catalog.productsById['coffee-brownies']).toMatchObject({ added: true, price: 600, ragiPrice: 50, art: 'brownie-box' })
    expect(sqlite.prepare('SELECT added FROM product_extras WHERE product_id = ?').get('coffee-brownies')).toEqual({ added: 1 })
    const show = publicShowcase(await d1.listOffers(), await d1.listTilePhotos(), catalog)
    expect(show.offers).toMatchObject([{ title: { en: 'Mango season' }, link: '/menu?item=mango-delight-box' }])
    expect(show.tilePhotos['drawing-bar']).toMatch(/^\/api\/photo\/tile-drawing-bar\/\d+\.webp$/)

    // Back to original, then delete the offer
    await run('updateProduct', { id: 'mango-delight-box', reset: true })
    expect((await loadCatalog(d1)).productsById['mango-delight-box'].name.en).toBe('Mango Delight Box')
    const [o] = await d1.listOffers()
    await run('deleteOffer', { id: o.id })
    expect(await d1.listOffers()).toEqual([])
    // The database itself refuses a description over 200 letters
    expect(() => sqlite.prepare("INSERT INTO product_extras (product_id, description_en) VALUES ('x', ?)").run('x'.repeat(201))).toThrow(/CHECK/)
  })
})
