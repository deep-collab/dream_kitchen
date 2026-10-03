import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { site, waLink } from '../config/site'
import LogoBadge from './LogoBadge'
import { InstagramIcon, MailIcon, PinIcon, WhatsAppIcon } from './Icons'

export default function Footer() {
  const { t } = useI18n()
  const year = new Date().getFullYear()
  const col = 'font-display text-lg font-bold text-gold-soft'
  const link = 'inline-flex min-h-11 items-center text-cream/90 transition hover:text-gold-soft'

  return (
    <footer className="relative mt-16 bg-deep text-cream">
      {/* scalloped top edge */}
      <svg aria-hidden="true" className="absolute -top-[15px] left-0 h-4 w-full text-deep" viewBox="0 0 120 8" preserveAspectRatio="none">
        <path d="M0 8 Q5 0 10 8 T20 8 T30 8 T40 8 T50 8 T60 8 T70 8 T80 8 T90 8 T100 8 T110 8 T120 8 V8 H0Z" fill="currentColor" />
      </svg>
      <div className="container-dk grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
        <div>
          <div className="flex items-center gap-3">
            <LogoBadge size="md" />
            <div>
              <p className="font-display text-2xl font-bold text-cream">{t('brand.name')}</p>
              <p className="text-sm text-gold-soft">{t('brand.tagline')}</p>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-cream/85">{t('footer.about')}</p>
        </div>

        <nav aria-label={t('footer.explore')}>
          <h2 className={col}>{t('footer.explore')}</h2>
          <ul className="mt-2">
            <li><Link className={link} to="/shop">{t('nav.shop')}</Link></li>
            <li><Link className={link} to="/about">{t('nav.about')}</Link></li>
            <li><Link className={link} to="/gallery">{t('nav.gallery')}</Link></li>
            <li><Link className={link} to="/cart">{t('nav.cart')}</Link></li>
          </ul>
        </nav>

        <nav aria-label={t('footer.help')}>
          <h2 className={col}>{t('footer.help')}</h2>
          <ul className="mt-2">
            <li><Link className={link} to="/track">{t('nav.track')}</Link></li>
            <li><Link className={link} to="/faq">{t('nav.faq')}</Link></li>
            <li><Link className={link} to="/contact">{t('nav.contact')}</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className={col}>{t('footer.contact')}</h2>
          <ul className="mt-2 space-y-0.5">
            <li>
              <a className={`${link} gap-2`} href={waLink(t('wa.general'))} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="h-5 w-5" /> +91 {site.whatsapp}
              </a>
            </li>
            <li>
              <a className={`${link} gap-2 break-all`} href={`mailto:${site.email}`}>
                <MailIcon className="h-5 w-5 shrink-0" /> {site.email}
              </a>
            </li>
            <li>
              <a className={`${link} gap-2`} href={site.social.instagram} target="_blank" rel="noopener noreferrer">
                <InstagramIcon className="h-5 w-5" /> {site.social.instagramHandle}
              </a>
            </li>
            <li className="flex min-h-11 items-center gap-2 text-cream/90">
              <PinIcon className="h-5 w-5 shrink-0" /> {t('contact.locationText')}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/15">
        <div className="container-dk flex flex-col gap-2 py-5 pb-24 text-sm text-cream/75 sm:flex-row sm:items-center sm:justify-between md:pb-5">
          <p>{t('footer.rights', { year })}</p>
          <p>{t('footer.fssai', { fssai: site.fssai })}</p>
          <p>{t('footer.madeWith')} ♥</p>
        </div>
      </div>
    </footer>
  )
}
