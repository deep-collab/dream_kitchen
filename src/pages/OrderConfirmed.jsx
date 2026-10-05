import { useLocation, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useOrder } from '../hooks/useOrder'
import { formatDay } from '../lib/dates'
import { copyText } from '../lib/clipboard'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import PhoneGate from '../components/order/PhoneGate'
import { OrderItems, StatusTimeline } from '../components/order/OrderParts'
import { CheckIcon, CopyIcon, TrackIcon } from '../components/icons'
import 'virtual:dk-strings/order'
import 'virtual:dk-strings/track'

/**
 * The confirmation page: order ID (with Copy), payment status, dispatch date, items and total,
 * "Track your order" and Call. Loaded from the server, so it is the same after a reload.
 */
export default function OrderConfirmed() {
  useSeo('order')
  const { t } = useI18n()
  const { code: param } = useParams()
  const { state } = useLocation()
  const toast = useToast()
  const o = useOrder(param, state?.order)

  if (o.status === 'needPhone' || o.status === 'notFound')
    return (
      <Container className="py-8">
        <h1 className="t-h2">
          {t('order.code')} {o.code}
        </h1>
        <div className="mt-4">
          <PhoneGate onLookup={o.lookup} notFound={o.status === 'notFound'} />
        </div>
      </Container>
    )
  if (!o.order) return <div aria-busy="true" className="min-h-dvh" />
  const order = o.order
  const names = t('dates')

  return (
    <Container className="py-6 lg:py-10">
      <div className="max-w-2xl">
        <p className="flex items-center gap-2 font-bold">
          <CheckIcon className="h-6 w-6" />
          {t('order.title')}
        </p>
        <div className="on-dark mt-3 rounded-card bg-ink p-4 text-cream">
          <p className="t-small text-muted">{t('order.code')}</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-body text-[1.75rem] font-bold tracking-wide text-gold-light tabular-nums" data-dk-code>
              {order.code}
            </p>
            <button
              type="button"
              onClick={async () => (await copyText(order.code)) && toast.show({ message: t('order.codeCopied') })}
              className="inline-flex min-h-12 items-center gap-1.5 rounded-control border border-gold/60 px-3 font-bold text-cream hover:bg-white/10"
              aria-label={t('order.copyCode', { code: order.code })}
            >
              <CopyIcon className="h-5 w-5 text-gold" />
              {t('common.copy')}
            </button>
          </div>
          <p className="t-small text-muted">{t('order.keep')}</p>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-line bg-[#fffcf5] p-4">
            <dt className="t-small text-brown-2">{t('order.payment')}</dt>
            <dd className="font-bold" data-dk-payment={order.paymentStatus}>
              {t(`order.paymentStatus.${order.paymentStatus}`)}
            </dd>
            {order.status === 'placed' && order.paymentStatus === 'pending' && (
              <Button to={`/pay/${order.code}`} className="mt-2">
                {t('order.payNow')}
              </Button>
            )}
          </div>
          <div className="rounded-card border border-line bg-[#fffcf5] p-4">
            <dt className="t-small text-brown-2">{t('order.dispatch')}</dt>
            <dd className="font-bold">{formatDay(order.dispatchDate, names, { year: true })}</dd>
            <dd className="t-small text-brown-2">{t('order.courierNote')}</dd>
          </div>
        </dl>

        <section aria-labelledby="oc-status" className="mt-6">
          <h2 id="oc-status" className="sr-only">
            {t('track.progress')}
          </h2>
          <StatusTimeline order={order} />
        </section>

        <section aria-labelledby="oc-items" className="mt-6">
          <h2 id="oc-items" className="t-h3 mb-2">
            {t('order.items')}
          </h2>
          <OrderItems order={order} />
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Button to={`/track?id=${order.code}`} icon={TrackIcon} size="lg">
            {t('order.track')}
          </Button>
          <Button variant="call" size="lg">
            {t('common.callUs')}
          </Button>
        </div>
      </div>
    </Container>
  )
}
