import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useCart } from '../context/CartProvider'
import { useShopStatus } from '../context/MenuProvider'
import { useSeo } from '../hooks/useSeo'
import { useCartQuote } from '../hooks/useCartQuote'
import { states } from '../data/states'
import { DETAIL_FIELDS, detailsErrors, MAX } from '../lib/checkout'
import { formatINR, stateMismatch, zoneForPincode } from '../lib/pricing'
import { tidyPhoneInput } from '../lib/validation'
import { forgetDetails, loadDetails, loadDraft, saveDetails, saveDraft } from '../lib/deviceStore'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import Notice from '../components/ui/Notice'
import TextField, { PhoneField } from '../components/ui/TextField'
import { CheckoutProgress, TotalBar } from '../components/checkout/CheckoutFrame'
import { AlertIcon, InfoIcon } from '../components/icons'
import 'virtual:dk-strings/checkout'
import 'virtual:dk-strings/cart'

const EMPTY = Object.fromEntries(DETAIL_FIELDS.map((k) => [k, '']))

/**
 * Checkout step 1 of 3: the customer's details. Remembered on this phone (with "Not you? Clear").
 * The checks are the same ones the server makes (src/lib/checkout.js).
 */
export default function Checkout() {
  useSeo('checkout')
  const { t, pick } = useI18n()
  const cart = useCart()
  const navigate = useNavigate()
  const { settings } = useShopStatus()
  const [initial] = useState(() => {
    const draft = loadDraft()
    const saved = loadDetails()
    return { form: { ...EMPTY, ...saved, ...draft?.form }, remember: draft?.remember ?? true, prefilled: Boolean(saved?.name) }
  })
  const [form, setForm] = useState(() => ({ ...initial.form, phone: tidyPhoneInput(initial.form.phone || '') }))
  const [remember, setRemember] = useState(initial.remember)
  const [prefilled, setPrefilled] = useState(initial.prefilled)
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [cleared, setCleared] = useState(false)

  const zone = zoneForPincode(form.pincode)
  const q = useCartQuote(zone)

  if (!cart.lines.length) return <Navigate to="/cart" replace state={{ notice: 'checkoutEmpty' }} />
  if (cart.unavailableIds.length) return <Navigate to="/cart" replace />

  const errors = detailsErrors(form)
  const message = (k) => errors[k] && t(`checkout.errors.${k}.${errors[k]}`, { max: MAX[k] })
  const shown = (k) => (touched[k] || submitted ? message(k) : undefined)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k) => () => setTouched((p) => (p[k] ? p : { ...p, [k]: true }))
  const mismatch = !errors.pincode && !errors.state && stateMismatch(form.state, zone)
  const stateLabel = pick(states.find((s) => s.id === form.state)?.name || { en: '' })

  const announce = (text) => {
    setAnnouncement('')
    requestAnimationFrame(() => setAnnouncement(text))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    setSubmitted(true)
    const bad = DETAIL_FIELDS.filter((k) => errors[k])
    if (bad.length) {
      const el = document.getElementById(`co-${bad[0]}`)
      el?.scrollIntoView({ block: 'center' })
      el?.focus({ preventScroll: true })
      const first = message(bad[0])
      announce(bad.length === 1 ? t('checkout.fixOne', { first }) : t('checkout.fixMany', { count: bad.length, first }))
      return
    }
    if (remember) saveDetails(form)
    else forgetDetails()
    saveDraft({ ...loadDraft(), form, remember })
    navigate('/checkout/review')
  }

  const clearDetails = () => {
    forgetDetails()
    setForm({ ...EMPTY, note: form.note })
    setPrefilled(false)
    setTouched({})
    setSubmitted(false)
    setCleared(true)
    document.getElementById('co-name')?.focus()
  }

  const field = (k, props = {}) => ({ id: `co-${k}`, value: form[k], onChange: set(k), onBlur: blur(k), error: shown(k), maxLength: MAX[k], ...props })

  return (
    <Container className="py-5 pb-40 lg:py-10">
      <CheckoutProgress step={1} />
      <h1 className="t-h2">{t('checkout.title')}</h1>

      {prefilled && (
        <p className="t-small mt-2 flex flex-wrap items-center gap-x-2">
          <span>{t('checkout.welcomeBack', { name: form.name.split(' ')[0] })}</span>
          <button type="button" onClick={clearDetails} className="inline-flex min-h-12 items-center font-bold underline underline-offset-4">
            {t('checkout.notYou')}
          </button>
        </p>
      )}
      {cleared && (
        <p role="status" className="t-small mt-2 font-bold">
          {t('checkout.cleared')}
        </p>
      )}

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <form id="co-form" noValidate onSubmit={onSubmit} className="min-w-0 space-y-5">
          {/* Honeypot: hidden from people, filled in by bots; the server refuses those orders */}
          <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label>
              Website
              <input tabIndex={-1} autoComplete="off" value={form.website || ''} onChange={set('website')} />
            </label>
          </div>

          <TextField label={t('checkout.name')} autoComplete="name" autoCapitalize="words" required {...field('name')} />
          <PhoneField
            label={t('checkout.phone')}
            hint={t('checkout.phoneHint')}
            required
            {...field('phone', {
              maxLength: 16,
              onBlur: () => {
                blur('phone')()
                setForm((f) => ({ ...f, phone: tidyPhoneInput(f.phone) }))
              },
            })}
          />
          <TextField label={t('checkout.email')} hint={t('checkout.emailHint')} type="email" inputMode="email" autoComplete="email" optional {...field('email')} />
          <TextField label={t('checkout.line1')} autoComplete="address-line1" required {...field('line1')} />
          <TextField label={t('checkout.line2')} autoComplete="address-line2" required {...field('line2')} />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField label={t('checkout.city')} autoComplete="address-level2" required {...field('city')} />
            <TextField label={t('checkout.pincode')} inputMode="numeric" autoComplete="postal-code" placeholder="560001" required {...field('pincode', {
                  maxLength: 7,
                  // A Karnataka pincode fills in the state (one less thing to choose); never overrides a choice
                  onBlur: () => {
                    blur('pincode')()
                    setForm((f) => (!f.state && zoneForPincode(f.pincode) === 'karnataka' ? { ...f, state: 'karnataka' } : f))
                  },
                })} />
          </div>
          <TextField as="select" label={t('checkout.state')} autoComplete="address-level1" required {...field('state', { maxLength: undefined })}>
            <option value="">{t('checkout.statePick')}</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {pick(s.name)}
              </option>
            ))}
          </TextField>
          {mismatch && (
            <p role="status" className="flex items-start gap-2 rounded-control border-[1.5px] border-error bg-error-bg p-3 font-bold">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-error" />
              <span>{t('checkout.stateMismatch', { pincode: form.pincode.trim(), zone: t(`checkout.zone.${zone}`), state: stateLabel })}</span>
            </p>
          )}
          <TextField label={t('checkout.landmark')} optional {...field('landmark')} />
          <TextField
            as="textarea"
            rows={2}
            label={t('checkout.note')}
            optional
            hint={t('checkout.noteHint', { count: form.note.length, max: MAX.note })}
            {...field('note')}
          />
          <label className="flex min-h-12 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="h-6 w-6 shrink-0 accent-ink" />
            <span className="font-bold">{t('checkout.remember')}</span>
          </label>
        </form>

        <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <Notice icon={InfoIcon} className="hidden lg:flex">
            <p className="t-small">{t('cart.dispatch', { days: settings.leadTimes.standardBusinessDays })}</p>
          </Notice>
          <TotalBar label={zone ? t('cart.total') : t('cart.subtotal')} total={zone ? formatINR(q.total) : t('cart.totalPlusCourier', { price: formatINR(q.subtotal) })}>
            <Button type="submit" form="co-form" size="lg" fullWidth data-dk-next>
              {t('checkout.toReview')}
            </Button>
          </TotalBar>
        </aside>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </Container>
  )
}
