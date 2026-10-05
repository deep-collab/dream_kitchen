import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { site, telLink } from '../../config/site'
import { useCart } from '../../context/CartProvider'
import Wordmark from '../brand/Wordmark'
import LanguageToggle from '../ui/LanguageToggle'
import { PhoneIcon } from '../icons'
import { FOOTER_NAV, isCheckoutPath } from './nav'

// Short black footer: Call, Track Order, Our Story, FAQ, Contact and the language switch.
// Bottom padding clears the tab bar (plus the safe-area inset) below 1024px.
export default function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()
  // On the cart and checkout the order's total bar (taller than the tab bar) covers the bottom
  const { pathname } = useLocation()
  const { count } = useCart()
  const clear = isCheckoutPath(pathname, count) ? 'pb-48' : 'pb-[calc(var(--bar-h)+env(safe-area-inset-bottom)+1.25rem)]'
  const link = 'inline-flex min-h-12 min-w-12 items-center text-cream underline-offset-4 transition-colors hover:text-gold-light hover:underline'

  return (
    <footer className="on-dark border-t border-gold/45 bg-ink text-muted">
      <div className="dk-container grid gap-6 pt-8 pb-6 md:grid-cols-[auto_1fr_auto] md:items-center md:gap-10">
        <Link to="/" className="justify-self-center rounded-control p-1 md:justify-self-start" aria-label={t('brand.homeLink')}>
          <Wordmark variant="stacked" size="sm" />
        </Link>

        <nav aria-label={t('footer.links')}>
          <ul className="grid grid-cols-2 gap-x-6 sm:flex sm:flex-wrap sm:justify-center sm:gap-x-8">
            <li className="col-span-2 sm:col-span-1">
              <a href={telLink} className={`${link} gap-2 font-bold`}>
                <PhoneIcon className="h-5 w-5 text-gold" />
                {t('common.callUs')}
              </a>
            </li>
            {FOOTER_NAV.map(({ to, key }) => (
              <li key={to}>
                <Link to={to} className={link}>
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <LanguageToggle className="justify-self-center md:justify-self-end" />
      </div>

      <div className="dk-container">
        <hr className="rule-gold" />
        <div className={`t-small flex flex-col gap-1 pt-4 text-center sm:flex-row sm:flex-wrap sm:justify-between sm:gap-x-8 sm:text-left lg:pb-6 ${clear}`}>
          <p>{t('footer.rights', { year })}</p>
          <p>{t('footer.shipping')}</p>
          {site.fssai && <p>{t('footer.fssai', { fssai: site.fssai })}</p>}
        </div>
      </div>
    </footer>
  )
}
