/*
  Pure cart operations on an array of lines (cart schema v2). The CartProvider
  wraps these with React state and localStorage. Covered by tests/pricing.test.js.

  Line shapes (prices and labels are snapshotted when added, so the cart reads
  correctly in both languages without refetching; Stage B re-validates on order):
    product: { id, kind:'product', productId, slug, image, name:{en,kn},
               sectionName:{en,kn}|null, selection, labels:{size,flavour,occasion},
               unitPrice, qty }
    combo:   { id, kind:'combo', comboId, name:{en,kn}, picks:[productId x3],
               pickNames:[{en,kn} x3], image, unitPrice, qty }
*/
import { defaultSelection, findChoice, priceForSelection } from './pricing'

export const MAX_QTY = 20
export const clampQty = (q) => Math.max(1, Math.min(MAX_QTY, Math.round(Number(q)) || 1))

let counter = 0
export const newLineId = () => `l${Date.now().toString(36)}${(counter++).toString(36)}`

/** Selection with irrelevant or empty values removed, so identical choices compare equal. */
export function normaliseSelection(product, selection = {}) {
  const s = { ...defaultSelection(product), ...selection }
  const nameOn = Boolean(product.nameCustomisation && s.nameOn && String(s.name || '').trim())
  return {
    size: s.size || null,
    flavour: s.flavour || null,
    nameOn,
    name: nameOn ? String(s.name).trim().slice(0, 20) : '',
    occasion: s.occasion || null,
    note: String(s.note || '').trim().slice(0, 120),
  }
}

/** Identity used to merge lines: same product/combo and the same choices. */
export function lineKey(line) {
  if (line.kind === 'combo') return `combo|${line.comboId}|${[...line.picks].sort().join(',')}`
  const s = line.selection
  return ['product', line.productId, s.size, s.flavour, s.nameOn ? s.name.toLowerCase() : '', s.occasion, s.note].join('|')
}

/** Build a product line from the catalogue entry, choices and quantity. */
export function makeProductLine(product, selection, qty, { sections = [], occasions = [] } = {}) {
  const sel = normaliseSelection(product, selection)
  const section = sections.find((s) => s.id === product.sectionId)
  return {
    id: newLineId(),
    kind: 'product',
    productId: product.id,
    slug: product.slug,
    image: product.image,
    name: product.name,
    sectionName: section?.name || null,
    selection: sel,
    labels: {
      size: findChoice(product, 'size', sel.size)?.label || null,
      flavour: findChoice(product, 'flavour', sel.flavour)?.label || null,
      occasion: occasions.find((o) => o.id === sel.occasion)?.label || null,
    },
    unitPrice: priceForSelection(product, sel),
    qty: clampQty(qty),
  }
}

/** Build a combo line. productsById: { [id]: product } */
export function makeComboLine(combo, picks, qty, productsById) {
  return {
    id: newLineId(),
    kind: 'combo',
    comboId: combo.id,
    name: combo.name,
    picks: [...picks],
    pickNames: picks.map((id) => productsById[id].name),
    image: combo.image,
    unitPrice: combo.price,
    qty: clampQty(qty),
  }
}

/** Add a line; an identical line just gains quantity (capped at MAX_QTY). */
export function addLine(lines, line) {
  const key = lineKey(line)
  const existing = lines.find((l) => lineKey(l) === key)
  if (existing) return lines.map((l) => (l === existing ? { ...l, qty: clampQty(l.qty + line.qty) } : l))
  return [...lines, line]
}

/**
 * Replace line `id` with `next` (keeping its place). If the edit makes it identical
 * to another line, the two merge into the other line's position.
 */
export function updateLine(lines, id, next) {
  const index = lines.findIndex((l) => l.id === id)
  if (index === -1) return addLine(lines, next)
  const updated = { ...next, id }
  const rest = lines.filter((l) => l.id !== id)
  const twin = rest.find((l) => lineKey(l) === lineKey(updated))
  if (twin) return rest.map((l) => (l === twin ? { ...l, qty: clampQty(l.qty + updated.qty) } : l))
  const out = [...lines]
  out[index] = updated
  return out
}

export const setLineQty = (lines, id, qty) => lines.map((l) => (l.id === id ? { ...l, qty: clampQty(qty) } : l))

/** Returns { lines, removed, index } so the caller can offer Undo. */
export function removeLine(lines, id) {
  const index = lines.findIndex((l) => l.id === id)
  if (index === -1) return { lines, removed: null, index: -1 }
  return { lines: lines.filter((l) => l.id !== id), removed: lines[index], index }
}

/** Put a removed line back where it was (Undo). */
export function restoreLine(lines, line, index) {
  if (lines.some((l) => l.id === line.id)) return lines
  const out = [...lines]
  out.splice(Math.min(Math.max(index, 0), out.length), 0, line)
  return out
}

/* ---------- persistence (schema v2) ---------- */

export const CART_STORAGE_KEY = 'dk_cart_v2'
export const LEGACY_CART_KEYS = ['dk_cart']

const isValidLine = (l) =>
  l && typeof l.id === 'string' && (l.kind === 'product' || l.kind === 'combo') && Number.isFinite(l.unitPrice) && l.unitPrice > 0 && l.qty >= 1

/** Parse stored JSON: only { version: 2, lines } is accepted; anything else is an empty cart. */
export function parseStoredCart(raw) {
  try {
    const data = JSON.parse(raw)
    if (!data || data.version !== 2 || !Array.isArray(data.lines)) return []
    return data.lines.filter(isValidLine).map((l) => ({ ...l, qty: clampQty(l.qty) }))
  } catch {
    return []
  }
}

export const serialiseCart = (lines) => JSON.stringify({ version: 2, lines })
