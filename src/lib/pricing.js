/*
  Pure price logic. No React, no storage. Covered by tests/pricing.test.js.
  All amounts are whole rupees.
*/

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

/** 1499 -> "₹1,499", 150000 -> "₹1,50,000" (Indian grouping, no decimals) */
export const formatINR = (amount) => `₹${inr.format(Math.round(amount))}`

export const optionGroup = (product, id) => product.optionGroups?.find((grp) => grp.id === id) || null
export const findChoice = (product, groupId, choiceId) => optionGroup(product, groupId)?.choices.find((c) => c.id === choiceId) || null

/** The default selection: first size preselected, no flavour, no extras. */
export function defaultSelection(product) {
  const size = optionGroup(product, 'size')
  return { size: size ? size.choices[0].id : null, flavour: null, nameOn: false, name: '', occasion: null, note: '' }
}

/** Name customisation is charged only when the product allows it, the switch is on, and a name was typed. */
export function nameCharged(product, selection) {
  return Boolean(product.nameCustomisation && selection?.nameOn && String(selection.name || '').trim())
}

/**
 * Unit price for one item with the given choices.
 * size price (or the fixed price) + flavour delta + name customisation.
 * Returns null when a required size is missing or unknown.
 */
export function priceForSelection(product, selection = {}) {
  let price
  if (optionGroup(product, 'size')) {
    const size = findChoice(product, 'size', selection.size)
    if (!size) return null
    price = size.price
  } else {
    price = product.price
  }
  if (selection.flavour) price += findChoice(product, 'flavour', selection.flavour)?.priceDelta || 0
  if (nameCharged(product, selection)) price += product.nameCustomisationPrice
  return price
}

/** Lowest price a customer can pay for the product (for "from ₹X"). */
export function fromPrice(product) {
  const size = optionGroup(product, 'size')
  return size ? Math.min(...size.choices.map((c) => c.price)) : product.price
}
export const hasPriceRange = (product) => (optionGroup(product, 'size')?.choices.length || 0) > 1

/* ---------- combo ---------- */

export const comboPrice = (combo) => combo.price

/** Sum of the picked items bought one by one. productsById: { [id]: product } */
export function comboIndividualTotal(picks, productsById) {
  return picks.reduce((sum, id) => sum + (productsById[id]?.price ?? 0), 0)
}

/** Positive = the combo saves money; negative = buying individually is cheaper. */
export function comboSavings(combo, picks, productsById) {
  return comboIndividualTotal(picks, productsById) - combo.price
}

/** A pick list is complete when it has exactly `pick` eligible items (repeats only if allowed). */
export function isComboComplete(combo, picks) {
  if (picks.length !== combo.pick) return false
  if (!picks.every((id) => combo.eligibleProductIds.includes(id))) return false
  return combo.allowRepeats || new Set(picks).size === picks.length
}

export const cheaperIndividually = (combo, picks, productsById) =>
  isComboComplete(combo, picks) && comboIndividualTotal(picks, productsById) < combo.price

/* ---------- cart lines ---------- */

export const lineTotal = (line) => line.unitPrice * line.qty
export const cartSubtotal = (lines) => lines.reduce((sum, line) => sum + lineTotal(line), 0)
export const cartCount = (lines) => lines.reduce((sum, line) => sum + line.qty, 0)
