import { describe, expect, it } from 'vitest'
import { products } from '../src/data/products.js'
import { categories, occasions } from '../src/data/categories.js'
import { combos } from '../src/data/combos.js'
import { addLine, makeComboLine, makeProductLine } from '../src/lib/cart.js'
import { cartSubtotal } from '../src/lib/pricing.js'
import { repriceCart } from '../src/lib/reprice.js'

const byId = Object.fromEntries(products.map((p) => [p.id, p]))
const ctx = { sections: categories.flatMap((c) => c.sections), occasions }
const catalog = { products, combos }

// A cart made from today's menu: Ferrero tub 500g with a name (999 + 100), Dreamy Biscoff mango ×2, combo
function sampleCart() {
  let lines = []
  lines = addLine(lines, makeProductLine(byId['ferrero-rocher-nutella-tub'], { size: '500g', nameOn: true, name: 'Asha' }, 1, ctx))
  lines = addLine(lines, makeProductLine(byId['dreamy-biscoff-delight'], { flavour: 'mango' }, 2, ctx))
  lines = addLine(lines, makeComboLine(combos[0], ['dark-chocolate-bar', 'coconut-bar', 'coconut-bar'], 1, byId))
  return lines
}

/** The menu with one product changed */
const withProduct = (id, change) => ({ products: products.map((p) => (p.id === id ? change(p) : p)), combos })

describe('repriceCart', () => {
  it('leaves an unchanged cart exactly as it was, with no flags', () => {
    const cart = sampleCart()
    const r = repriceCart(cart, catalog)
    expect(r.priceChanged).toBe(false)
    expect(r.unavailableCount).toBe(0)
    expect(r.lines.map((l) => l.unitPrice)).toEqual([1099, 550, 699])
    expect(r.lines.every((l) => l.priceWas === null && l.unavailable === null)).toBe(true)
    expect(r.lines.map(({ priceWas, unavailable, ...rest }) => rest)).toEqual(cart)
  })

  it('updates a changed size price and flags the old one', () => {
    const menu = withProduct('ferrero-rocher-nutella-tub', (p) => ({
      ...p,
      optionGroups: [{ ...p.optionGroups[0], choices: p.optionGroups[0].choices.map((c) => (c.id === '500g' ? { ...c, price: 1049 } : c)) }],
    }))
    const r = repriceCart(sampleCart(), menu)
    expect(r.priceChanged).toBe(true)
    expect(r.lines[0]).toMatchObject({ unitPrice: 1149, priceWas: 1099, unavailable: null }) // 1049 + name 100
    expect(r.lines[1].priceWas).toBeNull()
    expect(cartSubtotal(r.lines)).toBe(1149 + 1100 + 699)
  })

  it('updates a changed fixed price and a changed name charge', () => {
    const menu = withProduct('dreamy-biscoff-delight', (p) => ({ ...p, price: 500, nameCustomisationPrice: 120 }))
    const cart = [makeProductLine(byId['dreamy-biscoff-delight'], { flavour: 'mango', nameOn: true, name: 'Ravi' }, 1, ctx)]
    expect(cart[0].unitPrice).toBe(650)
    const r = repriceCart(cart, menu)
    expect(r.lines[0]).toMatchObject({ unitPrice: 620, priceWas: 650 })
  })

  it('updates the combo when its price changes', () => {
    const r = repriceCart(sampleCart(), { products, combos: [{ ...combos[0], price: 749 }] })
    expect(r.lines[2]).toMatchObject({ unitPrice: 749, priceWas: 699 })
  })

  it('a price that goes back to what the customer saw clears the flag', () => {
    const cart = sampleCart()
    const stale = cart.map((l, i) => (i === 1 ? { ...l, unitPrice: 500, priceWas: 480 } : l))
    const r = repriceCart(stale, catalog)
    expect(r.lines[1]).toMatchObject({ unitPrice: 550, priceWas: 500 })
    const again = repriceCart(cart, catalog)
    expect(again.lines[1].priceWas).toBeNull()
  })

  it('flags a product that was removed from the menu', () => {
    const menu = { products: products.filter((p) => p.id !== 'dreamy-biscoff-delight'), combos }
    const r = repriceCart(sampleCart(), menu)
    expect(r.unavailableCount).toBe(1)
    expect(r.lines[1]).toMatchObject({ unavailable: 'removed', priceWas: null, unitPrice: 550 })
  })

  it('treats an inactive product as removed', () => {
    const r = repriceCart(sampleCart(), withProduct('ferrero-rocher-nutella-tub', (p) => ({ ...p, active: false })))
    expect(r.lines[0].unavailable).toBe('removed')
  })

  it('flags a sold-out product', () => {
    const r = repriceCart(sampleCart(), withProduct('dreamy-biscoff-delight', (p) => ({ ...p, soldOut: true })))
    expect(r.unavailableCount).toBe(1)
    expect(r.lines[1].unavailable).toBe('soldOut')
    expect(r.lines[0].unavailable).toBeNull()
  })

  it('flags a combo when one of its bars is sold out or removed', () => {
    expect(repriceCart(sampleCart(), withProduct('coconut-bar', (p) => ({ ...p, soldOut: true }))).lines[2].unavailable).toBe('soldOut')
    const gone = { products: products.filter((p) => p.id !== 'coconut-bar'), combos }
    expect(repriceCart(sampleCart(), gone).lines[2].unavailable).toBe('changed')
    expect(repriceCart(sampleCart(), { products, combos: [] }).lines[2].unavailable).toBe('removed')
  })

  it('flags a line whose size, flavour or name option is no longer offered', () => {
    const noSize = withProduct('ferrero-rocher-nutella-tub', (p) => ({
      ...p,
      optionGroups: [{ ...p.optionGroups[0], choices: p.optionGroups[0].choices.filter((c) => c.id !== '500g') }],
    }))
    expect(repriceCart(sampleCart(), noSize).lines[0].unavailable).toBe('changed')
    const noMango = withProduct('dreamy-biscoff-delight', (p) => ({
      ...p,
      optionGroups: [{ ...p.optionGroups[0], choices: p.optionGroups[0].choices.filter((c) => c.id !== 'mango') }],
    }))
    expect(repriceCart(sampleCart(), noMango).lines[1].unavailable).toBe('changed')
    const noName = withProduct('ferrero-rocher-nutella-tub', (p) => ({ ...p, nameCustomisation: false }))
    expect(repriceCart(sampleCart(), noName).lines[0].unavailable).toBe('changed')
  })

  it('accepts the services menu shape { productsById, combos }', () => {
    const r = repriceCart(sampleCart(), { productsById: byId, combos })
    expect(r.priceChanged).toBe(false)
    expect(r.unavailableCount).toBe(0)
  })

  it('an empty cart stays empty', () => {
    expect(repriceCart([], catalog)).toEqual({ lines: [], priceChanged: false, unavailableCount: 0 })
  })
})
