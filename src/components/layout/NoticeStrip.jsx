import { useI18n } from '../../i18n/I18nProvider'
import { site } from '../../config/site'
import { CalendarIcon } from '../icons'

// Slim pre-booking notice under the header on every page. Not dismissible.
export default function NoticeStrip() {
  const { t } = useI18n()
  return (
    <div className="border-b border-ink-line bg-ink text-muted">
      <p className="dk-container t-small flex items-center justify-center gap-2.5 py-2.5 text-center">
        <CalendarIcon className="h-5 w-5 shrink-0 text-gold" />
        <span>{t('notice.prebook', { days: site.ordering.dispatchBusinessDays })}</span>
      </p>
    </div>
  )
}
