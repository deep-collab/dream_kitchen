/*
  Data layer. Every component gets data ONLY through these functions.
  Stage A: local data files (src/data) + browser storage.
  Stage B: swap the bodies for Supabase calls; keep the same names and return shapes.
*/
import { categories, occasions } from '../data/categories'
import { products } from '../data/products'
import { combos } from '../data/combos'
import { mockOrders } from '../data/mockOrders'
import { site } from '../config/site'
import { addDays, toISODate } from '../lib/format'
import { normaliseOrderId, normalisePhone } from '../lib/validation'

const ORDERS_KEY = 'dk_orders'
const SEQ_KEY = 'dk_order_seq'
const ENQUIRIES_KEY = 'dk_enquiries'

const readJSON = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key))
    return v ?? fallback
  } catch {
    return fallback
  }
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
function nextOrderId() {
  const seq = Number(readJSON(SEQ_KEY, 0)) + 1
  writeJSON(SEQ_KEY, seq)
  return `${site.order.idPrefix}${String(seq).padStart(4, '0')}`
}

/**
 * input: { items:[{productId,name,unitPrice,qty}], customer:{name,phone,address,pincode},
 *          deliveryDate:'YYYY-MM-DD', note, lang }
 * returns the saved order (clean, bot-friendly shape).
 */
export async function createOrder(input) {
  const items = input.items.map((it) => ({
    productId: it.productId,
    name: it.name,
    unitPrice: it.unitPrice,
    qty: it.qty,
    lineTotal: it.unitPrice * it.qty,
  }))
  const pieces = items.reduce((s, it) => s + it.qty, 0)
  const subtotal = items.reduce((s, it) => s + it.lineTotal, 0)
  const deliveryCharge = site.delivery.charge
  const order = {
    id: nextOrderId(),
    createdAt: new Date().toISOString(),
    status: 'received',
    channel: 'whatsapp',
    lang: input.lang || 'en',
    items,
    pieces,
    subtotal,
    deliveryCharge,
    total: subtotal + deliveryCharge,
    customer: {
      name: input.customer.name.trim(),
      phone: normalisePhone(input.customer.phone),
      address: input.customer.address.trim(),
      pincode: input.customer.pincode.trim(),
    },
    deliveryDate: input.deliveryDate,
    note: (input.note || '').trim(),
  }
  writeJSON(ORDERS_KEY, [order, ...readJSON(ORDERS_KEY, [])].slice(0, 50))
  return order
}

// Orders placed from this browser (used by the success page)
export async function getRecentOrder(id) {
  return readJSON(ORDERS_KEY, []).find((o) => o.id === id) || null
}

// Returns only what the tracker needs. Phase 2: Supabase RPC that checks id + phone together.
export async function getOrderStatus(orderId, phone) {
  const id = normaliseOrderId(orderId)
  const ph = normalisePhone(phone)
  const local = readJSON(ORDERS_KEY, []).find((o) => o.id === id && o.customer.phone === ph)
  if (local) return { id: local.id, status: local.status, deliveryDate: local.deliveryDate }
  const mock = mockOrders.find((o) => o.id === id && o.phone === ph)
  if (mock) return { id: mock.id, status: mock.status, deliveryDate: mock.deliveryDate || toISODate(addDays(new Date(), mock.daysFromNow)) }
  return null
}

/* ---------- enquiries ---------- */
export async function createEnquiry(input) {
  const enquiry = {
    id: `ENQ-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    name: input.name.trim(),
    phone: normalisePhone(input.phone),
    type: input.type,
    message: input.message.trim(),
  }
  writeJSON(ENQUIRIES_KEY, [enquiry, ...readJSON(ENQUIRIES_KEY, [])].slice(0, 50))
  return enquiry
}
