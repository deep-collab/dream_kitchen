import { useI18n } from '../i18n/I18nProvider'
import { formatPrice } from '../lib/format'
import { deliveryCharge } from '../lib/orderRules'

// Totals block shared by Cart and Checkout (legacy; Step 2/3 rework it)
export default function OrderSummary({ items, pieces, subtotal, showItems = false, children }) {
  const { t, pick } = useI18n()
  const delivery = deliveryCharge(pieces)
  return (
    <div className="rounded-card bg-champagne p-5 sm:p-6">
      <h2 className="t-h3">{t('cart.summary')}</h2>
      {showItems && (
        <ul className="mt-4 space-y-2 border-b border-line pb-4">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-3">
              <span className="min-w-0">
                {pick(i.name)} <span className="font-bold text-brown-2">× {i.qty}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums">{formatPrice(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-4 space-y-2">
        <div className="flex justify-between">
          <dt className="text-brown-2">{t('cart.subtotal')}</dt>
          <dd className="font-bold tabular-nums">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-brown-2">{t('cart.delivery')}</dt>
          <dd className="font-bold tabular-nums">{formatPrice(delivery)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-t border-line pt-3">
          <dt className="font-bold">{t('cart.total')}</dt>
          <dd className="t-price">{formatPrice(subtotal + delivery)}</dd>
        </div>
      </dl>
      {children}
    </div>
  )
}
