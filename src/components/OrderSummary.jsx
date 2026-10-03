import { useI18n } from '../i18n/I18nProvider'
import { formatINR, lineTotal } from '../lib/pricing'
import { deliveryCharge } from '../lib/orderRules'

// Totals block for the (legacy) checkout. Step 3 rebuilds checkout and this with it.
export default function OrderSummary({ lines, count, subtotal, children }) {
  const { t, pick } = useI18n()
  const delivery = deliveryCharge(count)
  return (
    <div className="rounded-card bg-champagne p-5 sm:p-6">
      <h2 className="t-h3">{t('cart.summary')}</h2>
      <ul className="mt-4 space-y-2 border-b border-line pb-4">
        {lines.map((l) => (
          <li key={l.id} className="flex justify-between gap-3">
            <span className="min-w-0">
              {pick(l.name)} <span className="font-bold text-brown-2">× {l.qty}</span>
            </span>
            <span className="shrink-0 font-bold tabular-nums">{formatINR(lineTotal(l))}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 space-y-2">
        <div className="flex justify-between">
          <dt className="text-brown-2">{t('cart.subtotal')}</dt>
          <dd className="font-bold tabular-nums">{formatINR(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-brown-2">{t('cart.deliveryKarnataka')}</dt>
          <dd className="font-bold tabular-nums">{formatINR(delivery)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-bold">{t('cart.total')}</dt>
          <dd className="t-price">{formatINR(subtotal + delivery)}</dd>
        </div>
      </dl>
      {children}
    </div>
  )
}
