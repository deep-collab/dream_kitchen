import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../i18n/I18nProvider'
import { useSeo } from '../hooks/useSeo'
import { classes as CLASSES } from '../data/classInfo'
import { waLink } from '../config/site'
import { formatINR } from '../lib/pricing'
import { BOOKING_MAX, bookingDetailsErrors, slotLabel, weekendText } from '../lib/classes'
import { tidyPhoneInput } from '../lib/validation'
import { classBookingText } from '../lib/whatsappText'
import { attemptKey, clearAttempt, loadDetails, rememberBooking } from '../lib/deviceStore'
import { errorText } from '../lib/api'
import { createBooking, getClasses } from '../services'
import Container from '../components/ui/Container'
import Button from '../components/ui/Button'
import TextField, { PhoneField } from '../components/ui/TextField'
import { RadioCard } from '../components/ui/RadioCard'
import { TotalBar } from '../components/checkout/CheckoutFrame'
import { AlertIcon, BackIcon } from '../components/icons'
import 'virtual:dk-strings/book'
import 'virtual:dk-strings/classes'
import 'virtual:dk-strings/cart'

const FIELDS = ['name', 'phone', 'email']

/**
 * Book a class on the website: class -> weekend (the next 8; closed and full ones can't be picked)
 * -> time slot -> name, mobile, email -> "Book and pay". The server checks the seat and the fee
 * again, saves the booking (DK-CL-…) and the booking page takes the payment. Until payments are
 * set up, or when nothing is open, it offers WhatsApp instead.
 */
export default function BookClass() {
  useSeo('book')
  const { t, pick, lang } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const names = t('dates')
  const [data, setData] = useState(undefined) // undefined = loading, null = couldn't load
  const [classId, setClassId] = useState(() => (CLASSES.some((c) => c.id === params.get('class')) ? params.get('class') : CLASSES[0].id))
  const [weekend, setWeekend] = useState('')
  const [slot, setSlot] = useState('')
  const [form, setForm] = useState(() => {
    const d = loadDetails()
    return { name: d?.name || '', phone: d?.phone || '', email: d?.email || '', website: '' }
  })
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(() => getClasses().then((r) => setData(r.ok ? r.data : null)), [])
  useEffect(() => {
    load()
  }, [load])

  const fee = data?.classes?.find((c) => c.id === classId)?.price ?? CLASSES.find((c) => c.id === classId).price
  const week = data?.weekends?.find((w) => w.weekend === weekend)
  const errors = bookingDetailsErrors(form)
  const msg = (k) => tried && errors[k] && t(`book.errors.${k}.${errors[k]}`)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const cls = CLASSES.find((c) => c.id === classId)

  if (data === undefined)
    return (
      <Container className="py-8">
        <p role="status" className="text-brown-2">
          {t('common.loading')}
        </p>
      </Container>
    )
  const open = data?.ready && data.open && data.weekends.some((w) => w.open)
  if (!open)
    return (
      <Container className="py-6 lg:py-10">
        <div className="max-w-xl space-y-4">
          <h1 className="t-h2">{t('book.title')}</h1>
          <p className="rounded-card bg-champagne p-4 font-bold" data-dk-book-closed>
            {t('book.noneOpen')}
          </p>
          <Button variant="whatsapp" size="lg" fullWidth href={waLink(classBookingText(cls))}>
            {t('classes.bookWhatsApp')}
            <span className="sr-only"> {t('common.newTab')}</span>
          </Button>
        </div>
      </Container>
    )

  const seatsText = (s) => (!data.showSeats || s.seatsLeft == null || !s.open ? null : s.seatsLeft === 1 ? t('book.seatsLeftOne') : t('book.seatsLeft', { n: s.seatsLeft }))
  const slotOf = (id) => data.slots.find((s) => s.id === id)

  const onSubmit = async (e) => {
    e.preventDefault()
    setTried(true)
    setError(null)
    if (!weekend) return document.getElementById('bk-weekend')?.focus()
    if (!slot) return document.getElementById('bk-slot')?.focus()
    const bad = FIELDS.find((k) => errors[k])
    if (bad) return document.getElementById(`bk-${bad}`)?.focus()
    const body = { classId, weekend, slot, name: form.name, phone: form.phone, email: form.email, expectedFee: fee, lang, website: form.website }
    body.idempotencyKey = attemptKey(JSON.stringify(body))
    setBusy(true)
    const r = await createBooking(body)
    setBusy(false)
    if (r.ok) {
      const b = r.data.booking
      rememberBooking(b.code, form.phone)
      clearAttempt()
      navigate(`/classes/booking/${b.code}`, { state: { booking: b } })
      return
    }
    if (r.error === 'slotFull' || r.error === 'slotGone') {
      setSlot('')
      load()
      setError(t(`book.${r.error}`))
    } else if (r.error === 'feeChanged') {
      load()
      setError(t('book.feeChanged', { price: formatINR(r.fee) }))
    } else setError(errorText(t, r))
  }

  return (
    <Container className="py-5 pb-48 lg:py-10">
      <Link to="/classes" className="inline-flex min-h-12 items-center gap-1 font-bold">
        <BackIcon className="h-5 w-5" /> {t('nav.classes')}
      </Link>
      <h1 className="t-h2">{t('book.title')}</h1>
      <p className="mt-1 text-brown-2">{t('book.lead')}</p>

      <form id="book-form" noValidate onSubmit={onSubmit} className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="min-w-0 space-y-8">
          <fieldset>
            <legend className="mb-3 text-[1.125rem] font-bold">{t('book.stepClass')}</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              {CLASSES.map((c) => (
                <RadioCard
                  key={c.id}
                  name="bk-class"
                  value={c.id}
                  checked={classId === c.id}
                  onChange={setClassId}
                  label={t('classes.cardTitle', { name: pick(c.name) })}
                  detail={c.beginnerFriendly ? t('classes.beginner') : undefined}
                  price={data.classes.find((x) => x.id === c.id)?.price ?? c.price}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend id="bk-weekend" tabIndex={-1} className="text-[1.125rem] font-bold outline-none">
              {t('book.stepWeekend')}
            </legend>
            <p className="t-small mb-3 text-brown-2">{t('book.stepWeekendHint')}</p>
            {tried && !weekend && (
              <p role="alert" className="mb-2 font-bold text-error">
                {t('book.chooseWeekend')}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {data.weekends.map((w) => (
                <RadioCard
                  key={w.weekend}
                  name="bk-weekend"
                  value={w.weekend}
                  checked={weekend === w.weekend}
                  disabled={!w.open}
                  onChange={(v) => {
                    setWeekend(v)
                    const s = data.weekends.find((x) => x.weekend === v).slots
                    if (!s.find((x) => x.id === slot)?.open) setSlot('')
                  }}
                  label={weekendText(w.weekend, names)}
                  detail={w.open ? undefined : w.slots.some((s) => s.seatsLeft === 0) ? t('book.full') : t('book.closed')}
                />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend id="bk-slot" tabIndex={-1} className="mb-3 text-[1.125rem] font-bold outline-none">
              {t('book.stepSlot')}
            </legend>
            {tried && weekend && !slot && (
              <p role="alert" className="mb-2 font-bold text-error">
                {t('book.chooseSlot')}
              </p>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {data.slots.map((s) => {
                const state = week?.slots.find((x) => x.id === s.id)
                const unavailable = week && !state?.open
                return (
                  <RadioCard
                    key={s.id}
                    name="bk-slot"
                    value={s.id}
                    checked={slot === s.id}
                    disabled={!week || unavailable}
                    onChange={setSlot}
                    label={slotLabel(s, lang, pick)}
                    detail={unavailable ? (state?.seatsLeft === 0 ? t('book.full') : t('book.closed')) : state ? seatsText(state) || undefined : undefined}
                  />
                )
              })}
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 text-[1.125rem] font-bold">{t('book.stepDetails')}</legend>
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label>
                Website
                <input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
              </label>
            </div>
            <TextField id="bk-name" label={t('book.name')} autoComplete="name" maxLength={BOOKING_MAX.name} value={form.name} onChange={set('name')} error={msg('name')} />
            <PhoneField id="bk-phone" label={t('book.phone')} value={form.phone} onChange={set('phone')} onBlur={() => setForm((f) => ({ ...f, phone: tidyPhoneInput(f.phone) }))} error={msg('phone')} />
            <TextField id="bk-email" type="email" inputMode="email" autoComplete="email" label={t('book.email')} hint={t('book.emailHint')} optional maxLength={BOOKING_MAX.email} value={form.email} onChange={set('email')} error={msg('email')} />
          </fieldset>
        </div>

        <aside className="lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          {weekend && slot && (
            <p className="mb-3 rounded-card bg-champagne p-4 font-bold" data-dk-book-summary>
              {t('book.summary', { class: pick(cls.name), weekend: weekendText(weekend, names), slot: slotLabel(slotOf(slot), lang, pick) })}
            </p>
          )}
          {error && (
            <p role="alert" className="mb-3 flex items-start gap-2 rounded-control border-[1.5px] border-error bg-error-bg p-3 font-bold">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0 text-error" />
              <span>{error}</span>
            </p>
          )}
          <TotalBar label={t('cart.total')} total={formatINR(fee)}>
            <Button type="submit" form="book-form" size="lg" fullWidth disabled={busy} aria-busy={busy || undefined} data-dk-book>
              {busy ? t('book.booking') : t('book.pay', { price: formatINR(fee) })}
            </Button>
          </TotalBar>
        </aside>
      </form>
    </Container>
  )
}
