import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { getOrderStatus } from '../services'
import { formatDay, zonedNow } from '../lib/dates'
import { normaliseOrderId, orderIdError } from '../lib/orderId'
import { phoneError, tidyPhoneInput } from '../lib/validation'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField, { PhoneField } from '../components/ui/TextField'
import StatusTracker from '../components/order/StatusTracker'
import { AlertIcon } from '../components/icons'

/**
 * Order ID + phone -> status. Everything goes through services.getOrderStatus,
 * so Stage B only swaps that function for a Supabase RPC.
 */
export default function Track() {
  useSeo('track')
  const { t } = useI18n()
  const [params] = useSearchParams()
  const [orderId, setOrderId] = useState(params.get('id') || '')
  const [phone, setPhone] = useState(tidyPhoneInput(params.get('phone') || ''))
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null) // { order } | { notFound: true }
  const [busy, setBusy] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const resultRef = useRef(null)

  const errors = { orderId: orderIdError(orderId), phone: phoneError(phone) }
  const shown = (k) => ((touched[k] || submitted) && errors[k] ? t(`track.errors.${k}.${errors[k]}`) : undefined)

  const check = async (id, ph, { focusResult = true } = {}) => {
    setBusy(true)
    const order = await getOrderStatus(id, ph)
    setBusy(false)
    setResult(order ? { order } : { notFound: true })
    setAnnouncement(order ? `${t('track.statusFor', { id: order.id })}. ${t('track.current', { status: t(`track.steps.${order.status}`) })}` : t('track.notFound'))
    if (focusResult) requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: false }))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    const bad = ['orderId', 'phone'].find((k) => errors[k])
    if (bad) {
      document.getElementById(`tr-${bad}`)?.focus()
      setResult(null)
      return
    }
    setOrderId(normaliseOrderId(orderId))
    check(orderId, phone)
  }

  // Coming from the success page (?id=…&phone=…): look it up straight away
  useEffect(() => {
    const id = params.get('id')
    const ph = params.get('phone')
    if (id && ph && !orderIdError(id) && !phoneError(ph)) check(id, ph, { focusResult: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <PageHero title={t('track.title')} subtitle={t('track.subtitle')} />
      <Container className="py-10 lg:py-14">
        <form noValidate onSubmit={onSubmit} className="grid max-w-[48rem] gap-6 sm:grid-cols-2 sm:items-start">
          <TextField
            id="tr-orderId"
            label={t('track.orderId')}
            hint={t('track.orderIdHint')}
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            onBlur={() => {
              setTouched((p) => ({ ...p, orderId: true }))
              if (!orderIdError(orderId)) setOrderId(normaliseOrderId(orderId))
            }}
            error={shown('orderId')}
            required
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          <PhoneField id="tr-phone" label={t('track.phone')} required value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={() => {
              setTouched((p) => ({ ...p, phone: true }))
              setPhone(tidyPhoneInput)
            }} error={shown('phone')} />
          <Button type="submit" size="lg" disabled={busy} className="sm:col-span-2 sm:justify-self-start sm:min-w-60">
            {busy ? t('track.checking') : t('track.submit')}
          </Button>
        </form>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {announcement}
        </p>

        <div ref={resultRef} tabIndex={-1} className="mt-10 max-w-[56rem] scroll-mt-28 outline-none">
          {result?.order && <Found order={result.order} />}
          {result?.notFound && <NotFound />}
        </div>
      </Container>
    </>
  )
}

function Found({ order }) {
  const { t } = useI18n()
  const names = t('dates')
  const placed = order.placedAt ? zonedNow(new Date(order.placedAt)).date : null
  return (
    <section aria-labelledby="track-found" className="card p-5 sm:p-8">
      <h2 id="track-found" className="t-h3">
        {t('track.statusFor', { id: order.id })}
      </h2>
      <div className="mt-1 text-brown-2">
        {placed && <p>{t('track.placedOn', { date: formatDay(placed, names, { year: true }) })}</p>}
        {order.preferredDate && <p>{t('track.preferred', { date: formatDay(order.preferredDate, names, { year: true }) })}</p>}
      </div>
      <p className="mt-6 font-bold">{t('track.current', { status: t(`track.steps.${order.status}`) })}</p>
      <div className="mt-6">
        <StatusTracker status={order.status} />
      </div>
      {order.status === 'received' && (
        <div className="mt-8 border-t border-line pt-6">
          <p>{t('track.receivedHelp')}</p>
          <ContactButtons />
        </div>
      )}
    </section>
  )
}

function NotFound() {
  const { t } = useI18n()
  return (
    <section className="rounded-card border border-line bg-champagne p-5 sm:p-8">
      <p className="t-lead flex items-start gap-3">
        <AlertIcon className="mt-1 h-6 w-6 shrink-0" />
        <span>{t('track.notFound')}</span>
      </p>
      <ContactButtons />
    </section>
  )
}

function ContactButtons() {
  const { t } = useI18n()
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 sm:max-w-[36rem]">
      <Button variant="call" fullWidth>
        {t('callOptions.call')}
      </Button>
      <Button variant="whatsapp" fullWidth>
        {t('mobileMenu.chat')}
      </Button>
    </div>
  )
}
