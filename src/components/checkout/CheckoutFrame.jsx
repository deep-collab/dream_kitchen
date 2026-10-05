import { useI18n } from '../../i18n/I18nProvider'
import { CheckIcon } from '../icons'
import 'virtual:dk-strings/checkout'

const STEPS = ['details', 'review', 'pay']

/** 1 Details → 2 Review → 3 Pay, with a gold progress line. step: 1 | 2 | 3 */
export function CheckoutProgress({ step }) {
  const { t } = useI18n()
  return (
    <div className="mb-5">
      <p className="sr-only">{t('checkout.progress', { n: step, name: t(`checkout.steps.${STEPS[step - 1]}`) })}</p>
      <ol aria-hidden="true" className="grid grid-cols-3 gap-2">
        {STEPS.map((s, i) => {
          const n = i + 1
          const state = n < step ? 'done' : n === step ? 'now' : 'next'
          return (
            <li key={s} className="min-w-0">
              <span className={`block h-1.5 rounded-full ${state === 'next' ? 'bg-line' : 'bg-ink'}`} />
              <span className={`t-small mt-1.5 flex items-center gap-1 font-bold ${state === 'next' ? 'text-brown-2' : ''}`}>
                {state === 'done' ? <CheckIcon className="h-4 w-4 shrink-0" /> : <span className="tabular-nums">{n}</span>}
                <span className="truncate">{t(`checkout.steps.${s}`)}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/**
 * The order total and the step's main button. Phones: fixed to the bottom of the screen, so the
 * total is always visible (the tab bar steps aside on checkout). From 1024px: in the summary column.
 *   total: text (e.g. "₹2,100" or "₹1,650 + courier")   label: the total's label
 */
export function TotalBar({ label, total, children, note }) {
  return (
    <div className="on-dark fixed inset-x-0 bottom-0 z-40 border-t border-gold/45 bg-ink px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] text-cream lg:static lg:mt-5 lg:rounded-card lg:border lg:p-5">
      <div className="mx-auto max-w-xl lg:max-w-none">
        <p className="mb-2 flex items-baseline justify-between gap-3" aria-live="polite" aria-atomic="true">
          <span className="t-small text-muted">{label}</span>
          <span className="t-price text-gold-light">{total}</span>
        </p>
        {children}
        {note && <p className="t-small mt-2 text-center text-muted">{note}</p>}
      </div>
    </div>
  )
}
