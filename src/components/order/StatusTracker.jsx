import { useI18n } from '../../i18n/I18nProvider'
import { ORDER_STEPS } from '../../lib/order'
import { CheckIcon } from '../icons'

/**
 * Received → Confirmed → Preparing → Dispatched → Delivered.
 * A real sequence, so the steps are numbered. Vertical on phones and tablets, a row
 * from 1024px (the long Kannada step names need the room).
 * The current step has aria-current="step"; every step says whether it is done,
 * current or still to come, so the state never relies on colour.
 */
export default function StatusTracker({ status }) {
  const { t } = useI18n()
  const current = Math.max(0, ORDER_STEPS.indexOf(status))
  const stateWord = { done: t('track.stepDone'), now: t('track.stepNow'), next: t('track.stepNext') }

  return (
    <div>
      <ol aria-label={t('track.progress')} className="grid lg:grid-cols-5">
        {ORDER_STEPS.map((step, i) => {
          const state = i < current ? 'done' : i === current ? 'now' : 'next'
          return (
            <li key={step} aria-current={state === 'now' ? 'step' : undefined} className="relative flex gap-4 pb-6 last:pb-0 lg:flex-col lg:items-center lg:gap-3 lg:pb-0 lg:text-center">
              {i < ORDER_STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`absolute top-14 bottom-0 left-7 w-0.5 -translate-x-1/2 lg:top-7 lg:bottom-auto lg:left-1/2 lg:h-0.5 lg:w-full lg:translate-x-0 ${
                    i < current ? 'bg-ink' : 'bg-line'
                  }`}
                />
              )}
              <span
                className={`relative grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 text-[1.125rem] font-bold ${
                  state === 'now' ? 'border-ink bg-ink text-gold-light' : state === 'done' ? 'border-ink bg-champagne text-brown' : 'border-control-line bg-cream text-brown-2'
                }`}
              >
                {state === 'done' ? <CheckIcon className="h-6 w-6" /> : <span aria-hidden="true">{i + 1}</span>}
              </span>
              <span className="min-w-0 pt-3 lg:pt-0">
                <span className={`block leading-snug font-bold ${state === 'next' ? 'text-brown-2' : ''}`}>{t(`track.steps.${step}`)}</span>
                <span className="sr-only">, {stateWord[state]}</span>
                {state === 'now' && <span className="t-small mt-1 block text-brown-2 lg:hidden">{t(`track.stepText.${step}`)}</span>}
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-6 hidden rounded-control bg-champagne px-4 py-3 lg:block">
        <span className="font-bold">{t(`track.steps.${ORDER_STEPS[current]}`)}:</span> {t(`track.stepText.${ORDER_STEPS[current]}`)}
      </p>
    </div>
  )
}
