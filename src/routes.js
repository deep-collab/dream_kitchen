import { loadSheetBodies } from './components/shop/ShopSheets'

// Each page is its own chunk, downloaded only when someone opens it (App.jsx), so the first visit
// downloads just the shell and that one page.
export const pages = {
  Home: () => import('./pages/Home'),
  Menu: () => import('./pages/Menu'),
  Customize: () => import('./pages/Customize'),
  Cart: () => import('./pages/Cart'),
  Checkout: () => import('./pages/Checkout'),
  CheckoutReview: () => import('./pages/CheckoutReview'),
  Pay: () => import('./pages/Pay'),
  OrderConfirmed: () => import('./pages/OrderConfirmed'),
  Track: () => import('./pages/Track'),
  Classes: () => import('./pages/Classes'),
  BookClass: () => import('./pages/BookClass'),
  Booking: () => import('./pages/Booking'),
  Story: () => import('./pages/Story'),
  Contact: () => import('./pages/Contact'),
  FAQ: () => import('./pages/FAQ'),
  NotFound: () => import('./pages/NotFound'),
}

/**
 * Once the first page is up and the phone is idle, fetch the pages of the order path so the
 * next taps feel instant. Skipped when the visitor has asked to save data.
 */
export function prefetchOrderPath() {
  if (typeof navigator !== 'undefined' && navigator.connection?.saveData) return
  const go = () => [pages.Menu, loadSheetBodies, pages.Cart, pages.Checkout, pages.CheckoutReview].forEach((load) => load().catch(() => {}))
  if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 5000 })
  else setTimeout(go, 2500)
}
