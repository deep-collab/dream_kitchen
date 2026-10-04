import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/I18nProvider'
import { createClassBooking } from '../../services'
import { site, telLink } from '../../config/site'
import { makeBookingId } from '../../lib/bookingId'
import { BOOKING_FIELDS, bookingErrors, buildBooking, peopleLimit } from '../../lib/classes'
import { loadDetails } from '../../lib/deviceStore'
import { NAME_MAX } from '../../lib/order'
import { openWhatsApp } from '../../lib/openWhatsApp'
import { formatINR } from '../../lib/pricing'
import { tidyPhoneInput } from '../../lib/validation'
import { bookingWhatsAppUrl } from '../../lib/whatsappMessage'
import Sheet from '../ui/Sheet'
import Button from '../ui/Button'
import QuantityStepper from '../ui/QuantityStepper'
import { RadioCard } from '../ui/RadioCard'
import TextField, { PhoneField } from '../ui/TextField'
import { AlertIcon, PhoneIcon, PinIcon } from '../icons'
import { batchText, locationText, seatsText } from './classText'
import 'virtual:dk-strings/booking'
import 'virtual:dk-strings/checkout'

const FORM_ID = 'class-booking-form'

/**
 * "Book a seat": name, phone, date (batch) and number of people.
 * Sending builds the booking, opens WhatsApp inside the tap (before anything async,
 * so phone browsers allow it), saves a copy and goes to /classes/booked/:id, which
 * says "ready in WhatsApp" only if WhatsApp really opened.
 */
export default function BookingSheet({ cls, open, onClose }) {
  const { t, pick, lang } = useI18n()
  const navigate = useNavigate()
  const uid = useId()
  const [saved] = useState(loadDetails)
  const [form, setForm] = useState({ name: saved?.name || '', phone: tidyPhoneInput(saved?.phone || ''), batchId: '', people: 1 })
  const [touched, setTouched] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [announcement, setAnnouncement] = useState('')
  const [sending, setSending] = useState(false)

  if (!cls) return null
  const batch = cls.batches.find((b) => b.id === form.batchId)
  const max = batch ? peopleLimit(batch) : site.classes.peopleMax
  const errors = bookingErrors(form, cls.batches)
  const ids = { name: `${uid}-name`, phone: `${uid}-phone`, batch: `${uid}-batch`, people: `${uid}-people` }
  const message = (k) => errors[k] && t(`booking.errors.${k}.${errors[k]}`, { max })
  const shown = (k) => (submitted || touched[k] ? message(k) : undefined)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const blur = (k) => () => setTouched((s) => ({ ...s, [k]: true }))

  const chooseBatch = (id) => {
    const next = cls.batches.find((b) => b.id === id)
    setForm((f) => ({ ...f, batchId: id, people: Math.min(f.people, Math.max(1, peopleLimit(next))) }))
    setTouched((s) => ({ ...s, batch: true }))
  }

  const onSubmit = (e) => {
    e.preventDefault()
    if (sending) return
    setSubmitted(true)
    const bad = BOOKING_FIELDS.filter((k) => errors[k])
    if (bad.length) {
      const first = message(bad[0])
      document.getElementById(ids[bad[0]])?.focus()
      // Re-announce even when the same message repeats
      setAnnouncement('')
      requestAnimationFrame(() => setAnnouncement(bad.length === 1 ? t('checkout.fixOne', { first }) : t('checkout.fixMany', { count: bad.length, first })))
      return
    }
    const at = new Date()
    const booking = buildBooking({ id: makeBookingId(at), now: at, cls, batch, form, lang })
    const opened = openWhatsApp(bookingWhatsAppUrl(booking))
    setSending(true)
    createClassBooking(booking).finally(() => navigate(`/classes/booked/${booking.id}`, { state: { booking, opened } }))
  }

  const total = cls.price * form.people
  const footer = (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-bold">{t('booking.total')}</p>
        <p className="text-right">
          <span className="t-small mr-2 text-brown-2">{t('booking.totalFor', { count: form.people, price: formatINR(cls.price) })}</span>
          <span className="t-price" aria-live="polite">
            {formatINR(total)}
          </span>
        </p>
      </div>
      <Button type="submit" form={FORM_ID} variant="whatsapp" size="lg" fullWidth className="mt-3" disabled={sending}>
        {t('booking.submit', { price: formatINR(total) })}
      </Button>
      <a href={telLink} className="t-small mt-1 flex min-h-12 items-center justify-center gap-2 font-bold underline underline-offset-4">
        <PhoneIcon className="h-5 w-5" />
        {t('booking.call', { phone: site.phone.short })}
      </a>
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} title={pick(cls.title)} footer={footer}>
      <form id={FORM_ID} noValidate onSubmit={onSubmit} className="space-y-7">
        <fieldset id={ids.batch} tabIndex={-1} aria-describedby={shown('batch') ? `${ids.batch}-error` : undefined} className="scroll-mt-4 outline-none">
          <legend className="mb-3 text-[1.125rem] font-bold">{t('booking.batch')}</legend>
          {shown('batch') && (
            <p id={`${ids.batch}-error`} className="t-small mb-3 flex items-start gap-2 font-bold text-error">
              <AlertIcon className="mt-[0.15em] h-5 w-5 shrink-0" />
              {shown('batch')}
            </p>
          )}
          <div className="grid gap-3">
            {cls.batches.map((b) => (
              <RadioCard
                key={b.id}
                name={`${uid}-batch-choice`}
                value={b.id}
                checked={form.batchId === b.id}
                onChange={chooseBatch}
                label={batchText(b, t)}
                detail={seatsText(b, t)}
                disabled={b.seatsLeft < 1}
              />
            ))}
          </div>
        </fieldset>

        <div>
          <p id={`${ids.people}-label`} className="mb-1 text-[1.125rem] font-bold">
            {cls.ages ? t('booking.peopleKids') : t('booking.people')}
          </p>
          <p id={`${ids.people}-hint`} className="t-small mb-3 text-brown-2">
            {t('booking.peopleHint', { max })}
          </p>
          <div id={ids.people} tabIndex={-1} className="outline-none">
            <QuantityStepper value={form.people} min={1} max={Math.max(1, max)} onChange={(people) => setForm((f) => ({ ...f, people }))} label={cls.ages ? t('booking.peopleKids') : t('booking.people')} />
          </div>
          {shown('people') && (
            <p className="t-small mt-2 flex items-start gap-2 font-bold text-error">
              <AlertIcon className="mt-[0.15em] h-5 w-5 shrink-0" />
              {shown('people')}
            </p>
          )}
        </div>

        <TextField id={ids.name} label={t('booking.name')} autoComplete="name" maxLength={NAME_MAX} required value={form.name} onChange={set('name')} onBlur={blur('name')} error={shown('name')} />
        <PhoneField
          id={ids.phone}
          label={t('booking.phone')}
          hint={t('booking.phoneHint')}
          required
          value={form.phone}
          onChange={set('phone')}
          onBlur={() => {
            blur('phone')()
            setForm((f) => ({ ...f, phone: tidyPhoneInput(f.phone) }))
          }}
          error={shown('phone')}
        />

        <div className="space-y-2 rounded-card bg-champagne p-4">
          <p className="flex items-start gap-2">
            <PinIcon className="mt-0.5 h-5 w-5 shrink-0" />
            {locationText(cls.mode, t)}
          </p>
          <p className="t-small text-brown-2">{t('booking.payNote')}</p>
        </div>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </form>
    </Sheet>
  )
}
