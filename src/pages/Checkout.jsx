import { useId, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { useMenu } from '../context/MenuProvider'
import { useSeo } from '../hooks/useSeo'
import { createOrder } from '../services'
import { site } from '../config/site'
import { dateChoices, earliestDate, formatDay, latestDate } from '../lib/dates'
import { forgetDetails, loadDetails, markCartForClearing, saveDetails } from '../lib/deviceStore'
import { ADDRESS_MAX, AREA_MAX, buildOrder, CHECKOUT_FIELDS, checkoutErrors, NAME_MAX, NOTE_MAX } from '../lib/order'
import { makeOrderId } from '../lib/orderId'
import { openWhatsApp } from '../lib/openWhatsApp'
import { formatINR } from '../lib/pricing'
import { tidyPhoneInput } from '../lib/validation'
import { orderWhatsAppUrl } from '../lib/whatsappMessage'
import PageHero from '../components/PageHero'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import Notice from '../components/ui/Notice'
import TextField, { PhoneField } from '../components/ui/TextField'
import CallOptions from '../components/contact/CallOptions'
import DateChips from '../components/checkout/DateChips'
import CheckoutBar from '../components/checkout/CheckoutBar'
import CartNotices from '../components/order/CartNotices'
import SummaryLines from '../components/order/SummaryLines'
import { WalletIcon } from '../components/icons'

const FORM_ID = 'checkout-form'
const DATE_NAME = 'co-date'
const EMPTY = { name: '', phone: '', address: '', area: '', pincode: '', date: '', note: '' }

function Section({ title, children, className = '' }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={className}>
      <h2 id={id} className="t-h3">
        {title}
      </h2>
      <div className="mt-5 space-y-6">{children}</div>
    </section>
  )
}

export default function Checkout() {
  useSeo('checkout')
  const { t, lang } = useI18n()
  const cart = useCart()
  const menu = useMenu()
  const navigate = useNavigate()
  const [saved] = useState(loadDetails)
  const [form, setForm] = useState(() => ({ ...EMPTY, ...saved, phone: tidyPhoneInput(saved?.phone || '') }))
  const [remember, setRemember] = useState(true)
  const [dateMode, setDateMode] = useState('chip')
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const sending = useRef(false)

  // Worked out on every render, so a page left open past midnight moves on with the day
  const now = new Date()
  const earliest = earliestDate(now)
  const names = t('dates')

  if (!cart.lines.length && !sending.current) return <Navigate to="/cart" replace state={{ notice: 'checkoutEmpty' }} />

  const errors = checkoutErrors(form, now)
  const messageFor = (k) =>
    errors[k] && t(`checkout.errors.${k}.${errors[k]}`, { date: formatDay(earliest, names), days: site.ordering.maxDaysAhead, max: NOTE_MAX })
  const shown = (k) => (touched[k] || submitted ? messageFor(k) : undefined)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k) => () => setTouched((prev) => (prev[k] ? prev : { ...prev, [k]: true }))

  const delivery = cart.lines.length ? site.delivery.charge : 0
  const total = cart.subtotal + delivery
  const ready = cart.checked && Boolean(menu)
  const submitLabel = ready ? t('checkout.submit', { price: formatINR(total) }) : t('checkout.checkingPrices')

  const announce = (text) => {
    setAnnouncement('')
    requestAnimationFrame(() => setAnnouncement(text))
  }

  const focusField = (k) => {
    let el
    if (k === 'date') {
      el =
        dateMode === 'other'
          ? document.getElementById(`${DATE_NAME}-other`)
          : document.querySelector(`input[name="${DATE_NAME}"]:checked`) || document.querySelector(`input[name="${DATE_NAME}"]`)
      document.getElementById(`${DATE_NAME}-group`)?.scrollIntoView({ block: 'start' })
    } else {
      el = document.getElementById(`co-${k}`)
      el?.scrollIntoView({ block: 'center' })
    }
    el?.focus({ preventScroll: true })
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (sending.current || !ready) return
    setSubmitted(true)

    if (cart.unavailableIds.length) {
      const box = document.getElementById('co-unavailable')
      box?.scrollIntoView({ block: 'center' })
      box?.focus({ preventScroll: true })
      announce(t('cart.checkoutBlocked'))
      return
    }

    const at = new Date()
    const errs = checkoutErrors(form, at)
    const bad = CHECKOUT_FIELDS.filter((k) => errs[k])
    if (bad.length) {
      focusField(bad[0])
      const first = t(`checkout.errors.${bad[0]}.${errs[bad[0]]}`, { date: formatDay(earliestDate(at), names), days: site.ordering.maxDaysAhead, max: NOTE_MAX })
      announce(bad.length === 1 ? t('checkout.fixOne', { first }) : t('checkout.fixMany', { count: bad.length, first }))
      return
    }

    // Build the order and open WhatsApp right here in the tap, before anything async,
    // so phone browsers don't block the new tab.
    const order = buildOrder({ id: makeOrderId(at), now: at, lines: cart.lines, menu, form, lang })
    const opened = openWhatsApp(orderWhatsAppUrl(order))
    sending.current = true

    if (remember) saveDetails(form)
    else forgetDetails()
    markCartForClearing(order.id)
    // The success page empties the cart once the order is saved and the page has loaded
    createOrder(order).finally(() => navigate(`/order/${order.id}`, { state: { order, opened } }))
  }

  const noteLength = form.note.length

  return (
    <>
      <PageHero title={t('checkout.title')} subtitle={t('checkout.subtitle')} />
      <Container className="py-8 lg:py-12">
        <CartNotices id="co-unavailable" className="mb-8 max-w-[48rem]" />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-12 xl:grid-cols-[minmax(0,1fr)_27rem]">
          <div className="min-w-0 space-y-10">
            {/* Outside the <form>: the call-back sheet has its own form */}
            <CallOptions variant="feature" title={t('callOptions.checkoutTitle')} />

            <form id={FORM_ID} noValidate onSubmit={onSubmit} className="space-y-10">
              <Section title={t('checkout.sections.details')}>
                <TextField
                  id="co-name"
                  label={t('checkout.name')}
                  autoComplete="name"
                  autoCapitalize="words"
                  maxLength={NAME_MAX}
                  required
                  value={form.name}
                  onChange={set('name')}
                  onBlur={blur('name')}
                  error={shown('name')}
                />
                <PhoneField
                  id="co-phone"
                  label={t('checkout.phone')}
                  hint={t('checkout.phoneHint')}
                  required
                  value={form.phone}
                  onChange={set('phone')}
                  onBlur={() => {
                    blur('phone')()
                    setForm((f) => ({ ...f, phone: tidyPhoneInput(f.phone) }))
                  }}
                  error={shown('phone')}
                />
              </Section>

              <Section title={t('checkout.sections.address')} className="border-t border-line pt-10">
                <TextField
                  id="co-address"
                  as="textarea"
                  rows={3}
                  label={t('checkout.address')}
                  hint={t('checkout.addressHint')}
                  autoComplete="street-address"
                  maxLength={ADDRESS_MAX}
                  required
                  value={form.address}
                  onChange={set('address')}
                  onBlur={blur('address')}
                  error={shown('address')}
                />
                <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_14rem]">
                  <TextField
                    id="co-area"
                    label={t('checkout.area')}
                    hint={t('checkout.areaHint')}
                    autoComplete="address-level2"
                    maxLength={AREA_MAX}
                    required
                    value={form.area}
                    onChange={set('area')}
                    onBlur={blur('area')}
                    error={shown('area')}
                  />
                  <TextField
                    id="co-pincode"
                    label={t('checkout.pincode')}
                    hint={t('checkout.pincodeHint')}
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={7}
                    placeholder="560001"
                    required
                    value={form.pincode}
                    onChange={set('pincode')}
                    onBlur={blur('pincode')}
                    error={shown('pincode')}
                  />
                </div>
              </Section>

              <div className="space-y-6 border-t border-line pt-10">
                <DateChips
                  name={DATE_NAME}
                  choices={dateChoices(now)}
                  earliest={earliest}
                  latest={latestDate(now)}
                  value={form.date}
                  mode={dateMode}
                  onChange={({ date, mode }) => {
                    setDateMode(mode)
                    setForm((f) => ({ ...f, date }))
                    if (mode === 'chip') setTouched((prev) => ({ ...prev, date: true }))
                  }}
                  onOtherBlur={blur('date')}
                  error={shown('date')}
                />
                <Notice>
                  <p>{t('checkout.prebook', { days: site.ordering.dispatchAfterBusinessDays })}</p>
                </Notice>
              </div>

              <Section title={t('checkout.sections.note')} className="border-t border-line pt-10">
                <TextField
                  id="co-note"
                  as="textarea"
                  rows={3}
                  optional
                  label={t('checkout.noteLabel')}
                  hint={`${t('checkout.noteHint')} ${t('checkout.noteCount', { count: noteLength, max: NOTE_MAX })}`}
                  maxLength={NOTE_MAX}
                  value={form.note}
                  onChange={set('note')}
                  onBlur={blur('note')}
                  error={shown('note')}
                />
              </Section>
            </form>
          </div>

          <div className="min-w-0 space-y-8 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)] lg:max-h-[calc(100dvh-var(--header-h)-3rem)] lg:overflow-y-auto lg:overscroll-contain lg:p-1 lg:-m-1">
            <section aria-labelledby="co-summary" className="rounded-card bg-champagne p-5 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4">
                <h2 id="co-summary" className="t-h3">
                  {t('checkout.sections.summary')}
                </h2>
                <Link to="/cart" className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
                  {t('checkout.changeItems')}
                </Link>
              </div>
              <p className="t-small text-brown-2">{cart.count === 1 ? t('checkout.itemsOne') : t('checkout.items', { count: cart.count })}</p>
              <div className="mt-3">
                <SummaryLines lines={cart.lines} />
              </div>
              <dl className="mt-4 space-y-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-brown-2">{t('cart.subtotal')}</dt>
                  <dd className="font-bold tabular-nums">{formatINR(cart.subtotal)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-brown-2">{t('cart.deliveryKarnataka')}</dt>
                  <dd className="font-bold tabular-nums">{formatINR(delivery)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3">
                  <dt className="font-bold">{t('cart.total')}</dt>
                  <dd className="t-price" aria-live="polite">
                    {formatINR(total)}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby="co-payment">
              <h2 id="co-payment" className="t-h3">
                {t('checkout.sections.payment')}
              </h2>
              <p className="mt-3 flex gap-3">
                <WalletIcon className="mt-0.5 h-6 w-6 shrink-0" />
                <span>{t('checkout.payment')}</span>
              </p>
            </section>

            <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-control border-[1.5px] border-control-line bg-[#fffdf8] p-4 hover:border-brown-2">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                aria-describedby="co-remember-hint"
                className="mt-0.5 h-6 w-6 shrink-0 accent-ink"
              />
              <span>
                <span className="block leading-snug font-bold">{t('checkout.remember')}</span>
                <span id="co-remember-hint" className="t-small mt-1 block text-brown-2">
                  {t('checkout.rememberHint')}
                </span>
              </span>
            </label>

            <div className="hidden md:block">
              <Button type="submit" form={FORM_ID} variant="whatsapp" size="lg" fullWidth disabled={!ready}>
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </Container>

      <CheckoutBar formId={FORM_ID} label={submitLabel} disabled={!ready} />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </>
  )
}
