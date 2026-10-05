import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { hasCallHours, site, telLink, waLink } from '../config/site'
import { formatCallHours } from '../lib/hours'
import Container from '../components/ui/Container'
import { ClockIcon, InstagramIcon, MailIcon, PhoneIcon, WhatsAppIcon } from '../components/icons'
import 'virtual:dk-strings/contact'

/**
 * Contact: Call (the main way), a plain "Chat on WhatsApp" link (the only WhatsApp link on the
 * site: orders are placed and paid on the website), Instagram, and hours / email / FSSAI once
 * Hema confirms them (src/config/site.js).
 */
export default function Contact() {
  useSeo('contact')
  const { t } = useI18n()
  const row = 'flex min-h-16 items-center gap-4 rounded-card border border-line bg-[#fffcf5] p-4 transition-colors hover:border-ink'
  return (
    <Container className="py-6 lg:py-12">
      <div className="max-w-xl">
        <h1 className="t-h2">{t('contact.title')}</h1>
        <p className="mt-1 text-brown-2">{t('contact.lead')}</p>

        <ul className="mt-5 space-y-3">
          <li>
            <a href={telLink} className={`${row} on-dark border-ink bg-ink text-cream hover:border-gold`}>
              <PhoneIcon className="h-7 w-7 shrink-0 text-gold" />
              <span>
                <span className="block text-[1.125rem] font-bold">{t('contact.call', { phone: site.phone.display })}</span>
                <span className="t-small block text-muted">{t('contact.callText')}</span>
              </span>
            </a>
          </li>
          <li>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className={row}>
              <WhatsAppIcon className="h-7 w-7 shrink-0 text-whatsapp" />
              <span>
                <span className="block font-bold">
                  {t('contact.whatsapp')}
                  <span className="sr-only"> {t('common.newTab')}</span>
                </span>
                <span className="t-small block text-brown-2">{t('contact.whatsappText')}</span>
              </span>
            </a>
          </li>
          <li>
            <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className={row}>
              <InstagramIcon className="h-7 w-7 shrink-0" />
              <span>
                <span className="block font-bold">{t('contact.instagram')}</span>
                <span className="t-small block break-all text-brown-2">{site.instagram.handle}</span>
              </span>
            </a>
          </li>
          {site.email && (
            <li>
              <a href={`mailto:${site.email}`} className={row}>
                <MailIcon className="h-7 w-7 shrink-0" />
                <span>
                  <span className="block font-bold">{t('contact.email')}</span>
                  <span className="t-small block break-all text-brown-2">{site.email}</span>
                </span>
              </a>
            </li>
          )}
        </ul>

        {hasCallHours() && (
          <p className="mt-5 flex gap-3">
            <ClockIcon className="mt-0.5 h-6 w-6 shrink-0" />
            <span>
              <span className="block font-bold">{t('hours.label')}</span>
              {formatCallHours(t)}
            </span>
          </p>
        )}
        {site.fssai && (
          <p className="mt-3">
            <span className="font-bold">{t('contact.fssai')}:</span> {site.fssai}
          </p>
        )}
        <p className="mt-6 flex flex-wrap gap-x-6">
          <Link to="/track" className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
            {t('contact.track')}
          </Link>
          <Link to="/faq" className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
            {t('contact.faq')}
          </Link>
        </p>
      </div>
    </Container>
  )
}
