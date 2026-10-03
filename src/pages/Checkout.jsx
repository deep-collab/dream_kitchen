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
import PageHero from '../components/PageHero'
import Field from '../components/Field'
import OrderSummary from '../components/OrderSummary'
import { BulkNotice } from './Cart'
import { WhatsAppIcon } from '../components/Icons'

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
  const { items, pieces, subtotal, clear } = useCart()
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

  if (!items.length) {
    return (
      <PageHero title={t('checkout.title')} subtitle={t('checkout.emptyCart')}>
        <Link to="/shop" className="btn btn-primary mt-6">
          {t('cart.emptyCta')}
        </Link>
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
        items: items.map((i) => ({ productId: i.productId, name: i.name.en, unitPrice: i.price, qty: i.qty })),
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
      <div className="container-dk grid gap-6 py-8 sm:py-10 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <form ref={formRef} onSubmit={onSubmit} noValidate className="card space-y-5 p-5 sm:p-8">
          <BulkNotice pieces={pieces} />
          {errorCount > 0 && (
            <p role="alert" className="rounded-2xl bg-[#FFF0EE] p-3 font-bold text-rose">
              {t('checkout.fixErrors')}
            </p>
          )}
          <Field id="co-name" label={t('checkout.name')} error={show('name')}>
            <input className="input" type="text" autoComplete="name" value={form.name} onChange={set('name')} onBlur={blur('name')} />
          </Field>
          <Field id="co-phone" label={t('checkout.phone')} hint={t('checkout.phoneHint')} error={show('phone')}>
            <input className="input" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={form.phone} onChange={set('phone')} onBlur={blur('phone')} />
          </Field>
          <Field id="co-address" label={t('checkout.address')} hint={t('checkout.addressHint')} error={show('address')}>
            <textarea className="input min-h-28" rows={3} autoComplete="street-address" value={form.address} onChange={set('address')} onBlur={blur('address')} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="co-pincode" label={t('checkout.pincode')} hint={t('checkout.pincodeHint')} error={show('pincode')}>
              <input className="input" type="text" inputMode="numeric" maxLength={6} autoComplete="postal-code" placeholder="560001" value={form.pincode} onChange={set('pincode')} onBlur={blur('pincode')} />
            </Field>
            <Field id="co-date" label={t('checkout.date')} hint={t('checkout.dateHint', { date: formatDate(minDate, lang) })} error={show('date')}>
              <input className="input" type="date" min={minDate} max={maxDate} value={form.date} onChange={set('date')} onBlur={blur('date')} />
            </Field>
          </div>
          <Field id="co-note" label={t('checkout.note')} optional>
            <textarea className="input min-h-24" rows={2} maxLength={300} placeholder={t('checkout.notePlaceholder')} value={form.note} onChange={set('note')} />
          </Field>
          <button type="submit" disabled={busy} className="btn btn-whatsapp w-full text-lg">
            <WhatsAppIcon /> {busy ? t('checkout.submitting') : t('checkout.submit')}
          </button>
          <p className="text-center text-sm text-brown">{t('cart.noPayment')}</p>
        </form>

        <div className="lg:sticky lg:top-24">
          <OrderSummary items={items} pieces={pieces} subtotal={subtotal} showItems />
        </div>
      </div>
    </>
  )
}
