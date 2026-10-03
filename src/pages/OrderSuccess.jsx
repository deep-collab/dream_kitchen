import { Link, useLocation, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useAsync } from '../hooks/useAsync'
import { getRecentOrder } from '../services'
import { formatDate, formatPrice } from '../lib/format'
import { orderWhatsAppUrl } from '../lib/whatsapp'
import LogoBadge from '../components/LogoBadge'
import { ArrowRightIcon, WhatsAppIcon } from '../components/Icons'

export default function OrderSuccess() {
  useSeo('success')
  const { t, lang } = useI18n()
  const { id } = useParams()
  const { state } = useLocation()
  const { data: stored, loading } = useAsync(() => (state?.order ? Promise.resolve(state.order) : getRecentOrder(id)), [id])
  const order = stored

  return (
    <section className="doodle-bg min-h-[60vh] py-10 sm:py-16">
      <div className="container-dk">
        <div className="card-cream mx-auto max-w-xl p-6 text-center sm:p-10">
          <LogoBadge size="md" />
          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">{t('success.title')}</h1>
          <p className="mt-5 text-sm font-extrabold tracking-wider text-brown uppercase">{t('success.orderId')}</p>
          <p className="mt-1 inline-block rounded-2xl border-2 border-dashed border-gold bg-offwhite px-6 py-2 font-display text-4xl font-bold text-deep">{id}</p>
          <p className="mt-2 text-sm text-brown">{t('success.saveId')}</p>

          {!loading && !order && <p className="mt-4 text-brown">{t('success.missing')}</p>}

          {order && (
            <>
              <p className="mt-6 text-lg">{t('success.text')}</p>
              <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-2 text-left">
                <dt className="text-brown">{t('cart.total')}</dt>
                <dd className="text-right font-extrabold">{formatPrice(order.total)}</dd>
                <dt className="text-brown">{t('checkout.date')}</dt>
                <dd className="text-right font-extrabold">{formatDate(order.deliveryDate, lang)}</dd>
              </dl>
              <div className="mt-8 rounded-2xl bg-tint/60 p-4">
                <p className="font-bold">{t('success.notOpened')}</p>
                <a href={orderWhatsAppUrl(order)} target="_blank" rel="noopener noreferrer" className="btn btn-whatsapp mt-3 w-full">
                  <WhatsAppIcon /> {t('success.sendAgain')}
                </a>
              </div>
            </>
          )}

          <Link to={`/track?id=${encodeURIComponent(id)}${order ? `&phone=${order.customer.phone}` : ''}`} className="btn btn-primary mt-4 w-full text-lg">
            {t('success.track')} <ArrowRightIcon className="h-5 w-5" />
          </Link>
          <Link to="/shop" className="btn btn-secondary mt-3 w-full">
            {t('common.continueShopping')}
          </Link>
        </div>
      </div>
    </section>
  )
}
