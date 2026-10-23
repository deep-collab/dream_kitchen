// Hema's requests of 23 Oct 2026, called exactly as Netlify calls the functions, against the
// practice store: offers (add, schedule, turn off, edit, delete, photo; what the website gets and
// when), the Customize tiles' photos, a ragi version for the products she adds, and her names
// and descriptions (the product's ID never changes, so old orders stay whole).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dateChoices, dispatchRules } from '../src/lib/dates.js'
import { cleanOffer, istToday, liveOffers, offerHref, offerStatus, PAGE_PHOTO_IDS } from '../src/lib/offers.js'
import { applyOverrides } from '../src/lib/pricing.js'
import { products as CONFIG } from '../src/config/shop.js'
import { createMemoryStore } from '../netlify/lib/store/memory.mjs'
import { setStore } from '../netlify/lib/store/index.mjs'
import { publicOffers } from '../netlify/lib/catalog.mjs'
import createOrder from '../netlify/functions/create-order.mjs'
import admin from '../netlify/functions/admin.mjs'
import menuFn from '../netlify/functions/menu.mjs'
import photoFn from '../netlify/functions/photo.mjs'

const HEMA = { email: 'hema@example.com', password: 'test-only-password', id: '00000000-0000-4000-8000-0000000000a1' }
let store
let ip = 10
let nowMs

function call(fn, body, { method = 'POST', headers = {}, path = '/api/x' } = {}) {
  const init = { method, headers: { 'content-type': 'application/json', ...headers } }
  if (method !== 'GET') init.body = JSON.stringify(body)
  return fn(new Request(`http://localhost${path}`, init), { ip: `10.2.0.${ip}` }).then(async (res) => ({ status: res.status, body: res.headers.get('content-type')?.includes('json') ? await res.json() : await res.arrayBuffer() }))
}
const login = async () => (await call(admin, { action: 'login', email: HEMA.email, password: HEMA.password })).body
const act = (s, action, body = {}) => call(admin, { action, ...body }, { headers: { authorization: `Bearer ${s.accessToken}` } })
const menu = async () => (await call(menuFn, null, { method: 'GET' })).body
const webpOf = (n) => `data:image/webp;base64,${Buffer.from([...new TextEncoder().encode('RIFF'), 0, 0, 0, 0, ...new TextEncoder().encode('WEBPVP8 '), n, n]).toString('base64')}`

let k = 0
const customer = { name: 'Asha Rao', phone: '98450 12345', email: '', line1: '12, 3rd Cross', line2: 'Jayanagar 4th Block', city: 'Bengaluru', pincode: '560011', state: 'karnataka', landmark: '', note: '' }
const orderBody = (items, expectedTotal) => ({ idempotencyKey: `offers-test-${Date.now()}-${k++}-abcdefgh`, items, customer, dispatchDate: dateChoices(new Date(), 1, dispatchRules())[0], expectedTotal, lang: 'en', website: '' })

// Indian dates around "now" in these tests
const day = (n) => istToday(new Date(nowMs + n * 86_400_000))
const offerBody = (over = {}) => ({ title: { en: 'Diwali boxes', kn: 'ದೀಪಾವಳಿ ಬಾಕ್ಸ್' }, message: { en: 'Order by Sunday.' }, button: { en: 'See boxes' }, link: 'category:delight-boxes', startsOn: day(0), endsOn: day(5), ...over })

beforeEach(async () => {
  process.env.DK_MOCK_BACKEND = '1'
  // A fixed day for the store and the admin alike (11:30 am in India), so the tests pass on any date
  nowMs = Date.parse('2026-10-23T06:00:00Z')
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(nowMs)
  store = createMemoryStore({ admins: [HEMA], now: () => new Date(nowMs) })
  await store.updateSettings({ upi_id: 'hema@okaxis' })
  setStore(store)
  ip++
})
afterEach(() => {
  setStore(null)
  vi.useRealTimers()
})

describe('offer dates are Indian dates, both days included', () => {
  it('today in India changes at midnight IST, not UTC', () => {
    expect(istToday(new Date('2026-10-23T18:29:59Z'))).toBe('2026-10-23') // 11:59:59 pm IST
    expect(istToday(new Date('2026-10-23T18:30:00Z'))).toBe('2026-10-24') // midnight IST
  })

  it('live only from the start date to the end date, and never while switched off', () => {
    const o = { active: true, startsOn: '2026-10-24', endsOn: '2026-10-31' }
    expect(offerStatus(o, '2026-10-23')).toBe('scheduled')
    expect(offerStatus(o, '2026-10-24')).toBe('live')
    expect(offerStatus(o, '2026-10-31')).toBe('live')
    expect(offerStatus(o, '2026-11-01')).toBe('ended')
    expect(offerStatus({ ...o, active: false }, '2026-10-26')).toBe('off')
  })

  it('the website picks the live ones, soonest to end first, and drops anything broken', () => {
    const list = [
      { id: 'a', title: { en: 'Later' }, startsOn: '2026-10-25', endsOn: '2026-10-30' },
      { id: 'b', title: { en: 'Ends first', kn: 'ಮೊದಲು' }, startsOn: '2026-10-20', endsOn: '2026-10-26', link: 'product:pista-bar', button: { en: 'Buy' } },
      { id: 'c', title: { en: 'Long one' }, startsOn: '2026-10-01', endsOn: '2026-12-31' },
      { id: 'd', title: { kn: 'no English' }, startsOn: '2026-10-01', endsOn: '2026-12-31' },
      { id: 'e', title: { en: 'Bad link' }, startsOn: '2026-10-01', endsOn: '2026-12-31', link: 'javascript:alert(1)', button: { en: 'x' }, photo: 'javascript:1' },
    ]
    const live = liveOffers(list, '2026-10-24')
    expect(live.map((o) => o.id)).toEqual(['b', 'c', 'e'])
    expect(live[0]).toMatchObject({ href: '/menu?item=pista-bar', button: { en: 'Buy', kn: 'Buy' }, title: { en: 'Ends first', kn: 'ಮೊದಲು' } })
    expect(live[2]).toMatchObject({ href: '', button: null, photo: null })
    expect(liveOffers(list, '2027-01-01')).toEqual([])
    expect(liveOffers(undefined)).toEqual([])
    expect(cleanOffer({ id: 'x', title: { en: 'T' }, startsOn: '2026-10-05', endsOn: '2026-10-01' })).toBeNull()
  })

  it('where the button goes', () => {
    expect(offerHref('category:brownies')).toBe('/menu#brownies')
    expect(offerHref('product:walnut-brownies')).toBe('/menu?item=walnut-brownies')
    expect(offerHref('page:customize')).toBe('/customize')
    expect(offerHref('')).toBe('')
  })

  it('/api/menu sends offers switched on, not ended, starting today (or within 10 minutes)', () => {
    const now = new Date('2026-10-23T18:25:00Z') // 11:55 pm IST on the 23rd
    const row = (id, starts_on, ends_on, active = true) => ({ id, title: { en: id }, starts_on, ends_on, active })
    const sent = publicOffers([row('now', '2026-10-20', '2026-10-23'), row('midnight', '2026-10-24', '2026-10-30'), row('tomorrow-noon-is-later', '2026-10-25', '2026-10-30'), row('over', '2026-10-01', '2026-10-22'), row('off', '2026-10-20', '2026-10-30', false)], now)
    expect(sent.map((o) => o.id)).toEqual(['now', 'midnight'])
    // and the website still shows "midnight" only from midnight
    expect(liveOffers(sent, istToday(now)).map((o) => o.id)).toEqual(['now'])
    expect(liveOffers(sent, '2026-10-24').map((o) => o.id)).toEqual(['midnight'])
  })
})

describe('admin -> Offers', () => {
  it('add, schedule, turn off, edit and delete; the website gets only the live ones', async () => {
    let s = await login()
    expect((await act(s, 'offers')).body.offers).toEqual([])

    // What Hema must fill in, in plain words on the page
    const bad = await act(s, 'saveOffer', offerBody({ title: { en: '', kn: 'ಕನ್ನಡ' }, link: 'product:no-such-thing', startsOn: day(3), endsOn: day(1) }))
    expect(bad.status).toBe(400)
    expect(bad.body.fields).toEqual({ title: 'required', link: 'invalid', endsOn: 'beforeStart' })
    expect((await act(s, 'saveOffer', offerBody({ startsOn: day(-9), endsOn: day(-2) }))).body.fields).toEqual({ endsOn: 'past' })

    const live = await act(s, 'saveOffer', offerBody())
    expect(live.status).toBe(200)
    const later = await act(s, 'saveOffer', offerBody({ title: { en: 'Next week' }, link: 'product:walnut-brownies', button: { en: '' }, startsOn: day(7), endsOn: day(9) }))
    const byId = (r, id) => r.body.offers.find((o) => o.id === id)
    expect(byId(later, live.body.id)).toMatchObject({ status: 'live', titleEn: 'Diwali boxes', titleKn: 'ದೀಪಾವಳಿ ಬಾಕ್ಸ್', link: 'category:delight-boxes', buttonEn: 'See boxes' })
    expect(byId(later, later.body.id)).toMatchObject({ status: 'scheduled', buttonEn: '' })
    expect(later.body.offers.map((o) => o.status)).toEqual(['live', 'scheduled'])
    expect(later.body.links).toContainEqual(expect.objectContaining({ value: 'product:walnut-brownies' }))

    let m = await menu()
    expect(m.offers.map((o) => o.title.en)).toEqual(['Diwali boxes'])
    expect(m.offers[0]).toMatchObject({ link: 'category:delight-boxes', startsOn: day(0), endsOn: day(5), message: { en: 'Order by Sunday.' } })

    // A week later the scheduled one is live and the first has ended
    nowMs += 7 * 86_400_000
    vi.setSystemTime(nowMs)
    s = await login() // a week later she logs in again
    const week = await act(s, 'offers')
    expect(week.body.offers.map((o) => [o.titleEn, o.status])).toEqual([
      ['Next week', 'live'],
      ['Diwali boxes', 'ended'],
    ])
    m = await menu()
    expect(m.offers.map((o) => o.title.en)).toEqual(['Next week'])

    // Turn off: gone from the website at once, still in the list as "Off"
    const off = await act(s, 'setOfferActive', { id: later.body.id, active: false })
    expect(byId(off, later.body.id).status).toBe('off')
    expect((await menu()).offers).toEqual([])
    // Edit: new dates and words, turned back on
    const edit = await act(s, 'saveOffer', offerBody({ id: later.body.id, title: { en: 'Ragi walnut brownies' }, link: 'product:walnut-brownies', startsOn: day(0), endsOn: day(3), active: true }))
    expect(byId(edit, later.body.id)).toMatchObject({ titleEn: 'Ragi walnut brownies', status: 'live' })
    expect((await menu()).offers.map((o) => o.title.en)).toEqual(['Ragi walnut brownies'])

    // Delete
    const del = await act(s, 'deleteOffer', { id: later.body.id })
    expect(del.body.offers.map((o) => o.id)).toEqual([live.body.id])
    expect((await act(s, 'deleteOffer', { id: later.body.id })).status).toBe(404)
    // Anything that isn't an offer's id is "not found", never a server error
    for (const action of ['deleteOffer', 'setOfferActive', 'saveOffer']) expect((await act(s, action, { ...offerBody(), id: 'not-an-id', active: false })).status).toBe(404)
    expect((await menu()).offers).toEqual([])
  })

  it('a banner photo in two sizes, and taking it away', async () => {
    const s = await login()
    const { id } = (await act(s, 'saveOffer', offerBody())).body
    const r = await act(s, 'offerPhoto', { id, image: webpOf(1), imageSmall: webpOf(2) })
    const photo = r.body.offers[0].photo
    expect(photo).toMatch(new RegExp(`^/api/photo/offer-${id}/\\d+-1200\\.webp$`))
    expect((await call(photoFn, null, { method: 'GET', path: photo.replace('-1200', '-600') })).status).toBe(200)
    expect((await menu()).offers[0].photo).toBe(photo)
    expect((await act(s, 'offerPhoto', { id, image: 'data:image/png;base64,PGh0bWw+' })).body.fields).toEqual({ photo: 'image' })
    expect((await act(s, 'offerPhoto', { id, image: null })).body.offers[0].photo).toBeNull()
    expect((await act(s, 'offerPhoto', { id: 'not-an-offer', image: webpOf(1), imageSmall: webpOf(2) })).status).toBe(404)
  })

  it('only a logged-in admin can see or change offers', async () => {
    for (const action of ['offers', 'saveOffer', 'setOfferActive', 'deleteOffer', 'offerPhoto', 'pagePhotos', 'pagePhoto']) {
      expect((await call(admin, { action, ...offerBody() })).status).toBe(401)
    }
  })

  it('the menu and ordering still work if the offers can’t be read (before the new SQL is run)', async () => {
    store.listOffers = () => Promise.reject(new Error('relation "offers" does not exist'))
    store.listPagePhotos = () => Promise.reject(new Error('relation "page_photos" does not exist'))
    const m = await call(menuFn, null, { method: 'GET' })
    expect(m.status).toBe(200)
    expect(m.body).toMatchObject({ ready: true, offers: [], pagePhotos: {} })
  })

  it('…and also on a database whose store has no offers at all yet (it must never take the menu down)', async () => {
    store.listOffers = undefined
    store.listPagePhotos = undefined
    const m = await call(menuFn, null, { method: 'GET' })
    expect(m.status).toBe(200)
    expect(m.body).toMatchObject({ ready: true, offers: [], pagePhotos: {} })
  })
})

describe('admin -> Menu -> Customize page photos', () => {
  it('each tile shows the product photo until Hema changes it; the website gets hers at once', async () => {
    const s = await login()
    const before = (await act(s, 'pagePhotos')).body.photos
    expect(before.map((t) => t.id)).toEqual(PAGE_PHOTO_IDS)
    expect(before.every((t) => !t.ownPhoto)).toBe(true)
    expect(before.find((t) => t.id === 'customize-box').photo).toMatch(/^\/products\/red-velvet-delight-box-600\.webp/)

    const r = await act(s, 'pagePhoto', { id: 'customize-box', image: webpOf(4), imageSmall: webpOf(5) })
    const tile = r.body.photos.find((t) => t.id === 'customize-box')
    expect(tile).toMatchObject({ ownPhoto: true })
    expect(tile.photo).toMatch(/^\/api\/photo\/page-customize-box\/\d+-1200\.webp$/)
    expect((await call(photoFn, null, { method: 'GET', path: tile.photo })).status).toBe(200)
    expect((await menu()).pagePhotos).toEqual({ 'customize-box': tile.photo })
    // The Red Velvet Delight Box keeps its own photo
    expect((await act(s, 'menu')).body.products.find((p) => p.id === 'red-velvet-delight-box').ownPhoto).toBe(false)

    expect((await act(s, 'pagePhoto', { id: 'customize-box', image: null })).body.photos.find((t) => t.id === 'customize-box').ownPhoto).toBe(false)
    expect((await menu()).pagePhotos).toEqual({})
    expect((await act(s, 'pagePhoto', { id: 'somewhere-else', image: webpOf(1), imageSmall: webpOf(2) })).status).toBe(404)
  })
})

describe('admin -> Menu: products', () => {
  it('a new product with a ragi version: the server prices the ragi extra; Hema can switch it off', async () => {
    const s = await login()
    expect((await act(s, 'addProduct', { category: 'brownies', name: { en: 'Choco Chip Brownies' }, courierTier: 'small', price: 450, ragiPrice: 0 })).body.fields).toEqual({ ragiPrice: 'price' })
    const r = await act(s, 'addProduct', { category: 'brownies', name: { en: 'Choco Chip Brownies', kn: 'ಚಾಕೊ ಚಿಪ್ ಬ್ರೌನಿಗಳು' }, description: { en: 'Five fudgy brownies with chocolate chips.' }, courierTier: 'small', price: 450, ragiPrice: 60 })
    expect(r.body.id).toBe('choco-chip-brownies')
    expect(r.body.products.find((p) => p.id === 'choco-chip-brownies')).toMatchObject({ price: 450, ragiPrice: 60, custom: true })
    // The website builds the same product from /api/menu
    const site = applyOverrides(CONFIG, (await menu()).overrides).find((p) => p.id === 'choco-chip-brownies')
    expect(site).toMatchObject({ price: 450, ragiPrice: 60, name: { en: 'Choco Chip Brownies', kn: 'ಚಾಕೊ ಚಿಪ್ ಬ್ರೌನಿಗಳು' } })

    // Ordered with ragi: 450 + 60 = ₹510 each, ×2 = ₹1,020, + ₹90 courier in Karnataka
    const ok = await call(createOrder, orderBody([{ productId: 'choco-chip-brownies', selection: { ragi: true }, qty: 2, unitPrice: 510 }], 1110))
    expect(ok.status).toBe(201)
    expect(ok.body.order.total).toBe(1110)
    // A browser claiming the ragi version is free is refused (the server's price wins)
    const cheat = await call(createOrder, orderBody([{ productId: 'choco-chip-brownies', selection: { ragi: true }, qty: 1, unitPrice: 450 }], 540))
    expect(cheat.status).toBe(409)

    // Ragi switched off: the product stays, without the ragi choice
    const off = await act(s, 'updateProduct', { id: 'choco-chip-brownies', price: 450, ragiPrice: null })
    expect(off.body.products.find((p) => p.id === 'choco-chip-brownies').ragiPrice).toBeNull()
  })

  it('Edit name keeps the product’s ID, so its price, photo and old orders stay right', async () => {
    const s = await login()
    const placed = await call(createOrder, orderBody([{ productId: 'almond-bar', selection: {}, qty: 1, unitPrice: 150 }], 240))
    expect(placed.status).toBe(201)
    await act(s, 'productPhoto', { id: 'almond-bar', image: webpOf(1), imageSmall: webpOf(2) })
    const r = await act(s, 'updateProduct', { id: 'almond-bar', name: { en: 'Roasted Almond Bar', kn: 'ಹುರಿದ ಬಾದಾಮಿ ಬಾರ್' } })
    const p = r.body.products.find((x) => x.id === 'almond-bar')
    expect(p).toMatchObject({ id: 'almond-bar', name: 'Roasted Almond Bar', nameKn: 'ಹುರಿದ ಬಾದಾಮಿ ಬಾರ್', price: 150, ownPhoto: true })
    expect(r.body.products.filter((x) => /almond/.test(x.id)).map((x) => x.id)).toEqual(['almond-bar'])
    // The old order keeps the product and the name it was ordered under
    const old = await act(s, 'order', { code: placed.body.order.code })
    expect(old.body.order.items[0]).toMatchObject({ productId: 'almond-bar', name: { en: 'Almond Bar' } })
    // A new order uses the same ID and the same price
    expect((await call(createOrder, orderBody([{ productId: 'almond-bar', selection: {}, qty: 1, unitPrice: 150 }], 240))).status).toBe(201)
  })

  it('a description is at most 200 letters, in English and Kannada', async () => {
    const s = await login()
    const long = 'ಚಾ'.repeat(150)
    const r = await act(s, 'updateProduct', { id: 'pista-bar', description: { en: 'x'.repeat(250), kn: long } })
    const p = r.body.products.find((x) => x.id === 'pista-bar')
    expect(p.description).toHaveLength(200)
    expect(p.descriptionKn).toHaveLength(200)
    expect((await act(s, 'updateProduct', { id: 'pista-bar', description: { en: '', kn: 'ಕನ್ನಡ ಮಾತ್ರ' } })).body.fields).toEqual({ description: 'required' })
  })
})
