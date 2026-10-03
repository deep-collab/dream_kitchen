/*
  Re-checks a cart against the current menu. Pure, covered by tests/reprice.test.js.

  Cart lines remember the price and labels from the moment they were added. If Hema
  changes a price, removes an item or marks it sold out while a cart sits on a phone,
  the cart, checkout and the WhatsApp order must use today's menu instead.

  repriceCart(cart, catalog) -> { lines, priceChanged, unavailableCount }
    catalog: { productsById, combos } (services.getMenu) or { products, combos } (raw data)
    Each returned line is the stored line plus:
      unitPrice    today's price (unchanged for unavailable lines)
      priceWas     the price the customer saw when adding it, only when it changed
      unavailable  null | 'removed' (off the menu) | 'soldOut' | 'changed' (a chosen
                   size, flavour or the name option is no longer offered)
  The stored cart itself is not touched, so the flag stays visible until the line
  is edited or the order is placed.
*/
import { findChoice, optionGroup, priceForSelection } from './pricing'

const isGone = (item) => !item || item.active === false

function checkProduct(line, product) {
  if (isGone(product)) return { unavailable: 'removed' }
  if (product.soldOut) return { unavailable: 'soldOut' }
  const s = line.selection || {}
  if (optionGroup(product, 'size') && !findChoice(product, 'size', s.size)) return { unavailable: 'changed' }
  const flavours = optionGroup(product, 'flavour')
  if (s.flavour ? !findChoice(product, 'flavour', s.flavour) : flavours?.required) return { unavailable: 'changed' }
  if (s.nameOn && !product.nameCustomisation) return { unavailable: 'changed' }
  const price = priceForSelection(product, s)
  return price == null ? { unavailable: 'changed' } : { price }
}

function checkCombo(line, combo, productsById) {
  if (isGone(combo)) return { unavailable: 'removed' }
  const picks = (line.picks || []).map((id) => productsById[id])
  if (picks.length !== combo.pick || picks.some(isGone) || !line.picks.every((id) => combo.eligibleProductIds.includes(id))) return { unavailable: 'changed' }
  if (picks.some((p) => p.soldOut)) return { unavailable: 'soldOut' }
  return { price: combo.price }
}

export function repriceCart(cart, catalog) {
  const productsById = catalog.productsById || Object.fromEntries((catalog.products || []).map((p) => [p.id, p]))
  const combos = catalog.combos || []

  const lines = cart.map((stored) => {
    const { priceWas: _p, unavailable: _u, ...line } = stored
    const result =
      line.kind === 'combo' ? checkCombo(line, combos.find((c) => c.id === line.comboId), productsById) : checkProduct(line, productsById[line.productId])
    if (result.unavailable) return { ...line, priceWas: null, unavailable: result.unavailable }
    const changed = result.price !== line.unitPrice
    return { ...line, unitPrice: result.price, priceWas: changed ? line.unitPrice : null, unavailable: null }
  })

  return {
    lines,
    priceChanged: lines.some((l) => l.priceWas != null),
    unavailableCount: lines.filter((l) => l.unavailable).length,
  }
}
