import { Link, NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useCart } from '../../context/CartProvider'
import { telLink } from '../../config/site'
import Wordmark from '../brand/Wordmark'
import LanguageToggle from '../ui/LanguageToggle'
import { CartIcon, PhoneIcon } from '../icons'
import { MAIN_NAV } from './nav'
import CartCount, { CartItemsSr } from './CartCount'

// Sticky black header with a fine gold rule: logo, (wide screens) the five main links,
// language, Call (visible at every width) and the cart with its count.
// Phones and tablets get the five links in the tab bar at the bottom instead.
export default function Header() {
  const { t } = useI18n()
  const { count } = useCart()

  const navCls = ({ isActive }) =>
    `relative inline-flex min-h-12 items-center rounded-control px-3 text-[1.0625rem] font-bold whitespace-nowrap transition-colors hover:text-gold-light ${
      isActive ? 'text-gold-light after:absolute after:inset-x-3 after:bottom-2 after:h-px after:bg-gold' : 'text-cream'
    }`

  return (
    <header className="on-dark sticky top-0 z-40 border-b border-gold/45 bg-ink text-cream">
      <div className="dk-container flex h-[var(--header-h)] items-center gap-1 sm:gap-2">
        <Link to="/" className="mr-auto -ml-1 flex min-h-12 shrink-0 items-center rounded-control px-1" aria-label={t('brand.homeLink')}>
          <Wordmark />
        </Link>

        <nav aria-label={t('nav.main')} className="hidden lg:block">
          <ul className="flex items-center gap-0.5 xl:gap-1">
            {MAIN_NAV.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.end} className={navCls}>
                  {t(item.key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2 lg:ml-3">
          <LanguageToggle variant="compact" />
          <a
            href={telLink}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-control border-[1.5px] border-gold px-3 font-bold whitespace-nowrap text-cream transition-colors hover:bg-gold/15"
          >
            <PhoneIcon className="h-5 w-5 text-gold" />
            <span>{t('header.call')}</span>
          </a>
          <Link
            to="/cart"
            data-dk-cart
            className="relative -mr-1 inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-control px-2 font-bold whitespace-nowrap text-cream transition-colors hover:bg-white/10 md:px-3"
          >
            <CartIcon className="h-6 w-6 text-gold" />
            <span className="sr-only md:not-sr-only">{t('nav.cart')}</span>
            <CartItemsSr count={count} t={t} />
            <CartCount count={count} className="absolute -top-0.5 right-0 h-5 min-w-5 px-1 text-[0.8125rem] md:static md:h-6 md:min-w-6 md:text-base" />
          </Link>
        </div>
      </div>
    </header>
  )
}
