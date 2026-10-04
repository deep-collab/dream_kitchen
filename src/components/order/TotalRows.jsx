import { useI18n } from '../../i18n/I18nProvider'
import { formatINR } from '../../lib/pricing'

/**
 * Subtotal, delivery and total, as in the cart, checkout and the order sent page.
 *   delivery: a number, or null while Hema hasn't confirmed the charge (site.delivery.charge
 *   empty). Then the row says she confirms it on WhatsApp and the total is "before delivery",
 *   so no screen ever shows "Delivery: ₹" with nothing after it.
 *   live: announce the total when it changes (cart and checkout)
 */
export default function TotalRows({ subtotal, delivery, live = false, className = '' }) {
  const { t } = useI18n()
  const known = delivery != null
  return (
    <dl className={`space-y-2 ${className}`}>
      <div className="flex justify-between gap-4">
        <dt className="text-brown-2">{t('cart.subtotal')}</dt>
        <dd className="font-bold tabular-nums">{formatINR(subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-brown-2">{t('cart.deliveryKarnataka')}</dt>
        <dd className={known ? 'font-bold tabular-nums' : 'text-right'}>{known ? formatINR(delivery) : t('cart.deliveryToConfirm')}</dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <dt className="font-bold">{known ? t('cart.total') : t('cart.totalBeforeDelivery')}</dt>
        <dd className="t-price" aria-live={live ? 'polite' : undefined}>
          {formatINR(subtotal + (delivery ?? 0))}
        </dd>
      </div>
    </dl>
  )
}

/** "₹449" when the charge is known, "₹399 + delivery" while it isn't (checkout button). */
export function useTotalText() {
  const { t } = useI18n()
  return (subtotal, delivery) => (delivery == null ? t('cart.plusDelivery', { price: formatINR(subtotal) }) : formatINR(subtotal + delivery))
}
