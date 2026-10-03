import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { useCart } from '../../context/CartProvider'
import { useAnyOverlayOpen } from '../../hooks/useModal'
import { telLink, waLink } from '../../config/site'
import { CartIcon, PhoneIcon, WhatsAppIcon } from '../icons'
import CartCount from './CartCount'

// Phones only (<768px): three equal labelled buttons, always within thumb reach.
// Hidden while a sheet or the menu is open. Layout pads the page so it never covers content.
export default function MobileBar() {
  const { t } = useI18n()
  const { pieces } = useCart()
  const hidden = useAnyOverlayOpen()
  const item =
    'flex h-full flex-col items-center justify-center gap-1 px-1 text-center text-base leading-tight font-bold text-cream transition-colors active:bg-white/10'

  return (
    <nav
      aria-label={t('mobileBar.label')}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-gold/45 bg-ink pb-[env(safe-area-inset-bottom)] transition-transform duration-200 md:hidden ${
        hidden ? 'translate-y-full' : ''
      }`}
    >
      <ul className="grid h-[var(--bar-h)] grid-cols-3 divide-x divide-ink-line">
        <li>
          <a href={telLink} className={item}>
            <PhoneIcon className="h-6 w-6 text-gold" />
            <span>{t('mobileBar.call')}</span>
          </a>
        </li>
        <li>
          <a href={waLink(t('wa.general'))} target="_blank" rel="noopener noreferrer" className={item}>
            <WhatsAppIcon className="h-6 w-6 text-[#25d366]" />
            <span>{t('mobileBar.whatsapp')}</span>
          </a>
        </li>
        <li>
          <Link to="/cart" className={item} aria-label={t('common.cartWithCount', { count: pieces })}>
            <span className="relative">
              <CartIcon className="h-6 w-6 text-gold" />
              <CartCount count={pieces} className="absolute -top-2 left-4 h-5 min-w-5 px-1 text-[0.8125rem]" />
            </span>
            <span aria-hidden="true">{t('mobileBar.cart')}</span>
          </Link>
        </li>
      </ul>
    </nav>
  )
}
