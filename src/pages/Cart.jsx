import { useLocation } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { useMenu, useShopStatus } from '../context/MenuProvider'
import { useSeo } from '../hooks/useSeo'
import { useCartQuote } from '../hooks/useCartQuote'
import { limits } from '../config/shop'
import { site } from '../config/site'
import { formatINR } from '../lib/pricing'
import { lineChoices } from '../lib/lineText'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import QuantityStepper from '../components/ui/QuantityStepper'
import Notice from '../components/ui/Notice'
import { useToast } from '../components/ui/Toast'
import ProductPhoto from '../components/shop/ProductPhoto'
import { useShopSheets } from '../components/shop/ShopSheets'
import CartNotices from '../components/order/CartNotices'
import { TotalBar } from '../components/checkout/CheckoutFrame'
import LineStatus from '../components/order/LineStatus'
import TotalRows from '../components/order/TotalRows'
import { CartIcon, InfoIcon, TrashIcon } from '../components/icons'
import 'virtual:dk-strings/cart'
import 'virtual:dk-strings/checkout'

export default function Cart() {
  useSeo('cart')
  const { t } = useI18n()
  const cart = useCart()
  const { settings, canOrder, remoteLoaded } = useShopStatus()
  const q = useCartQuote(null)
  const blocked = cart.unavailableIds.length > 0
  const r = settings.courier.rates

  if (!cart.lines.length) return <EmptyCart />

  return (
    <Container className="py-6 pb-40 lg:py-10">
      <h1 className="t-h2">{t('cart.title')}</h1>
      <p className="t-small text-brown-2">{cart.count === 1 ? t('cart.countLineOne') : t('cart.countLine', { count: cart.count })}</p>

      <div className="mt-4 grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-start">
        <div>
          <CartNotices className="mb-5" />
          <ul className="divide-y divide-line border-y border-line">
            {cart.lines.map((line) => (
              <CartLine key={line.id} line={line} />
            ))}
          </ul>
          <Button to="/menu" variant="secondary" className="mt-5">
            {t('cart.addMore')}
          </Button>
        </div>

        <aside aria-labelledby="summary-title" className="rounded-card bg-champagne p-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <h2 id="summary-title" className="sr-only">
            {t('cart.total')}
          </h2>
          <TotalRows subtotal={q.subtotal} courier={null} rates={q.rates} live />
          <p className="t-small mt-3 text-brown-2">
            {t('cart.courierHow', { smallKa: formatINR(r.small.karnataka), smallOut: formatINR(r.small.outside), largeKa: formatINR(r.large.karnataka), largeOut: formatINR(r.large.outside) })}
          </p>
          <p className="t-small mt-2 text-brown-2">{t('cart.dispatch', { days: settings.leadTimes.standardBusinessDays })}</p>
          {remoteLoaded && !canOrder && (
            <Notice icon={InfoIcon} className="mt-4">
              <p>{settings.store.open ? t('checkout.paymentsSoonText', { phone: site.phone.display }) : t('errors.storeClosed', { phone: site.phone.display })}</p>
            </Notice>
          )}
          {blocked && (
            <p id="cart-blocked" className="t-small mt-3 font-bold text-error">
              {t('cart.checkoutBlocked')}
            </p>
          )}
          <TotalBar label={t('cart.total')} total={t('cart.totalPlusCourier', { price: formatINR(q.subtotal) })}>
            <Button to={blocked ? undefined : '/checkout'} size="lg" fullWidth disabled={blocked} aria-describedby={blocked ? 'cart-blocked' : undefined} data-dk-continue>
              {t('cart.checkout')}
            </Button>
          </TotalBar>
        </aside>
      </div>
    </Container>
  )
}

function CartLine({ line }) {
  const { t, pick } = useI18n()
  const cart = useCart()
  const menu = useMenu()
  const toast = useToast()
  const { openProduct } = useShopSheets()
  const product = menu.productsById[line.productId]
  const name = pick(product?.name || line.name)
  const choices = lineChoices(line, product, { t, pick })

  const onRemove = () => {
    const undo = cart.remove(line.id)
    toast.show({ message: t('cart.removed', { name }), action: { label: t('cart.undo'), onClick: undo } })
  }

  return (
    <li className="flex gap-3 py-4 sm:gap-4">
      <ProductPhoto slug={product?.slug || line.productId} art={line.art} sizes="80px" className={`h-20 w-20 shrink-0 ${line.unavailable ? 'grayscale' : ''}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3">
          <h2 className="font-body leading-snug font-bold">{name}</h2>
          {!line.unavailable && <p className="t-small text-brown-2 tabular-nums">{t('cart.each', { price: formatINR(line.unitPrice) })}</p>}
        </div>
        {choices.length > 0 && (
          <dl className="t-small mt-1 grid grid-cols-[auto_1fr] gap-x-3">
            {choices.map((ch) => (
              <div key={ch.key} className="contents">
                <dt className="text-brown-2">{ch.label}</dt>
                <dd className="min-w-0 break-words">{ch.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {line.refThumb && line.selection.drawingRef && <img src={line.refThumb} alt="" width="48" height="48" className="mt-2 h-12 w-12 rounded-inline object-cover" />}
        <LineStatus line={line} className="mt-2" />
        {!line.unavailable && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            <QuantityStepper value={line.qty} max={limits.maxQtyPerItem} onChange={(n) => (n < 1 ? onRemove() : cart.setQty(line.id, n))} label={t('cart.qtyFor', { name })} />
            <p className="t-price">{formatINR(line.unitPrice * line.qty)}</p>
          </div>
        )}
        <div className="mt-1 flex flex-wrap gap-1">
          {product && !line.unavailable && (
            <button type="button" onClick={() => openProduct(product, { line })} className="inline-flex min-h-12 items-center rounded-control px-3 font-bold underline underline-offset-4 hover:bg-champagne">
              <span>
                {t('cart.edit')}
                <span className="sr-only"> {name}</span>
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className={`inline-flex min-h-12 items-center gap-1.5 rounded-control px-3 font-bold ${line.unavailable ? 'border-[1.5px] border-brown hover:bg-champagne' : 'text-brown-2 hover:bg-champagne hover:text-error'}`}
          >
            <TrashIcon className="h-5 w-5" />
            <span>
              {t('common.remove')}
              <span className="sr-only"> {name}</span>
            </span>
          </button>
        </div>
      </div>
    </li>
  )
}

function EmptyCart() {
  const { t } = useI18n()
  const { state } = useLocation()
  return (
    <Container className="py-10 lg:py-16">
      <div className="max-w-[36rem]">
        {state?.notice === 'checkoutEmpty' && (
          <Notice icon={InfoIcon} className="mb-6">
            <p role="status">{t('cart.checkoutEmpty')}</p>
          </Notice>
        )}
        <CartIcon className="h-12 w-12 text-brown-2" />
        <h1 className="t-h2 mt-3">{t('cart.emptyTitle')}</h1>
        <p className="mt-2 text-brown-2">{t('cart.emptyText')}</p>
        <Button to="/menu" size="lg" className="mt-6">
          {t('cart.emptyCta')}
        </Button>
      </div>
    </Container>
  )
}
