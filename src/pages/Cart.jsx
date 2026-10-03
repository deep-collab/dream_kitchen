import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { useSeo } from '../hooks/useSeo'
import { site } from '../config/site'
import { formatPrice } from '../lib/format'
import { isBulkOrder } from '../lib/orderRules'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import QuantityStepper from '../components/ui/QuantityStepper'
import Notice from '../components/ui/Notice'
import OrderSummary from '../components/OrderSummary'
import { TrashIcon } from '../components/icons'

// Legacy cart (sample lines). Step 2 rebuilds it with editable option lines.
export function PrebookNotice({ pieces }) {
  const { t } = useI18n()
  return (
    <Notice>
      <p>{t('notice.prebook', { days: site.ordering.dispatchBusinessDays })}</p>
      {isBulkOrder(pieces) && (
        <p className="mt-2">{t('cart.bulkNotice', { count: pieces, threshold: site.order.bulkThreshold, days: site.order.bulkMinDaysAhead })}</p>
      )}
    </Notice>
  )
}

export default function Cart() {
  useSeo('cart')
  const { t, pick } = useI18n()
  const { items, pieces, subtotal, setQty, remove, maxQty } = useCart()

  if (!items.length) {
    return (
      <PageHero title={t('cart.title')} subtitle={t('cart.empty')}>
        <Button to="/shop" className="mt-6">
          {t('cart.emptyCta')}
        </Button>
      </PageHero>
    )
  }

  return (
    <>
      <PageHero title={t('cart.title')} />
      <Container className="grid gap-8 py-10 lg:grid-cols-[1.5fr_1fr] lg:items-start lg:py-14">
        <div className="space-y-4">
          <PrebookNotice pieces={pieces} />
          <ul className="divide-y divide-line border-y border-line">
            {items.map((item) => {
              const name = pick(item.name)
              return (
                <li key={item.productId} className="flex gap-4 py-4">
                  <img src={item.image} alt="" width="96" height="96" loading="lazy" className="h-20 w-20 shrink-0 rounded-control bg-ink object-cover sm:h-24 sm:w-24" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h2 className="text-[1.125rem] leading-snug font-bold">
                          <Link to={`/product/${item.slug}`} className="hover:underline">
                            {name}
                          </Link>
                        </h2>
                        <p className="t-small text-brown-2">{formatPrice(item.price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.productId)}
                        className="inline-flex min-h-12 shrink-0 items-center gap-1.5 rounded-control px-2 font-bold text-brown-2 hover:bg-champagne hover:text-error"
                      >
                        <TrashIcon className="h-5 w-5" />
                        <span className="t-small font-bold">{t('common.remove')}</span>
                        <span className="sr-only">: {name}</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <QuantityStepper
                        value={item.qty}
                        max={maxQty}
                        onChange={(q) => (q < 1 ? remove(item.productId) : setQty(item.productId, q))}
                        label={`${t('common.quantity')}: ${name}`}
                      />
                      <p className="t-price">{formatPrice(item.price * item.qty)}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <Button to="/shop" variant="secondary">
            {t('common.continueShopping')}
          </Button>
        </div>

        <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <OrderSummary items={items} pieces={pieces} subtotal={subtotal}>
            <Button to="/checkout" size="lg" fullWidth className="mt-6">
              {t('cart.checkout')}
            </Button>
            <p className="t-small mt-3 text-brown-2">{t('cart.noPayment')}</p>
          </OrderSummary>
        </div>
      </Container>
    </>
  )
}
