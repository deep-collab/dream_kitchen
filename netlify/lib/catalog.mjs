// The menu and settings as they are right now: src/config/shop.js with Hema's admin changes
// on top, through the SAME applyOverrides / applySettings the website uses (src/lib/pricing.js).
// The `menu` function sends the website exactly the inputs used here, so both sides price alike.
// Live offers with a special price lower their products' prices here too (applyOfferPrices, by
// today's Indian date), exactly as the website shows them, and only on the offer's dates.
import { courier, leadTimes, payment, products as CONFIG_PRODUCTS } from '../../src/config/shop.js'
import { applyOverrides, applySettings } from '../../src/lib/pricing.js'
import { config } from './env.mjs'
import { allLiveOffers, applyOfferPrices, istToday } from '../../src/lib/offers.js'
import { publicConfig } from '../../src/lib/siteConfig.js'

const has = (v) => v !== null && v !== undefined

/** A products row -> the override object applyOverrides expects (NULL columns = use the config) */
export function rowToOverride(r) {
  const o = { id: r.id }
  if (has(r.price)) o.price = r.price
  if (has(r.ragi_price)) o.ragiPrice = r.ragi_price
  if (Array.isArray(r.sizes) && r.sizes.length) o.sizes = r.sizes
  if (has(r.sold_out)) o.soldOut = r.sold_out
  if (has(r.active)) o.active = r.active
  if (has(r.price_status)) o.priceStatus = r.price_status
  if (r.photo_url) o.photo = r.photo_url
  if (r.display_name) o.name = r.display_name
  if (r.description) o.description = r.description
  // A product Hema added: the row is the whole product
  if (r.custom) Object.assign(o, { custom: true, category: r.category, courierTier: r.courier_tier, sort: r.sort })
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

// Offers and the developer options' settings are extras: if they can't be read (e.g. before the
// owner ran a migration) the menu and ordering still work, just without them
const extra = (read, fallback) => Promise.resolve().then(read).catch((e) => (console.warn('[catalog] extra data unavailable:', e?.message), fallback))

/** Everything a price check needs, read fresh from the store (`now` decides which offers are live) */
export async function loadCatalog(store, now = new Date()) {
  const [rows, settingsRow, offerRows, configMap] = await Promise.all([
    store.listProducts(),
    store.getSettings(),
    extra(() => store.listOffers(), []),
    extra(() => store.getConfig?.() ?? {}, {}),
  ])
  const overrides = (rows || []).map(rowToOverride).filter((o) => Object.keys(o).length > 1)
  const offers = publicOffers(offerRows, now)
  const products = applyOfferPrices(applyOverrides(CONFIG_PRODUCTS, overrides), allLiveOffers(offers, istToday(now)))
  const settings = applySettings(rowToSettings(settingsRow || {}), settingsBase())
  return { products, productsById: Object.fromEntries(products.map((p) => [p.id, p])), overrides, settings, settingsRow: settingsRow || {}, offers, config: configMap || {} }
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

/** Can a customer pay right now? (UPI set, or Razorpay switched on) */
export const paymentsOpen = (catalog) => Boolean(catalog.settings.payment.upiId) || config.razorpay.enabled

/**
 * Hema's offers for the website: switched on, not ended, and starting today or within the next
 * ten minutes (so one that starts at midnight is there even from a copy cached just before). The
 * website picks the live ones by today's Indian date itself (src/lib/offers.js).
 */
export function publicOffers(rows, now = new Date()) {
  const today = istToday(now)
  const soon = istToday(new Date(now.getTime() + 10 * 60_000))
  return (rows || [])
    .filter((r) => r.active !== false && r.ends_on >= today && r.starts_on <= soon)
    .map((r) => ({
      id: r.id,
      title: r.title,
      message: r.message || null,
      button: r.button || null,
      link: r.link || '',
      photo: r.photo_url || null,
      photoPhone: r.photo_phone_url || null,
      badge: r.badge || null,
      items: r.items || null,
      deal: r.deal || null,
      startsOn: r.starts_on,
      endsOn: r.ends_on,
    }))
}

/** The developer options' settings the website needs (src/lib/siteConfig.js publicConfig) */
export const publicSiteConfig = (map) => publicConfig(map || {})

/** The Customize tiles' photos Hema changed: { [tile]: address } */
export const publicPagePhotos = (rows) => Object.fromEntries((rows || []).filter((r) => r.photo_url).map((r) => [r.id, r.photo_url]))
