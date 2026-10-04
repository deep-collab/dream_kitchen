import { classesEnabled } from '../../config/site'
import { ClassesIcon, ContactIcon, FaqIcon, GalleryIcon, ShopIcon, StoryIcon, TrackIcon } from '../icons'

// Main navigation (header on desktop, large rows in the mobile menu, footer links).
// Classes appears only while site.classes.enabled is true.
export const MAIN_NAV = [
  { to: '/shop', key: 'nav.shop', icon: ShopIcon },
  classesEnabled() && { to: '/classes', key: 'nav.classes', icon: ClassesIcon },
  { to: '/our-story', key: 'nav.story', icon: StoryIcon },
  { to: '/track', key: 'nav.track', icon: TrackIcon },
  { to: '/contact', key: 'nav.contact', icon: ContactIcon },
].filter(Boolean)

export const MORE_NAV = [
  { to: '/gallery', key: 'nav.gallery', icon: GalleryIcon },
  { to: '/faq', key: 'nav.faq', icon: FaqIcon },
]
