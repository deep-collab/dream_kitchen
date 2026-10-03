import { useI18n } from '../i18n/I18nProvider'
import { formatPrice } from '../lib/format'
import { deliveryCharge } from '../lib/orderRules'

// Totals block shared by Cart and Checkout
export default function OrderSummary({ items, pieces, subtotal, showItems = false, children }) {
  const { t, pick } = useI18n()
  const delivery = deliveryCharge(pieces)
  return (
    <div className="card-cream p-5 sm:p-6">
      <h2 className="text-2xl font-bold">{t('cart.summary')}</h2>
      {showItems && (
        <ul className="mt-4 space-y-2 border-b border-tint pb-4">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-3 text-[0.98rem]">
              <span className="min-w-0">
                {pick(i.name)} <span className="font-bold text-brown">× {i.qty}</span>
              </span>
              <span className="shrink-0 font-bold">{formatPrice(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-4 space-y-2">
        <div className="flex justify-between">
          <dt className="text-brown">{t('cart.pieces')}</dt>
          <dd className="font-bold">{pieces}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-brown">{t('cart.subtotal')}</dt>
          <dd className="font-bold">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-brown">{t('cart.delivery')}</dt>
          <dd className="font-bold">{formatPrice(delivery)}</dd>
        </div>
        <div className="flex justify-between border-t border-tint pt-3 text-xl">
          <dt className="font-extrabold text-deep">{t('cart.total')}</dt>
          <dd className="font-display font-bold text-deep">{formatPrice(subtotal + delivery)}</dd>
        </div>
      </dl>
      {children}
    </div>
  )
}
