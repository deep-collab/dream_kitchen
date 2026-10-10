import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { adminCall } from './api'
import { BOOKING_WORDS, Btn, card, ErrorText, Field, formatINR, input, LinkBtn, Loading, PAYMENT_WORDS, Pill, SaveMessage, useAdminData, useSave, weekendLabel, when, whatsappTo } from './ui'
import { formatPhone } from '../lib/validation'
import { BackIcon, PhoneIcon, WhatsAppIcon } from '../components/icons'

/** One class booking: who, which class, weekend and slot, the payment, and Payment received / Cancel */
export default function BookingDetail() {
  const { code } = useParams()
  const { data, error, setData, reload } = useAdminData(() => adminCall('booking', { code }), [code])
  const b = data?.booking
  const [cancelling, setCancelling] = useState(false)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState(null)
  const save = useSave()
  const notesSave = useSave()
  if (error) return <ErrorText>{error}</ErrorText>
  if (!b) return <Loading />

  const act = async (step) => {
    if (step === 'cancel' && !cancelling) return setCancelling(true)
    const r = await save.run(() => adminCall('bookingAction', { code, step, reason }), b.email ? 'Saved. The customer has been emailed.' : 'Saved')
    if (r.ok) {
      setData({ booking: r.data.booking })
      setCancelling(false)
    } else if (r.error === 'transition') reload()
  }
  return (
    <div className="space-y-5">
      <Link to="/classes" className="inline-flex min-h-12 items-center gap-1 font-bold">
        <BackIcon className="h-5 w-5" /> Classes
      </Link>
      <div>
        <h1 className="t-h2">{b.name}</h1>
        <p className="text-brown-2 tabular-nums">
          {b.code} · booked {when(b.createdAt)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Pill tone={b.status === 'confirmed' ? 'good' : b.status === 'cancelled' ? 'bad' : 'warn'}>{BOOKING_WORDS[b.status]}</Pill>
          <Pill>{PAYMENT_WORDS[b.paymentStatus]}</Pill>
        </div>
      </div>

      <section className={card}>
        <dl className="space-y-1">
          <div className="flex flex-wrap justify-between gap-2">
            <dt>Class</dt>
            <dd className="font-bold">{b.className}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt>Weekend</dt>
            <dd className="font-bold">{weekendLabel(b.weekend)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt>Time (both days)</dt>
            <dd className="font-bold">{b.slotText}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt>Fee</dt>
            <dd className="font-bold">{formatINR(b.fee)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt>Paid by</dt>
            <dd className="font-bold">{b.paymentMethod === 'razorpay' ? 'Razorpay' : 'UPI to your account'}</dd>
          </div>
          {b.razorpayPaymentId && (
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Razorpay payment ID</dt>
              <dd className="font-bold break-all select-all">{b.razorpayPaymentId}</dd>
            </div>
          )}
          {b.utr && (
            <div className="flex flex-wrap justify-between gap-2">
              <dt>UPI reference</dt>
              <dd className="text-[1.25rem] font-bold tabular-nums select-all">{b.utr}</dd>
            </div>
          )}
        </dl>
        {b.paymentStatus === 'submitted' && <p className="mt-2 rounded-control bg-[#fdf6dc] p-3 font-bold">Find this UPI reference in your bank app, then tap “Payment received”.</p>}
      </section>

      {b.actions.length > 0 && (
        <section className="rounded-card bg-champagne p-4">
          <h2 className="font-bold">Next step</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {b.actions.includes('paymentReceived') && (
              <Btn tone="go" onClick={() => act('paymentReceived')} disabled={save.status === 'saving'} data-admin-booking-action="paymentReceived">
                Payment received
              </Btn>
            )}
            {b.actions.includes('cancel') && (
              <Btn tone="danger" onClick={() => act('cancel')} disabled={save.status === 'saving'} data-admin-booking-action="cancel">
                Cancel booking
              </Btn>
            )}
          </div>
          {cancelling && (
            <div className="mt-3 space-y-3 rounded-control bg-cream p-3">
              <Field label="Why is it cancelled?" hint="The customer sees this in the email." error={save.fields?.reason ? 'Please write a short reason.' : undefined}>
                <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
              </Field>
              {b.paymentStatus === 'confirmed' && <p className="t-small font-bold">This booking was paid: refund it in the Razorpay dashboard (or your bank app for UPI).</p>}
              <Btn tone="danger" onClick={() => act('cancel')} disabled={save.status === 'saving'}>
                Cancel this booking
              </Btn>
            </div>
          )}
          <div className="mt-2">
            <SaveMessage save={save} />
          </div>
        </section>
      )}
      {b.cancelReason && <p className="font-bold text-error">Cancelled: {b.cancelReason}</p>}

      <section className={card}>
        <h2 className="t-h3">Contact</h2>
        <p className="mt-1">{formatPhone(b.phone)}</p>
        {b.email && <p className="t-small text-brown-2">{b.email}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={`tel:+91${b.phone}`} className="inline-flex min-h-12 items-center gap-2 rounded-control bg-ink px-4 font-bold text-gold-light">
            <PhoneIcon className="h-5 w-5" /> Call
          </a>
          <LinkBtn tone="whatsapp" href={whatsappTo(b.phone, `Hi ${b.name}, this is Hema from Dream Kitchen about your ${b.className} class booking ${b.code}.`)}>
            <WhatsAppIcon className="h-5 w-5" /> WhatsApp
          </LinkBtn>
        </div>
      </section>

      <section>
        <Field label="Your notes (only you see these)">
          <textarea className={input} rows={2} maxLength={1000} value={notes ?? b.adminNotes ?? ''} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Btn tone="light" onClick={() => notesSave.run(() => adminCall('bookingAction', { code, step: 'notes', notes: notes ?? b.adminNotes ?? '' }))}>
            Save notes
          </Btn>
          <SaveMessage save={notesSave} />
        </div>
      </section>

      <section>
        <h2 className="t-h3">History</h2>
        <ol className="t-small mt-2 space-y-1">
          {b.events.map((e) => (
            <li key={e.id}>
              <strong>{when(e.at)}</strong> · {e.kind === 'payment' ? 'UPI reference given' : BOOKING_WORDS[e.to_status] || e.to_status} · {e.by}
              {e.note ? ` · ${e.note}` : ''}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
