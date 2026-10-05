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

/** Pages where the bottom of the screen belongs to the checkout's own total bar */
export const isCheckoutPath = (pathname) => /^\/(checkout|pay)(\/|$)/.test(pathname)
