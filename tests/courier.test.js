// Courier charges (src/lib/pricing.js): Hema's exact rates, one charge per order for the
// highest tier in the cart, zone from the pincode.
import { describe, expect, it } from 'vitest'
import { courier, products } from '../src/config/shop.js'
import { courierCharge, courierFrom, defaultSelection, itemCourierTier, pincodeError, quote, stateMismatch, zoneForPincode } from '../src/lib/pricing.js'
import { stateIds } from '../src/data/states.js'

const P = Object.fromEntries(products.map((p) => [p.id, p]))
const item = (id, selection = {}, qty = 1) => ({ product: P[id], selection: { ...defaultSelection(P[id]), ...selection }, qty })
const courierFor = (items, pin) => quote(items, zoneForPincode(pin)).courier

describe('rates and tiers from config', () => {
  it('small ₹90 / ₹100, large ₹100 / ₹150; 750 g (TO CONFIRM) pays the large rate until Hema sets one', () => {
    expect(courier.rates).toEqual({ small: { karnataka: 90, outside: 100 }, large: { karnataka: 100, outside: 150 }, xl: { karnataka: 100, outside: 150 } })
    expect(courierFrom()).toBe(90)
  })

  it('750 g tubs are the "750 g" tier; Hema’s 750 g rate applies to them', () => {
    const tubs = products.filter((p) => p.category === 'brownie-tubs' && p.sizes.length)
    for (const p of tubs) {
      expect(itemCourierTier(p, { size: '750g' }), p.id).toBe('xl')
      expect(itemCourierTier(p, { size: '500g' }), p.id).toBe('small')
    }
    const rates = { ...courier.rates, xl: { karnataka: 120, outside: 180 } }
    const cfg = { ...courier, rates }
    const cart = [item('oreo-overload-tub', { size: '750g' }), item('plain-brownies')]
    expect(quote(cart, 'karnataka', cfg).courier).toBe(120)
    expect(quote(cart, 'outside', cfg)).toMatchObject({ courierTier: 'xl', courier: 180 })
  })

  it('one charge per order = the highest rate among its tiers, even if Hema sets a heavier tier cheaper', () => {
    const cfg = { ...courier, rates: { ...courier.rates, xl: { karnataka: 95, outside: 120 } } }
    expect(courierCharge(['xl', 'large', 'small'], 'outside', cfg)).toBe(150)
    expect(courierCharge(['xl', 'small'], 'karnataka', cfg)).toBe(95)
    expect(courierCharge([], 'karnataka', cfg)).toBe(0)
    expect(courierCharge(['small'], null, cfg)).toBeNull()
  })

  it('Delight Box 250 g is small; 500 g and 700 g are large; everything else is small (750 g tubs: xl)', () => {
    for (const id of ['red-velvet-delight-box', 'chocolate-delight-box', 'mango-delight-box', 'pista-delight-box']) {
      expect(itemCourierTier(P[id], { size: '250g' })).toBe('small')
      expect(itemCourierTier(P[id], { size: '500g' })).toBe('large')
      expect(itemCourierTier(P[id], { size: '700g' })).toBe('large')
    }
    for (const p of products.filter((p) => p.category !== 'delight-boxes')) for (const s of p.sizes?.length ? p.sizes : [null]) expect(itemCourierTier(p, { size: s?.id }), p.id).toBe(s?.grams >= 750 ? 'xl' : 'small')
  })
})

describe('the brief’s courier cases', () => {
  it('small-only cart: ₹90 for 560001 (Bengaluru), ₹100 for 400001 (Mumbai)', () => {
    const cart = [item('plain-brownies'), item('almond-bar', {}, 3), item('mango-delight-box', { size: '250g' })]
    expect(courierFor(cart, '560001')).toBe(90)
    expect(courierFor(cart, '400001')).toBe(100)
  })

  it.each(['500g', '700g'])('any %s Delight Box: ₹100 for 560001, ₹150 for 110001 (Delhi)', (size) => {
    const cart = [item('pista-delight-box', { size })]
    expect(courierFor(cart, '560001')).toBe(100)
    expect(courierFor(cart, '110001')).toBe(150)
  })

  it('mixed small + large: the large rate, charged once', () => {
    const cart = [item('plain-brownies', {}, 5), item('chocolate-delight-box', { size: '500g' }), item('pista-bar'), item('red-velvet-delight-box', { size: '700g' }, 2)]
    const q = quote(cart, zoneForPincode('110001'))
    expect(q.courierTier).toBe('large')
    expect(q.courier).toBe(150)
    expect(q.total).toBe(q.subtotal + 150)
  })

  it('pincode/state mismatch: a warning, and the pincode’s zone wins', () => {
    const cart = [item('plain-brownies')]
    // Says Karnataka, pincode is Mumbai -> outside rate
    expect(stateMismatch('karnataka', zoneForPincode('400001'))).toBe(true)
    expect(courierFor(cart, '400001')).toBe(100)
    // Says Kerala, pincode is Mysuru -> Karnataka rate
    expect(stateMismatch('kerala', zoneForPincode('570001'))).toBe(true)
    expect(courierFor(cart, '570001')).toBe(90)
    // Agreeing pairs: no warning
    expect(stateMismatch('karnataka', zoneForPincode('580001'))).toBe(false)
    expect(stateMismatch('delhi', zoneForPincode('110001'))).toBe(false)
  })

  it.each(['', '12345', '1234567', '056001', 'ABCDEF', '56 00 1'])('an invalid pincode "%s" is blocked: no zone, no courier, no total', (pin) => {
    expect(pincodeError(pin)).not.toBeNull()
    expect(zoneForPincode(pin)).toBeNull()
    const q = quote([item('plain-brownies')], zoneForPincode(pin))
    expect(q.courier).toBeNull()
    expect(q.total).toBeNull()
  })
})

describe('zones', () => {
  it.each([
    ['560001', 'karnataka'],
    ['570001', 'karnataka'],
    ['580001', 'karnataka'],
    ['591237', 'karnataka'],
    ['560 001', 'karnataka'],
    ['400001', 'outside'],
    ['110001', 'outside'],
    ['600001', 'outside'], // Chennai: starts with 6, not 56–59
    ['550001', 'outside'],
  ])('%s -> %s', (pin, zone) => expect(zoneForPincode(pin)).toBe(zone))

  it('an empty cart pays no courier', () => {
    expect(courierCharge([], 'karnataka')).toBe(0)
    expect(quote([], 'outside').total).toBe(0)
  })

  it('the state list has Karnataka and every state the mismatch check needs', () => {
    expect(stateIds.has('karnataka')).toBe(true)
    expect(stateIds.size).toBe(36)
  })
})
