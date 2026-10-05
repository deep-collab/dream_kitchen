import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminCall, problem } from './api'
import { Btn, day, Field, formatINR, input, PAYMENT_WORDS, paymentTone, Pill, SaveMessage, STATUS_WORDS, useSave, when } from './ui'
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

/**
 * One order: items with every choice (name text, drawing description, reference photo), address
 * with Copy, Call / WhatsApp the customer, the UTR to check, and one-tap status buttons. Every
 * change is logged (order_events) and shows on the customer's Track Order.
 */
export default function OrderDetail() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [asking, setAsking] = useState(null) // 'shipped' | 'cancel'
  const [form, setForm] = useState({ courierName: '', trackingNo: '', trackingUrl: '', reason: '' })
  const [notes, setNotes] = useState('')
  const [copied, setCopied] = useState(false)
  const save = useSave()
  const notesSave = useSave()

  const load = useCallback(async () => {
    const r = await adminCall('order', { code })
    if (r.ok) {
      setOrder(r.data.order)
      setNotes(r.data.order.adminNotes || '')
    } else setError(problem(r))
  }, [code])
  useEffect(() => {
    load()
  }, [load])

  if (error) return <p className="font-bold text-error">{error}</p>
  if (!order) return <p className="text-brown-2">Loading…</p>

  const act = async (step) => {
    if ((step === 'shipped' || step === 'cancel') && asking !== step) {
      setAsking(step)
      save.reset()
      return
    }
    const extra = step === 'shipped' ? { courierName: form.courierName, trackingNo: form.trackingNo, trackingUrl: form.trackingUrl } : step === 'cancel' ? { reason: form.reason } : {}
    const r = await save.run(() => adminCall('orderAction', { code, step, ...extra }))
    if (r.ok) {
      setOrder(r.data.order)
      setAsking(null)
    } else if (r.error === 'transition') load()
  }

  const a = order.address
  const addressText = [order.name, a.line1, a.line2, a.landmark, `${a.city} ${a.pincode}`, a.state, formatPhone(order.phone)].filter(Boolean).join('\n')
  const fieldErr = (k) => (save.fields?.[k] ? 'Please fill this in correctly.' : undefined)

  return (
    <div className="space-y-5">
      <Link
        to="/"
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
          <Pill tone={paymentTone(order.paymentStatus)}>{PAYMENT_WORDS[order.paymentStatus]}</Pill>
          <Pill tone={order.status === 'cancelled' ? 'bad' : 'plain'}>{STATUS_WORDS[order.status]}</Pill>
          {order.hasDrawing && <Pill tone="warn">Has a drawing</Pill>}
        </div>
      </div>

      {order.paymentStatus === 'submitted' && (
        <section className="rounded-card border-2 border-[#c99a00] bg-[#fdf6dc] p-4">
          <h2 className="font-bold">Payment to check</h2>
          <p className="mt-1">
            Customer says they paid <strong>{formatINR(order.total)}</strong>. UPI reference (UTR):
          </p>
          <p className="mt-1 text-[1.375rem] font-bold tracking-wider tabular-nums select-all" data-admin-utr>
            {order.utr}
          </p>
          <p className="t-small text-brown-2">Find this number in your bank or UPI app before tapping "Payment received".</p>
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
              <Field label="Why is it cancelled?" hint="The customer sees this on Track Order." error={fieldErr('reason')}>
                <input className={input} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={200} />
              </Field>
              <Btn tone="danger" onClick={() => act('cancel')} disabled={save.status === 'saving'}>
                Cancel this order
              </Btn>
            </div>
          )}
          <div className="mt-2">
            <SaveMessage save={save} />
          </div>
        </section>
      )}

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
            <dt>Items</dt>
            <dd>{formatINR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>
              Courier ({order.courierTier}, {order.zone === 'karnataka' ? 'Karnataka' : 'outside Karnataka'})
            </dt>
            <dd>{formatINR(order.courier)}</dd>
          </div>
          <div className="flex justify-between font-bold">
            <dt>Total</dt>
            <dd>{formatINR(order.total)}</dd>
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

      <section className="rounded-card border border-line bg-[#fffcf5] p-4">
        <h2 className="t-h3">Customer</h2>
        <pre className="mt-2 font-body whitespace-pre-wrap">{addressText}</pre>
        {order.email && <p className="t-small text-brown-2">{order.email}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Btn tone="light" onClick={async () => setCopied(await copyText(addressText))}>
            <CopyIcon className="h-5 w-5" /> {copied ? 'Address copied' : 'Copy address'}
          </Btn>
          <a href={`tel:+91${order.phone}`} className="inline-flex min-h-12 items-center gap-2 rounded-control bg-ink px-4 font-bold text-gold-light">
            <PhoneIcon className="h-5 w-5" /> Call
          </a>
          <a href={`https://wa.me/91${order.phone}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center gap-2 rounded-control bg-whatsapp px-4 font-bold text-white">
            <WhatsAppIcon className="h-5 w-5" /> WhatsApp
          </a>
        </div>
      </section>

      {order.trackingNo && (
        <section>
          <h2 className="t-h3">Courier</h2>
          <p>
            {order.courierName} · {order.trackingNo}
          </p>
          {order.trackingUrl && (
            <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">
              Tracking link
            </a>
          )}
        </section>
      )}
      {order.cancelReason && <p className="font-bold text-error">Cancelled: {order.cancelReason}</p>}

      <section>
        <Field label="Your notes (only you see these)">
          <textarea className={input} rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <div className="mt-2 flex items-center gap-3">
          <Btn tone="light" onClick={() => notesSave.run(() => adminCall('orderAction', { code, step: 'notes', notes }))}>
            Save notes
          </Btn>
          <SaveMessage save={notesSave} />
        </div>
      </section>

      <section>
        <h2 className="t-h3">History</h2>
        <ol className="t-small mt-2 space-y-1">
          {order.events.map((e) => (
            <li key={e.id}>
              <strong>{when(e.at)}</strong> · {e.kind === 'payment' ? 'Payment submitted' : STATUS_WORDS[e.to_status] || e.to_status} · {e.by}
              {e.note ? ` · ${e.note}` : ''}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
