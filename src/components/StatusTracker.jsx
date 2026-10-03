import { useI18n } from '../i18n/I18nProvider'
import { ORDER_STATUSES } from '../data/mockOrders'
import { BoxIcon, CheckIcon, ChefIcon, HeartIcon, TruckIcon } from './Icons'

const ICONS = { received: BoxIcon, confirmed: CheckIcon, preparing: ChefIcon, out_for_delivery: TruckIcon, delivered: HeartIcon }

// Cute 5-step progress tracker (vertical on phones, horizontal on larger screens)
export default function StatusTracker({ status }) {
  const { t } = useI18n()
  const current = Math.max(0, ORDER_STATUSES.indexOf(status))
  const pct = (current / (ORDER_STATUSES.length - 1)) * 100

  return (
    <div>
      <p className="sr-only">
        {t('track.current')}: {t(`track.steps.${status}`)}
      </p>
      <div className="relative hidden sm:block" aria-hidden="true">
        <div className="absolute top-7 right-[10%] left-[10%] h-2 rounded-full bg-tint" />
        <div className="absolute top-7 left-[10%] h-2 rounded-full bg-gold transition-all duration-700" style={{ width: `${pct * 0.8}%` }} />
      </div>
      <ol className="relative flex flex-col gap-4 sm:flex-row sm:gap-0">
        {ORDER_STATUSES.map((s, i) => {
          const Icon = ICONS[s]
          const done = i < current
          const isNow = i === current
          return (
            <li key={s} className="relative flex items-center gap-4 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center" aria-current={isNow ? 'step' : undefined}>
              {i < ORDER_STATUSES.length - 1 && (
                <span aria-hidden="true" className={`absolute top-14 left-7 h-[calc(100%-2.5rem)] w-1.5 -translate-x-1/2 rounded-full sm:hidden ${done ? 'bg-gold' : 'bg-tint'}`} />
              )}
              <span
                className={`relative z-10 grid h-14 w-14 shrink-0 place-items-center rounded-full border-4 transition ${
                  isNow ? 'pop border-gold bg-dark text-gold-soft shadow-lift' : done ? 'border-gold bg-gold text-deep' : 'border-tint bg-offwhite text-mid'
                }`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span>
                <span className={`block font-extrabold ${isNow ? 'text-deep' : done ? 'text-dark' : 'text-brown'}`}>{t(`track.steps.${s}`)}</span>
                {isNow && <span className="block text-sm text-brown">{t(`track.stepText.${s}`)}</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
