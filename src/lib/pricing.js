/*
  THE shared pricing module. Pure functions only (no React, no browser, no storage), imported by
  the website AND by the Netlify Functions, so the price a customer sees and the price the server
  charges come from the same code. Covered by tests/pricing.test.js and tests/courier.test.js.

  Inputs come from src/config/shop.js (with Hema's admin changes applied by applyOverrides /
  applySettings). All amounts are whole rupees.
*/
import { categories as CATEGORIES, courier as COURIER, leadTimes as LEAD_TIMES, limits as LIMITS, optionPrices as OPTION_PRICES, payment as PAYMENT } from '../config/shop.js'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** 1499 -> "₹1,499", 150000 -> "₹1,50,000" (Indian grouping, no decimals) */
export const formatINR = (amount) => `₹${inr.format(Math.round(amount))}`

/* ======================= products and selections ======================= */

export const sizeOf = (product, sizeId) => product.sizes?.find((s) => s.id === sizeId) || null
export const hasSizes = (product) => (product.sizes?.length || 0) > 0
export const hasRagi = (product) => Number.isFinite(product.ragiPrice)
export const hasNameOption = (product) => product.options?.name === true
export const drawingIncluded = (product) => product.options?.drawing === 'included'
export const hasDrawingOption = (product) => product.options?.drawing === true || drawingIncluded(product)

/** Has a price the customer can pay right now (tubs without confirmed prices say "coming soon") */
export function hasPrice(product) {
  if (product.priceStatus !== 'live') return false
  return hasSizes(product) ? product.sizes.every((s) => Number.isFinite(s.price) && s.price > 0) : Number.isFinite(product.price) && product.price > 0
}

/** Can go in the cart: on the menu, not sold out, and priced */
export const isForSale = (product) => Boolean(product && product.active !== false && !product.soldOut && hasPrice(product))

/** First size preselected, nothing extra */
export function defaultSelection(product) {
  return {
    size: hasSizes(product) ? product.sizes[0].id : null,
    ragi: false,
    name: '',
    drawing: drawingIncluded(product),
    drawingText: '',
    drawingRef: null,
  }
}

/** True when this selection carries a drawing (always for the Drawing Chocolate Bar) */
export const selectionHasDrawing = (product, sel) => drawingIncluded(product) || Boolean(product.options?.drawing === true && sel?.drawing)

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

// Name on the box: English or Kannada letters, digits, spaces and a little punctuation.
// (U+200C/U+200D are the joiners Kannada keyboards insert.)
const NAME_CHARS = /^[\p{Script=Latin}\p{Script=Kannada}‌‍0-9 .,'&!?-]*$/u
// Drawing description: no control characters; anything else people type is fine.
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
// Uploaded reference photo, as returned by the upload function
export const DRAWING_REF_PATTERN = /^refs\/\d{8}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(webp|jpg|png)$/

/**
 * The selection with irrelevant or empty values removed, so equal choices compare equal and the
 * server stores exactly what was priced. Never adds options the product doesn't offer.
 */
export function normaliseSelection(product, sel = {}, lim = LIMITS) {
  const s = { ...defaultSelection(product), ...sel }
  const drawing = selectionHasDrawing(product, s)
  return {
    size: hasSizes(product) ? s.size || null : null,
    ragi: hasRagi(product) ? Boolean(s.ragi) : false,
    name: hasNameOption(product) ? clean(s.name).slice(0, lim.nameOnBoxMax) : '',
    drawing,
    drawingText: drawing ? clean(s.drawingText).slice(0, lim.drawingTextMax) : '',
    drawingRef: drawing && typeof s.drawingRef === 'string' && DRAWING_REF_PATTERN.test(s.drawingRef) ? s.drawingRef : null,
  }
}

/**
 * What's wrong with a selection: { field: code } (empty = fine). Used by the sheet (to show
 * errors) and by the server (to refuse the order). The text a customer typed is checked as typed.
 *   product: 'unavailable' (removed, sold out or no price yet)   size: 'required' | 'unknown'
 *   name: 'long' | 'chars'   drawingText: 'required' | 'long' | 'chars'   drawingRef: 'invalid'
 */
export function selectionErrors(product, sel = {}, lim = LIMITS) {
  const errors = {}
  if (!isForSale(product)) errors.product = 'unavailable'
  if (hasSizes(product)) {
    if (!sel.size) errors.size = 'required'
    else if (!sizeOf(product, sel.size)) errors.size = 'unknown'
  }
  if (hasNameOption(product) && sel.name) {
    const name = clean(sel.name)
    if (name.length > lim.nameOnBoxMax) errors.name = 'long'
    else if (!NAME_CHARS.test(name)) errors.name = 'chars'
  }
  if (selectionHasDrawing(product, sel)) {
    const text = clean(sel.drawingText)
    if (text.length < lim.drawingTextMin) errors.drawingText = 'required'
    else if (text.length > lim.drawingTextMax) errors.drawingText = 'long'
    else if (CONTROL.test(sel.drawingText)) errors.drawingText = 'chars'
    if (sel.drawingRef != null && !(typeof sel.drawingRef === 'string' && DRAWING_REF_PATTERN.test(sel.drawingRef))) errors.drawingRef = 'invalid'
  }
  return errors
}

/**
 * Price of one item with these choices: size price (or the fixed price) + ragi + drawing.
 * The name on the box is free. null when the product has no price yet or the size is unknown.
 */
export function unitPrice(product, sel = {}, prices = OPTION_PRICES) {
  if (!hasPrice(product)) return null
  let price
  if (hasSizes(product)) {
    const size = sizeOf(product, sel.size)
    if (!size) return null
    price = size.price
  } else price = product.price
  if (hasRagi(product) && sel.ragi) price += product.ragiPrice
  if (product.options?.drawing === true && sel.drawing) price += prices.drawing
  if (hasNameOption(product) && clean(sel.name)) price += prices.nameOnBox
  return price
}

/** Lowest price a customer can pay ("from ₹650"), or null while the price is coming soon */
export function fromPrice(product) {
  if (!hasPrice(product)) return null
  return hasSizes(product) ? Math.min(...product.sizes.map((s) => s.price)) : product.price
}
export const hasPriceRange = (product) => hasPrice(product) && (product.sizes?.length || 0) > 1

/* ======================= courier ======================= */

const tierRank = (tier, cfg = COURIER) => Math.max(0, cfg.tiers.indexOf(tier))

/** Courier tier of one item: the size's tier (Delight Box 500 g / 700 g = large), else the product's, else small */
export function itemCourierTier(product, sel = {}, cfg = COURIER) {
  const tier = sizeOf(product, sel.size)?.courierTier || product.courierTier || cfg.tiers[0]
  return cfg.tiers.includes(tier) ? tier : cfg.tiers[0]
}

/** The highest tier among the items (one courier charge per order) */
export function cartCourierTier(tiers, cfg = COURIER) {
  if (!tiers.length) return null
  return tiers.reduce((best, t) => (tierRank(t, cfg) > tierRank(best, cfg) ? t : best), cfg.tiers[0])
}

/** "560 001" -> "560001" */
export const normalisePincode = (value) => String(value ?? '').replace(/\s/g, '')

/** null | 'required' | 'format' (Indian pincodes are 6 digits and never start with 0) */
export function pincodeError(value) {
  const pin = normalisePincode(value)
  if (!pin) return 'required'
  return /^[1-9]\d{5}$/.test(pin) ? null : 'format'
}

/** 'karnataka' | 'outside' for a valid pincode, null for an invalid one. The pincode decides the zone. */
export function zoneForPincode(value, cfg = COURIER) {
  const pin = normalisePincode(value)
  if (pincodeError(pin)) return null
  return cfg.karnatakaPrefixes.includes(pin.slice(0, 2)) ? 'karnataka' : 'outside'
}

/** The state the customer picked disagrees with the pincode's zone (warn; the pincode wins) */
export function stateMismatch(stateId, zone) {
  if (!stateId || !zone) return false
  return (stateId === 'karnataka') !== (zone === 'karnataka')
}

/**
 * Courier for the whole order: the highest rate among its tiers in that zone (with Hema's rates
 * in order that is the highest tier's rate; taking the highest rate keeps it right even if she
 * sets a heavier tier cheaper). 0 for an empty cart, null if the zone is unknown.
 */
export function courierCharge(tiers, zone, cfg = COURIER) {
  if (!tiers.length) return 0
  if (!zone) return null
  return Math.max(...[...new Set(tiers)].map((t) => cfg.rates[t]?.[zone] ?? cfg.rates[cfg.tiers[0]][zone]))
}

/** The lowest courier charge anyone pays ("+ courier from ₹90") */
export const courierFrom = (cfg = COURIER) => Math.min(...cfg.tiers.flatMap((t) => Object.values(cfg.rates[t])))

/* ======================= quotes (cart, checkout and the server) ======================= */

/**
 * Prices a whole order.
 *   items: [{ product, selection, qty }]
 *   zone:  'karnataka' | 'outside' | null (unknown yet: courier and total are null)
 * -> { lines: [{ unitPrice, lineTotal, tier, drawing }], subtotal, courierTier, courier, total, hasDrawing }
 * A line with no price (sold out, no price yet) has unitPrice null and is left out of the totals.
 */
export function quote(items, zone, cfg = COURIER, prices = OPTION_PRICES) {
  const lines = items.map(({ product, selection, qty }) => {
    const price = product && isForSale(product) ? unitPrice(product, selection, prices) : null
    return {
      unitPrice: price,
      lineTotal: price == null ? null : price * qty,
      tier: product ? itemCourierTier(product, selection, cfg) : null,
      drawing: product ? selectionHasDrawing(product, selection) : false,
    }
  })
  const priced = lines.filter((l) => l.unitPrice != null)
  const subtotal = priced.reduce((sum, l) => sum + l.lineTotal, 0)
  const tiers = priced.map((l) => l.tier)
  const charge = courierCharge(tiers, zone, cfg)
  return {
    lines,
    subtotal,
    courierTier: cartCourierTier(tiers, cfg),
    courier: charge,
    total: charge == null ? null : subtotal + charge,
    hasDrawing: priced.some((l) => l.drawing),
  }
}

export const clampQty = (q, lim = LIMITS) => Math.max(1, Math.min(lim.maxQtyPerItem, Math.round(Number(q)) || 1))

/* ======================= Hema's admin changes ======================= */

const money = (v) => (Number.isInteger(v) && v > 0 && v <= 100000 ? v : undefined)

/** Limits for Hema's own names and descriptions (the admin checks the same) */
export const PRODUCT_TEXT_MAX = { name: 60, description: 200 }
/** The categories Hema can add products to (the Customize page's items stay in the config) */
export const CUSTOM_CATEGORIES = ['brownie-tubs', 'delight-boxes', 'brownies', 'chocolates']
export const PRODUCT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,59}$/

/** { en, kn } from Hema's text: the English is needed; the Kannada falls back to it */
function textPair(v, max) {
  if (!v || typeof v !== 'object') return undefined
  const en = clean(v.en).slice(0, max)
  if (!en) return undefined
  return { en, kn: clean(v.kn).slice(0, max) || en }
}

/**
 * A product Hema added in the admin (custom: true), before her prices are applied: everything
 * comes from its row. null for anything incomplete, so a bad row never reaches the menu.
 *   o: { id, custom: true, category, name: { en, kn }, description?, courierTier, sort?, price? | sizes?, ragiPrice? }
 */
function customProduct(o) {
  const category = CATEGORIES.find((c) => c.id === o.category && CUSTOM_CATEGORIES.includes(c.id))
  const name = textPair(o.name, PRODUCT_TEXT_MAX.name)
  const tier = COURIER.tiers.includes(o.courierTier) ? o.courierTier : null
  if (typeof o.id !== 'string' || !PRODUCT_ID_PATTERN.test(o.id) || !category || !name || !tier) return null
  const sized = Array.isArray(o.sizes) && o.sizes.length > 0
  return {
    id: o.id,
    slug: o.id,
    category: category.id,
    sort: 100 + (Number.isInteger(o.sort) ? o.sort : 0),
    name,
    art: category.art,
    courierTier: tier,
    priceStatus: 'live',
    options: {},
    active: true,
    soldOut: false,
    custom: true,
    // A ragi version, if she gave it an extra price
    ...(money(o.ragiPrice) ? { ragiPrice: o.ragiPrice } : {}),
    // The sizes' ids and tier; their prices and names come in with the rest of her changes
    ...(sized ? { sizes: o.sizes.filter((s) => s && typeof s.id === 'string').map((s) => ({ id: s.id, courierTier: tier })) } : {}),
  }
}

/**
 * The config menu with Hema's admin changes on top. Both sides call this with the same rows,
 * so they price the same menu. Only known fields with sane values are taken.
 *   overrides: [{ id, price?, ragiPrice?, sizes?: [{ id, grams?, label?, price }], soldOut?, active?, priceStatus?, photo?,
 *                 name?: { en, kn }, description?: { en, kn } }]
 *   plus the products Hema added: { id, custom: true, category, name, description?, courierTier, sort?, price? | sizes? },
 *   listed after the config's, and only once they have a price (or sizes with prices).
 * Sizes: a product with sizes gets new prices for them; a tub may get its sizes defined (Hema
 * sends tub sizes later). Courier tiers come from the config (her own products: the tier she chose).
 */
export function applyOverrides(products, overrides = []) {
  const list = (overrides || []).filter((o) => o && o.id)
  const byId = new Map(list.map((o) => [o.id, o]))
  const known = new Set(products.map((p) => p.id))
  const added = list.filter((o) => o.custom === true && !known.has(o.id)).map(customProduct).filter(Boolean)
  return [...products, ...added]
    .map((p) => {
      const o = byId.get(p.id)
      return o ? withOverride(p, o) : p
    })
    .filter((p) => !p.custom || hasSizes(p) || money(p.price))
}

function withOverride(p, o) {
  const next = { ...p }
  if (money(o.price) && !hasSizes(p)) next.price = o.price
  if (money(o.ragiPrice) && hasRagi(p)) next.ragiPrice = o.ragiPrice
  if (Array.isArray(o.sizes) && o.sizes.length && (hasSizes(p) || p.category === 'brownie-tubs')) {
    const sizes = o.sizes
      .filter((s) => s && typeof s.id === 'string' && /^[a-z0-9-]{1,20}$/.test(s.id) && money(s.price))
      .slice(0, 6)
      .map((s) => {
        const base = sizeOf(p, s.id)
        const grams = Number.isInteger(s.grams) && s.grams > 0 && s.grams < 10000 ? s.grams : base?.grams
        const label = typeof s.label === 'string' && clean(s.label) ? clean(s.label).slice(0, 24) : undefined
        // New tub sizes Hema adds get their tier from the weight (750 g and more = xl)
        const tier = base?.courierTier || (p.category === 'brownie-tubs' && grams >= 750 ? 'xl' : p.courierTier)
        return { id: s.id, price: s.price, ...(grams ? { grams } : {}), ...(label ? { label } : {}), courierTier: tier }
      })
      // Her own products' sizes need a name (there is no weight in the config to name them)
      .filter((s) => !p.custom || s.label || s.grams)
    if (sizes.length || p.custom) next.sizes = sizes
  }
  if (typeof o.soldOut === 'boolean') next.soldOut = o.soldOut
  if (typeof o.active === 'boolean') next.active = o.active
  if (o.priceStatus === 'live' || o.priceStatus === 'coming-soon') next.priceStatus = o.priceStatus
  // A photo Hema uploaded in the admin (Supabase storage, or the practice store's /api/photo/)
  if (typeof o.photo === 'string' && o.photo.length <= 500 && /^(https:\/\/|\/api\/photo\/)/.test(o.photo)) next.photo = o.photo
  // Her name and description (both languages; the Kannada falls back to her English)
  const name = textPair(o.name, PRODUCT_TEXT_MAX.name)
  if (name) next.name = name
  const description = textPair(o.description, PRODUCT_TEXT_MAX.description)
  if (description) next.description = description
  return next
}

const rate = (v) => (Number.isInteger(v) && v >= 0 && v <= 2000 ? v : undefined)
const days = (v) => (Number.isInteger(v) && v >= 0 && v <= 30 ? v : undefined)

/** A UPI ID looks like name@bank (letters, digits, dot, dash, underscore) */
export const isUpiId = (value) => /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.-]{1,32}$/.test(String(value ?? '').trim())

/**
 * Courier rates, lead times, payment and store status: config defaults with Hema's admin
 * settings on top (the server passes the UPI_ID environment variable in as a default).
 *   settings: { courierRates?, leadStandard?, leadDrawingExtra?, upiId?, upiName?, upiQr?, storeOpen?, closedMessage?, announcement? }
 */
export function applySettings(settings = {}, base = { courier: COURIER, leadTimes: LEAD_TIMES, payment: PAYMENT }) {
  const s = settings || {}
  const rates = {}
  for (const tier of base.courier.tiers) {
    rates[tier] = {}
    for (const zone of ['karnataka', 'outside']) rates[tier][zone] = rate(s.courierRates?.[tier]?.[zone]) ?? base.courier.rates[tier][zone]
  }
  const upiId = [s.upiId, base.payment.upi.id].find((v) => isUpiId(v)) || ''
  return {
    courier: { ...base.courier, rates },
    leadTimes: {
      standardBusinessDays: days(s.leadStandard) ?? base.leadTimes.standardBusinessDays,
      drawingExtraBusinessDays: days(s.leadDrawingExtra) ?? base.leadTimes.drawingExtraBusinessDays,
    },
    payment: {
      upiId: String(upiId).trim(),
      upiName: (typeof s.upiName === 'string' && clean(s.upiName).slice(0, 40)) || base.payment.upi.payeeName,
      upiQr: (typeof s.upiQr === 'string' && s.upiQr) || base.payment.upi.qrImage || '',
    },
    store: {
      open: s.storeOpen !== false,
      closedMessage: typeof s.closedMessage === 'string' ? clean(s.closedMessage).slice(0, 200) : '',
      announcement: typeof s.announcement === 'string' ? clean(s.announcement).slice(0, 200) : '',
    },
  }
}

/** upi:// link that opens the customer's UPI app with the amount and the order ID filled in */
export function upiLink({ upiId, name, amount, orderCode }) {
  const params = [
    ['pa', upiId],
    ['pn', name || 'Dream Kitchen'],
    ['am', Number(amount).toFixed(2)], // "650.00": the decimal form every UPI app accepts
    ['cu', 'INR'],
    ['tn', orderCode],
  ]
  // Some UPI apps don't decode %40 in the payee address, so '@' stays as it is
  return `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v).replace(/%40/g, '@')}`).join('&')}`
}

/** UPI transaction reference (UTR): exactly 12 digits */
export const normaliseUtr = (value) => String(value ?? '').replace(/[\s-]/g, '')
export const utrError = (value) => (!normaliseUtr(value) ? 'required' : /^\d{12}$/.test(normaliseUtr(value)) ? null : 'format')
