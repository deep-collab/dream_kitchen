import { useI18n } from '../i18n/I18nProvider'
import { MinusIcon, PlusIcon } from './Icons'

export default function QtyStepper({ value, onChange, min = 1, max = 99, label, size = 'md' }) {
  const { t } = useI18n()
  const btn = size === 'sm' ? 'h-11 w-11' : 'h-12 w-12'
  return (
    <div className="inline-flex items-center rounded-full border-2 border-tint bg-offwhite" role="group" aria-label={label || t('common.quantity')}>
      <button type="button" className={`${btn} grid place-items-center rounded-full text-dark transition hover:bg-tint disabled:opacity-40`} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={t('common.decrease')}>
        <MinusIcon className="h-5 w-5" />
      </button>
      <output className="min-w-9 text-center text-lg font-extrabold text-deep" aria-live="polite">
        {value}
      </output>
      <button type="button" className={`${btn} grid place-items-center rounded-full text-dark transition hover:bg-tint disabled:opacity-40`} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={t('common.increase')}>
        <PlusIcon className="h-5 w-5" />
      </button>
    </div>
  )
}
