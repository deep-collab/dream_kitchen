import { useCallback, useEffect, useId, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useShopStatus } from '../context/MenuProvider'
import { useSeo } from '../hooks/useSeo'
import { useOrder } from '../hooks/useOrder'
import { formatINR, utrError } from '../lib/pricing'
import { errorText } from '../lib/api'
import { prepareImage, uploadImage } from '../lib/images'
import { submitPayment } from '../services'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import PhoneGate from '../components/order/PhoneGate'
import { CheckoutProgress, TotalBar } from '../components/checkout/CheckoutFrame'
import { useRazorpay } from '../components/pay/useRazorpay'
import { RazorpayNote, razorpayLabel, UpiBox } from '../components/pay/PayParts'
import { AlertIcon, ImageIcon } from '../components/icons'
import 'virtual:dk-strings/pay'
import 'virtual:dk-strings/order'
import 'virtual:dk-strings/cart'
import 'virtual:dk-strings/sheet'

/**
 * Checkout step 3 of 3: pay. The order is saved already, so this page works after a reload.
 *   Razorpay set up (the main way): one big "Pay ₹X now" button (card, UPI or net banking). If the
 *   customer closes the window or a card fails, nothing is charged and they can tap it again.
 *   Otherwise the UPI fallback: Hema's QR, a "Pay with a UPI app" button on phones, then the
 *   12-digit UPI reference (and an optional screenshot); Hema confirms it in the admin.
 */
export default function Pay() {
  useSeo('pay')
  const { t } = useI18n()
  const { code: param } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { settings, razorpay } = useShopStatus()
  const o = useOrder(param, state?.order)

  // Paid already (or submitted): the confirmation page says so
  useEffect(() => {
    if (o.order && (o.order.status !== 'placed' || o.order.paymentStatus === 'confirmed')) navigate(`/order/${o.code}`, { replace: true })
  }, [o.order, o.code, navigate])

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
  if (o.order.paymentStatus === 'submitted' && !state?.order) return <Navigate to={`/order/${o.code}`} replace />

  const props = { order: o.order, phone: o.phone, onDone: (order) => navigate(`/order/${order.code}`, { replace: true, state: { order } }), update: o.update }
  return (
    <Container className="py-5 pb-48 lg:py-10">
      <CheckoutProgress step={3} />
      <h1 className="t-h2">{t('pay.title', { price: formatINR(o.order.total) })}</h1>
      <p className="mt-1 text-brown-2">{t('pay.orderSaved', { code: o.order.code })}</p>
      {razorpay.enabled ? <PayOnline {...props} /> : <PayUpi {...props} upi={settings.payment} />}
    </Container>
  )
}

function PayOnline({ order, phone, onDone }) {
  const { t } = useI18n()
  const onPaid = useCallback((data) => onDone(data.order), [onDone])
  const rz = useRazorpay({ code: order.code, phone, onPaid })
  const total = formatINR(order.total)
  return (
    <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <div className="min-w-0 space-y-4">
        <RazorpayNote problem={rz.problem} />
        <p className="t-small text-brown-2">{t('pay.later')}</p>
      </div>
      <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
        <TotalBar label={t('cart.total')} total={total} note={`${t('order.code')} ${order.code}`}>
          <Button size="lg" fullWidth onClick={rz.pay} disabled={rz.busy} aria-busy={rz.busy || undefined} data-dk-pay-online>
            {razorpayLabel(t, rz.state, total)}
          </Button>
        </TotalBar>
      </aside>
    </div>
  )
}

function PayUpi({ order, phone, onDone, upi }) {
  const { t } = useI18n()
  const [utr, setUtr] = useState('')
  const [tried, setTried] = useState(false)
  const [shot, setShot] = useState(null) // { path, thumb }
  const [shotBusy, setShotBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const fileId = useId()
  const total = formatINR(order.total)
  const utrErr = utrError(utr)

  const onShot = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setShotBusy(true)
    setError(null)
    const prepared = await prepareImage(file)
    const r = prepared.error ? { ok: false } : await uploadImage('payment', prepared, { code: order.code, phone })
    setShotBusy(false)
    if (r.ok) setShot({ path: r.data.path, thumb: prepared.thumb })
    else setError(t('pay.errors.screenshot'))
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    setTried(true)
    if (utrErr) return document.getElementById('pay-utr')?.focus()
    setBusy(true)
    setError(null)
    const r = await submitPayment(order.code, phone, utr, shot?.path)
    setBusy(false)
    if (r.ok) onDone(r.data.order)
    else if (r.error === 'notPending' && r.order) navigate(`/order/${order.code}`, { replace: true })
    else setError(errorText(t, r))
  }

  return (
    <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <div className="min-w-0 space-y-6">
        {upi.upiId && <UpiBox upi={upi} amount={order.total} code={order.code} />}
        <form id="pay-form" noValidate onSubmit={onSubmit} className="space-y-4">
          <h2 className="t-h3">{t('pay.afterTitle')}</h2>
          <TextField
            id="pay-utr"
            label={t('pay.utr')}
            hint={t('pay.utrHint')}
            inputMode="numeric"
            autoComplete="off"
            maxLength={16}
            placeholder="412345678901"
            value={utr}
            onChange={(e) => setUtr(e.target.value)}
            error={tried && utrErr ? t(`pay.errors.utr.${utrErr}`) : undefined}
          />
          <div>
            <p className="font-bold">
              {t('pay.screenshot')} <span className="t-small font-normal text-brown-2">({t('common.optional')})</span>
            </p>
            <p className="t-small text-brown-2">{t('pay.screenshotHint')}</p>
            <div className="mt-2 flex items-center gap-3">
              {shot && <img src={shot.thumb} alt="" width="48" height="48" className="h-12 w-12 rounded-inline object-cover" />}
              <label htmlFor={fileId} className={`btn btn-secondary cursor-pointer ${shotBusy ? 'pointer-events-none opacity-60' : ''}`}>
                <ImageIcon />
                <span>{shotBusy ? t('sheet.photoUploading') : t('pay.screenshotAdd')}</span>
              </label>
              <input id={fileId} type="file" accept="image/*" onChange={onShot} className="sr-only" disabled={shotBusy} />
            </div>
          </div>
          <p className="rounded-control bg-champagne p-3 font-bold">{t('pay.check')}</p>
        </form>
        <p className="t-small text-brown-2">{t('pay.later')}</p>
      </div>

      <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
        {error && (
          <p role="alert" className="mb-4 flex items-start gap-2 rounded-control border-[1.5px] border-error bg-error-bg p-3 font-bold">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-error" />
            <span>{error}</span>
          </p>
        )}
        <TotalBar label={t('cart.total')} total={total} note={`${t('order.code')} ${order.code}`}>
          <Button type="submit" form="pay-form" size="lg" fullWidth disabled={busy || shotBusy} data-dk-paid>
            {busy ? t('pay.submitting') : t('pay.submit')}
          </Button>
        </TotalBar>
      </aside>
    </div>
  )
}
