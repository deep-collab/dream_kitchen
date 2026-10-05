import { useCart } from '../context/CartProvider'
import { useMenu, useShopStatus } from '../context/MenuProvider'
import { quote } from '../lib/pricing'

/**
 * The cart priced by the shared pricing module, with Hema's current courier rates:
 *   zone: 'karnataka' | 'outside' (exact courier and total) or null (cart page: both rates)
 * -> { subtotal, courier, total, courierTier, rates: {karnataka, outside}, hasDrawing, lines, items }
 * Unavailable lines are left out (checkout blocks them until removed).
 */
export function useCartQuote(zone = null) {
  const cart = useCart()
  const menu = useMenu()
  const { settings } = useShopStatus()
  const lines = cart.lines.filter((l) => !l.unavailable && menu.productsById[l.productId])
  const items = lines.map((l) => ({ product: menu.productsById[l.productId], selection: l.selection, qty: l.qty }))
  const q = quote(items, zone, settings.courier)
  return { ...q, rates: q.courierTier ? settings.courier.rates[q.courierTier] : null, lines, items }
}
