/*
  Sample orders built through the real cart, reprice and order code. Used by
  tests/order.test.js and by scripts/qa-step3.mjs (through the dev server) to
  write docs/screenshots/step3/whatsapp-samples.txt, so both show the same messages.
*/
import { products } from '../../src/data/products.js'
import { categories, occasions } from '../../src/data/categories.js'
import { combos } from '../../src/data/combos.js'
import { addLine, makeComboLine, makeProductLine } from '../../src/lib/cart.js'
import { repriceCart } from '../../src/lib/reprice.js'
import { buildOrder } from '../../src/lib/order.js'
import { makeOrderId } from '../../src/lib/orderId.js'

export const byId = Object.fromEntries(products.map((p) => [p.id, p]))
export const sections = categories.flatMap((c) => c.sections)
export const menu = { productsById: byId, combos, sections }
export const ctx = { sections, occasions }
export const NOW = new Date('2026-10-05T10:00:00+05:30') // Monday in India: earliest date Wed 7 Oct
// The sample ID is made by the real generator at NOW, with fixed random bytes, so it
// carries the order date (5 Oct, DK-261005-…), not the preferred date (7 Oct).
export const SAMPLE_ID = makeOrderId(NOW, () => Uint8Array.from([5, 22, 2, 19])) // DK-261005-7Q4M

export const form = (over = {}) => ({
  name: 'Asha Rao',
  phone: '+91 98450 12345',
  address: '12, 3rd Cross\nJayanagar 4th Block',
  area: 'Bengaluru',
  pincode: '560 011',
  date: '2026-10-07',
  note: '',
  ...over,
})

// The samples use a confirmed ₹50 charge (the agreed message format). Config leaves the
// charge empty until Hema confirms it; tests/order.test.js covers that case separately.
export const SAMPLE_DELIVERY = { charge: 50 }

/** build: [['product', id, selection, qty] | ['combo', picks, qty]] */
export function orderFrom(build, formOver = {}, id = SAMPLE_ID, delivery = SAMPLE_DELIVERY) {
  let lines = []
  for (const [kind, ...args] of build) {
    lines = addLine(lines, kind === 'combo' ? makeComboLine(combos[0], args[0], args[1], byId) : makeProductLine(byId[args[0]], args[1], args[2], ctx))
  }
  return buildOrder({ id, now: NOW, lines: repriceCart(lines, menu).lines, menu, form: form(formOver), lang: 'en', delivery })
}

export const SAMPLES = {
  simple: () => orderFrom([['product', 'oreo-overload-tub', { size: '250g' }, 1]]),
  personalised: () =>
    orderFrom(
      [
        ['product', 'ferrero-rocher-nutella-tub', { size: '500g', nameOn: true, name: 'Asha', occasion: 'birthday', note: 'Less sweet please' }, 1],
        ['product', 'dreamy-biscoff-delight', { flavour: 'mango', nameOn: true, name: 'Ravi' }, 2],
      ],
      { note: 'Please call before delivering.\nGate code 4512.' },
    ),
  combo: () =>
    orderFrom([
      ['combo', ['walnut-white-chocolate-bar', 'coconut-bar', 'coconut-bar'], 1],
      ['product', 'classic-triple-layer-chocolate', { size: '1kg' }, 1],
      ['product', 'colour-blast-bar', { flavour: 'coffee' }, 3],
    ]),
}
