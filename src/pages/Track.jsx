import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { site } from '../config/site'
import { normaliseOrderId, orderIdError } from '../lib/orderId'
import { phoneError, tidyPhoneInput } from '../lib/validation'
import { myOrders, phoneForOrder, rememberOrder } from '../lib/deviceStore'
import { errorText } from '../lib/api'
import { getOrder } from '../services'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField, { PhoneField } from '../components/ui/TextField'
import { dayOf, OrderItems, StatusTimeline } from '../components/order/OrderParts'
import { AlertIcon } from '../components/icons'
import 'virtual:dk-strings/track'

/**
 * Track Order on any phone: the order ID AND the phone number it was placed with (the server
 * needs both, so nobody can look up someone else's order). The ID can come from the link in the
 * confirmation email (?id=); on the phone that placed it, the number is filled in too.
 */
export default function Track() {
  useSeo('track')
  const { t } = useI18n()
  const [params] = useSearchParams()
  const initialId = normaliseOrderId(params.get('id') || myOrders()[0]?.code || '')
  const [form, setForm] = useState({ id: initialId, phone: tidyPhoneInput(phoneForOrder(initialId) || '') })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null) // { order } | { error }
  const resultRef = useRef(null)
  const auto = useRef(false)

  const errors = { id: orderIdError(form.id), phone: phoneError(form.phone) }

  const check = async () => {
    setBusy(true)
    const code = normaliseOrderId(form.id)
    const r = await getOrder(code, form.phone)
    setBusy(false)
    if (r.ok) rememberOrder(code, form.phone)
    setResult(r.ok ? { order: r.data.order } : { error: r })
    requestAnimationFrame(() => resultRef.current?.focus())
  }

  // Arriving with both filled in (this phone placed it): show it straight away
  useEffect(() => {
    if (auto.current || !form.id || errors.id || errors.phone) return
    auto.current = true
    check()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = (e) => {
    e.preventDefault()
    setTried(true)
    if (errors.id || errors.phone) {
      document.getElementById(errors.id ? 'tr-id' : 'tr-phone')?.focus()
      return
    }
    check()
  }

  const order = result?.order
  return (
    <Container className="py-6 lg:py-10">
      <div className="max-w-2xl">
        <h1 className="t-h2">{t('track.title')}</h1>
        <p className="mt-1 text-brown-2">{t('track.lead')}</p>

        <form noValidate onSubmit={onSubmit} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="tr-id"
              label={t('track.orderId')}
              hint={t('track.orderIdHint')}
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={20}
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value }))}
              error={tried && errors.id ? t(`track.errors.orderId.${errors.id}`) : undefined}
            />
            <PhoneField
              id="tr-phone"
              label={t('track.phone')}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              onBlur={() => setForm((f) => ({ ...f, phone: tidyPhoneInput(f.phone) }))}
              error={tried && errors.phone ? t(`track.errors.phone.${errors.phone}`) : undefined}
            />
          </div>
          <Button type="submit" size="lg" disabled={busy} data-dk-track>
            {busy ? t('track.checking') : t('track.submit')}
          </Button>
        </form>

        <div ref={resultRef} tabIndex={-1} aria-live="polite" className="mt-6 outline-none">
          {result?.error && (
            <p role="alert" className="flex items-start gap-2 rounded-control border-[1.5px] border-error bg-error-bg p-3 font-bold">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-error" />
              {result.error.error === 'notFound' || result.error.error === 'badRequest' ? t('track.notFound', { phone: site.phone.display }) : errorText(t, result.error)}
            </p>
          )}
          {order && (
            <section aria-labelledby="tr-result" className="space-y-5" data-dk-status={order.status}>
              <div>
                <h2 id="tr-result" className="t-h3">
                  {t('track.statusFor', { id: order.code })}
                </h2>
                <p className="t-small text-brown-2">{t('track.placedOn', { date: dayOf(order.createdAt, t('dates')) })}</p>
              </div>
              <StatusTimeline order={order} />
              <OrderItems order={order} />
            </section>
          )}
        </div>
      </div>
    </Container>
  )
}
