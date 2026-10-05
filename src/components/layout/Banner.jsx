import { useShopStatus } from '../../context/MenuProvider'
import { useI18n } from '../../i18n/I18nProvider'
import { InfoIcon } from '../icons'

// Hema's notice from admin -> Settings, under the header on every page: "orders paused" (with
// her back-on message) while the shop is closed, otherwise her announcement. Nothing when empty.
// Her own words are shown as she typed them, in both languages.
export default function Banner() {
  const { t } = useI18n()
  const { settings } = useShopStatus()
  const { open, closedMessage, announcement } = settings.store
  const text = !open ? [t('banner.closed'), closedMessage].filter(Boolean).join(' ') : announcement
  if (!text) return null
  return (
    <aside aria-label={t('banner.label')} className={`border-b ${open ? 'border-ink-line bg-ink text-muted' : 'border-error bg-error-bg text-brown'}`}>
      <p className="dk-container t-small flex items-center justify-center gap-2.5 py-2.5 text-center font-bold">
        <InfoIcon className={`h-5 w-5 shrink-0 ${open ? 'text-gold' : 'text-error'}`} />
        <span>{text}</span>
      </p>
    </aside>
  )
}
