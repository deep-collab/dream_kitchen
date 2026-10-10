import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { useShopStatus } from '../context/MenuProvider'
import { site } from '../config/site'
import { classes as CLASSES } from '../data/classInfo'
import { formatINR, utrError } from '../lib/pricing'
import { applyClassSettings, normaliseBookingId, slotLabel, weekendText } from '../lib/classes'
import { phoneError } from '../lib/validation'
import { copyText } from '../lib/clipboard'
import { errorText } from '../lib/api'
import { phoneForBooking, rememberBooking } from '../lib/deviceStore'
import { getBooking, submitPayment } from '../services'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField, { PhoneField } from '../components/ui/TextField'
import { useToast } from '../components/ui/Toast'
import { TotalBar } from '../components/checkout/CheckoutFrame'
import { useRazorpay } from '../components/pay/useRazorpay'
import { RazorpayNote, razorpayLabel, UpiBox } from '../components/pay/PayParts'
import { AlertIcon, CheckIcon, ClockIcon, CopyIcon } from '../components/icons'
import 'virtual:dk-strings/book'
import 'virtual:dk-strings/classes'
import 'virtual:dk-strings/pay'
import 'virtual:dk-strings/cart'

/**
 * A class booking (/classes/booking/DK-CL-…): pay for it (Razorpay, or the UPI fallback), then the
 * confirmation. Works after a reload on this phone; on another phone it asks for the number it
 * was booked with.
 */
export default function Booking() {
  useSeo('booking')
  const { t } = useI18n()
  const { code: param } = useParams()
  const code = normaliseBookingId(param)
  const { state } = useLocation()
  const [b, setB] = useState(state?.booking?.code === code ? state.booking : null)
  const [status, setStatus] = useState(b ? 'ok' : 'loading') // loading | needPhone | notFound | ok | error
  const [phone, setPhone] = useState(() => phoneForBooking(code))

  const lookup = useCallback(
    async (p) => {
      const r = await getBooking(code, p)
      if (r.ok) {
        rememberBooking(code, p)
        setPhone(p)
        setB(r.data.booking)
        setStatus('ok')
      } else setStatus(r.error === 'notFound' || r.error === 'badRequest' ? 'notFound' : 'error')
    },
    [code],
  )
  useEffect(() => {
    if (phone) lookup(phone)
    else if (!b) setStatus('needPhone')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code])

  if (status === 'needPhone' || status === 'notFound') return <BookingGate code={code} onLookup={lookup} notFound={status === 'notFound'} />
  if (status === 'error')
    return (
      <Container className="py-8">
        <p role="alert" className="font-bold text-error">
          {errorText(t, { error: 'server' })}
        </p>
      </Container>
    )
  if (!b) return <div aria-busy="true" className="min-h-dvh" />
  return <BookingView booking={b} phone={phone} onChange={setB} />
}

function BookingGate({ code, onLookup, notFound }) {
  const { t } = useI18n()
  const [p, setP] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const err = phoneError(p)
  const submit = async (e) => {
    e.preventDefault()
    setTried(true)
    if (err) return
    setBusy(true)
    await onLookup(p)
    setBusy(false)
  }
  return (
    <Container className="py-8">
      <h1 className="t-h2">
        {t('book.codeLabel')} {code}
      </h1>
      <form noValidate onSubmit={submit} className="mt-4 max-w-md space-y-4">
        <p>{t('book.needPhone')}</p>
        <PhoneField id="bk-gate-phone" label={t('book.phone')} value={p} onChange={(e) => setP(e.target.value)} error={tried && err ? t(`book.errors.phone.${err}`) : undefined} />
        {notFound && (
          <p role="alert" className="font-bold text-error">
            {t('book.notFound', { phone: site.phone.display })}
          </p>
        )}
        <Button type="submit" size="lg" disabled={busy}>
          {t('book.title')}
        </Button>
      </form>
    </Container>
  )
}

function BookingView({ booking: b, phone, onChange }) {
  const { t, pick, lang } = useI18n()
  const toast = useToast()
  const { settings, razorpay } = useShopStatus()
  const names = t('dates')
  const cls = CLASSES.find((c) => c.id === b.classId)
  const slot = b.slotStart ? { start: b.slotStart, end: b.slotEnd } : applyClassSettings().slots.find((s) => s.id === b.slot)
  const fee = formatINR(b.fee)
  const toPay = b.status === 'pending' && b.paymentStatus === 'pending'

  return (
    <Container className={`py-6 lg:py-10 ${toPay ? 'pb-48' : ''}`}>
      <div className="max-w-2xl space-y-5" data-dk-booking={b.status} data-dk-booking-payment={b.paymentStatus}>
        {b.status === 'confirmed' ? (
          <div className="rounded-card bg-ink p-5 text-cream" role="status">
            <p className="flex items-center gap-2 text-[1.375rem] font-bold text-gold-light">
              <CheckIcon className="h-7 w-7" /> {t('book.confirmed')}
            </p>
            <p className="mt-2">{t('book.confirmedText', { phone: site.phone.display })}</p>
          </div>
        ) : b.status === 'cancelled' ? (
          <div className="rounded-card border-[1.5px] border-error bg-error-bg p-5" role="status">
            <p className="font-bold">{t('book.cancelledTitle')}</p>
            {b.cancelReason && <p className="mt-1">{b.cancelReason}</p>}
          </div>
        ) : b.paymentStatus === 'submitted' ? (
          <div className="rounded-card bg-champagne p-5" role="status">
            <p className="flex items-center gap-2 font-bold">
              <ClockIcon className="h-6 w-6" /> {t('book.submittedTitle')}
            </p>
            <p className="mt-1">{t('book.submittedText')}</p>
          </div>
        ) : (
          <div>
            <h1 className="t-h2">{t('book.payTitle', { price: fee })}</h1>
            <p className="mt-1 text-brown-2">{t('book.saved', { code: b.code })}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-[#fffcf5] px-4 py-2">
          <span>
            <span className="t-small block text-brown-2">{t('book.codeLabel')}</span>
            <span className="text-[1.25rem] font-bold tabular-nums" data-dk-booking-code>
              {b.code}
            </span>
          </span>
          <button
            type="button"
            onClick={async () => (await copyText(b.code)) && toast.show({ message: t('book.codeCopied') })}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-control px-3 font-bold underline underline-offset-4"
            aria-label={t('book.copyCode', { code: b.code })}
          >
            <CopyIcon className="h-5 w-5" /> {t('common.copy')}
          </button>
        </div>

        <dl className="divide-y divide-line border-y border-line">
          {[
            ['class', t('classes.cardTitle', { name: cls ? pick(cls.name) : b.classId })],
            ['weekend', weekendText(b.weekend, names)],
            ['time', slot ? slotLabel(slot, lang, pick) : b.slot],
            ['fee', fee],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2.5">
              <dt className="text-brown-2">{t(`book.${k}`)}</dt>
              <dd className="text-right font-bold">{v}</dd>
            </div>
          ))}
        </dl>

        {toPay && (razorpay.enabled ? <PayBookingOnline booking={b} phone={phone} onChange={onChange} /> : <PayBookingUpi booking={b} phone={phone} onChange={onChange} upi={settings.payment} />)}

        {!toPay && (
          <Link to="/classes" className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
            {t('book.another')}
          </Link>
        )}
      </div>
    </Container>
  )
}

function PayBookingOnline({ booking: b, phone, onChange }) {
  const { t } = useI18n()
  const onPaid = useCallback((data) => onChange(data.booking), [onChange])
  const rz = useRazorpay({ code: b.code, phone, onPaid })
  const fee = formatINR(b.fee)
  return (
    <>
      <RazorpayNote problem={rz.problem} />
      <TotalBar label={t('cart.total')} total={fee}>
        <Button size="lg" fullWidth onClick={rz.pay} disabled={rz.busy} aria-busy={rz.busy || undefined} data-dk-pay-online>
          {razorpayLabel(t, rz.state, fee)}
        </Button>
      </TotalBar>
    </>
  )
}

function PayBookingUpi({ booking: b, phone, onChange, upi }) {
  const { t } = useI18n()
  const [utr, setUtr] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const err = utrError(utr)
  const submit = async (e) => {
    e.preventDefault()
    setTried(true)
    if (err) return document.getElementById('bk-utr')?.focus()
    setBusy(true)
    setError(null)
    const r = await submitPayment(b.code, phone, utr)
    setBusy(false)
    if (r.ok) onChange(r.data.booking)
    else if (r.error === 'notPending' && r.booking) onChange(r.booking)
    else setError(errorText(t, r))
  }
  return (
    <>
      {upi.upiId && <UpiBox upi={upi} amount={b.fee} code={b.code} />}
      <form id="bk-pay-form" noValidate onSubmit={submit} className="space-y-4">
        <h2 className="t-h3">{t('pay.afterTitle')}</h2>
        <TextField id="bk-utr" label={t('pay.utr')} hint={t('pay.utrHint')} inputMode="numeric" autoComplete="off" maxLength={16} placeholder="412345678901" value={utr} onChange={(e) => setUtr(e.target.value)} error={tried && err ? t(`pay.errors.utr.${err}`) : undefined} />
        <p className="rounded-control bg-champagne p-3 font-bold">{t('book.submittedText')}</p>
      </form>
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-control border-[1.5px] border-error bg-error-bg p-3 font-bold">
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-error" />
          <span>{error}</span>
        </p>
      )}
      <TotalBar label={t('cart.total')} total={formatINR(b.fee)}>
        <Button type="submit" form="bk-pay-form" size="lg" fullWidth disabled={busy} data-dk-paid>
          {busy ? t('pay.submitting') : t('pay.submit')}
        </Button>
      </TotalBar>
    </>
  )
}
