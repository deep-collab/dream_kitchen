import { useI18n } from '../../i18n/I18nProvider'
import { MinusIcon, PlusIcon } from '../icons'

// − 1 + with 48px buttons; the number is announced politely when it changes.
export default function QuantityStepper({ value, onChange, min = 1, max = 99, label }) {
  const { t } = useI18n()
  const btn =
    'grid h-12 w-12 place-items-center rounded-full text-brown transition-colors hover:bg-champagne disabled:cursor-not-allowed disabled:opacity-35'
  return (
    <div role="group" aria-label={label || t('common.quantity')} className="inline-flex items-center rounded-full border-[1.5px] border-control-line bg-[#fffdf8] p-0.5">
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={t('common.decrease')}>
        <MinusIcon className="h-5 w-5" />
      </button>
      <output aria-live="polite" className="t-price min-w-10 text-center">
        {value}
      </output>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t('common.increase')}>
        <PlusIcon className="h-5 w-5" />
      </button>
    </div>
  )
}
