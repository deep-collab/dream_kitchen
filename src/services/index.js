/*
  Data layer. Every component gets data ONLY through these functions.
  Phase 1: local sample data + browser storage.
  Phase 2: swap the bodies for Supabase calls; keep the same names and return shapes.
*/
import { categories, products } from '../data/products'
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

/* ---------- products ---------- */
export async function getCategories() {
  return categories
}

export async function getProducts({ category, search, sort, bestSellers } = {}) {
  let list = products.slice()
  if (category && category !== 'all') list = list.filter((p) => p.category === category)
  if (bestSellers) list = list.filter((p) => p.tags.includes('bestseller'))
  if (search) {
    const q = search.trim().toLowerCase()
    list = list.filter((p) =>
      [p.name.en, p.name.kn, p.description.en, p.description.kn, ...p.tags].some((s) => s.toLowerCase().includes(q)),
    )
  }
  if (sort === 'price-asc') list.sort((a, b) => a.price - b.price)
  if (sort === 'price-desc') list.sort((a, b) => b.price - a.price)
  if (sort === 'name') list.sort((a, b) => a.name.en.localeCompare(b.name.en))
  // sold-out items always go last
  list.sort((a, b) => Number(a.soldOut) - Number(b.soldOut))
  return list
}

export async function getProduct(slug) {
  return products.find((p) => p.slug === slug) || null
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
