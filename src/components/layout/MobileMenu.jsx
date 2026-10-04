import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useCart } from '../../context/CartProvider'
import { useModal, usePresence } from '../../hooks/useModal'
import { formatCallHours } from '../../lib/hours'
import { hasCallHours, telLink } from '../../config/site'
import Wordmark from '../brand/Wordmark'
import Button from '../ui/Button'
import LanguageToggle from '../ui/LanguageToggle'
import { CartIcon, CloseIcon, PhoneIcon } from '../icons'
import { MAIN_NAV, MORE_NAV } from './nav'
import CartCount, { CartItemsSr } from './CartCount'

// Full-screen black menu: big labelled rows with icons, language, and large Call and
// WhatsApp buttons within thumb reach at the bottom.
export default function MobileMenu({ open, onClose }) {
  const { t } = useI18n()
  const { count: pieces } = useCart()
  const [mounted, shown] = usePresence(open, 260)
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  useModal(open && mounted, { ref: panelRef, onClose, initialFocusRef: closeRef })
  if (!mounted) return null

  const row = ({ isActive }) =>
    `flex min-h-14 items-center gap-4 border-b border-ink-line px-1 text-[1.25rem] font-bold transition-colors ${
      isActive ? 'text-gold-light' : 'text-cream hover:text-gold-light'
    }`

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={t('mobileMenu.title')}
      className={`on-dark fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-ink text-cream transition-[opacity,transform] duration-[260ms] ease-out-soft xl:hidden ${
        shown ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'
      }`}
    >
      <div className="dk-container flex h-[var(--header-h)] shrink-0 items-center gap-2 border-b border-gold/45">
        <Link to="/" onClick={onClose} className="mr-auto -ml-1 flex min-h-12 items-center rounded-control px-1" aria-label={t('brand.homeLink')}>
          <Wordmark />
        </Link>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="-mr-1 inline-flex min-h-12 items-center gap-2 rounded-control px-3 font-bold text-cream transition-colors hover:bg-white/10"
        >
          <CloseIcon className="h-7 w-7" />
          <span>{t('common.close')}</span>
        </button>
      </div>

      <div className="dk-container flex flex-1 flex-col pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <nav aria-label={t('nav.main')}>
          <ul>
            {MAIN_NAV.map(({ to, key, icon: Icon }) => (
              <li key={to}>
                <NavLink to={to} onClick={onClose} className={row}>
                  <Icon className="h-6 w-6 shrink-0 text-gold" />
                  {t(key)}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/cart" onClick={onClose} className={row}>
                <CartIcon className="h-6 w-6 shrink-0 text-gold" />
                <span>{t('nav.cart')}</span>
                <CartItemsSr count={pieces} t={t} />
                <CartCount count={pieces} />
              </NavLink>
            </li>
          </ul>
          <ul className="mt-2 flex gap-2">
            {MORE_NAV.map(({ to, key, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onClose}
                  className="inline-flex min-h-12 items-center gap-2 rounded-control px-2 font-bold text-muted transition-colors hover:text-gold-light"
                >
                  <Icon className="h-5 w-5" />
                  {t(key)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <span className="font-bold text-muted">{t('nav.language')}</span>
          <LanguageToggle size="lg" />
        </div>

        <div className="mt-auto grid gap-3 pt-8">
          <Button href={telLink} variant="primary" size="lg" icon={PhoneIcon} fullWidth>
            {t('mobileMenu.callUs')}
          </Button>
          <Button variant="whatsapp" size="lg" fullWidth>
            {t('mobileMenu.chat')}
          </Button>
          {hasCallHours() && (
            <p className="t-small mt-1 text-center text-muted">
              {t('hours.label')}: {formatCallHours(t)}
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
