/*
  Hema's offers (admin -> Offers) and the photos of the Customize tiles (admin -> Menu ->
  Customize page). Pure functions shared by the website, the admin and the server.

  An offer is a banner at the top of Home (and a slim strip on the Menu page) with her title,
  short message, optional photo (a wide one for computers, a 16:9 one for phones) and one button.
  Since 26 Oct 2026 an offer can also hold products (whole menu sections and/or single products):
  its button then opens the menu showing only them ("Shop the offer"), each with the offer's badge.
  An offer with a special price (`deal`) changes those products' prices during its dates, on the
  website AND on the server (applyOfferPrices, used by both, like applyOverrides), so the price a
  customer sees is the price charged. Without a deal it never changes a price.
  Dates are Indian calendar dates (IST), both days included: an offer from 24 Oct to 31 Oct shows
  from midnight on the 24th to midnight at the end of the 31st, Indian time.

  Kannada Rajyotsava (27 Oct 2026; its stored words: src/lib/rajyotsava.js, kept out of the
  website's code so English visitors download no Kannada): one offer with a fixed id, made by the database migration
  (d1/migrations/0004, supabase 20261027000001): 50% off every product, 1 to 30 November, online
  orders only. While it is live the website shows its popup, the "Offer Zone" button in the header,
  its banner on Home and the faint waving Karnataka flag; Hema turns it off, moves its dates or
  changes the percent in admin -> Offers, and all of that stops or changes with it.
*/
import { optionPrices as OPTION_PRICES } from '../config/shop.js'

export const OFFER_MAX = { title: 60, message: 120, button: 24, badge: 24 }
// How many products / sections one offer may hold, and the biggest discount (keeps a typo harmless)
export const OFFER_ITEMS_MAX = 60
export const DEAL_MAX = { percent: 90, amount: 100000 }
// More than this many live offers at once: the first ones show (the banner stays quick to read)
export const MAX_LIVE_OFFERS = 5
// How many sizes one product may have (admin -> Menu); exact offer prices can be given for each
export const MAX_SIZES = 12

export const RAJYOTSAVA = { id: '20261101-0000-4000-8000-000000000001', startsOn: '2026-11-01', endsOn: '2026-11-30', percent: 50 }

/** The Offer Zone: the menu with every product of the Rajyotsava offer (src/pages/Menu.jsx) */
export const OFFER_ZONE = 'zone'
export const OFFER_ZONE_HREF = `/menu?offer=${OFFER_ZONE}`

/** The Rajyotsava offer among today's live offers (cleaned), or null */
export const rajyotsavaLive = (live) => (Array.isArray(live) ? live : []).find((o) => o?.id === RAJYOTSAVA.id && o.items && o.deal?.kind === 'percent') || null

/** Today's date in India ("2026-10-23"). India has no summer time, so a fixed +5:30 is exact. */
export const istToday = (now = new Date()) => new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10)

/** 'off' (switched off) | 'scheduled' (starts later) | 'live' | 'ended' */
export function offerStatus(offer, today = istToday()) {
  if (!offer.active) return 'off'
  if (today < offer.startsOn) return 'scheduled'
  if (today > offer.endsOn) return 'ended'
  return 'live'
}

/**
 * Where an offer's button goes. Stored as one word pair:
 *   'category:<id>' (that menu section), 'product:<id>' (that product's sheet), 'page:customize'.
 *   '' = no button (the banner just shows the message).
 */
export const LINK_PATTERN = /^(|category:[a-z0-9-]{2,40}|product:[a-z0-9][a-z0-9-]{1,59}|page:customize)$/

/** The website address for an offer's link ('' when there is none) */
export function offerHref(link) {
  const [kind, id] = String(link || '').split(':')
  if (kind === 'category') return `/menu#${id}`
  if (kind === 'product') return `/menu?item=${id}`
  if (kind === 'page' && id === 'customize') return '/customize'
  return ''
}

const pair = (v, max) => {
  if (!v || typeof v !== 'object') return null
  const en = String(v.en ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  if (!en) return null
  const kn = String(v.kn ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
  return { en, kn: kn || en }
}
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
export const isPhotoUrl = (v) => typeof v === 'string' && v.length <= 500 && /^(https:\/\/|\/api\/photo\/)/.test(v)
const ID = /^[a-z0-9][a-z0-9-]{1,59}$/
const SIZE_ID = /^[a-z0-9-]{1,20}$/
const whole = (v, max) => Number.isInteger(v) && v > 0 && v <= max

/**
 * { categories: [...], products: [...] } with only well-formed ids, or null when it holds nothing.
 * { all: true, ... }: every product on the website (e.g. "50% off everything").
 */
export function cleanItems(v) {
  if (!v || typeof v !== 'object') return null
  const list = (a) => [...new Set((Array.isArray(a) ? a : []).filter((id) => typeof id === 'string' && ID.test(id)))].slice(0, OFFER_ITEMS_MAX)
  const all = v.all === true
  const categories = all ? [] : list(v.categories)
  const products = all ? [] : list(v.products)
  if (all) return { all: true, categories, products }
  return categories.length || products.length ? { categories, products } : null
}

/**
 * A special price, or null:
 *   { kind: 'percent', value: 1..90, drawing? }   { kind: 'amount', value: ₹ off each item }
 *   { kind: 'prices', prices: { [product]: ₹ | { [size]: ₹ } } }   (an exact price per product / size)
 * A percent off lowers every size and the ragi version too; the drawing add-on keeps its price
 * unless `drawing: true` (Hema's choice, admin -> Offers).
 */
export function cleanDeal(v) {
  if (!v || typeof v !== 'object') return null
  if (v.kind === 'percent') return whole(v.value, DEAL_MAX.percent) ? { kind: 'percent', value: v.value, ...(v.drawing === true ? { drawing: true } : {}) } : null
  if (v.kind === 'amount') return whole(v.value, DEAL_MAX.amount) ? { kind: 'amount', value: v.value } : null
  if (v.kind !== 'prices' || !v.prices || typeof v.prices !== 'object') return null
  const prices = {}
  for (const [id, p] of Object.entries(v.prices).slice(0, OFFER_ITEMS_MAX)) {
    if (!ID.test(id)) continue
    if (whole(p, DEAL_MAX.amount)) prices[id] = p
    else if (p && typeof p === 'object') {
      const sizes = Object.fromEntries(Object.entries(p).filter(([s, x]) => SIZE_ID.test(s) && whole(x, DEAL_MAX.amount)).slice(0, MAX_SIZES))
      if (Object.keys(sizes).length) prices[id] = sizes
    }
  }
  return Object.keys(prices).length ? { kind: 'prices', prices } : null
}

/**
 * An offer as the website gets it from /api/menu, checked again in the browser so a bad row
 * never breaks the page. -> { id, title, message, button, href, photo, photoPhone, badge, items,
 * deal, startsOn, endsOn } or null. An offer with products always has a button: "Shop the offer",
 * to the menu showing only them.
 */
export function cleanOffer(o) {
  if (!o || typeof o.id !== 'string') return null
  const title = pair(o.title, OFFER_MAX.title)
  if (!title || !isDate(o.startsOn) || !isDate(o.endsOn) || o.endsOn < o.startsOn) return null
  const items = cleanItems(o.items)
  const href = items ? offerMenuHref(o.id) : LINK_PATTERN.test(o.link || '') ? offerHref(o.link) : ''
  return {
    id: o.id,
    title,
    message: pair(o.message, OFFER_MAX.message),
    button: href ? pair(o.button, OFFER_MAX.button) : null,
    href,
    photo: isPhotoUrl(o.photo) ? o.photo : null,
    photoPhone: isPhotoUrl(o.photoPhone) ? o.photoPhone : null,
    badge: pair(o.badge, OFFER_MAX.badge),
    items,
    deal: items ? cleanDeal(o.deal) : null,
    startsOn: o.startsOn,
    endsOn: o.endsOn,
    active: o.active !== false,
  }
}

/** The menu showing only this offer's products ('all': every live offer's products) */
export const offerMenuHref = (id) => `/menu?offer=${encodeURIComponent(id)}`

const byEnd = (a, b) => (a.endsOn < b.endsOn ? -1 : a.endsOn > b.endsOn ? 1 : 0)

/** Every offer live today, cleaned, the soonest to end first (all of them: for prices and badges) */
export const allLiveOffers = (list, today = istToday()) =>
  (Array.isArray(list) ? list : [])
    .map(cleanOffer)
    .filter((o) => o && offerStatus(o, today) === 'live')
    .sort(byEnd)

/** The offers to show right now, in Hema's order (the soonest to end first) */
export const liveOffers = (list, today = istToday()) => allLiveOffers(list, today).slice(0, MAX_LIVE_OFFERS)

/** Is this product in the offer (by itself, or through its menu section)? */
export const inOffer = (offer, product) =>
  Boolean(offer?.items && (offer.items.all || offer.items.products.includes(product.id) || offer.items.categories.includes(product.category)))

/** The offer's price for one base price (a size's or the product's), or null when it doesn't lower it */
function dealPrice(deal, product, sizeId, price) {
  if (!deal || !Number.isFinite(price)) return null
  let next = null
  if (deal.kind === 'percent') next = percentOff(price, deal.value)
  else if (deal.kind === 'amount') next = price - deal.value
  else if (deal.kind === 'prices') {
    const p = deal.prices[product.id]
    next = typeof p === 'number' ? (sizeId ? null : p) : p && sizeId ? (p[sizeId] ?? null) : null
  }
  if (next == null) return null
  next = Math.max(1, next)
  return next < price ? next : null
}

/** 50% off ₹549 = ₹275: rounded to the nearest rupee (halves up), never below ₹1 */
export const percentOff = (price, percent) => Math.max(1, Math.round((price * (100 - percent)) / 100))

/**
 * The menu with the live offers on top: each product in an offer gets `offer` ({ id, badge, title,
 * deal, was }) and, when the offer has a special price that lowers it, the new price (sizes too). A
 * percent off also lowers the ragi version's extra; the drawing add-on keeps its price unless the
 * offer says `drawing: true` (then the product carries its own `drawingPrice`). In two offers at
 * once: the lower price wins. The website and the server call this with the same offers and the
 * same Indian date, so they always agree.
 *   was: the regular prices ({ price } or { sizes: { [size]: price } }, plus ragiPrice / drawingPrice
 *        when those changed) when a price changed, else null
 */
export function applyOfferPrices(products, offers, base = { drawing: OPTION_PRICES.drawing }) {
  const live = (offers || []).filter((o) => o?.items)
  if (!live.length) return products
  const low = (x) => (x.sizes?.length ? Math.min(...x.sizes.map((s) => s.price)) : x.price)
  return products.map((p) => {
    let best = null
    for (const o of live) {
      if (!inOffer(o, p)) continue
      const next = { ...p }
      const was = {}
      if (p.sizes?.length) {
        next.sizes = p.sizes.map((s) => {
          const d = dealPrice(o.deal, p, s.id, s.price)
          if (d == null) return s
          was.sizes = Object.fromEntries(p.sizes.map((x) => [x.id, x.price]))
          return { ...s, price: d }
        })
      } else {
        const d = dealPrice(o.deal, p, null, p.price)
        if (d != null) {
          next.price = d
          was.price = p.price
        }
      }
      // A percent off: the ragi version is the same product, so its extra comes down too
      if (o.deal?.kind === 'percent' && Number.isFinite(p.ragiPrice) && (was.sizes || was.price != null)) {
        const r = percentOff(p.ragiPrice, o.deal.value)
        if (r < p.ragiPrice) {
          next.ragiPrice = r
          was.ragiPrice = p.ragiPrice
        }
      }
      // The drawing add-on: full price unless Hema ticked "the drawing too"
      if (o.deal?.kind === 'percent' && o.deal.drawing && p.options?.drawing === true && Number.isFinite(base.drawing)) {
        next.drawingPrice = percentOff(base.drawing, o.deal.value)
        was.drawingPrice = base.drawing
      }
      const changed = Object.keys(was).length > 0
      // title and deal: for the order line's words ("Rajyotsava 50% off", src/lib/rajyotsava.js)
      next.offer = { id: o.id, badge: o.badge, title: o.title, deal: o.deal, was: changed ? was : null }
      // A changed price beats a badge alone; the lower price beats a higher one
      if (!best || (changed && !best.offer.was) || (changed && low(next) < low(best))) best = next
    }
    return best || p
  })
}

/** The product at its regular prices (for the crossed-out price of the chosen choices), or null */
export function regularVersion(product) {
  const was = product?.offer?.was
  if (!was) return null
  const next = { ...product }
  if (was.sizes) next.sizes = product.sizes.map((s) => ({ ...s, price: was.sizes[s.id] ?? s.price }))
  if (was.price != null) next.price = was.price
  if (was.ragiPrice != null) next.ragiPrice = was.ragiPrice
  delete next.drawingPrice
  return next
}

/** The regular "from" price of a product whose price an offer lowered (for the crossed-out price) */
export function regularFrom(product) {
  const was = product?.offer?.was
  if (!was) return null
  if (was.sizes) return Math.min(...Object.values(was.sizes))
  return was.price ?? null
}

/**
 * What an order's offers took off, from its lines (netlify/lib/orders.mjs snapshotItem): for the
 * totals on the order page, Track Order, the packing slip and the emails.
 *   -> { regularSubtotal, saved, labels: [{ en, kn }] } or null when no offer lowered a price
 */
export function orderSavings(items) {
  const offered = (items || []).filter((i) => i?.offer && Number.isFinite(i.regularLineTotal) && Number.isFinite(i.lineTotal))
  if (!offered.length) return null
  const saved = offered.reduce((sum, i) => sum + (i.regularLineTotal - i.lineTotal), 0)
  if (saved <= 0) return null
  const labels = [...new Map(offered.map((i) => [i.offer.label?.en || i.offer.id, i.offer.label || { en: 'Offer' }])).values()]
  const regularSubtotal = (items || []).reduce((sum, i) => sum + (i.offer ? i.regularLineTotal : i.lineTotal || 0), 0)
  return { regularSubtotal, saved, labels }
}

/*
  The photos on the Customize page and Home's customise tile and card. Each has its own photo
  Hema can change (admin -> Menu -> Customize page); until she does, it shows the product photo
  named here (the photo that was always there).
*/
export const PAGE_PHOTOS = [
  { id: 'customize-box', fallback: 'red-velvet-delight-box', art: 'delight-box', name: 'Customize page: “Delight Box with a name or a drawing”' },
  { id: 'customize-bar', fallback: 'drawing-chocolate-bar', art: 'drawing-bar', name: 'Customize page: “Drawing Chocolate Bar”' },
  { id: 'home-customize', fallback: 'drawing-chocolate-bar', art: 'drawing-bar', name: 'Home page: the “Customize” tile and the hand-drawn chocolates card' },
]
export const PAGE_PHOTO_IDS = PAGE_PHOTOS.map((p) => p.id)

/** { [slot id]: photo address } from /api/menu, keeping only known slots and real addresses */
export function cleanPagePhotos(map) {
  const out = {}
  for (const id of PAGE_PHOTO_IDS) if (isPhotoUrl(map?.[id])) out[id] = map[id]
  return out
}
