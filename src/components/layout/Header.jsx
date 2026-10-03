import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useCart } from '../../context/CartProvider'
import { telLink } from '../../config/site'
import Wordmark from '../brand/Wordmark'
import LanguageToggle from '../ui/LanguageToggle'
import { CartIcon, MenuIcon, PhoneIcon } from '../icons'
import { MAIN_NAV } from './nav'
import MobileMenu from './MobileMenu'
import CartCount from './CartCount'

// Sticky black header with a fine gold rule. Call is visible at every width.
// Phones: wordmark · language · Call · Menu (the cart lives in the bottom bar).
export default function Header() {
  const { t } = useI18n()
  const { pieces } = useCart()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the menu whenever the route changes (taps on menu links navigate)
  const [lastPath, setLastPath] = useState(pathname)
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setMenuOpen(false)
  }
  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1280px)')
    const onChange = (e) => e.matches && setMenuOpen(false)
    wide.addEventListener('change', onChange)
    return () => wide.removeEventListener('change', onChange)
  }, [])

  const navCls = ({ isActive }) =>
    `relative inline-flex min-h-12 items-center rounded-control px-3 text-[1.0625rem] font-bold whitespace-nowrap transition-colors hover:text-gold-light ${
      isActive ? 'text-gold-light after:absolute after:inset-x-3 after:bottom-2 after:h-px after:bg-gold' : 'text-cream'
    }`

  return (
    <header className="on-dark sticky top-0 z-40 border-b border-gold/45 bg-ink text-cream">
      <div className="dk-container flex h-[var(--header-h)] items-center gap-1.5 sm:gap-2">
        <Link to="/" className="mr-auto -ml-1 flex min-h-12 shrink-0 items-center rounded-control px-1" aria-label={t('brand.homeLink')}>
          <Wordmark />
        </Link>

        <nav aria-label={t('nav.main')} className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {MAIN_NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} className={navCls}>
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 xl:ml-4">
          <span className="md:hidden">
            <LanguageToggle variant="compact" />
          </span>
          <span className="hidden md:block">
            <LanguageToggle />
          </span>

          <a
            href={telLink}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-control border-[1.5px] border-gold px-3 font-bold whitespace-nowrap text-cream transition-colors hover:bg-gold/15 md:px-4"
          >
            <PhoneIcon className="h-5 w-5 text-gold" />
            <span>{t('header.call')}</span>
          </a>

          <Link
            to="/cart"
            className="hidden min-h-12 items-center gap-2 rounded-control px-3 font-bold whitespace-nowrap text-cream transition-colors hover:bg-white/10 md:inline-flex"
            aria-label={t('common.cartWithCount', { count: pieces })}
          >
            <CartIcon className="h-6 w-6 text-gold" />
            <span aria-hidden="true">{t('nav.cart')}</span>
            <CartCount count={pieces} />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            className="-mr-1 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-control px-2 font-bold text-cream transition-colors hover:bg-white/10 md:px-3 xl:hidden"
          >
            <MenuIcon className="h-7 w-7" />
            {/* Phones: icon only (no room at 360px); the accessible name stays */}
            <span className="sr-only md:not-sr-only">{t('nav.menu')}</span>
          </button>
        </div>
      </div>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
