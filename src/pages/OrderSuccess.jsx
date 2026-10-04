import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { useSeo } from '../hooks/useSeo'
import { useAsync } from '../hooks/useAsync'
import { getSavedOrder } from '../services'
import { site } from '../config/site'
import { copyText } from '../lib/clipboard'
import { formatDay } from '../lib/dates'
import { consumeCartClearing } from '../lib/deviceStore'
import { orderItemChoices } from '../lib/lineText'
import { normaliseOrderId } from '../lib/orderId'
import { formatINR } from '../lib/pricing'
import { formatPhone } from '../lib/validation'
import { orderMessage, orderWhatsAppUrl } from '../lib/whatsappMessage'
import Container from '../components/ui/Container'
import TotalRows from '../components/order/TotalRows'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import Symbol from '../components/brand/Symbol'
import { CopyIcon } from '../components/icons'
import 'virtual:dk-strings/success'

export default function OrderSuccess() {
  useSeo('success')
  const { t } = useI18n()
  const { id: rawId } = useParams()
  const id = normaliseOrderId(rawId)
  const { state } = useLocation()
  const cart = useCart()
  // Saved on this phone, so a refresh still shows it. The navigation state covers
  // phones where storage is blocked.
  const { data: order, loading } = useAsync(() => getSavedOrder(id).then((o) => o || (state?.order?.id === id ? state.order : null)), [id])

  // Empty the cart only now: the order is saved and this page has loaded. Once only,
  // so opening an old success page never empties a newer cart.
  const { clear } = cart
  useEffect(() => {
    if (order && consumeCartClearing(order.id)) clear()
  }, [order, clear])

  if (loading) return <Container className="min-h-dvh py-16" aria-busy="true" />
  if (!order) return <Missing id={id} />
  // The browser blocked the WhatsApp tab: say so, and put "Open WhatsApp" first
  const blocked = state?.opened === false

  return (
    <Container className="py-10 lg:py-14">
      <div className="mx-auto max-w-[40rem]">
        <div className="text-center">
          <Symbol className="mx-auto h-16 w-auto" />
          <h1 className="t-h1 mt-4">{blocked ? t('success.blockedTitle') : t('success.title')}</h1>
          <p className="t-lead mt-3">{blocked ? t('success.blockedLead') : t('success.lead')}</p>
        </div>

        {blocked ? (
          <>
            <Fallback order={order} emphasise className="mt-8" />
            <OrderIdCard id={order.id} className="mt-6" />
          </>
        ) : (
          <>
            <OrderIdCard id={order.id} className="mt-8" />
            <Fallback order={order} className="mt-6" />
          </>
        )}

        <NextSteps />

        <OrderDetails order={order} />

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Button to={`/track?id=${encodeURIComponent(order.id)}&phone=${order.customer.phone}`} size="lg" fullWidth>
            {t('success.track')}
          </Button>
          <Button to="/shop" variant="secondary" size="lg" fullWidth>
            {t('common.continueShopping')}
          </Button>
        </div>
      </div>
    </Container>
  )
}

function OrderIdCard({ id, className = '' }) {
  const { t } = useI18n()
  const toast = useToast()
  const copy = async () => toast.show({ message: (await copyText(id)) ? t('success.copied') : t('success.copyFailed') })
  return (
    <section aria-labelledby="order-id-label" className={`rounded-card border-2 border-ink p-5 text-center sm:p-6 ${className}`}>
      <p id="order-id-label" className="font-bold text-brown-2">
        {t('success.orderId')}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
        <p className="font-body text-[1.75rem] leading-tight font-bold tracking-wide tabular-nums sm:text-[2.25rem]">{id}</p>
        <button
          type="button"
          onClick={copy}
          aria-label={t('success.copyLabel', { id })}
          className="inline-flex min-h-12 items-center gap-2 rounded-control border-[1.5px] border-brown px-4 font-bold hover:bg-champagne"
        >
          <CopyIcon className="h-5 w-5" />
          <span>{t('success.copy')}</span>
        </button>
      </div>
      <p className="t-small mt-2 text-brown-2">{t('success.saveId')}</p>
    </section>
  )
}

function Fallback({ order, emphasise = false, className = '' }) {
  const { t } = useI18n()
  const toast = useToast()
  const copyDetails = async () => toast.show({ message: (await copyText(orderMessage(order))) ? t('success.detailsCopied') : t('success.copyFailed') })
  return (
    <section aria-labelledby="fallback-title" className={`rounded-card bg-champagne p-5 sm:p-6 ${emphasise ? 'border-2 border-ink' : 'border border-line'} ${className}`}>
      <h2 id="fallback-title" className="t-h3">
        {t('success.fallbackTitle')}
      </h2>
      <p className="mt-2 text-brown-2">{t('success.fallbackText')}</p>
      <div className="mt-5 grid gap-3">
        <Button variant="whatsapp" size="lg" href={orderWhatsAppUrl(order)} fullWidth>
          {t('success.openAgain')}
        </Button>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button variant="secondary" icon={CopyIcon} fullWidth onClick={copyDetails}>
            {t('success.copyDetails')}
          </Button>
          <Button variant="call" fullWidth>
            {t('callOptions.call')}
          </Button>
        </div>
      </div>
    </section>
  )
}

function NextSteps() {
  const { t } = useI18n()
  const steps = ['confirm', 'pay', 'dispatch']
  return (
    <section aria-labelledby="next-title" className="mt-10">
      <h2 id="next-title" className="t-h2">
        {t('success.nextTitle')}
      </h2>
      <ol className="mt-6 space-y-0">
        {steps.map((s, i) => (
          <li key={s} className="relative flex gap-4 pb-6 last:pb-0">
            {i < steps.length - 1 && <span aria-hidden="true" className="absolute top-12 bottom-0 left-6 w-0.5 -translate-x-1/2 bg-line" />}
            <span aria-hidden="true" className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-ink text-[1.125rem] font-bold text-gold-light">
              {i + 1}
            </span>
            <div className="min-w-0 pt-2">
              <h3 className="font-body text-[1.125rem] leading-snug font-bold">{t(`success.steps.${s}.title`, { days: site.ordering.dispatchAfterBusinessDays })}</h3>
              <p className="mt-1 text-brown-2">{t(`success.steps.${s}.text`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

function OrderDetails({ order }) {
  const { t, pick } = useI18n()
  const c = order.customer
  return (
    <section aria-labelledby="your-order" className="mt-10 rounded-card border border-line p-5 sm:p-6">
      <h2 id="your-order" className="t-h3">
        {t('success.yourOrder')}
      </h2>
      <dl className="mt-4 grid gap-x-4 gap-y-3 sm:grid-cols-[auto_1fr]">
        <dt className="font-bold">{t('success.preferredDate')}</dt>
        <dd>{formatDay(order.preferredDate, t('dates'), { year: true })}</dd>
        <dt className="font-bold">{t('success.deliverTo')}</dt>
        <dd className="min-w-0 break-words">
          {c.name}, {formatPhone(c.phone)}
          <br />
          {[c.address, c.area].filter(Boolean).join(', ')}, {c.pincode}
        </dd>
      </dl>
      <ul className="mt-5 divide-y divide-line border-y border-line">
        {order.items.map((item, i) => {
          const choices = orderItemChoices(item, { t, pick })
          return (
            <li key={i} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 leading-snug font-bold">
                  {pick(item.name)} <span className="font-normal text-brown-2">× {item.qty}</span>
                </p>
                <p className="shrink-0 font-bold tabular-nums">{formatINR(item.lineTotal)}</p>
              </div>
              {choices.length > 0 && (
                <dl className="t-small mt-1 grid grid-cols-[auto_1fr] gap-x-2.5">
                  {choices.map((ch) => (
                    <div key={ch.key} className="contents">
                      <dt className="text-brown-2">{ch.label}</dt>
                      <dd className="min-w-0 break-words">{ch.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </li>
          )
        })}
      </ul>
      <TotalRows subtotal={order.subtotal} delivery={order.deliveryCharge} className="mt-4" />
    </section>
  )
}

function Missing({ id }) {
  const { t } = useI18n()
  return (
    <Container className="py-12 lg:py-16">
      <div className="max-w-[40rem]">
        <h1 className="t-h2">{t('success.missingTitle')}</h1>
        <p className="mt-2 font-bold text-brown-2">{id}</p>
        <p className="t-lead mt-4 text-brown-2">{t('success.missingText')}</p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button variant="call" size="lg" fullWidth>
            {t('callOptions.call')}
          </Button>
          <Button variant="whatsapp" size="lg" fullWidth>
            {t('mobileMenu.chat')}
          </Button>
        </div>
        <Button to="/track" variant="secondary" fullWidth className="mt-3">
          {t('nav.track')}
        </Button>
      </div>
    </Container>
  )
}
