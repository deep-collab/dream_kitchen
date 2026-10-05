import { useEffect, useId, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useShopStatus } from '../context/MenuProvider'
import { useSeo } from '../hooks/useSeo'
import { useOrder } from '../hooks/useOrder'
import { formatINR, upiLink, utrError } from '../lib/pricing'
import { copyText } from '../lib/clipboard'
import { errorText } from '../lib/api'
import { prepareImage, uploadImage } from '../lib/images'
import { startRazorpay, submitPayment, verifyRazorpay } from '../services'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField from '../components/ui/TextField'
import { useToast } from '../components/ui/Toast'
import PhoneGate from '../components/order/PhoneGate'
import { CheckoutProgress, TotalBar } from '../components/checkout/CheckoutFrame'
import { AlertIcon, CopyIcon, ImageIcon, WalletIcon } from '../components/icons'
import 'virtual:dk-strings/pay'
import 'virtual:dk-strings/order'
import 'virtual:dk-strings/cart'
import 'virtual:dk-strings/sheet'

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

/**
 * Checkout step 3 of 3: pay by UPI on the website. The amount, Hema's QR code, a "Pay with a UPI
 * app" button on phones (upi://pay with the amount and order ID filled in), then the 12-digit UPI
 * reference (and an optional screenshot). Hema confirms the payment in admin. Razorpay shows here
 * too once it is switched on. The order is saved already, so this page works after a reload.
 */
export default function Pay() {
  useSeo('pay')
  const { t } = useI18n()
  const { code: param } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const toast = useToast()
  const { settings, razorpay } = useShopStatus()
  const o = useOrder(param, state?.order)
  const [utr, setUtr] = useState('')
  const [tried, setTried] = useState(false)
  const [shot, setShot] = useState(null) // { path, thumb }
  const [shotBusy, setShotBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const fileId = useId()
  const [phoneUi] = useState(isPhone)

  // Paid already (or submitted): the confirmation page says so
  useEffect(() => {
    if (o.order && o.order.status === 'placed' && o.order.paymentStatus === 'confirmed') navigate(`/order/${o.code}`, { replace: true })
    if (o.order && o.order.status !== 'placed') navigate(`/order/${o.code}`, { replace: true })
  }, [o.order, o.code, navigate])

  if (o.status === 'needPhone' || o.status === 'notFound')
    return (
      <Container className="py-8">
        <h1 className="t-h2">{t('order.code')} {o.code}</h1>
        <div className="mt-4">
          <PhoneGate onLookup={o.lookup} notFound={o.status === 'notFound'} />
        </div>
      </Container>
    )
  if (!o.order) return <div aria-busy="true" className="min-h-dvh" />
  if (o.order.paymentStatus === 'submitted' && !state?.order) return <Navigate to={`/order/${o.code}`} replace />

  const order = o.order
  const total = formatINR(order.total)
  const upi = settings.payment
  const phone = o.phone
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
    if (utrErr) {
      document.getElementById('pay-utr')?.focus()
      return
    }
    setBusy(true)
    setError(null)
    const r = await submitPayment(order.code, phone, utr, shot?.path)
    setBusy(false)
    if (r.ok) {
      o.update(r.data.order)
      navigate(`/order/${order.code}`, { replace: true, state: { order: r.data.order } })
    } else if (r.error === 'notPending' && r.order) {
      navigate(`/order/${order.code}`, { replace: true })
    } else setError(errorText(t, r))
  }

  const payOnline = async () => {
    setError(null)
    const r = await startRazorpay(order.code, phone)
    if (!r.ok) return setError(errorText(t, r))
    await loadRazorpay().catch(() => null)
    if (!window.Razorpay) return setError(t('pay.onlineFailed'))
    const d = r.data
    const rzp = new window.Razorpay({
      key: d.keyId,
      order_id: d.razorpayOrderId,
      amount: d.amount,
      currency: d.currency,
      name: d.name,
      description: d.description,
      prefill: d.prefill,
      theme: { color: '#0F0F0F' },
      handler: async (resp) => {
        const v = await verifyRazorpay({ code: order.code, phone, razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature })
        if (v.ok) navigate(`/order/${order.code}`, { replace: true, state: { order: v.data.order } })
        else setError(t('pay.onlineFailed'))
      },
    })
    rzp.on('payment.failed', () => setError(t('pay.onlineFailed')))
    rzp.open()
  }

  return (
    <Container className="py-5 pb-48 lg:py-10">
      <CheckoutProgress step={3} />
      <h1 className="t-h2">{t('pay.title', { price: total })}</h1>
      <p className="mt-1 text-brown-2">{t('pay.orderSaved', { code: order.code })}</p>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          {upi.upiId ? (
            <section className="rounded-card border border-line bg-[#fffcf5] p-4 sm:p-5">
              {upi.upiQr && (
                <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
                  <img src={upi.upiQr} alt={t('pay.qrAlt')} width="200" height="200" className="h-48 w-48 shrink-0 rounded-control border border-line bg-white object-contain p-2" />
                  <p>{t('pay.scan', { price: total })}</p>
                </div>
              )}
              {phoneUi && (
                <Button href={upiLink({ upiId: upi.upiId, name: upi.upiName, amount: order.total, orderCode: order.code })} icon={WalletIcon} size="lg" fullWidth className={upi.upiQr ? 'mt-4' : ''} data-dk-upi>
                  {t('pay.app', { price: total })}
                </Button>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-control bg-champagne px-4 py-2">
                <span>
                  <span className="t-small block text-brown-2">{t('pay.upiId')}</span>
                  <span className="font-bold break-all">{upi.upiId}</span>
                </span>
                <button
                  type="button"
                  onClick={async () => (await copyText(upi.upiId)) && toast.show({ message: t('pay.upiCopied') })}
                  className="inline-flex min-h-12 items-center gap-1.5 rounded-control px-3 font-bold underline underline-offset-4"
                >
                  <CopyIcon className="h-5 w-5" />
                  {t('pay.copyUpi')}
                </button>
              </div>
              <p className="t-small mt-3 text-brown-2">{t('pay.amountNote', { price: total, code: order.code })}</p>
            </section>
          ) : null}

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

          {razorpay.enabled && (
            <section className="space-y-2">
              <h2 className="t-h3">{t('pay.onlineOr')}</h2>
              <Button variant="secondary" fullWidth onClick={payOnline}>
                {t('pay.online')}
              </Button>
            </section>
          )}
          <p className="t-small text-brown-2">{t('pay.later')}</p>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          {error && (
            <p role="alert" className="mb-4 flex items-start gap-2 rounded-control border-[1.5px] border-error bg-error-bg p-3 font-bold">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-error" />
              <span>{error}</span>
            </p>
          )}
          <TotalBar label={t('cart.total')} total={total} note={t('order.code') + ' ' + order.code}>
            <Button type="submit" form="pay-form" size="lg" fullWidth disabled={busy || shotBusy} data-dk-paid>
              {busy ? t('pay.submitting') : t('pay.submit')}
            </Button>
          </TotalBar>
        </aside>
      </div>
    </Container>
  )
}

let razorpayScript = null
function loadRazorpay() {
  razorpayScript ||= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = resolve
    s.onerror = () => {
      razorpayScript = null
      reject(new Error('razorpay'))
    }
    document.head.appendChild(s)
  })
  return razorpayScript
}
