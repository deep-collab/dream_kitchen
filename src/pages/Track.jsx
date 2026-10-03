import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { getOrderStatus } from '../services'
import { formatDate } from '../lib/format'
import { isValidOrderId, isValidPhone, normaliseOrderId } from '../lib/validation'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField, { PhoneField } from '../components/ui/TextField'
import StatusTracker from '../components/StatusTracker'

// Legacy tracker (mock data). Step 3 rebuilds it with the new status names.
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
      <Container className="py-12 lg:py-16">
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            check(orderId, phone)
          }}
          className="grid max-w-[52rem] gap-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <TextField
            id="tr-id"
            label={t('track.orderId')}
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            onBlur={() => orderId && setOrderId(normaliseOrderId(orderId))}
            placeholder={t('track.orderIdPlaceholder')}
            autoComplete="off"
            autoCapitalize="characters"
          />
          <PhoneField id="tr-phone" label={t('track.phone')} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Button type="submit" disabled={busy}>
            {t('track.submit')}
          </Button>
          <p className="t-small text-brown-2 sm:col-span-3">{t('track.demo')}</p>
        </form>

        <div aria-live="polite" className="mt-8 max-w-[52rem]">
          {result?.error && <p className="rounded-card border border-error bg-error-bg p-5 font-bold text-error">{result.error}</p>}
          {result?.order && (
            <div className="card p-5 sm:p-8">
              <h2 className="t-h3">{t('track.statusFor', { id: result.order.id })}</h2>
              {result.order.deliveryDate && <p className="mt-1 text-brown-2">{t('track.deliveryOn', { date: formatDate(result.order.deliveryDate, lang) })}</p>}
              <div className="mt-8">
                <StatusTracker status={result.order.status} />
              </div>
            </div>
          )}
        </div>
      </Container>
    </>
  )
}
