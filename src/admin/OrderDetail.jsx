import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminCall } from './api'
import { Btn, card, day, ErrorText, Field, formatINR, input, LinkBtn, Loading, PAYMENT_WORDS, paymentTone, Pill, SaveMessage, STATUS_WORDS, useAdminData, useSave, when, whatsappTo } from './ui'
import { copyText } from '../lib/clipboard'
import { formatPhone } from '../lib/validation'
import { BackIcon, CopyIcon, PhoneIcon, WhatsAppIcon } from '../components/icons'

const ACTION_WORDS = {
  paymentReceived: 'Payment received',
  preparing: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancel: 'Cancel order',
}
const EVENT_WORDS = { ...STATUS_WORDS, submitted: 'UPI reference given', payment_confirmed: 'Payment received' }

/**
 * One order: what to make (every choice, the name on the box, the drawing and its photo), where it
 * goes (Copy address), how it was paid, one-tap status buttons (each one is logged, shows on the
 * customer's Track Order and is emailed to them), the refund note, notes and the history.
 */
export default function OrderDetail() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { data, error, reload, setData } = useAdminData(() => adminCall('order', { code }), [code])
  const order = data?.order
  const [asking, setAsking] = useState(null) // 'shipped' | 'cancel'
  const [form, setForm] = useState({ courierName: '', trackingNo: '', trackingUrl: '', reason: '' })
  const [notes, setNotes] = useState(null)
  const [refund, setRefund] = useState(null)
  const [copied, setCopied] = useState(false)
  const save = useSave()
  const notesSave = useSave()
  const refundSave = useSave()

  if (error) return <ErrorText>{error}</ErrorText>
  if (!order) return <Loading />

  const act = async (step) => {
    if ((step === 'shipped' || step === 'cancel') && asking !== step) {
      setAsking(step)
      save.reset()
      return
    }
    const extra = step === 'shipped' ? { courierName: form.courierName, trackingNo: form.trackingNo, trackingUrl: form.trackingUrl } : step === 'cancel' ? { reason: form.reason } : {}
    let emailed = false
    const r = await save.run(async () => {
      const res = await adminCall('orderAction', { code, step, ...extra })
      emailed = res.ok && res.data.emailed
      return res
    }, 'Saved')
    if (r.ok) {
      setData({ order: r.data.order })
      setAsking(null)
      if (emailed) save.run(async () => ({ ok: true }), 'Saved. The customer has been emailed.')
    } else if (r.error === 'transition') reload()
  }

  const a = order.address
  const addressText = [order.name, a.line1, a.line2, a.landmark, `${a.city} ${a.pincode}`, a.state, formatPhone(order.phone)].filter(Boolean).join('\n')
  const fieldErr = (k) => (save.fields?.[k] ? 'Please fill this in correctly.' : undefined)
  const waText = `Hi ${order.name}, this is Hema from Dream Kitchen about your order ${order.code}.`

  return (
    <div className="space-y-5">
      <Link
        to="/orders"
        onClick={(e) => {
          // Back to the same tab of the list when she came from it
          if (window.history.state?.idx > 0) {
            e.preventDefault()
            navigate(-1)
          }
        }}
        className="inline-flex min-h-12 items-center gap-1 font-bold"
      >
        <BackIcon className="h-5 w-5" /> Orders
      </Link>
      <div>
        <h1 className="t-h2 tabular-nums">{order.code}</h1>
        <p className="text-brown-2">Ordered {when(order.createdAt)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {order.status !== 'payment_confirmed' && <Pill tone={paymentTone(order.paymentStatus)}>{PAYMENT_WORDS[order.paymentStatus]}</Pill>}
          <Pill tone={order.status === 'cancelled' ? 'bad' : 'dark'}>{STATUS_WORDS[order.status]}</Pill>
          {order.hasDrawing && <Pill tone="warn">Has a drawing</Pill>}
        </div>
      </div>

      {order.paymentStatus === 'submitted' && (
        <section className="rounded-card border-2 border-[#c99a00] bg-[#fdf6dc] p-4">
          <h2 className="font-bold">UPI payment to check</h2>
          <p className="mt-1">
            Customer says they paid <strong>{formatINR(order.total)}</strong>. UPI reference (UTR):
          </p>
          <p className="mt-1 text-[1.375rem] font-bold tracking-wider tabular-nums select-all" data-admin-utr>
            {order.utr}
          </p>
          <p className="t-small text-brown-2">Find this number in your bank or UPI app before tapping “Payment received”.</p>
          {order.screenshotUrl && (
            <a href={order.screenshotUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-bold underline">
              <img src={order.screenshotUrl} alt="Payment screenshot" className="mt-1 max-h-64 rounded-control border border-line" />
              Open the screenshot
            </a>
          )}
        </section>
      )}

      {order.actions.length > 0 && (
        <section className="rounded-card bg-champagne p-4">
          <h2 className="font-bold">Next step</h2>
          {order.status === 'placed' && order.paymentStatus === 'pending' && (
            <p className="t-small mt-1 text-brown-2">{order.paymentMethod === 'razorpay' ? 'Not paid yet. Online payments mark themselves as paid; tap “Payment received” only if you see it in your Razorpay dashboard.' : 'Not paid yet.'}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {order.actions.map((step) => (
              <Btn key={step} tone={step === 'cancel' ? 'danger' : step === 'paymentReceived' ? 'go' : 'dark'} onClick={() => act(step)} disabled={save.status === 'saving'} data-admin-action={step}>
                {ACTION_WORDS[step]}
              </Btn>
            ))}
          </div>
          {asking === 'shipped' && (
            <div className="mt-3 space-y-3 rounded-control bg-cream p-3">
              <Field label="Courier name" error={fieldErr('courierName')}>
                <input className={input} value={form.courierName} onChange={(e) => setForm({ ...form, courierName: e.target.value })} placeholder="e.g. DTDC, India Post" maxLength={40} />
              </Field>
              <Field label="Tracking number" error={fieldErr('trackingNo')}>
                <input className={input} value={form.trackingNo} onChange={(e) => setForm({ ...form, trackingNo: e.target.value })} maxLength={40} />
              </Field>
              <Field label="Tracking link (optional)" hint="Paste the courier's tracking page, starting with https://" error={fieldErr('trackingUrl')}>
                <input className={input} type="url" value={form.trackingUrl} onChange={(e) => setForm({ ...form, trackingUrl: e.target.value })} maxLength={300} />
              </Field>
              <Btn onClick={() => act('shipped')} disabled={save.status === 'saving'} data-admin-confirm="shipped">
                Save as shipped
              </Btn>
            </div>
          )}
          {asking === 'cancel' && (
            <div className="mt-3 space-y-3 rounded-control bg-cream p-3">
              <Field label="Why is it cancelled?" hint="The customer sees this on Track Order and in the email." error={fieldErr('reason')}>
                <input className={input} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={200} />
              </Field>
              {order.paymentStatus === 'confirmed' && <p className="t-small font-bold">This order was paid. Refunds are made in the Razorpay dashboard (or your bank app for UPI); write what you did in “Refund note” below.</p>}
              <Btn tone="danger" onClick={() => act('cancel')} disabled={save.status === 'saving'} data-admin-confirm="cancel">
                Cancel this order
              </Btn>
            </div>
          )}
          <div className="mt-2">
            <SaveMessage save={save} />
          </div>
        </section>
      )}
      {order.actions.length === 0 && save.status !== 'idle' && <SaveMessage save={save} />}

      <div className="flex flex-wrap gap-2">
        <LinkBtn tone="light" to={`/orders/${order.code}/slip`} data-admin-slip>
          Print packing slip
        </LinkBtn>
      </div>

      <section>
        <h2 className="t-h3">Items</h2>
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {order.items.map((i, n) => (
            <li key={n} className="py-3">
              <div className="flex justify-between gap-3">
                <p className="font-bold">
                  {i.name.en} × {i.qty}
                </p>
                <p className="font-bold tabular-nums">{formatINR(i.lineTotal)}</p>
              </div>
              <ul className="t-small mt-1 space-y-0.5">
                {i.size && <li>Size: {i.size.label}</li>}
                {i.ragi && <li>Ragi version</li>}
                {i.nameOnBox && (
                  <li>
                    Name on the box: <strong className="text-[1.0625rem]">“{i.nameOnBox}”</strong>
                  </li>
                )}
                {i.drawing && (
                  <li>
                    Drawing: <strong>{i.drawingText}</strong>
                  </li>
                )}
              </ul>
              {i.drawingRefUrl && (
                <a href={i.drawingRefUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
                  <img src={i.drawingRefUrl} alt="Reference photo for the drawing" className="max-h-48 rounded-control border border-line" />
                  <span className="t-small font-bold underline">Open the reference photo</span>
                </a>
              )}
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1">
          <div className="flex justify-between">
            <dt>Items (subtotal)</dt>
            <dd className="tabular-nums">{formatINR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>
              Courier ({order.courierTier === 'xl' ? '750 g' : order.courierTier === 'large' ? '500–700 g' : '250 g'}, {order.zone === 'karnataka' ? 'Karnataka' : 'outside Karnataka'})
            </dt>
            <dd className="tabular-nums">{formatINR(order.courier)}</dd>
          </div>
          <div className="flex justify-between font-bold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatINR(order.total)}</dd>
          </div>
        </dl>
        <p className="mt-2">
          Dispatch on <strong>{day(order.dispatchDate)}</strong>
        </p>
        {order.notes && (
          <p className="mt-2 rounded-control bg-champagne p-3">
            <strong>Customer’s note:</strong> {order.notes}
          </p>
        )}
      </section>

      <section className={card}>
        <h2 className="t-h3">Payment</h2>
        <dl className="mt-2 space-y-1">
          <div className="flex flex-wrap justify-between gap-2">
            <dt>Paid by</dt>
            <dd className="font-bold">{order.paymentMethod === 'razorpay' ? 'Razorpay (card, UPI or net banking)' : 'UPI to your account'}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt>Status</dt>
            <dd className="font-bold">{PAYMENT_WORDS[order.paymentStatus]}</dd>
          </div>
          {order.razorpayPaymentId && (
            <div className="flex flex-wrap justify-between gap-2">
              <dt>Razorpay payment ID</dt>
              <dd className="font-bold break-all select-all" data-admin-razorpay-id>
                {order.razorpayPaymentId}
              </dd>
            </div>
          )}
          {order.utr && (
            <div className="flex flex-wrap justify-between gap-2">
              <dt>UPI reference</dt>
              <dd className="font-bold tabular-nums select-all">{order.utr}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className={card}>
        <h2 className="t-h3">Customer</h2>
        <pre className="mt-2 font-body whitespace-pre-wrap" data-admin-address>
          {addressText}
        </pre>
        {order.email && <p className="t-small text-brown-2">{order.email}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn tone="light" onClick={async () => setCopied(await copyText(addressText))} data-admin-copy-address>
            <CopyIcon className="h-5 w-5" /> {copied ? 'Address copied' : 'Copy address'}
          </Btn>
          <a href={`tel:+91${order.phone}`} className="inline-flex min-h-12 items-center gap-2 rounded-control bg-ink px-4 font-bold text-gold-light">
            <PhoneIcon className="h-5 w-5" /> Call
          </a>
          <LinkBtn tone="whatsapp" href={whatsappTo(order.phone, waText)} data-admin-whatsapp>
            <WhatsAppIcon className="h-5 w-5" /> WhatsApp
          </LinkBtn>
        </div>
      </section>

      {order.trackingNo && (
        <section>
          <h2 className="t-h3">Courier</h2>
          <p>
            {order.courierName} · {order.trackingNo}
          </p>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center font-bold underline">
              Tracking link
            </a>
          )}
        </section>
      )}
      {order.cancelReason && <p className="font-bold text-error">Cancelled: {order.cancelReason}</p>}

      <section>
        <Field label="Refund note" hint="Refunds are made in the Razorpay dashboard. Write here what you refunded and when; it is saved in the history.">
          <input className={input} maxLength={300} value={refund ?? order.refundNote} onChange={(e) => setRefund(e.target.value)} data-admin-refund />
        </Field>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Btn
            tone="light"
            onClick={() =>
              refundSave.run(async () => {
                const r = await adminCall('orderAction', { code, step: 'refundNote', refundNote: refund ?? order.refundNote })
                if (r.ok) setData({ order: r.data.order })
                return r
              })
            }
          >
            Save refund note
          </Btn>
          <SaveMessage save={refundSave} />
        </div>
      </section>

      <section>
        <Field label="Your notes (only you see these)">
          <textarea className={input} rows={3} maxLength={1000} value={notes ?? order.adminNotes ?? ''} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Btn tone="light" onClick={() => notesSave.run(() => adminCall('orderAction', { code, step: 'notes', notes: notes ?? order.adminNotes ?? '' }))}>
            Save notes
          </Btn>
          <SaveMessage save={notesSave} />
        </div>
      </section>

      <section>
        <h2 className="t-h3">History</h2>
        <p className="t-small text-brown-2">The customer sees these steps on Track Order.</p>
        <ol className="t-small mt-2 space-y-1" data-admin-history>
          {order.events.map((e) => (
            <li key={e.id}>
              <strong>{when(e.at)}</strong> · {e.kind === 'note' ? 'Note' : EVENT_WORDS[e.to_status] || e.to_status} · {e.by}
              {e.note ? ` · ${e.note}` : ''}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
