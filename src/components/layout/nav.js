import { BrushIcon, ClassesIcon, ContactIcon, HomeIcon, ShopIcon } from '../icons'

// The five main places (Hema's request: no more than five). Header on wide screens, the tab bar
// on phones and tablets. Track Order, Our Story and FAQ live in the footer.
export const MAIN_NAV = [
  { to: '/', key: 'nav.home', icon: HomeIcon, end: true },
  { to: '/menu', key: 'nav.menu', icon: ShopIcon },
  { to: '/customize', key: 'nav.customize', icon: BrushIcon },
  { to: '/classes', key: 'nav.classes', icon: ClassesIcon },
  { to: '/contact', key: 'nav.contact', icon: ContactIcon },
]

export const FOOTER_NAV = [
  { to: '/track', key: 'nav.track' },
  { to: '/our-story', key: 'nav.story' },
  { to: '/faq', key: 'nav.faq' },
  { to: '/contact', key: 'nav.contact' },
]

// /terms, /refund, /shipping, /privacy (src/pages/Policy.jsx). Razorpay checks they are linked from every page.
export const POLICY_PAGES = ['terms', 'refund', 'shipping', 'privacy']
export const POLICY_NAV = POLICY_PAGES.map((page) => ({ to: `/${page}`, key: `nav.${page}` }))

/** Pages where the bottom of the screen belongs to the order's own total bar (cart and checkout).
 *  An empty cart has no total bar, so it keeps the tab bar. */
export const isCheckoutPath = (pathname, cartCount = 1) => /^\/(checkout|pay|classes\/book|classes\/booking)(\/|$)/.test(pathname) || (pathname === '/cart' && cartCount > 0)
