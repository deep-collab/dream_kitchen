/*
  Small things kept only on this phone (never sent anywhere):
  - the customer's checkout details, when "Remember my details" is ticked
  - which order's success page should empty the cart (once, after the order is saved)
*/
const DETAILS_KEY = 'dk_details'
const CLEAR_CART_KEY = 'dk_clear_cart_for'
const DETAIL_FIELDS = ['name', 'phone', 'address', 'area', 'pincode']

const get = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const set = (key, value) => {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* storage blocked: nothing is remembered */
  }
}

/** { name, phone, address, area, pincode } or null */
export function loadDetails() {
  try {
    const data = JSON.parse(get(DETAILS_KEY))
    if (!data || typeof data !== 'object') return null
    return Object.fromEntries(DETAIL_FIELDS.map((k) => [k, typeof data[k] === 'string' ? data[k] : '']))
  } catch {
    return null
  }
}
export const saveDetails = (form) => set(DETAILS_KEY, JSON.stringify(Object.fromEntries(DETAIL_FIELDS.map((k) => [k, String(form[k] ?? '').trim()]))))
export const forgetDetails = () => set(DETAILS_KEY, null)

/** Called when an order is sent: its success page empties the cart. */
export const markCartForClearing = (orderId) => set(CLEAR_CART_KEY, orderId)
/** True once for the order just placed (so revisiting an old success page never empties a new cart). */
export function consumeCartClearing(orderId) {
  if (get(CLEAR_CART_KEY) !== orderId) return false
  set(CLEAR_CART_KEY, null)
  return true
}
