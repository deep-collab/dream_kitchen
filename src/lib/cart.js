/*
  Pure cart operations on an array of lines (cart schema v3, Step 6 menu). The CartProvider
  wraps these with React state and localStorage. Covered by tests/cart.test.js.

  A line: { id, productId, selection, qty, unitPrice, name: {en,kn}, art, refThumb? }
    selection: what the customer chose (normaliseSelection in src/lib/pricing.js)
    unitPrice / name: snapshots from when it was added, so the cart count and lines show at once,
    before the menu has loaded; repriceCart() then puts today's price on every line.
    refThumb: a tiny preview of the drawing reference photo (the photo itself is on the server).
*/
import { clampQty, normaliseSelection, unitPrice } from './pricing.js'

let counter = 0
export const newLineId = () => `l${Date.now().toString(36)}${(counter++).toString(36)}`

/** Same product and the same choices -> one line with a bigger quantity */
export const lineKey = (line) => `${line.productId}|${JSON.stringify(line.selection)}`

export function makeLine(product, selection, qty = 1, extra = {}) {
  const sel = normaliseSelection(product, selection)
  return {
    id: newLineId(),
    productId: product.id,
    selection: sel,
    qty: clampQty(qty),
    unitPrice: unitPrice(product, sel),
    name: product.name,
    art: product.art,
    ...(extra.refThumb && sel.drawingRef ? { refThumb: extra.refThumb } : {}),
  }
}

export function addLine(lines, line) {
  const key = lineKey(line)
  const existing = lines.find((l) => lineKey(l) === key)
  if (existing) return lines.map((l) => (l === existing ? { ...l, qty: clampQty(l.qty + line.qty) } : l))
  return [...lines, line]
}

/** Replace line `id` (keeping its place and quantity); an edit that matches another line merges into it */
export function updateLine(lines, id, next) {
  const index = lines.findIndex((l) => l.id === id)
  if (index === -1) return addLine(lines, next)
  const updated = { ...next, id, qty: lines[index].qty }
  const rest = lines.filter((l) => l.id !== id)
  const twin = rest.find((l) => lineKey(l) === lineKey(updated))
  if (twin) return rest.map((l) => (l === twin ? { ...l, qty: clampQty(l.qty + updated.qty) } : l))
  const out = [...lines]
  out[index] = updated
  return out
}

export const setLineQty = (lines, id, qty) => lines.map((l) => (l.id === id ? { ...l, qty: clampQty(qty) } : l))

/** Returns { lines, removed, index } so the caller can offer Undo */
export function removeLine(lines, id) {
  const index = lines.findIndex((l) => l.id === id)
  if (index === -1) return { lines, removed: null, index: -1 }
  return { lines: lines.filter((l) => l.id !== id), removed: lines[index], index }
}

export function restoreLine(lines, line, index) {
  if (lines.some((l) => l.id === line.id)) return lines
  const out = [...lines]
  out.splice(Math.min(Math.max(index, 0), out.length), 0, line)
  return out
}

export const cartCount = (lines) => lines.reduce((n, l) => n + l.qty, 0)

/* ---------- persistence ---------- */

export const CART_STORAGE_KEY = 'dk_cart_v3'
// Older carts held products that no longer exist (the Step 2–5 menu): dropped
export const LEGACY_CART_KEYS = ['dk_cart', 'dk_cart_v2']

const isValidLine = (l) =>
  l && typeof l.id === 'string' && typeof l.productId === 'string' && l.selection && typeof l.selection === 'object' && Number.isFinite(l.qty) && l.qty >= 1 && l.name?.en

export function parseStoredCart(raw) {
  try {
    const data = JSON.parse(raw)
    if (!data || data.version !== 3 || !Array.isArray(data.lines)) return []
    return data.lines.filter(isValidLine).map((l) => ({ ...l, qty: clampQty(l.qty) }))
  } catch {
    return []
  }
}

export const serialiseCart = (lines) => JSON.stringify({ version: 3, lines })
