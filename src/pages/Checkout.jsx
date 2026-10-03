import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { useSeo } from '../hooks/useSeo'
import { createOrder } from '../services'
import { site } from '../config/site'
import { formatDate } from '../lib/format'
import { maxDeliveryDate, minDeliveryDate } from '../lib/orderRules'
import { isValidPhone, isValidPincode } from '../lib/validation'
import { orderWhatsAppUrl } from '../lib/whatsapp'
import { lineTextEn } from '../lib/lineText'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField, { PhoneField } from '../components/ui/TextField'
import OrderSummary from '../components/OrderSummary'
import { PrebookNotice } from './Cart'

const FIELDS = ['name', 'phone', 'address', 'pincode', 'date']

function validate(form, minDate, maxDate, t, lang) {
  const e = {}
  if (form.name.trim().length < 2) e.name = t('checkout.errors.name')
  if (!isValidPhone(form.phone)) e.phone = t('checkout.errors.phone')
  if (form.address.trim().length < 10) e.address = t('checkout.errors.address')
  if (!isValidPincode(form.pincode)) e.pincode = t('checkout.errors.pincode')
  if (!form.date) e.date = t('checkout.errors.date')
  else if (form.date < minDate) e.date = t('checkout.errors.dateTooSoon', { date: formatDate(minDate, lang) })
  else if (form.date > maxDate) e.date = t('checkout.errors.dateTooFar', { days: site.order.maxDaysAhead })
  return e
}

export default function Checkout() {
  useSeo('checkout')
  const { t, lang } = useI18n()
  const { lines, count, subtotal, clear } = useCart()
  const pieces = count
  const navigate = useNavigate()
  const formRef = useRef(null)
  const [form, setForm] = useState({ name: '', phone: '', address: '', pincode: '', date: '', note: '' })
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [busy, setBusy] = useState(false)

  const minDate = minDeliveryDate(pieces)
  const maxDate = maxDeliveryDate()
  const errors = useMemo(() => validate(form, minDate, maxDate, t, lang), [form, minDate, maxDate, t, lang])
  const show = (k) => (touched[k] || submitted ? errors[k] : undefined)

  if (!lines.length) {
    return (
      <PageHero title={t('checkout.title')} subtitle={t('checkout.emptyCart')}>
        <Button to="/shop" className="mt-6">
          {t('cart.emptyCta')}
        </Button>
      </PageHero>
    )
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k) => () => setTouched((tt) => ({ ...tt, [k]: true }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    const firstBad = FIELDS.find((k) => errors[k])
    if (firstBad) {
      formRef.current?.querySelector(`#co-${firstBad}`)?.focus()
      return
    }
    // Open the tab now (inside the tap) so phones don't block it, then point it at WhatsApp.
    const win = window.open('', '_blank')
    setBusy(true)
    try {
      const order = await createOrder({
        items: lines.map((l) => ({ productId: l.productId || l.comboId, name: lineTextEn(l), unitPrice: l.unitPrice, qty: l.qty })),
        customer: { name: form.name, phone: form.phone, address: form.address, pincode: form.pincode },
        deliveryDate: form.date,
        note: form.note,
        lang,
      })
      const url = orderWhatsAppUrl(order)
      if (win) {
        win.opener = null
        win.location.href = url
      }
      clear()
      navigate(`/order/${order.id}`, { replace: true, state: { order, opened: Boolean(win) } })
    } catch {
      win?.close()
      setBusy(false)
    }
  }

  const errorCount = submitted ? Object.keys(errors).length : 0

  return (
    <>
      <PageHero title={t('checkout.title')} subtitle={t('checkout.subtitle')} />
      <Container className="grid gap-8 py-10 lg:grid-cols-[1.4fr_1fr] lg:items-start lg:py-14">
        <form ref={formRef} onSubmit={onSubmit} noValidate className="space-y-6">
          <PrebookNotice />
          {errorCount > 0 && (
            <p role="alert" className="rounded-card border border-error bg-error-bg p-4 font-bold text-error">
              {t('checkout.fixErrors')}
            </p>
          )}
          <TextField id="co-name" label={t('checkout.name')} autoComplete="name" value={form.name} onChange={set('name')} onBlur={blur('name')} error={show('name')} />
          <PhoneField id="co-phone" label={t('checkout.phone')} hint={t('checkout.phoneHint')} value={form.phone} onChange={set('phone')} onBlur={blur('phone')} error={show('phone')} />
          <TextField id="co-address" as="textarea" rows={3} autoComplete="street-address" label={t('checkout.address')} hint={t('checkout.addressHint')} value={form.address} onChange={set('address')} onBlur={blur('address')} error={show('address')} />
          <div className="grid gap-6 sm:grid-cols-2">
            <TextField id="co-pincode" inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder="560001" label={t('checkout.pincode')} hint={t('checkout.pincodeHint')} value={form.pincode} onChange={set('pincode')} onBlur={blur('pincode')} error={show('pincode')} />
            <TextField id="co-date" type="date" min={minDate} max={maxDate} label={t('checkout.date')} hint={t('checkout.dateHint', { date: formatDate(minDate, lang) })} value={form.date} onChange={set('date')} onBlur={blur('date')} error={show('date')} />
          </div>
          <TextField id="co-note" as="textarea" rows={2} maxLength={300} optional label={t('checkout.note')} placeholder={t('checkout.notePlaceholder')} value={form.note} onChange={set('note')} />
          <Button type="submit" variant="whatsapp" size="lg" fullWidth disabled={busy}>
            {busy ? t('checkout.submitting') : t('checkout.submit')}
          </Button>
          <p className="t-small text-brown-2">{t('cart.noPayment')}</p>
        </form>

        <div className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <OrderSummary lines={lines} count={count} subtotal={subtotal} />
        </div>
      </Container>
    </>
  )
}
