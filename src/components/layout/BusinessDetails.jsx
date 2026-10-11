import { useI18n } from '../../i18n/I18nProvider'
import { site } from '../../config/site'

/**
 * Business name, owner, phone (plain text: no Call links on customer pages), email, address and
 * Instagram, as Razorpay expects them on every page. Email and address show once they are filled
 * in src/config/site.js. `dark`: on the black footer (links in cream).
 */
export default function BusinessDetails({ dark = false, className = '' }) {
  const { t } = useI18n()
  const link = `inline-flex min-h-12 items-center underline underline-offset-4 break-all ${dark ? 'text-cream hover:text-gold-light' : 'font-bold'}`
  const label = dark ? 'text-cream' : 'font-bold'
  return (
    <address className={`not-italic ${className}`}>
      <p>
        <span className={label}>{site.name}</span> · {t('footer.owner')}
      </p>
      <p>
        <span className={label}>{t('footer.phone')}:</span> {site.phone.display}
      </p>
      {site.email && (
        <p>
          <span className={label}>{t('footer.email')}:</span>{' '}
          <a href={`mailto:${site.email}`} className={link}>
            {site.email}
          </a>
        </p>
      )}
      {site.address && (
        <p>
          <span className={label}>{t('footer.address')}:</span> {site.address}
        </p>
      )}
      <p>
        <span className={label}>{t('footer.instagram')}:</span>{' '}
        <a href={site.instagram.url} target="_blank" rel="noopener noreferrer" className={link}>
          {site.instagram.handle}
          <span className="sr-only"> {t('common.newTab')}</span>
        </a>
      </p>
    </address>
  )
}
