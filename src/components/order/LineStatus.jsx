import { useI18n } from '../../i18n/I18nProvider'
import { formatINR } from '../../lib/pricing'
import { AlertIcon, InfoIcon } from '../icons'

/**
 * What changed on a cart line since it was added (src/lib/reprice.js):
 * "Was ₹549, now ₹599", or why it can't be ordered. Renders nothing otherwise.
 */
export default function LineStatus({ line, className = '' }) {
  const { t } = useI18n()
  if (line.unavailable) {
    return (
      <p className={`t-small flex items-start gap-2 font-bold text-error ${className}`}>
        <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <span>{t(`cart.unavailable.${line.unavailable}`)}</span>
      </p>
    )
  }
  if (line.priceWas == null) return null
  // "Was {old}" with the old price struck through, wherever the language puts it
  const [before, after = ''] = t('cart.priceWas').split('{old}')
  return (
    <p className={`t-small flex items-start gap-2 font-bold ${className}`}>
      <InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />
      <span>
        {before}
        <s className="font-normal">{formatINR(line.priceWas)}</s>
        {after}, {t('cart.priceNow', { new: formatINR(line.unitPrice) })}
      </span>
    </p>
  )
}
