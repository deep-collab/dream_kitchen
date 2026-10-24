// The menu and settings as they are right now: src/config/shop.js with Hema's admin changes
// on top, through the SAME applyOverrides / applySettings the website uses (src/lib/pricing.js).
// The `menu` function sends the website exactly the inputs used here, so both sides price alike.
import { categories, courier, leadTimes, payment, products as CONFIG_PRODUCTS } from '../../src/config/shop.js'
import { applyOverrides, applySettings } from '../../src/lib/pricing.js'
import { zonedNow } from '../../src/lib/dates.js'
import { config } from './env.mjs'

const has = (v) => v !== null && v !== undefined

/**
 * A products row -> the override object applyOverrides expects (NULL columns = use the config).
 * r.extras (the product_extras table): Hema's name and description, and `added` for a product
 * she added herself, which then carries its own category, courier tier and place in the list.
 */
export function rowToOverride(r) {
  const o = { id: r.id }
  if (has(r.price)) o.price = r.price
  if (has(r.ragi_price)) o.ragiPrice = r.ragi_price
  if (Array.isArray(r.sizes) && r.sizes.length) o.sizes = r.sizes
  if (has(r.sold_out)) o.soldOut = r.sold_out
  if (has(r.active)) o.active = r.active
  if (has(r.price_status)) o.priceStatus = r.price_status
  if (r.photo_url) o.photo = r.photo_url
  const x = r.extras
  if (x?.name_en) o.name = { en: x.name_en, kn: x.name_kn || '' }
  if (x && has(x.description_en)) o.description = { en: x.description_en, kn: x.description_kn || '' }
  if (x?.added) Object.assign(o, { added: true, category: r.category, courierTier: r.courier_tier, sort: r.sort, name: { en: x.name_en || r.name_en, kn: x.name_kn ?? r.name_kn ?? '' } })
  return o
}

/** The settings row -> the settings object applySettings expects */
export function rowToSettings(r = {}) {
  return {
    upiId: r?.upi_id || undefined,
    upiName: r?.upi_name || undefined,
    upiQr: r?.upi_qr ? `/api/upi-qr?v=${Date.parse(r.updated_at || 0) || 0}` : undefined,
    leadStandard: r?.lead_standard ?? undefined,
    leadDrawingExtra: r?.lead_drawing_extra ?? undefined,
    courierRates: r?.courier_rates || undefined,
    storeOpen: r?.store_open !== false,
    closedMessage: r?.closed_message || '',
    announcement: r?.announcement || '',
  }
}

/** Config defaults, with the UPI_ID environment variable as the UPI default */
export const settingsBase = () => ({ courier, leadTimes, payment: { ...payment, upi: { ...payment.upi, id: config.upiId || payment.upi.id } } })

/** The reference columns of a products row, from the config (scripts/seed-menu.mjs, admin saves) */
export const productRow = (p) => ({
  id: p.id,
  slug: p.slug,
  category: p.category,
  name_en: p.name.en,
  name_kn: p.name.kn || '',
  options: p.options || {},
  courier_tier: p.courierTier || 'small',
  sort: p.sort,
  image: p.art || null,
})

/** Everything a price check needs, read fresh from the store */
export async function loadCatalog(store) {
  const [rows, settingsRow] = await Promise.all([store.listProducts(), store.getSettings()])
  const overrides = (rows || []).map(rowToOverride).filter((o) => Object.keys(o).length > 1)
  const products = applyOverrides(CONFIG_PRODUCTS, overrides)
  const settings = applySettings(rowToSettings(settingsRow || {}), settingsBase())
  return { products, productsById: Object.fromEntries(products.map((p) => [p.id, p])), overrides, settings, settingsRow: settingsRow || {} }
}

/**
 * What the website needs: the overrides and the settings as applySettings input (already
 * resolved, so the website gets the same result without knowing the environment variables).
 */
export function publicMenu(catalog) {
  const s = catalog.settings
  return {
    overrides: catalog.overrides,
    settings: {
      courierRates: s.courier.rates,
      leadStandard: s.leadTimes.standardBusinessDays,
      leadDrawingExtra: s.leadTimes.drawingExtraBusinessDays,
      upiId: s.payment.upiId,
      upiName: s.payment.upiName,
      upiQr: s.payment.upiQr,
      storeOpen: s.store.open,
      closedMessage: s.store.closedMessage,
      announcement: s.store.announcement,
    },
    razorpay: config.razorpay.enabled ? { enabled: true, keyId: config.razorpay.keyId } : { enabled: false },
  }
}

/* ---------------- offers and Customize page photos (display only, never a price) ---------------- */

/** Where an offer's button goes on the website, or null when that category or product is gone */
export function offerLink(type, id, productsById) {
  if (type === 'category') {
    if (id === 'customize') return '/customize'
    return categories.some((c) => c.id === id && !c.hidden) ? `/menu#${id}` : null
  }
  if (type === 'product') {
    const p = productsById[id]
    if (!p || p.active === false) return null
    return p.menu === false ? '/customize' : `/menu?item=${encodeURIComponent(p.slug)}`
  }
  return null
}

/** On, and today (Indian date) is between its start and end dates, both included */
export const offerIsLive = (row, today) => Boolean(row.active) && row.starts_on <= today && today <= row.ends_on

export const MAX_LIVE_OFFERS = 6
const pair = (en, kn) => (en ? { en, kn: kn || '' } : null)

/**
 * The offers live today and Hema's Customize page tile photos, as the website shows them.
 * The button appears only when it has words and somewhere to go.
 */
export function publicShowcase(offerRows, tileRows, catalog, now = new Date()) {
  const today = zonedNow(now).date
  const offers = (offerRows || [])
    .filter((r) => offerIsLive(r, today))
    .sort((a, b) => (a.starts_on < b.starts_on ? -1 : a.starts_on > b.starts_on ? 1 : a.created_at < b.created_at ? -1 : 1))
    .slice(0, MAX_LIVE_OFFERS)
    .map((r) => {
      const link = offerLink(r.link_type, r.link_id, catalog.productsById)
      return {
        id: r.id,
        title: pair(r.title_en, r.title_kn),
        message: pair(r.message_en, r.message_kn),
        photo: r.photo_url || null,
        button: link ? pair(r.button_en, r.button_kn) : null,
        link: link && r.button_en ? link : null,
      }
    })
  return { offers, tilePhotos: Object.fromEntries((tileRows || []).map((r) => [r.tile, r.photo_url])) }
}

/** Can a customer pay right now? (UPI set, or Razorpay switched on) */
export const paymentsOpen = (catalog) => Boolean(catalog.settings.payment.upiId) || config.razorpay.enabled
