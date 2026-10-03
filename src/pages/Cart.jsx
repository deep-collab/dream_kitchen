import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { useSeo } from '../hooks/useSeo'
import { site } from '../config/site'
import { formatPrice } from '../lib/format'
import { isBulkOrder } from '../lib/orderRules'
import PageHero from '../components/PageHero'
import QtyStepper from '../components/QtyStepper'
import Notice from '../components/Notice'
import OrderSummary from '../components/OrderSummary'
import { ArrowRightIcon, TrashIcon } from '../components/Icons'

export function BulkNotice({ pieces }) {
  const { t } = useI18n()
  if (!isBulkOrder(pieces)) return null
  return (
    <Notice>
      {t('cart.bulkNotice', { count: pieces, threshold: site.order.bulkThreshold, days: site.order.bulkMinDaysAhead })}
    </Notice>
  )
}

export default function Cart() {
  useSeo('cart')
  const { t, pick } = useI18n()
  const { items, pieces, subtotal, setQty, remove, maxQty } = useCart()

  if (!items.length) {
    return (
      <>
        <PageHero title={t('cart.title')} subtitle={t('cart.empty')}>
          <Link to="/shop" className="btn btn-primary mt-6">
            {t('cart.emptyCta')} <ArrowRightIcon className="h-5 w-5" />
          </Link>
        </PageHero>
      </>
    )
  }

  return (
    <>
      <PageHero title={t('cart.title')} />
      <div className="container-dk grid gap-6 py-8 sm:py-10 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div className="space-y-4">
          <BulkNotice pieces={pieces} />
          <ul className="space-y-3">
            {items.map((item) => {
              const name = pick(item.name)
              return (
                <li key={item.productId} className="card flex gap-3 p-3 sm:gap-4 sm:p-4">
                  <Link to={`/product/${item.slug}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
                    <img src={item.image} alt="" width="96" height="96" loading="lazy" className="h-20 w-20 rounded-2xl object-cover sm:h-24 sm:w-24" />
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="font-display text-lg leading-snug font-bold">
                          <Link to={`/product/${item.slug}`} className="hover:text-brown">
                            {name}
                          </Link>
                        </h2>
                        <p className="text-sm text-brown">{formatPrice(item.price)}</p>
                      </div>
                      <button type="button" onClick={() => remove(item.productId)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-brown hover:bg-tint hover:text-rose" aria-label={`${t('common.remove')}: ${name}`}>
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <QtyStepper size="sm" value={item.qty} max={maxQty} onChange={(q) => (q < 1 ? remove(item.productId) : setQty(item.productId, q))} label={`${t('common.quantity')}: ${name}`} />
                      <p className="text-lg font-extrabold text-deep">{formatPrice(item.price * item.qty)}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <Link to="/shop" className="btn btn-secondary">
            {t('common.continueShopping')}
          </Link>
        </div>

        <div className="lg:sticky lg:top-24">
          <OrderSummary items={items} pieces={pieces} subtotal={subtotal}>
            <Link to="/checkout" className="btn btn-primary mt-6 w-full text-lg">
              {t('cart.checkout')} <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <p className="mt-3 text-center text-sm text-brown">{t('cart.noPayment')}</p>
          </OrderSummary>
        </div>
      </div>
    </>
  )
}
