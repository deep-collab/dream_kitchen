import { useI18n } from '../../i18n/I18nProvider'
import { formatINR } from '../../lib/pricing'
import 'virtual:dk-strings/cart'
import 'virtual:dk-strings/checkout'

/**
 * Items, courier and total, for the cart, the checkout steps and the order pages.
 *   courier: the exact charge once the pincode is known (a number), or null in the cart, where
 *            `rates` ({ karnataka, outside } for this cart's tier) shows both exact amounts
 *   zone:    'karnataka' | 'outside' when known, named in the courier row
 *   live:    announce the total when it changes
 */
export default function TotalRows({ subtotal, courier, rates, zone, live = false, className = '' }) {
  const { t } = useI18n()
  const known = courier != null
  return (
    <dl className={`space-y-2 ${className}`}>
      <div className="flex justify-between gap-4">
        <dt className="text-brown-2">{t('cart.subtotal')}</dt>
        <dd className="font-bold tabular-nums">{formatINR(subtotal)}</dd>
      </div>
      <div className="flex justify-between gap-4">
        <dt className="text-brown-2">{zone ? t('checkout.courierTo', { zone: t(`checkout.zone.${zone}`) }) : t('cart.courier')}</dt>
        <dd className={known ? 'font-bold tabular-nums' : 't-small text-right'}>
          {known ? formatINR(courier) : rates ? t('cart.courierRates', { karnataka: formatINR(rates.karnataka), outside: formatINR(rates.outside) }) : ''}
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
        <dt className="font-bold">{t('cart.total')}</dt>
        <dd className="t-price" aria-live={live ? 'polite' : undefined}>
          {known ? formatINR(subtotal + courier) : t('cart.totalPlusCourier', { price: formatINR(subtotal) })}
        </dd>
      </div>
    </dl>
  )
}
