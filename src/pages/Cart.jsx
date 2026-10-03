import { Link } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { useMenu } from '../context/MenuProvider'
import { useSeo } from '../hooks/useSeo'
import { site } from '../config/site'
import { formatINR, lineTotal } from '../lib/pricing'
import { lineChoices } from '../lib/lineText'
import { MAX_QTY } from '../lib/cart'
import { formatCallHours } from '../lib/hours'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import QuantityStepper from '../components/ui/QuantityStepper'
import Notice from '../components/ui/Notice'
import { useToast } from '../components/ui/Toast'
import ProductArt from '../components/art/ProductArt'
import { useShopSheets } from '../components/shop/ShopSheets'
import { CartIcon, TrashIcon } from '../components/icons'

/** Pre-booking reminder shown in the cart (and, until Step 3, the old checkout) */
export function PrebookNotice() {
  const { t } = useI18n()
  return (
    <Notice>
      <p>{t('cart.prebook', { days: site.ordering.dispatchBusinessDays })}</p>
    </Notice>
  )
}

export default function Cart() {
  useSeo('cart')
  const { t } = useI18n()
  const { lines, count, subtotal } = useCart()
  const delivery = lines.length ? site.delivery.charge : 0

  return (
    <>
      <section className="bg-champagne py-10 lg:py-14">
        <Container>
          <h1 className="t-h1">{t('cart.title')}</h1>
          {lines.length > 0 && <p className="t-lead mt-2 text-brown-2">{count === 1 ? t('cart.countLineOne') : t('cart.countLine', { count })}</p>}
        </Container>
      </section>
      <hr className="rule-gold" />

      {lines.length === 0 ? (
        <EmptyCart />
      ) : (
        <Container className="grid gap-10 py-10 lg:grid-cols-[1.6fr_1fr] lg:items-start lg:py-14">
          <div>
            <ul className="divide-y divide-line border-y border-line">
              {lines.map((line) => (
                <CartLine key={line.id} line={line} />
              ))}
            </ul>
            <Button to="/shop" variant="secondary" className="mt-6">
              {t('cart.addMore')}
            </Button>
          </div>

          <aside aria-labelledby="summary-title" className="space-y-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
            <div className="rounded-card bg-champagne p-5 sm:p-6">
              <h2 id="summary-title" className="t-h3">
                {t('cart.summary')}
              </h2>
              <dl className="mt-4 space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-brown-2">{t('cart.subtotal')}</dt>
                  <dd className="font-bold tabular-nums">{formatINR(subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brown-2">{t('cart.deliveryKarnataka')}</dt>
                  <dd className="font-bold tabular-nums">{formatINR(delivery)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <dt className="font-bold">{t('cart.total')}</dt>
                  <dd className="t-price" aria-live="polite">
                    {formatINR(subtotal + delivery)}
                  </dd>
                </div>
              </dl>
              <div className="mt-5">
                <PrebookNotice />
              </div>
              <Button to="/checkout" size="lg" fullWidth className="mt-5">
                {t('cart.checkout')}
              </Button>
              <p className="t-small mt-3 text-brown-2">{t('cart.noPayment')}</p>
            </div>
            <CallCard />
          </aside>
        </Container>
      )}
    </>
  )
}

function CartLine({ line }) {
  const { t, pick } = useI18n()
  const cart = useCart()
  const menu = useMenu()
  const toast = useToast()
  const { openProduct, openCombo } = useShopSheets()
  const name = pick(line.name)
  const choices = lineChoices(line, { t, pick })
  const product = line.kind === 'product' ? menu?.productsById[line.productId] : null
  const combo = line.kind === 'combo' ? menu?.combos.find((c) => c.id === line.comboId) : null
  const canEdit = Boolean(product || combo)

  const onRemove = () => {
    const undo = cart.remove(line.id)
    toast.show({ message: t('cart.removed', { name }), action: { label: t('cart.undo'), onClick: undo } })
  }

  return (
    <li className="flex gap-4 py-5">
      <ProductArt kind={line.image} className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            {line.sectionName && line.sectionName.en !== line.name.en && <p className="t-small text-brown-2">{pick(line.sectionName)}</p>}
            <h2 className="font-body text-[1.125rem] leading-snug font-bold">
              {line.kind === 'product' && product ? (
                <Link to={`/product/${line.slug}`} className="inline-flex min-h-12 items-center hover:underline">
                  {name}
                </Link>
              ) : (
                name
              )}
            </h2>
          </div>
          <p className="t-small text-brown-2 tabular-nums">{t('cart.each', { price: formatINR(line.unitPrice) })}</p>
        </div>

        {choices.length > 0 && (
          <dl className="t-small mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
            {choices.map((ch) => (
              <div key={ch.key} className="contents">
                <dt className="text-brown-2">{ch.label}</dt>
                <dd className="min-w-0 break-words">{ch.value}</dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <QuantityStepper value={line.qty} max={MAX_QTY} onChange={(q) => (q < 1 ? onRemove() : cart.setQty(line.id, q))} label={t('cart.qtyFor', { name })} />
          <p className="t-price">{formatINR(lineTotal(line))}</p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => (product ? openProduct(product, line) : openCombo(combo, line))}
              className="inline-flex min-h-12 items-center rounded-control px-3 font-bold underline underline-offset-4 hover:bg-champagne"
            >
              <span>
                {t('cart.edit')}
                <span className="sr-only"> {name}</span>
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-control px-3 font-bold text-brown-2 hover:bg-champagne hover:text-error"
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

function CallCard() {
  const { t } = useI18n()
  return (
    <div className="rounded-card border border-line p-5 sm:p-6">
      <h2 className="t-h3">{t('cart.callTitle')}</h2>
      <p className="mt-2 text-brown-2">{t('cart.callText')}</p>
      <Button variant="call" fullWidth className="mt-4">
        {t('mobileMenu.callUs')}
      </Button>
      <p className="t-small mt-2 text-brown-2">
        {t('hours.label')}: {formatCallHours(t)}
      </p>
    </div>
  )
}

function EmptyCart() {
  const { t } = useI18n()
  return (
    <Container className="py-12 lg:py-16">
      <div className="max-w-[36rem]">
        <CartIcon className="h-12 w-12 text-brown-2" />
        <h2 className="t-h2 mt-4">{t('cart.emptyTitle')}</h2>
        <p className="t-lead mt-3 text-brown-2">{t('cart.emptyText')}</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button to="/shop" size="lg">
            {t('cart.emptyCta')}
          </Button>
          <Button variant="call" size="lg">
            {t('hero.callToOrder')}
          </Button>
        </div>
      </div>
    </Container>
  )
}
