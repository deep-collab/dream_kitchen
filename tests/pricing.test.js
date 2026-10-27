// The shared pricing module (src/lib/pricing.js) against Hema's menu (src/config/shop.js).
// The same module prices the website and the server, so these numbers are what customers pay.
import { describe, expect, it } from 'vitest'
import { categories, optionPrices, products } from '../src/config/shop.js'
import {
  applyOverrides,
  applySettings,
  clampQty,
  defaultSelection,
  formatINR,
  fromPrice,
  hasPriceRange,
  isForSale,
  isUpiId,
  normaliseSelection,
  quote,
  selectionErrors,
  unitPrice,
  upiLink,
  utrError,
} from '../src/lib/pricing.js'

const P = Object.fromEntries(products.map((p) => [p.id, p]))
const item = (id, selection = {}, qty = 1) => ({ product: P[id], selection: { ...defaultSelection(P[id]), ...selection }, qty })
const total = (...items) => quote(items, 'karnataka').subtotal

describe('the menu is exactly Hema’s list', () => {
  it('has 5 tubs, 4 delight boxes, 5 brownies, 2 chocolates and the drawing bar', () => {
    const by = (c) => products.filter((p) => p.category === c).map((p) => p.id)
    expect(by('brownie-tubs')).toEqual(['ferrero-rocher-nutella-tub', 'lotus-biscoff-tub', 'red-velvet-white-chocolate-tub', 'oreo-overload-tub', 'dream-cake-tub'])
    expect(by('delight-boxes')).toEqual(['red-velvet-delight-box', 'chocolate-delight-box', 'mango-delight-box', 'pista-delight-box'])
    expect(by('brownies')).toEqual(['plain-brownies', 'nutty-brownies', 'nutella-brownies', 'walnut-brownies', 'assorted-brownies'])
    expect(by('chocolates')).toEqual(['pista-bar', 'almond-bar'])
    expect(by('customize')).toEqual(['drawing-chocolate-bar'])
    expect(products).toHaveLength(17)
  })

  it('has no butter delight box, no cookies, no other bars and no combo', () => {
    const ids = products.map((p) => p.id).join(' ')
    expect(ids).not.toMatch(/butter|cookie|colour|classic|name-bar|combo|nutty-caramel/)
    // Cookie Tins (27 Oct 2026): a section only Hema's own products fill, so the config has none in it
    expect(categories.map((c) => c.id)).toEqual(['brownie-tubs', 'delight-boxes', 'brownies', 'chocolates', 'cookie-tins', 'customize'])
    expect(products.filter((p) => p.category === 'cookie-tins')).toEqual([])
  })

  it('lists the drawing bar only on the Customize page', () => {
    expect(products.filter((p) => p.menu === false).map((p) => p.id)).toEqual(['drawing-chocolate-bar'])
  })

  it('every product has a name in both languages and a known category', () => {
    const ids = new Set(categories.map((c) => c.id))
    for (const p of products) {
      expect(p.name.en && p.name.kn, p.id).toBeTruthy()
      expect(ids.has(p.category), p.id).toBe(true)
      expect(p.slug).toBe(p.id)
    }
  })
})

describe('prices', () => {
  const sizePrices = (id) => P[id].sizes.map((s) => [s.id, s.price])

  it('Delight Boxes: Red Velvet, Chocolate, Mango ₹650 / ₹1,250 / ₹1,900; Pista ₹750 / ₹1,500 / ₹2,250', () => {
    for (const id of ['red-velvet-delight-box', 'chocolate-delight-box', 'mango-delight-box'])
      expect(sizePrices(id)).toEqual([
        ['250g', 650],
        ['500g', 1250],
        ['700g', 1900],
      ])
    expect(sizePrices('pista-delight-box')).toEqual([
      ['250g', 750],
      ['500g', 1500],
      ['700g', 2250],
    ])
  })

  it('Brownies (5 pieces): Plain ₹350, Nutty ₹549, Nutella ₹549, Walnut ₹650, Assorted ₹700; ragi +₹50 (+₹80 Assorted)', () => {
    const got = Object.fromEntries(products.filter((p) => p.category === 'brownies').map((p) => [p.id, [p.price, p.ragiPrice]]))
    expect(got).toEqual({
      'plain-brownies': [350, 50],
      'nutty-brownies': [549, 50],
      'nutella-brownies': [549, 50],
      'walnut-brownies': [650, 50],
      'assorted-brownies': [700, 80],
    })
  })

  it('Chocolates: Pista Bar ₹450 (250 g shown), Almond Bar ₹150 (no weight)', () => {
    expect([P['pista-bar'].price, P['pista-bar'].grams, P['pista-bar'].showWeight]).toEqual([450, 250, true])
    expect([P['almond-bar'].price, P['almond-bar'].grams, P['almond-bar'].showWeight]).toEqual([150, undefined, undefined])
  })

  it('Drawing Chocolate Bar ₹950; a drawing on a Delight Box +₹450; the name on the box is free', () => {
    expect(P['drawing-chocolate-bar'].price).toBe(950)
    expect(optionPrices).toEqual({ nameOnBox: 0, drawing: 450 })
  })

  it('Dream Cake Tub has no price yet: "coming soon", not for sale', () => {
    const p = P['dream-cake-tub']
    expect(p.priceStatus).toBe('coming-soon')
    expect(fromPrice(p)).toBeNull()
    expect(isForSale(p)).toBe(false)
    expect(unitPrice(p, defaultSelection(p))).toBeNull()
    expect(selectionErrors(p, defaultSelection(p)).product).toBe('unavailable')
  })

  it('the four old tubs keep the prices from Hema’s first menu (flagged TO CONFIRM)', () => {
    const tubs = products.filter((p) => p.category === 'brownie-tubs' && p.priceStatus === 'live')
    expect(tubs.map((p) => [p.id, p.sizes.map((s) => s.price)])).toEqual([
      ['ferrero-rocher-nutella-tub', [549, 999, 1499]],
      ['lotus-biscoff-tub', [449, 799, 1149]],
      ['red-velvet-white-chocolate-tub', [449, 799, 1149]],
      ['oreo-overload-tub', [399, 699, 999]],
    ])
    for (const t of tubs) expect(t.toConfirm).toBeTruthy()
  })
})

describe('the brief’s worked examples', () => {
  it('Red Velvet 500 g + name + drawing = ₹1,700', () => {
    expect(total(item('red-velvet-delight-box', { size: '500g', name: 'Hema', drawing: true, drawingText: 'A small cat' }))).toBe(1700)
  })
  it('Pista 700 g + drawing = ₹2,700', () => {
    expect(total(item('pista-delight-box', { size: '700g', drawing: true, drawingText: 'Two hearts' }))).toBe(2700)
  })
  it('Assorted ragi = ₹780', () => expect(total(item('assorted-brownies', { ragi: true }))).toBe(780))
  it('Walnut ragi = ₹700', () => expect(total(item('walnut-brownies', { ragi: true }))).toBe(700))
  it('Plain + Pista Bar = ₹800', () => expect(total(item('plain-brownies'), item('pista-bar'))).toBe(800))
  it('Drawing Chocolate Bar = ₹950', () => expect(total(item('drawing-chocolate-bar', { drawingText: 'Our wedding date' }))).toBe(950))
})

describe('every product × size × ragi × name × drawing combination', () => {
  const cases = []
  for (const p of products.filter(isForSale)) {
    const sizes = p.sizes?.length ? p.sizes : [null]
    const ragis = Number.isFinite(p.ragiPrice) ? [false, true] : [false]
    const names = p.options.name ? ['', 'ಹೇಮಾ'] : ['']
    const drawings = p.options.drawing === true ? [false, true] : [p.options.drawing === 'included']
    for (const size of sizes)
      for (const ragi of ragis)
        for (const name of names)
          for (const drawing of drawings) {
            const expected = (size ? size.price : p.price) + (ragi ? p.ragiPrice : 0) + (p.options.drawing === true && drawing ? 450 : 0)
            cases.push([p.id, size?.id || '-', ragi, name, drawing, expected])
          }
  }

  // 4 tubs × 3 sizes, 4 boxes × 3 sizes × name × drawing, 5 brownies × ragi, 2 bars, the drawing bar
  it('covers all of them', () => expect(cases.length).toBe(4 * 3 + 4 * 3 * 2 * 2 + 5 * 2 + 2 + 1))

  it.each(cases)('%s size %s ragi %s name "%s" drawing %s = ₹%i', (id, size, ragi, name, drawing, expected) => {
    const sel = { size: size === '-' ? null : size, ragi, name, drawing, drawingText: drawing ? 'A rose' : '' }
    expect(unitPrice(P[id], sel)).toBe(expected)
    expect(selectionErrors(P[id], sel)).toEqual({})
  })
})

describe('from prices on the menu cards', () => {
  it.each([
    ['red-velvet-delight-box', 650, true],
    ['pista-delight-box', 750, true],
    ['ferrero-rocher-nutella-tub', 549, true],
    ['plain-brownies', 350, false],
    ['pista-bar', 450, false],
    ['almond-bar', 150, false],
  ])('%s from ₹%i (range: %s)', (id, from, range) => {
    expect(fromPrice(P[id])).toBe(from)
    expect(hasPriceRange(P[id])).toBe(range)
  })
})

describe('choices that are not allowed', () => {
  it('ragi only on brownies, name and drawing only where offered: ignored in the price', () => {
    expect(unitPrice(P['pista-bar'], { ragi: true, drawing: true, name: 'X' })).toBe(450)
    expect(unitPrice(P['plain-brownies'], { drawing: true, name: 'X' })).toBe(350)
    expect(normaliseSelection(P['plain-brownies'], { drawing: true, name: 'X', ragi: true })).toEqual({
      size: null,
      ragi: true,
      name: '',
      drawing: false,
      drawingText: '',
      drawingRef: null,
    })
  })

  it('a missing or unknown size has no price', () => {
    expect(unitPrice(P['mango-delight-box'], { size: null })).toBeNull()
    expect(unitPrice(P['mango-delight-box'], { size: '1kg' })).toBeNull()
    expect(selectionErrors(P['mango-delight-box'], { size: '1kg' }).size).toBe('unknown')
    expect(selectionErrors(P['mango-delight-box'], { size: null }).size).toBe('required')
  })

  it('a drawing needs a description of 3–200 characters', () => {
    const p = P['chocolate-delight-box']
    expect(selectionErrors(p, { size: '250g', drawing: true, drawingText: '' }).drawingText).toBe('required')
    expect(selectionErrors(p, { size: '250g', drawing: true, drawingText: 'x'.repeat(201) }).drawingText).toBe('long')
    expect(selectionErrors(P['drawing-chocolate-bar'], { drawingText: ' ' }).drawingText).toBe('required')
    expect(selectionErrors(p, { size: '250g', drawing: false, drawingText: '' })).toEqual({})
  })

  it('name on the box: up to 20 English or Kannada letters', () => {
    const p = P['mango-delight-box']
    expect(selectionErrors(p, { size: '250g', name: 'Happy 25th, Amma!' })).toEqual({})
    expect(selectionErrors(p, { size: '250g', name: 'ಹುಟ್ಟುಹಬ್ಬದ ಶುಭಾಶಯ' })).toEqual({})
    expect(selectionErrors(p, { size: '250g', name: 'ಟಬ್‌ಗಳು' })).toEqual({}) // with a zero-width joiner
    expect(selectionErrors(p, { size: '250g', name: 'x'.repeat(21) }).name).toBe('long')
    expect(selectionErrors(p, { size: '250g', name: '<script>' }).name).toBe('chars')
    expect(selectionErrors(p, { size: '250g', name: 'Hi 🎂' }).name).toBe('chars')
  })

  it('a reference photo must be one the upload function made', () => {
    const p = P['mango-delight-box']
    const ok = 'refs/20261005/0b0c8f5e-6a43-4f43-9a0e-2d6f2f1b7c11.webp'
    expect(selectionErrors(p, { size: '250g', drawing: true, drawingText: 'A rose', drawingRef: ok })).toEqual({})
    expect(selectionErrors(p, { size: '250g', drawing: true, drawingText: 'A rose', drawingRef: '../../etc/passwd' }).drawingRef).toBe('invalid')
    expect(normaliseSelection(p, { size: '250g', drawing: true, drawingText: 'A rose', drawingRef: 'https://evil.example/x.png' }).drawingRef).toBeNull()
  })

  it('sold out and hidden products are not for sale', () => {
    expect(isForSale({ ...P['almond-bar'], soldOut: true })).toBe(false)
    expect(isForSale({ ...P['almond-bar'], active: false })).toBe(false)
    expect(quote([{ product: { ...P['almond-bar'], soldOut: true }, selection: {}, qty: 1 }], 'karnataka').subtotal).toBe(0)
  })

  it('quantity is 1–10 per item', () => {
    expect([clampQty(0), clampQty(3.4), clampQty(11), clampQty('x')]).toEqual([1, 3, 10, 1])
  })
})

describe('Hema’s admin changes (applyOverrides)', () => {
  it('changes a size price and a fixed price, keeps courier tiers from the config', () => {
    const [box, bar] = applyOverrides(
      [P['mango-delight-box'], P['almond-bar']],
      [
        {
          id: 'mango-delight-box',
          sizes: [
            { id: '250g', price: 700 },
            { id: '500g', price: 1300 },
            { id: '700g', price: 1950 },
          ],
        },
        { id: 'almond-bar', price: 175, soldOut: true },
      ],
    )
    expect(box.sizes.map((s) => [s.price, s.courierTier])).toEqual([
      [700, 'small'],
      [1300, 'large'],
      [1950, 'large'],
    ])
    expect([bar.price, bar.soldOut]).toEqual([175, true])
  })

  it('turns on a tub once Hema sends its sizes and prices', () => {
    const [tub] = applyOverrides(
      [P['dream-cake-tub']],
      [
        {
          id: 'dream-cake-tub',
          priceStatus: 'live',
          sizes: [
            { id: 'small', label: 'Small', price: 499 },
            { id: 'large', label: 'Large', price: 899 },
          ],
        },
      ],
    )
    expect(isForSale(tub)).toBe(true)
    expect(fromPrice(tub)).toBe(499)
    expect(tub.sizes[1]).toEqual({ id: 'large', price: 899, label: 'Large', courierTier: 'small' })
  })

  it('ignores nonsense: negative, decimal or huge prices, unknown fields', () => {
    const [bar] = applyOverrides([P['almond-bar']], [{ id: 'almond-bar', price: -5, ragiPrice: 9, priceStatus: 'free', evil: true }])
    expect(bar).toEqual(P['almond-bar'])
    const [b2] = applyOverrides([P['almond-bar']], [{ id: 'almond-bar', price: 12.5 }])
    expect(b2.price).toBe(150)
  })
})

describe('settings, UPI and UTR', () => {
  it('defaults come from the config: no UPI yet, store open', () => {
    const s = applySettings({})
    expect(s.payment.upiId).toBe('')
    expect(s.store.open).toBe(true)
    expect(s.courier.rates.small).toEqual({ karnataka: 90, outside: 100 })
    expect(s.leadTimes.standardBusinessDays).toBe(2)
  })

  it('Hema’s settings win, bad values fall back', () => {
    const s = applySettings({ upiId: 'hema@okaxis', courierRates: { large: { outside: 160 }, small: { karnataka: -1 } }, storeOpen: false, leadDrawingExtra: 3 })
    expect(s.payment.upiId).toBe('hema@okaxis')
    expect(s.courier.rates).toEqual({ small: { karnataka: 90, outside: 100 }, large: { karnataka: 100, outside: 160 }, xl: { karnataka: 100, outside: 150 } })
    expect(s.store.open).toBe(false)
    expect(s.leadTimes.drawingExtraBusinessDays).toBe(3)
    expect(applySettings({ upiId: 'not a upi' }).payment.upiId).toBe('')
  })

  it('UPI IDs', () => {
    expect(['hema@okaxis', 'dream.kitchen-01@ybl', '9876543210@paytm'].every(isUpiId)).toBe(true)
    expect(['', 'hema', '@okaxis', 'he ma@okaxis', 'hema@1bank'].some(isUpiId)).toBe(false)
  })

  it('the UPI app link carries the amount and the order ID', () => {
    expect(upiLink({ upiId: 'hema@okaxis', name: 'Dream Kitchen', amount: 1790, orderCode: 'DK-261005-7Q4M' })).toBe(
      'upi://pay?pa=hema@okaxis&pn=Dream%20Kitchen&am=1790.00&cu=INR&tn=DK-261005-7Q4M',
    )
  })

  it('UTR: exactly 12 digits (spaces and dashes are tidied)', () => {
    expect(utrError('')).toBe('required')
    expect(utrError('1234 5678 9012')).toBeNull()
    expect(utrError('12345678901')).toBe('format')
    expect(utrError('12345678901A')).toBe('format')
  })

  it('formats rupees the Indian way', () => {
    expect([formatINR(1700), formatINR(150000)]).toEqual(['₹1,700', '₹1,50,000'])
  })
})
