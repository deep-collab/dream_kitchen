import { useId } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { voiceMessageUrl } from '../../lib/whatsappMessage'
import Button from '../ui/Button'
import { MicIcon } from '../icons'

/**
 * Opens the WhatsApp chat with "Hi Dream Kitchen" so customers who can't type can
 * hold the mic and talk. The helper line under it says exactly that.
 */
export default function VoiceMessageButton({ fullWidth = false, size, tone, className = '' }) {
  const { t } = useI18n()
  const helpId = useId()
  return (
    <div className={className}>
      <Button variant="whatsapp" icon={MicIcon} href={voiceMessageUrl()} fullWidth={fullWidth} size={size} tone={tone} aria-describedby={helpId}>
        {t('callOptions.voice')}
      </Button>
      <p id={helpId} className={`t-small mt-2 ${tone === 'dark' ? 'text-muted' : 'text-brown-2'}`}>
        {t('callOptions.voiceHelp')}
      </p>
    </div>
  )
}
