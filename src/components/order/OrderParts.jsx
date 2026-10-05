import { useI18n } from '../../i18n/I18nProvider'
import { site } from '../../config/site'
import { formatINR } from '../../lib/pricing'
import { formatDay } from '../../lib/dates'
import { orderItemChoices } from '../../lib/lineText'
import { AlertIcon, CheckIcon, ExternalIcon } from '../icons'
import 'virtual:dk-strings/track'
import 'virtual:dk-strings/order'
import 'virtual:dk-strings/cart'

export const STEPS = ['placed', 'payment_confirmed', 'preparing', 'shipped', 'delivered']

/** "Mon, 5 Oct" from an ISO timestamp, in Indian time */
export function dayOf(iso, names) {
  if (!iso) return ''
  const d = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso))
  return formatDay(d, names)
}

/**
 * Placed → Payment confirmed → Preparing → Shipped → Delivered, each with its date once done,
 * the courier and tracking number at "Shipped". A cancelled order is shown on its own.
 * A real sequence, so the steps are numbered; every step says done / current / not yet.
 */
export function StatusTimeline({ order }) {
  const { t } = useI18n()
  const names = t('dates')
  if (order.status === 'cancelled') {
    return (
      <div role="status" className="rounded-card border-2 border-error bg-error-bg p-4">
        <p className="flex items-start gap-2 font-bold text-error">
          <AlertIcon className="mt-0.5 h-6 w-6 shrink-0" />
          {t('track.cancelled')}
        </p>
        {order.cancelReason && <p className="mt-1">{order.cancelReason}</p>}
        <p className="t-small mt-1">{t('track.cancelledText', { phone: site.phone.display })}</p>
      </div>
    )
  }
  const current = Math.max(0, STEPS.indexOf(order.status))
  const word = { done: t('track.stepDone'), now: t('track.stepNow'), next: t('track.stepNext') }
  return (
    <ol aria-label={t('track.progress')}>
      {STEPS.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'now' : 'next'
        const at = order.timeline?.[step]
        return (
          <li key={step} aria-current={state === 'now' ? 'step' : undefined} className="relative flex gap-3 pb-5 last:pb-0">
            {i < STEPS.length - 1 && <span aria-hidden="true" className={`absolute top-11 bottom-0 left-5 w-0.5 -translate-x-1/2 ${i < current ? 'bg-ink' : 'bg-line'}`} />}
            <span
              className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 font-bold ${
                state === 'now' ? 'border-ink bg-ink text-gold-light' : state === 'done' ? 'border-ink bg-champagne' : 'border-control-line bg-cream text-brown-2'
              }`}
            >
              {state === 'done' ? <CheckIcon className="h-5 w-5" /> : <span aria-hidden="true">{i + 1}</span>}
            </span>
            <span className="min-w-0 pt-1.5">
              <span className={`block leading-snug font-bold ${state === 'next' ? 'text-brown-2' : ''}`}>
                {t(`track.steps.${step}`)}
                {at && state !== 'next' && <span className="t-small ml-2 font-normal text-brown-2">{dayOf(at, names)}</span>}
              </span>
              <span className="sr-only">, {word[state]}</span>
              {state === 'now' && <span className="t-small block text-brown-2">{nowText(order, t)}</span>}
              {step === 'shipped' && i <= current && order.trackingNo && <CourierInfo order={order} />}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function nowText(order, t) {
  if (order.status === 'placed') return order.paymentStatus === 'submitted' ? t('track.awaitingCheck') : t('track.awaitingPayment')
  return t(`track.stepText.${order.status}`)
}

function CourierInfo({ order }) {
  const { t } = useI18n()
  return (
    <span className="t-small mt-1 block rounded-control bg-champagne p-3">
      <span className="block">
        {t('track.courier')}: <strong>{order.courierName}</strong>
      </span>
      <span className="block">
        {t('track.trackingNo')}: <strong className="break-all select-all">{order.trackingNo}</strong>
      </span>
      {order.trackingUrl && (
        <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex min-h-12 items-center gap-1.5 font-bold underline underline-offset-4">
          {t('track.trackCourier')}
          <ExternalIcon className="h-4 w-4" />
          <span className="sr-only">{t('common.newTab')}</span>
        </a>
      )}
    </span>
  )
}

/** The items of a placed order, with their choices, and the totals */
export function OrderItems({ order }) {
  const { t, pick } = useI18n()
  return (
    <div>
      <ul className="divide-y divide-line border-y border-line">
        {order.items.map((item, i) => {
          const choices = orderItemChoices(item, { t, pick })
          return (
            <li key={i} className="py-3">
              <div className="flex justify-between gap-3">
                <p className="leading-snug font-bold">
                  {pick(item.name)} <span className="font-normal text-brown-2">× {item.qty}</span>
                </p>
                <p className="shrink-0 font-bold tabular-nums">{formatINR(item.lineTotal)}</p>
              </div>
              {choices.length > 0 && <p className="t-small text-brown-2">{choices.map((c) => (c.label ? `${c.label}: ${c.value}` : c.value)).join(' · ')}</p>}
            </li>
          )
        })}
      </ul>
      <dl className="mt-3 space-y-1">
        <div className="flex justify-between gap-4">
          <dt className="text-brown-2">{t('cart.subtotal')}</dt>
          <dd className="tabular-nums">{formatINR(order.subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-brown-2">{t('cart.courier')}</dt>
          <dd className="tabular-nums">{formatINR(order.courier)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2">
          <dt className="font-bold">{t('cart.total')}</dt>
          <dd className="t-price">{formatINR(order.total)}</dd>
        </div>
      </dl>
    </div>
  )
}
