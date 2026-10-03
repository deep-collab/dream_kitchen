import { useLocation, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useAsync } from '../hooks/useAsync'
import { getRecentOrder } from '../services'
import { formatDate } from '../lib/format'
import { formatINR } from '../lib/pricing'
import { orderWhatsAppUrl } from '../lib/whatsapp'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import Symbol from '../components/brand/Symbol'

// Legacy success page; Step 3 rebuilds it (adds "Call Dream Kitchen").
export default function OrderSuccess() {
  useSeo('success')
  const { t, lang } = useI18n()
  const { id } = useParams()
  const { state } = useLocation()
  const { data: order, loading } = useAsync(() => (state?.order ? Promise.resolve(state.order) : getRecentOrder(id)), [id])

  return (
    <Container className="py-12 lg:py-16">
      <div className="mx-auto max-w-[34rem] text-center">
        <Symbol className="mx-auto h-20 w-auto" />
        <h1 className="t-h1 mt-5">{t('success.title')}</h1>
        <p className="mt-6 font-bold text-brown-2">{t('success.orderId')}</p>
        <p className="t-h2 mt-1 inline-block rounded-control border-2 border-dashed border-brown-2 px-6 py-1">{id}</p>
        <p className="t-small mt-2 text-brown-2">{t('success.saveId')}</p>

        {!loading && !order && <p className="mt-4 text-brown-2">{t('success.missing')}</p>}

        {order && (
          <>
            <p className="mt-6">{t('success.text')}</p>
            <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-2 text-left">
              <dt className="text-brown-2">{t('cart.total')}</dt>
              <dd className="t-price text-right">{formatINR(order.total)}</dd>
              <dt className="text-brown-2">{t('checkout.date')}</dt>
              <dd className="text-right font-bold">{formatDate(order.deliveryDate, lang)}</dd>
            </dl>
            <div className="mt-8 rounded-card bg-champagne p-5">
              <p className="font-bold">{t('success.notOpened')}</p>
              <Button href={orderWhatsAppUrl(order)} variant="whatsapp" fullWidth className="mt-3">
                {t('success.sendAgain')}
              </Button>
            </div>
          </>
        )}

        <div className="mt-6 grid gap-3">
          <Button to={`/track?id=${encodeURIComponent(id)}${order ? `&phone=${order.customer.phone}` : ''}`} size="lg" fullWidth>
            {t('success.track')}
          </Button>
          <Button to="/shop" variant="secondary" fullWidth>
            {t('common.continueShopping')}
          </Button>
        </div>
      </div>
    </Container>
  )
}
