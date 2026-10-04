import { useI18n } from '../../i18n/I18nProvider'
import { site } from '../../config/site'
import { AwardIcon } from '../icons'

/**
 * "Hema is completing her chocolatier certification. Certificate coming soon."
 * Once site.classes.certificateImage is set (a photo in public/), the photo
 * replaces the note with no other change.
 */
export default function CertificationNote({ className = '' }) {
  const { t } = useI18n()
  const image = site.classes.certificateImage

  if (image) {
    return (
      <figure className={`card overflow-hidden ${className}`}>
        <img src={image} alt={t('classes.cert.alt')} loading="lazy" decoding="async" className="block h-auto w-full bg-champagne" />
        <figcaption className="t-small p-4 text-brown-2">{t('classes.cert.title')}</figcaption>
      </figure>
    )
  }

  return (
    <aside aria-labelledby="cert-title" className={`rounded-card border border-line bg-champagne p-5 sm:p-6 ${className}`}>
      {/* Icon beside the title only, so the sentence keeps the full width on narrow phones */}
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-gold">
          <AwardIcon className="h-6 w-6" />
        </span>
        <h2 id="cert-title" className="t-h3 min-w-0">
          {t('classes.cert.title')}
        </h2>
      </div>
      <p className="mt-3">{t('classes.cert.text')}</p>
    </aside>
  )
}
