// The cart (src/lib/cart.js) and the price re-check (src/lib/reprice.js)
import { describe, expect, it } from 'vitest'
import { products } from '../src/config/shop.js'
import { addLine, cartCount, makeLine, parseStoredCart, removeLine, restoreLine, serialiseCart, setLineQty, updateLine } from '../src/lib/cart.js'
import { repriceCart } from '../src/lib/reprice.js'
import { applyOverrides } from '../src/lib/pricing.js'

const P = Object.fromEntries(products.map((p) => [p.id, p]))
const byId = (list = products) => Object.fromEntries(list.map((p) => [p.id, p]))

describe('cart lines', () => {
  it('a line snapshots the price and keeps only the options the product has', () => {
    const l = makeLine(P['red-velvet-delight-box'], { size: '500g', name: '  Amma ', drawing: true, drawingText: 'A cat', ragi: true })
    expect(l).toMatchObject({ productId: 'red-velvet-delight-box', unitPrice: 1700, qty: 1, art: 'delight-box' })
    expect(l.selection).toEqual({ size: '500g', ragi: false, name: 'Amma', drawing: true, drawingText: 'A cat', drawingRef: null })
  })

  it('the same product with the same choices adds up; different choices are separate lines', () => {
    let lines = addLine([], makeLine(P['plain-brownies'], {}))
    lines = addLine(lines, makeLine(P['plain-brownies'], {}))
    lines = addLine(lines, makeLine(P['plain-brownies'], { ragi: true }))
    expect(lines.map((l) => [l.selection.ragi, l.qty])).toEqual([
      [false, 2],
      [true, 1],
    ])
    expect(cartCount(lines)).toBe(3)
  })

  it('quantity stays between 1 and 10', () => {
    const [l] = addLine([], makeLine(P['almond-bar'], {}, 3))
    expect(setLineQty([l], l.id, 40)[0].qty).toBe(10)
    expect(setLineQty([l], l.id, 0)[0].qty).toBe(1)
  })

  it('editing a line keeps its place and quantity, or merges into an identical line', () => {
    const a = makeLine(P['plain-brownies'], {}, 2)
    const b = makeLine(P['plain-brownies'], { ragi: true })
    const c = makeLine(P['pista-bar'], {})
    let lines = [a, b, c]
    lines = updateLine(lines, a.id, makeLine(P['plain-brownies'], { ragi: true }))
    expect(lines.map((l) => [l.productId, l.selection.ragi, l.qty])).toEqual([
      ['plain-brownies', true, 3],
      ['pista-bar', false, 1],
    ])
  })

  it('remove and undo put the line back where it was', () => {
    const lines = [makeLine(P['plain-brownies'], {}), makeLine(P['pista-bar'], {}), makeLine(P['almond-bar'], {})]
    const r = removeLine(lines, lines[1].id)
    expect(r.lines).toHaveLength(2)
    expect(restoreLine(r.lines, r.removed, r.index).map((l) => l.productId)).toEqual(['plain-brownies', 'pista-bar', 'almond-bar'])
  })

  it('stores as version 3; old carts (the previous menu) are dropped', () => {
    const lines = [makeLine(P['plain-brownies'], {})]
    expect(parseStoredCart(serialiseCart(lines))).toEqual(lines)
    expect(parseStoredCart(JSON.stringify({ version: 2, lines: [{ id: 'x', kind: 'product' }] }))).toEqual([])
    expect(parseStoredCart('nonsense')).toEqual([])
  })
})

describe('re-checking prices against today’s menu', () => {
  const lines = [makeLine(P['mango-delight-box'], { size: '500g' }), makeLine(P['almond-bar'], {}, 2)]

  it('nothing changed: no notices', () => {
    const r = repriceCart(lines, byId())
    expect(r.priceChanged).toBe(false)
    expect(r.unavailableCount).toBe(0)
  })

  it('Hema changed a price: today’s price, with what it was', () => {
    const menu = applyOverrides(products, [{ id: 'almond-bar', price: 175 }])
    const r = repriceCart(lines, byId(menu))
    expect(r.lines[1]).toMatchObject({ unitPrice: 175, priceWas: 150 })
    expect(r.priceChanged).toBe(true)
  })

  it.each([
    [{ id: 'almond-bar', soldOut: true }, 'soldOut'],
    [{ id: 'almond-bar', active: false }, 'removed'],
    [{ id: 'almond-bar', priceStatus: 'coming-soon' }, 'priceSoon'],
  ])('%o -> %s', (override, reason) => {
    const r = repriceCart(lines, byId(applyOverrides(products, [override])))
    expect(r.lines[1].unavailable).toBe(reason)
    expect(r.unavailableCount).toBe(1)
  })

  it('a size that is no longer offered', () => {
    const menu = applyOverrides(products, [{ id: 'mango-delight-box', sizes: [{ id: '250g', price: 650 }] }])
    expect(repriceCart(lines, byId(menu)).lines[0].unavailable).toBe('changed')
  })

  it('a product that left the menu entirely', () => {
    const old = { ...lines[0], productId: 'butterscotch-delight' }
    expect(repriceCart([old], byId()).lines[0].unavailable).toBe('removed')
  })
})
