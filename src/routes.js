import { loadSheetBodies } from './components/shop/ShopSheets'
import { loadMenuData } from './services'

// Pages that show the menu start downloading it together with their own code, not after
const withMenu = (load) => () => {
  loadMenuData()
  return load()
}

// Each page is its own chunk, downloaded only when someone opens it (App.jsx), so the
// first visit downloads just the shell and that one page.
export const pages = {
  Home: withMenu(() => import('./pages/Home')),
  Shop: withMenu(() => import('./pages/Shop')),
  Product: withMenu(() => import('./pages/Product')),
  Cart: withMenu(() => import('./pages/Cart')),
  Checkout: withMenu(() => import('./pages/Checkout')),
  OrderSuccess: () => import('./pages/OrderSuccess'),
  Track: () => import('./pages/Track'),
  About: () => import('./pages/About'),
  Classes: () => import('./pages/Classes'),
  ClassBooked: () => import('./pages/ClassBooked'),
  Gallery: () => import('./pages/Gallery'),
  Contact: () => import('./pages/Contact'),
  FAQ: withMenu(() => import('./pages/FAQ')),
  NotFound: () => import('./pages/NotFound'),
}

/**
 * Once the first page is up and the phone is idle, fetch the pages of the order path so the
 * next taps feel instant. Skipped when the visitor has asked to save data.
 */
export function prefetchOrderPath() {
  if (typeof navigator !== 'undefined' && navigator.connection?.saveData) return
  const go = () => [pages.Shop, pages.Product, pages.Cart, pages.Checkout, loadSheetBodies].forEach((load) => load().catch(() => {}))
  if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 5000 })
  else setTimeout(go, 2500)
}
