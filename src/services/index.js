/*
  Data layer. Every component gets data ONLY through these functions.
  Stage A: local data files (src/data) + browser storage.
  Stage B: swap the bodies for Supabase calls; keep the same names and return shapes.
*/
import { categories, occasions } from '../data/categories'
import { products } from '../data/products'
import { combos } from '../data/combos'
import { classes } from '../data/classes'
import { reviews } from '../data/reviews'
import { upcomingBatches } from '../lib/classes'
import { normaliseBookingId } from '../lib/bookingId'
import { normalisePhone } from '../lib/validation'
import { normaliseOrderId } from '../lib/orderId'

const ORDERS_KEY = 'dk_orders_v2'
const LEGACY_ORDERS_KEY = 'dk_orders' // the old sample checkout: read for Track Order only
const LEGACY_SEQ_KEY = 'dk_order_seq'
const CALLBACKS_KEY = 'dk_callbacks'
const BOOKINGS_KEY = 'dk_class_bookings'
const KEEP = 30

const readJSON = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
}
/** A stored list; anything unreadable counts as empty */
const readList = (key) => {
  const v = readJSON(key, [])
  return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []
}
const writeJSON = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked — order still goes out on WhatsApp */
  }
}

/* ---------- menu ---------- */
const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]))

// Dev-only test fixture: Playwright sets window.__dkTestSoldOut = ['product-id', ...]
// to photograph the sold-out state. Production builds drop this branch entirely.
function withFixtures(list) {
  if (!import.meta.env.DEV || typeof window === 'undefined' || !Array.isArray(window.__dkTestSoldOut)) return list
  return list.map((p) => (window.__dkTestSoldOut.includes(p.id) ? { ...p, soldOut: true } : p))
}

const activeProducts = () => withFixtures(products.filter((p) => p.active).sort((a, b) => a.sort - b.sort))

export async function getCategories() {
  return [...categories].sort((a, b) => a.sort - b.sort)
}

export async function getOccasions() {
  return occasions
}

/** Whole menu in one call: categories, products, combos, occasions and a product lookup. */
export async function getMenu() {
  const list = activeProducts()
  return { categories: await getCategories(), products: list, productsById: byId(list), combos: combos.filter((c) => c.active), occasions }
}

/** Search matches English and Kannada product names (case-insensitive). */
export async function getProducts({ categoryId, search } = {}) {
  let list = activeProducts()
  if (categoryId) list = list.filter((p) => p.categoryId === categoryId)
  const q = (search || '').trim().toLowerCase()
  if (q) list = list.filter((p) => p.name.en.toLowerCase().includes(q) || p.name.kn.toLowerCase().includes(q))
  return list
}

export async function getProduct(slug) {
  return activeProducts().find((p) => p.slug === slug) || null
}

export async function getCombos() {
  return combos.filter((c) => c.active)
}

/* ---------- orders ---------- */

/**
 * Saves an order built by lib/order.js (it already carries its ID, see lib/orderId.js)
 * and returns the ID. Stage A: kept on this phone only, for the success page and
 * Track Order. Stage B: also inserts into Supabase `orders` + `order_items` and
 * switches to the database's ID sequence (CLAUDE.md, "Order IDs").
 */
export async function createOrder(order) {
  const saved = readList(ORDERS_KEY).filter((o) => o.id !== order.id)
  writeJSON(ORDERS_KEY, [order, ...saved].slice(0, KEEP))
  try {
    localStorage.removeItem(LEGACY_SEQ_KEY)
  } catch {
    /* storage blocked */
  }
  return order.id
}

/** An order placed on this phone, for the success page (null if not found). */
export async function getSavedOrder(id) {
  return readList(ORDERS_KEY).find((o) => o.id === normaliseOrderId(id)) || null
}

/**
 * Status for Track Order. Needs the ID and the phone number together and returns
 * only what the tracker shows, so it can never list anyone's orders.
 * Stage A: orders saved on this phone (status "received"). Stage B: swap the body
 * for a Supabase RPC, e.g. supabase.rpc('get_order_status', { order_id, phone }).
 * Returns { id, status, placedAt, preferredDate } or null.
 */
export async function getOrderStatus(orderId, phone) {
  const id = normaliseOrderId(orderId)
  const ph = normalisePhone(phone)
  const order = readList(ORDERS_KEY).find((o) => o.id === id && o.customer?.phone === ph)
  if (order) return { id: order.id, status: order.status, placedAt: order.createdAt, preferredDate: order.preferredDate }
  const legacy = readList(LEGACY_ORDERS_KEY).find((o) => o.id === id && o.customer?.phone === ph)
  if (legacy) return { id: legacy.id, status: 'received', placedAt: legacy.createdAt, preferredDate: legacy.deliveryDate || null }
  return null
}

/* ---------- call-backs ---------- */

/**
 * input: { phone, name, time: 'morning'|'afternoon'|'evening'|null, lang }
 * Stage A: kept on this phone (the request itself goes out on WhatsApp).
 * Stage B: also inserted into Supabase `callbacks` for the admin panel.
 * Returns the saved call-back.
 */
export async function createCallback(input) {
  const callback = {
    id: `CB-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    phone: normalisePhone(input.phone),
    name: String(input.name || '').trim(),
    time: input.time || null,
    lang: input.lang || 'en',
    status: 'new',
  }
  writeJSON(CALLBACKS_KEY, [callback, ...readList(CALLBACKS_KEY)].slice(0, KEEP))
  return callback
}

/* ---------- classes ---------- */

/**
 * Active classes, each with its upcoming batches.
 * Stage A: batches come from each class's weekly slot (lib/classes.js).
 * Stage B: read `classes` + `class_batches` (date, time, seats left) instead.
 */
export async function getClasses({ now = new Date() } = {}) {
  return classes
    .filter((c) => c.active)
    .sort((a, b) => a.sort - b.sort)
    .map((c) => ({ ...c, batches: upcomingBatches(c, now) }))
}

/**
 * Saves a booking built by lib/classes.js (it already carries its ID, see
 * lib/bookingId.js). Stage A: kept on this phone only, for the success page.
 * Stage B: also inserts into Supabase `class_bookings` and takes the seats.
 */
export async function createClassBooking(booking) {
  const saved = readList(BOOKINGS_KEY).filter((b) => b.id !== booking.id)
  writeJSON(BOOKINGS_KEY, [booking, ...saved].slice(0, KEEP))
  return booking.id
}

/** A booking made on this phone, for its success page (null if not found). */
export async function getSavedBooking(id) {
  return readList(BOOKINGS_KEY).find((b) => b.id === normaliseBookingId(id)) || null
}

/* ---------- reviews and gallery ---------- */

/** Real reviews only (src/data/reviews.js). The home section is hidden while this is empty. */
export async function getReviews() {
  return reviews.filter((r) => r.approved)
}

/** Gallery photos. None until Hema uploads them (Stage B: Supabase Storage + a `gallery` table). */
export async function getGalleryPhotos() {
  return []
}
