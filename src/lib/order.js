/*
  Turns a checked cart (src/lib/reprice.js) and the checkout form into the order
  record. Pure, covered by tests/order.test.js. The same record is saved on the
  phone (services.createOrder), shown on the success page and sent to Hema on
  WhatsApp (src/lib/whatsappMessage.js). Shaped like the Stage B tables
  `orders` + `order_items`.
*/
import { site } from '../config/site'
import { weightLabel } from './weights'
import { preferredDateError } from './dates'
import { normalisePhone, normalisePincode, oneLine, phoneError, pincodeError } from './validation'

/** The order's journey, in order (Track Order) */
export const ORDER_STEPS = ['received', 'confirmed', 'preparing', 'dispatched', 'delivered']

export const NAME_MAX = 60
export const AREA_MAX = 60
export const ADDRESS_MAX = 300
export const NOTE_MAX = 200

/** Multi-line address to one tidy line: "12, 3rd Cross\nJayanagar" -> "12, 3rd Cross, Jayanagar" */
export function cleanAddress(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((part) => oneLine(part).replace(/^[,\s]+|[,\s]+$/g, ''))
    .filter(Boolean)
    .join(', ')
}

export const CHECKOUT_FIELDS = ['name', 'phone', 'address', 'area', 'pincode', 'date', 'note']

/**
 * The "Area or city" field, from site.ordering.areaField: 'required' | 'optional' | 'off'.
 * Anything else (a typo in config) counts as 'required', so an address is never cut short.
 */
export const areaFieldMode = (rules = site.ordering) => (['optional', 'off'].includes(rules.areaField) ? rules.areaField : 'required')

/**
 * Checkout form -> { field: reasonCode } for every field that needs fixing (empty = fine).
 * form: { name, phone, address, area, pincode, date, note }
 */
export function checkoutErrors(form, now = new Date(), rules = site.ordering) {
  const name = oneLine(form.name)
  const address = cleanAddress(form.address)
  const errors = {
    name: name.length < 2 ? 'required' : null,
    phone: phoneError(form.phone),
    address: !address ? 'required' : address.length < 10 ? 'short' : null,
    area: areaFieldMode(rules) === 'required' && !oneLine(form.area) ? 'required' : null,
    pincode: pincodeError(form.pincode),
    date: preferredDateError(form.date, now, rules),
    note: oneLine(form.note).length > NOTE_MAX ? 'long' : null,
  }
  return Object.fromEntries(Object.entries(errors).filter(([, v]) => v))
}

/**
 * Order items from checked cart lines (unavailable lines are left out; checkout
 * blocks them before this point anyway).
 * menu: { productsById, combos, sections }
 */
export function orderItems(lines, menu) {
  const sections = menu.sections || menu.categories?.flatMap((c) => c.sections) || []
  return lines
    .filter((line) => !line.unavailable)
    .map((line) => {
      const money = { qty: line.qty, unitPrice: line.unitPrice, lineTotal: line.unitPrice * line.qty }
      if (line.kind === 'combo') {
        const combo = menu.combos?.find((c) => c.id === line.comboId)
        return { kind: 'combo', comboId: line.comboId, name: combo?.itemLabel || line.name, bars: line.pickNames, ...money }
      }
      const product = menu.productsById?.[line.productId]
      const section = sections.find((s) => s.id === product?.sectionId)
      const s = line.selection
      return {
        kind: 'product',
        productId: line.productId,
        name: product?.name || line.name,
        itemLabel: section?.itemLabel || null,
        size: line.labels.size || (product?.grams ? weightLabel(product.grams) : null),
        flavour: line.labels.flavour || null,
        nameOnBox: s.nameOn ? s.name : null,
        namePrice: s.nameOn ? product?.nameCustomisationPrice || 0 : 0,
        occasion: line.labels.occasion || null,
        note: s.note || null,
        ...money,
      }
    })
}

/**
 * Delivery charge for a cart of `itemCount` lines: 0 for an empty cart, the flat charge from
 * config, or null while Hema hasn't confirmed it (site.delivery.charge empty). null means
 * "to be confirmed on WhatsApp": nothing is added to the total, and every screen says so.
 */
export function deliveryChargeFor(itemCount, delivery = site.delivery) {
  if (!itemCount) return 0
  return Number.isFinite(delivery.charge) ? delivery.charge : null
}

/**
 * The full order record.
 * { id, now, lines (checked), menu, form, lang } -> order
 * deliveryCharge is null when the charge is still to be confirmed (total = subtotal then).
 */
export function buildOrder({ id, now = new Date(), lines, menu, form, lang = 'en', rules = site.ordering, delivery = site.delivery }) {
  const items = orderItems(lines, menu)
  const subtotal = items.reduce((sum, it) => sum + it.lineTotal, 0)
  const deliveryCharge = deliveryChargeFor(items.length, delivery)
  return {
    id,
    createdAt: now.toISOString(),
    status: 'received',
    channel: 'whatsapp',
    lang,
    customer: {
      name: oneLine(form.name).slice(0, NAME_MAX),
      phone: normalisePhone(form.phone),
      address: cleanAddress(form.address).slice(0, ADDRESS_MAX),
      area: areaFieldMode(rules) === 'off' ? '' : oneLine(form.area).slice(0, AREA_MAX),
      pincode: normalisePincode(form.pincode),
    },
    preferredDate: form.date,
    note: oneLine(form.note).slice(0, NOTE_MAX),
    items,
    subtotal,
    deliveryCharge,
    total: subtotal + (deliveryCharge ?? 0),
  }
}
