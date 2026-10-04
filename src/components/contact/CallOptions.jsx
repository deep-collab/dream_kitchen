import 'virtual:dk-strings/callback'

import { useId, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { formatCallHours } from '../../lib/hours'
import { hasCallHours } from '../../config/site'
import Button from '../ui/Button'
import Sheet from '../ui/Sheet'
import CallbackForm from './CallbackForm'
import VoiceMessageButton from './VoiceMessageButton'
import { CallbackIcon } from '../icons'

/**
 * For people who would rather not type: Call Dream Kitchen, Request a call back
 * (opens a sheet with CallbackForm) and Send a voice message, plus call hours.
 * Used at the top of checkout, in the cart and in the empty search state.
 *   variant: 'card' (outlined) | 'feature' (champagne, for the top of checkout)
 *   as:      heading tag for the title
 */
export default function CallOptions({ title, text, as: Heading = 'h2', variant = 'card', className = '' }) {
  const { t } = useI18n()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const surface = variant === 'feature' ? 'border border-line bg-champagne' : 'border border-line'

  return (
    <section aria-labelledby={title ? titleId : undefined} className={`@container rounded-card p-5 sm:p-6 ${surface} ${className}`}>
      {title && (
        <Heading id={titleId} className="t-h3">
          {title}
        </Heading>
      )}
      {text && <p className="mt-2 text-brown-2">{text}</p>}
      <div className={`grid gap-3 @lg:grid-cols-2 @lg:items-start ${title || text ? 'mt-5' : ''}`}>
        <Button variant="call" size="lg" fullWidth className="@lg:col-span-2">
          {t('callOptions.call')}
        </Button>
        <Button variant="secondary" icon={CallbackIcon} fullWidth aria-haspopup="dialog" onClick={() => setOpen(true)}>
          {t('callOptions.requestCallback')}
        </Button>
        <VoiceMessageButton fullWidth />
      </div>
      {hasCallHours() && (
        <p className="t-small mt-3 text-brown-2">
          {t('hours.label')}: {formatCallHours(t)}
        </p>
      )}
      <Sheet open={open} onClose={() => setOpen(false)} title={t('callback.title')}>
        <CallbackForm onDone={() => setOpen(false)} />
      </Sheet>
    </section>
  )
}
