import { useI18n } from '../i18n/I18nProvider'
import { ORDER_STATUSES } from '../data/mockOrders'
import { BoxIcon, CheckIcon, ChefIcon, HeartIcon, TruckIcon } from './icons'

const ICONS = { received: BoxIcon, confirmed: CheckIcon, preparing: ChefIcon, out_for_delivery: TruckIcon, delivered: HeartIcon }

// Legacy 5-step tracker (vertical on phones). Step 3 renames steps to the brief's list.
export default function StatusTracker({ status }) {
  const { t } = useI18n()
  const current = Math.max(0, ORDER_STATUSES.indexOf(status))

  return (
    <div>
      <p className="sr-only">
        {t('track.current')}: {t(`track.steps.${status}`)}
      </p>
      <ol className="flex flex-col gap-4 sm:flex-row sm:gap-2">
        {ORDER_STATUSES.map((s, i) => {
          const Icon = ICONS[s]
          const done = i < current
          const isNow = i === current
          return (
            <li key={s} className="flex items-center gap-4 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center" aria-current={isNow ? 'step' : undefined}>
              <span
                className={`grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 ${
                  isNow ? 'border-ink bg-ink text-gold-light' : done ? 'border-ink bg-champagne' : 'border-line text-brown-2'
                }`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span>
                <span className={`block font-bold ${isNow || done ? '' : 'text-brown-2'}`}>{t(`track.steps.${s}`)}</span>
                {isNow && <span className="t-small block text-brown-2">{t(`track.stepText.${s}`)}</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
