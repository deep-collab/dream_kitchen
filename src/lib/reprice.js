/*
  Re-checks the cart against today's menu (config + Hema's admin changes). Pure, covered by
  tests/cart.test.js. The server does the same check again when the order is placed.

  repriceCart(lines, productsById) -> { lines, priceChanged, unavailableCount }
    each line + { unitPrice (today's), priceWas (only if it changed), unavailable }
    unavailable: null | 'removed' | 'soldOut' | 'priceSoon' | 'changed' (a chosen size or option
    is no longer offered)
*/
import { hasPrice, selectionErrors, unitPrice } from './pricing.js'

function check(line, product) {
  if (!product || product.active === false) return { unavailable: 'removed' }
  if (product.soldOut) return { unavailable: 'soldOut' }
  if (!hasPrice(product)) return { unavailable: 'priceSoon' }
  if (Object.keys(selectionErrors(product, line.selection)).length) return { unavailable: 'changed' }
  const price = unitPrice(product, line.selection)
  return price == null ? { unavailable: 'changed' } : { price }
}

export function repriceCart(lines, productsById) {
  const out = lines.map((stored) => {
    const { priceWas: _p, unavailable: _u, ...line } = stored
    const r = check(line, productsById[line.productId])
    if (r.unavailable) return { ...line, priceWas: null, unavailable: r.unavailable }
    return { ...line, unitPrice: r.price, priceWas: r.price !== line.unitPrice ? line.unitPrice : null, unavailable: null }
  })
  return { lines: out, priceChanged: out.some((l) => l.priceWas != null), unavailableCount: out.filter((l) => l.unavailable).length }
}
