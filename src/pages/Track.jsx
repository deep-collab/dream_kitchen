import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { getOrderStatus } from '../services'
import { formatDate } from '../lib/format'
import { isValidOrderId, isValidPhone, normaliseOrderId } from '../lib/validation'
import PageHero from '../components/PageHero'
import Field from '../components/Field'
import StatusTracker from '../components/StatusTracker'

export default function Track() {
  useSeo('track')
  const { t, lang } = useI18n()
  const [params] = useSearchParams()
  const [orderId, setOrderId] = useState(params.get('id') || '')
  const [phone, setPhone] = useState(params.get('phone') || '')
  const [result, setResult] = useState(null) // {order} | {error}
  const [busy, setBusy] = useState(false)

  const check = async (id, ph) => {
    if (!isValidOrderId(id) || !isValidPhone(ph)) {
      setResult({ error: t('track.invalid') })
      return
    }
    setBusy(true)
    const order = await getOrderStatus(id, ph)
    setBusy(false)
    setResult(order ? { order } : { error: t('track.notFound') })
  }

  // Coming from the success page: look it up straight away
  useEffect(() => {
    if (params.get('id') && params.get('phone')) check(params.get('id'), params.get('phone'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <PageHero title={t('track.title')} subtitle={t('track.subtitle')} />
      <div className="container-dk max-w-4xl py-8 sm:py-10">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            check(orderId, phone)
          }}
          className="card grid gap-4 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-start sm:p-6"
        >
          <Field id="tr-id" label={t('track.orderId')}>
            <input className="input uppercase" value={orderId} onChange={(e) => setOrderId(e.target.value)} onBlur={() => orderId && setOrderId(normaliseOrderId(orderId))} placeholder={t('track.orderIdPlaceholder')} autoComplete="off" autoCapitalize="characters" />
          </Field>
          <Field id="tr-phone" label={t('track.phone')}>
            <input className="input" type="tel" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" autoComplete="tel-national" />
          </Field>
          <button type="submit" disabled={busy} className="btn btn-primary sm:mt-8">
            {t('track.submit')}
          </button>
          <p className="text-sm text-brown sm:col-span-3">{t('track.demo')}</p>
        </form>

        <div aria-live="polite" className="mt-6">
          {result?.error && <p className="card p-5 font-bold text-rose">{result.error}</p>}
          {result?.order && (
            <div className="card-cream p-5 sm:p-8">
              <h2 className="text-2xl font-bold">{t('track.statusFor', { id: result.order.id })}</h2>
              {result.order.deliveryDate && <p className="mt-1 text-brown">{t('track.deliveryOn', { date: formatDate(result.order.deliveryDate, lang) })}</p>}
              <div className="mt-8">
                <StatusTracker status={result.order.status} />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
