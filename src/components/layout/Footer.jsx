import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { site, telLink, waLink } from '../../config/site'
import { formatCallHours } from '../../lib/hours'
import Wordmark from '../brand/Wordmark'
import { ClockIcon, InstagramIcon, PhoneIcon, WhatsAppIcon } from '../icons'
import { MAIN_NAV, MORE_NAV } from './nav'

// Black footer: lockup + tagline, ways to reach Hema, quick links, legal line.
// Bottom padding clears the mobile bar (plus the safe-area inset) below 768px.
export default function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()
  const contactLink = 'inline-flex min-h-12 items-center gap-3 font-bold text-cream transition-colors hover:text-gold-light'
  const quickLink = 'inline-flex min-h-12 min-w-12 items-center text-cream transition-colors hover:text-gold-light'

  return (
    <footer className="on-dark border-t border-gold/45 bg-ink text-muted">
      <div className="dk-container grid gap-10 pt-14 pb-10 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr] lg:gap-12 lg:pt-20">
        <div className="flex flex-col items-center text-center md:col-span-2 lg:col-span-1 lg:items-start lg:text-left">
          <Link to="/" className="rounded-control p-1" aria-label={t('brand.homeLink')}>
            <Wordmark variant="stacked" size="sm" />
          </Link>
          <p className="dk-tagline dk-tagline--footer mt-5">{t('brand.tagline')}</p>
        </div>

        <div>
          <h2 className="t-h3 text-cream">{t('footer.talk')}</h2>
          <ul className="mt-3">
            <li>
              <a href={telLink} className={contactLink}>
                <PhoneIcon className="h-6 w-6 shrink-0 text-gold" />
                <span>{site.phone.display}</span>
              </a>
            </li>
            <li>
              <a href={waLink(t('wa.general'))} target="_blank" rel="noopener noreferrer" className={contactLink}>
                <WhatsAppIcon className="h-6 w-6 shrink-0 text-[#25d366]" />
                <span>{t('footer.whatsapp')}</span>
              </a>
            </li>
            <li>
              <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className={`${contactLink} break-all`}>
                <InstagramIcon className="h-6 w-6 shrink-0 text-gold" />
                <span>{site.instagram.handle}</span>
              </a>
            </li>
          </ul>
          <p className="mt-3 flex gap-3">
            <ClockIcon className="mt-0.5 h-6 w-6 shrink-0 text-gold" />
            <span>
              <span className="block font-bold text-cream">{t('hours.label')}</span>
              {formatCallHours(t)}
            </span>
          </p>
        </div>

        <nav aria-label={t('footer.explore')}>
          <h2 className="t-h3 text-cream">{t('footer.explore')}</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-6 md:grid-cols-1">
            {[...MAIN_NAV, ...MORE_NAV].map(({ to, key }) => (
              <li key={to}>
                <Link to={to} className={quickLink}>
                  {t(key)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="dk-container">
        <hr className="rule-gold" />
        <div className="t-small flex flex-col gap-1 pt-5 pb-[calc(var(--bar-h)+env(safe-area-inset-bottom)+1.5rem)] sm:flex-row sm:flex-wrap sm:justify-between sm:gap-x-8 md:pb-8">
          <p>{t('footer.rights', { year })}</p>
          <p>{t('footer.prebook')}</p>
          {site.fssai && <p>{t('footer.fssai', { fssai: site.fssai })}</p>}
        </div>
      </div>
    </footer>
  )
}
