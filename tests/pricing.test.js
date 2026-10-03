import { describe, expect, it } from 'vitest'
import { products } from '../src/data/products.js'
import { categories, occasions } from '../src/data/categories.js'
import { combos } from '../src/data/combos.js'
import {
  cartCount,
  cartSubtotal,
  cheaperIndividually,
  comboIndividualTotal,
  comboPrice,
  comboSavings,
  defaultSelection,
  formatINR,
  fromPrice,
  isComboComplete,
  lineTotal,
  priceForSelection,
} from '../src/lib/pricing.js'
import {
  addLine,
  clampQty,
  lineKey,
  makeComboLine,
  makeProductLine,
  MAX_QTY,
  parseStoredCart,
  removeLine,
  restoreLine,
  serialiseCart,
  setLineQty,
  updateLine,
} from '../src/lib/cart.js'

const byId = Object.fromEntries(products.map((p) => [p.id, p]))
const sections = categories.flatMap((c) => c.sections)
const ctx = { sections, occasions }

/*
  Every price on Hema's menu, typed in again by hand from BUILD_BRIEF.md (not
  derived from the data file), so a typo in either place fails the build.
  [productId, { sizeId: price } | fixed price, nameCustomisation]
*/
const MENU = [
  // Brownie Tubs (250g / 500g / 750g)
  ['ferrero-rocher-nutella-tub', { '250g': 549, '500g': 999, '750g': 1499 }, true],
  ['lotus-biscoff-bliss-tub', { '250g': 449, '500g': 799, '750g': 1149 }, true],
  ['red-velvet-white-chocolate-tub', { '250g': 449, '500g': 799, '750g': 1149 }, true],
  ['oreo-overload-tub', { '250g': 399, '500g': 699, '750g': 999 }, true],
  ['nutty-caramel-crunch-tub', { '250g': 429, '500g': 749, '750g': 1049 }, true],
  // Delight Boxes
  ['dreamy-biscoff-delight', 550, true],
  ['red-velvet-delight', 950, true],
  ['pista-delight', 950, true],
  ['chocolate-delight', { '500g': 950, '700g': 1100 }, true],
  ['strawberry-red-velvet-delight', { '500g': 950, '700g': 1100 }, true],
  ['mango-delight', { '500g': 950, '700g': 1100 }, true],
  ['butterscotch-delight', { '500g': 950, '700g': 1100 }, true],
  ['red-velvet-premium-delight', { '500g': 1800, '700g': 2100 }, true],
  ['pista-premium-delight', { '500g': 1800, '700g': 2400 }, true],
  // Cookies
  ['assorted-cookie-dip-box', { '250g': 349, '500g': 599, '750g': 849 }, true],
  ['cookie-pie-tin', { '500g': 950, '750g': 1100 }, true],
  ['cookie-pie-box', 250, false],
  // Chocolates: Colour Blast
  ['colour-blast-bar', 150, false],
  // Chocolates: bars
  ['dark-chocolate-bar', 150, false],
  ['milk-chocolate-bar', 150, false],
  ['white-chocolate-bar', 200, false],
  ['strawberry-dark-chocolate-bar', 200, false],
  ['orange-milk-chocolate-bar', 200, false],
  ['cranberry-white-chocolate-bar', 250, false],
  ['hazelnut-dark-chocolate-bar', 250, false],
  ['almond-milk-chocolate-bar', 250, false],
  ['walnut-white-chocolate-bar', 300, false],
  ['coconut-bar', 280, false],
  // Chocolates: Classic Favourites (250g / 500g / 1kg)
  ['classic-dark-chocolate', { '250g': 275, '500g': 550, '1kg': 1100 }, false],
  ['classic-milk-chocolate', { '250g': 275, '500g': 550, '1kg': 1100 }, false],
  ['classic-white-chocolate', { '250g': 350, '500g': 700, '1kg': 1400 }, false],
  ['classic-caramel-delight', { '250g': 250, '500g': 500, '1kg': 1000 }, false],
  ['classic-favourite-assortment', { '250g': 350, '500g': 700, '1kg': 1400 }, false],
  ['classic-dry-fruits', { '250g': 325, '500g': 650, '1kg': 1300 }, false],
  ['classic-triple-layer-chocolate', { '250g': 325, '500g': 650, '1kg': 1300 }, false],
]

const PRICE_CASES = MENU.flatMap(([id, prices]) =>
  typeof prices === 'number' ? [[id, null, prices]] : Object.entries(prices).map(([size, price]) => [id, size, price]),
)

const flavourFor = (p) => p.optionGroups.find((grp) => grp.id === 'flavour')?.choices[0].id ?? null

describe('menu data', () => {
  it('has exactly the 35 products on her menu, all active and in stock', () => {
    expect(products).toHaveLength(35)
    expect(MENU).toHaveLength(35)
    expect(new Set(products.map((p) => p.id)).size).toBe(35)
    expect(products.map((p) => p.id).sort()).toEqual(MENU.map(([id]) => id).sort())
    expect(products.every((p) => p.active && !p.soldOut)).toBe(true)
  })

  it('has 5 tubs, 9 delight boxes, 3 cookies and 18 chocolates', () => {
    const count = (c) => products.filter((p) => p.categoryId === c).length
    expect([count('brownie-tubs'), count('delight-boxes'), count('cookies'), count('chocolates')]).toEqual([5, 9, 3, 18])
  })

  it('uses only the badges she stated', () => {
    const badged = products.filter((p) => p.badges.length).map((p) => [p.id, p.badges])
    expect(badged).toEqual([
      ['ferrero-rocher-nutella-tub', ['signature']],
      ['classic-triple-layer-chocolate', ['top-selling']],
    ])
  })

  it('offers flavours only where she listed them', () => {
    expect(byId['dreamy-biscoff-delight'].optionGroups[0].choices.map((c) => c.id)).toEqual(['chocolate', 'strawberry', 'mango', 'butterscotch'])
    expect(byId['colour-blast-bar'].optionGroups[0].choices).toHaveLength(9)
    expect(products.filter((p) => p.optionGroups.some((grp) => grp.id === 'flavour')).map((p) => p.id)).toEqual(['dreamy-biscoff-delight', 'colour-blast-bar'])
  })

  it('every product has Kannada text for its name', () => {
    for (const p of products) expect(p.name.kn, p.id).toBeTruthy()
  })

  it('records her per-kg rates for Classic Favourites', () => {
    expect(byId['classic-white-chocolate'].pricePerKg).toBe(1400)
    expect(byId['classic-caramel-delight'].pricePerKg).toBe(1000)
  })
})

describe('every price matches her menu', () => {
  it.each(PRICE_CASES)('%s %s = ₹%i', (id, size, price) => {
    const product = byId[id]
    expect(product, id).toBeDefined()
    const sizes = product.optionGroups.find((grp) => grp.id === 'size')
    if (size) {
      expect(sizes.choices.map((c) => c.id)).toContain(size)
      expect(priceForSelection(product, { size, flavour: flavourFor(product) })).toBe(price)
    } else {
      expect(sizes).toBeUndefined()
      expect(priceForSelection(product, { flavour: flavourFor(product) })).toBe(price)
    }
  })

  it('size choices are exactly the ones she lists, in her order', () => {
    for (const [id, prices] of MENU) {
      const sizes = byId[id].optionGroups.find((grp) => grp.id === 'size')
      if (typeof prices === 'number') continue
      expect(sizes.choices.map((c) => c.id), id).toEqual(Object.keys(prices))
    }
  })

  it('the first size is preselected and "from" is the lowest price', () => {
    expect(defaultSelection(byId['ferrero-rocher-nutella-tub']).size).toBe('250g')
    expect(fromPrice(byId['pista-premium-delight'])).toBe(1800)
    expect(fromPrice(byId['coconut-bar'])).toBe(280)
  })

  it('an unknown size has no price', () => {
    expect(priceForSelection(byId['oreo-overload-tub'], { size: '1kg' })).toBeNull()
  })
})

describe('formatINR', () => {
  it('uses ₹, Indian grouping and no decimals', () => {
    expect(formatINR(549)).toBe('₹549')
    expect(formatINR(1499)).toBe('₹1,499')
    expect(formatINR(150000)).toBe('₹1,50,000')
    expect(formatINR(2400.4)).toBe('₹2,400')
  })
})

describe('name customisation (+₹100)', () => {
  const tub = byId['ferrero-rocher-nutella-tub']
  it.each(MENU)('%s allows it: %s / %s', (id, _prices, allowed) => {
    expect(byId[id].nameCustomisation).toBe(allowed)
  })

  it('adds ₹100 only when the switch is on and a name is typed', () => {
    expect(priceForSelection(tub, { size: '250g' })).toBe(549)
    expect(priceForSelection(tub, { size: '250g', nameOn: true, name: 'Amma' })).toBe(649)
    expect(priceForSelection(tub, { size: '250g', nameOn: true, name: '   ' })).toBe(549)
    expect(priceForSelection(tub, { size: '250g', nameOn: false, name: 'Amma' })).toBe(549)
    expect(priceForSelection(tub, { size: '750g', nameOn: true, name: 'Ravi' })).toBe(1599)
  })

  it('never charges where the product does not allow it', () => {
    for (const id of ['cookie-pie-box', 'dark-chocolate-bar', 'colour-blast-bar', 'classic-white-chocolate']) {
      const p = byId[id]
      const sel = { ...defaultSelection(p), flavour: flavourFor(p), nameOn: true, name: 'Amma' }
      expect(priceForSelection(p, sel), id).toBe(priceForSelection(p, { ...sel, nameOn: false, name: '' }))
    }
  })

  it('works with fixed-price items and flavours too', () => {
    expect(priceForSelection(byId['dreamy-biscoff-delight'], { flavour: 'mango', nameOn: true, name: 'Anu' })).toBe(650)
    expect(priceForSelection(byId['pista-delight'], { nameOn: true, name: 'Anu' })).toBe(1050)
  })
})

describe('cart lines', () => {
  const tub = byId['ferrero-rocher-nutella-tub']
  const line = (sel, qty = 1, product = tub) => makeProductLine(product, { ...defaultSelection(product), ...sel }, qty, ctx)

  it('quantity math: line total, subtotal and count', () => {
    const a = line({ size: '500g' }, 3) // 999 x 3
    const b = line({ size: '250g', nameOn: true, name: 'Amma' }, 2) // 649 x 2
    expect(lineTotal(a)).toBe(2997)
    expect(lineTotal(b)).toBe(1298)
    expect(cartSubtotal([a, b])).toBe(4295)
    expect(cartCount([a, b])).toBe(5)
  })

  it('clamps quantity to 1–20', () => {
    expect(clampQty(0)).toBe(1)
    expect(clampQty(25)).toBe(MAX_QTY)
    expect(line({ size: '250g' }, 99).qty).toBe(20)
  })

  it('merges identical selections by increasing the quantity', () => {
    let lines = addLine([], line({ size: '250g', occasion: 'birthday' }, 1))
    lines = addLine(lines, line({ size: '250g', occasion: 'birthday' }, 2))
    expect(lines).toHaveLength(1)
    expect(lines[0].qty).toBe(3)
    lines = addLine(lines, line({ size: '250g', occasion: 'gifting' }, 1))
    expect(lines).toHaveLength(2)
  })

  it('treats a name the same regardless of spaces, and ignores names when the switch is off', () => {
    expect(lineKey(line({ size: '250g', nameOn: true, name: ' Amma ' }))).toBe(lineKey(line({ size: '250g', nameOn: true, name: 'Amma' })))
    expect(lineKey(line({ size: '250g', nameOn: false, name: 'Amma' }))).toBe(lineKey(line({ size: '250g' })))
  })

  it('merging never exceeds the maximum quantity', () => {
    let lines = addLine([], line({ size: '250g' }, 15))
    lines = addLine(lines, line({ size: '250g' }, 10))
    expect(lines[0].qty).toBe(20)
  })

  it('editing a line keeps its place and reprices it', () => {
    const a = line({ size: '250g' })
    const b = line({ size: '250g' }, 1, byId['coconut-bar'])
    const edited = line({ size: '750g', nameOn: true, name: 'Meera' }, 2)
    const lines = updateLine([a, b], a.id, edited)
    expect(lines.map((l) => l.id)).toEqual([a.id, b.id])
    expect(lines[0].unitPrice).toBe(1599)
    expect(lines[0].qty).toBe(2)
    expect(lines[0].labels.size.en).toBe('750g')
  })

  it('editing a line into a copy of another merges them', () => {
    const a = line({ size: '250g' }, 1)
    const b = line({ size: '500g' }, 2)
    const lines = updateLine([a, b], a.id, line({ size: '500g' }, 1))
    expect(lines).toHaveLength(1)
    expect(lines[0].id).toBe(b.id)
    expect(lines[0].qty).toBe(3)
  })

  it('set quantity, remove and undo', () => {
    const a = line({ size: '250g' })
    const b = line({ size: '500g' })
    let lines = setLineQty([a, b], b.id, 4)
    expect(lines[1].qty).toBe(4)
    const { lines: after, removed, index } = removeLine(lines, a.id)
    expect(after).toHaveLength(1)
    lines = restoreLine(after, removed, index)
    expect(lines.map((l) => l.id)).toEqual([a.id, b.id])
  })

  it('snapshots labels in both languages', () => {
    const l = line({ flavour: 'butterscotch', occasion: 'self-love' }, 1, byId['dreamy-biscoff-delight'])
    expect(l.labels.flavour).toEqual({ en: 'Butterscotch', kn: 'ಬಟರ್‌ಸ್ಕಾಚ್' })
    expect(l.labels.occasion.en).toBe('Self-love')
    expect(l.sectionName.en).toBe('Dreamy Biscoff Delight')
  })
})

describe('bars combo: pick any 3 for ₹699', () => {
  const combo = combos.find((c) => c.id === 'bars-pick-3')

  it('is her offer: 3 bars, ₹699, all 10 bars eligible, repeats allowed', () => {
    expect(comboPrice(combo)).toBe(699)
    expect(combo.pick).toBe(3)
    expect(combo.allowRepeats).toBe(true)
    expect(combo.eligibleProductIds.sort()).toEqual(products.filter((p) => p.sectionId === 'chocolate-bars').map((p) => p.id).sort())
  })

  it('needs exactly 3 eligible bars; repeats are fine', () => {
    expect(isComboComplete(combo, ['dark-chocolate-bar', 'dark-chocolate-bar'])).toBe(false)
    expect(isComboComplete(combo, ['dark-chocolate-bar', 'dark-chocolate-bar', 'dark-chocolate-bar'])).toBe(true)
    expect(isComboComplete(combo, ['dark-chocolate-bar', 'milk-chocolate-bar', 'coconut-bar', 'coconut-bar'])).toBe(false)
    expect(isComboComplete(combo, ['dark-chocolate-bar', 'milk-chocolate-bar', 'colour-blast-bar'])).toBe(false)
  })

  it('shows the right savings', () => {
    const picks = ['walnut-white-chocolate-bar', 'coconut-bar', 'hazelnut-dark-chocolate-bar'] // 300 + 280 + 250
    expect(comboIndividualTotal(picks, byId)).toBe(830)
    expect(comboSavings(combo, picks, byId)).toBe(131)
    expect(cheaperIndividually(combo, picks, byId)).toBe(false)
  })

  it('detects when the 3 bars are cheaper individually (and never changes ₹699)', () => {
    const picks = ['dark-chocolate-bar', 'milk-chocolate-bar', 'white-chocolate-bar'] // 150 + 150 + 200
    expect(comboIndividualTotal(picks, byId)).toBe(500)
    expect(comboSavings(combo, picks, byId)).toBe(-199)
    expect(cheaperIndividually(combo, picks, byId)).toBe(true)
    expect(comboPrice(combo)).toBe(699)
  })

  it('break-even edges: ₹700 saves ₹1, an incomplete pick is never "cheaper"', () => {
    const picks = ['walnut-white-chocolate-bar', 'white-chocolate-bar', 'white-chocolate-bar'] // 300 + 200 + 200
    expect(comboSavings(combo, picks, byId)).toBe(1)
    expect(cheaperIndividually(combo, ['dark-chocolate-bar'], byId)).toBe(false)
  })

  it('goes into the cart as ONE line listing its 3 bars; same bars in any order merge', () => {
    const a = makeComboLine(combo, ['coconut-bar', 'dark-chocolate-bar', 'coconut-bar'], 1, byId)
    const b = makeComboLine(combo, ['dark-chocolate-bar', 'coconut-bar', 'coconut-bar'], 2, byId)
    expect(a.unitPrice).toBe(699)
    expect(a.pickNames.map((n) => n.en)).toEqual(['Coconut Bar', 'Dark Chocolate', 'Coconut Bar'])
    const lines = addLine(addLine([], a), b)
    expect(lines).toHaveLength(1)
    expect(lineTotal(lines[0])).toBe(2097)
  })
})

describe('stored cart (schema v2)', () => {
  it('round-trips v2 and silently drops the old sample cart', () => {
    const l = makeProductLine(byId['coconut-bar'], {}, 2, ctx)
    expect(parseStoredCart(serialiseCart([l]))).toEqual([l])
    expect(parseStoredCart(JSON.stringify([{ productId: 'p01', qty: 2, price: 199 }]))).toEqual([])
    expect(parseStoredCart('not json')).toEqual([])
    expect(parseStoredCart(JSON.stringify({ version: 2, lines: [{ id: 'x', kind: 'product', unitPrice: 0, qty: 1 }] }))).toEqual([])
  })
})
