import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adminCall } from './api'
import { BOOKING_WORDS, Btn, card, ErrorText, Field, formatINR, input, LinkBtn, Loading, PageTitle, Pill, SaveMessage, Tabs, useAdminData, useSave, weekendLabel, when, whatsappTo } from './ui'
import { formatPhone } from '../lib/validation'
import { WhatsAppIcon } from '../components/icons'

const TABS = [
  ['bookings', 'Bookings'],
  ['attendees', 'Who’s coming'],
  ['weekends', 'Weekends'],
  ['fees', 'Fees & times'],
]

/** Classes: bookings (filter by weekend and slot), who's coming per slot, blocking weekends or slots, and fees, times and seats */
export default function Classes() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : params.get('weekend') ? 'attendees' : 'bookings'
  const go = (k) => setParams({ tab: k, ...(params.get('weekend') ? { weekend: params.get('weekend') } : {}) })
  return (
    <div className="space-y-4">
      <PageTitle>Classes</PageTitle>
      <Tabs tabs={TABS} value={tab} onChange={go} label="Class screens" />
      {tab === 'bookings' && <Bookings params={params} setParams={setParams} />}
      {tab === 'attendees' && <Attendees params={params} setParams={setParams} />}
      {tab === 'weekends' && <Weekends />}
      {tab === 'fees' && <Fees />}
    </div>
  )
}

function WeekendSelect({ weekends, value, onChange, allowAll }) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block font-bold">Weekend</span>
      <select className="field-control" value={value} onChange={(e) => onChange(e.target.value)} data-admin-weekend>
        {allowAll && <option value="">All weekends</option>}
        {weekends.map((w) => (
          <option key={w} value={w}>
            {weekendLabel(w)}
          </option>
        ))}
      </select>
    </label>
  )
}

function Bookings({ params, setParams }) {
  const weekend = params.get('weekend') || ''
  const slot = params.get('slot') || 'all'
  const { data, error } = useAdminData(() => adminCall('bookings', { weekend, slot }), [weekend, slot], { every: 60_000 })
  const set = (k, v) => {
    const next = Object.fromEntries(params)
    if (v && v !== 'all') next[k] = v
    else delete next[k]
    next.tab = 'bookings'
    setParams(next)
  }
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  const slotLabel = (id) => data.slots.find((s) => s.id === id)?.label || id
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <WeekendSelect weekends={data.weekends} value={weekend} onChange={(v) => set('weekend', v)} allowAll />
        <label className="block flex-1">
          <span className="mb-1 block font-bold">Time slot</span>
          <select className="field-control" value={slot} onChange={(e) => set('slot', e.target.value)} data-admin-slot>
            <option value="all">Both slots</option>
            {data.slots.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {data.bookings.length === 0 && <p className="text-brown-2">No bookings here yet.</p>}
      <ul className="space-y-3">
        {data.bookings.map((b) => (
          <li key={b.code}>
            <Link to={`/classes/bookings/${b.code}`} className="block rounded-card border border-line bg-[#fffcf5] p-4 hover:border-ink" data-admin-booking={b.code}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-bold">{b.name}</p>
                <p className="t-price">{formatINR(b.fee)}</p>
              </div>
              <p>
                {b.className} class · {weekendLabel(b.weekend)} · {slotLabel(b.slot)}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={b.status === 'confirmed' ? 'good' : b.status === 'cancelled' ? 'bad' : b.paymentStatus === 'submitted' ? 'warn' : 'plain'}>
                  {b.status === 'pending' && b.paymentStatus === 'submitted' ? 'Payment to check' : BOOKING_WORDS[b.status]}
                </Pill>
                <span className="t-small text-brown-2">
                  {b.code} · booked {when(b.createdAt)}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Attendees({ params, setParams }) {
  const [weekends, setWeekends] = useState(null)
  const weekend = params.get('weekend') || ''
  const { data, error } = useAdminData(() => adminCall('attendees', weekend ? { weekend } : {}), [weekend], { every: 60_000 })
  useEffect(() => {
    adminCall('bookings', { q: '' }).then((r) => r.ok && setWeekends(r.data.weekends))
  }, [])
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  return (
    <div className="space-y-4">
      {weekends && <WeekendSelect weekends={weekends} value={data.weekend} onChange={(v) => setParams({ tab: 'attendees', weekend: v })} />}
      <p className="font-bold">{weekendLabel(data.weekend)} (both days)</p>
      {data.slots.map((s) => (
        <section key={s.id} className={card} data-admin-attendees={s.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="t-h3">{s.label}</h2>
            <p className="font-bold">{data.seats ? `${s.people.length} of ${data.seats} seats` : `${s.people.length} booked`}</p>
          </div>
          {s.blocked && <Pill tone="bad">Blocked</Pill>}
          {s.people.length === 0 ? (
            <p className="mt-2 text-brown-2">Nobody yet.</p>
          ) : (
            <ol className="mt-2 divide-y divide-line">
              {s.people.map((p, i) => (
                <li key={p.code} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-bold">
                      {i + 1}. {p.name}
                    </span>{' '}
                    <span className="t-small text-brown-2">
                      {p.className} · {formatPhone(p.phone)}
                    </span>
                    {!p.paid && (
                      <span className="ml-2">
                        <Pill tone="warn">Payment to check</Pill>
                      </span>
                    )}
                  </span>
                  <LinkBtn tone="whatsapp" href={whatsappTo(p.phone, `Hi ${p.name}, this is Hema from Dream Kitchen about your ${p.className} class on ${weekendLabel(p.weekend)}.`)} className="px-3">
                    <WhatsAppIcon className="h-5 w-5" /> <span className="sr-only">WhatsApp {p.name}</span>
                  </LinkBtn>
                </li>
              ))}
            </ol>
          )}
          {s.unpaid > 0 && <p className="t-small mt-2 text-brown-2">+ {s.unpaid} started booking in the last 30 minutes and may still pay.</p>}
        </section>
      ))}
      <Btn tone="light" onClick={() => window.print()}>
        Print this list
      </Btn>
    </div>
  )
}

function Weekends() {
  const { data, error, setData } = useAdminData(() => adminCall('schedule'), [])
  const save = useSave()
  const [asking, setAsking] = useState(null) // { weekend, slot }
  const [reason, setReason] = useState('')
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  const setBlock = (weekend, slot, blocked) =>
    save.run(async () => {
      const r = await adminCall('setBlock', { weekend, slot, blocked, reason })
      if (r.ok) {
        setData(r.data)
        setAsking(null)
        setReason('')
      }
      return r
    })
  const seatsText = (s) => (data.seats ? `${s.taken} of ${data.seats} seats` : `${s.taken} booked`)
  const ask = (weekend, slot) => (
    <div className="mt-2 space-y-2 rounded-control bg-champagne p-3">
      <Field label="Why? (optional, only you see it)">
        <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={120} placeholder="e.g. Holiday, Full" />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Btn tone="danger" onClick={() => setBlock(weekend, slot, true)} disabled={save.status === 'saving'} data-admin-confirm-block>
          {slot === '*' ? 'Close the whole weekend' : 'Close this slot'}
        </Btn>
        <Btn tone="light" onClick={() => setAsking(null)}>
          Never mind
        </Btn>
      </div>
    </div>
  )
  return (
    <div className="space-y-3">
      <p className="text-brown-2">Close a weekend (a holiday) or one slot (full). Customers can’t book closed ones. Existing bookings stay.</p>
      <SaveMessage save={save} />
      {data.weekends.map((w) => (
        <section key={w.weekend} className={`${card} ${w.blocked ? 'border-dashed opacity-90' : ''}`} data-admin-weekend-card={w.weekend}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">{weekendLabel(w.weekend)}</h2>
            {w.blocked ? (
              <Btn tone="go" onClick={() => setBlock(w.weekend, '*', false)} disabled={save.status === 'saving'}>
                Open the weekend
              </Btn>
            ) : (
              <Btn tone="light" onClick={() => setAsking({ weekend: w.weekend, slot: '*' })} data-admin-block-weekend>
                Close the weekend
              </Btn>
            )}
          </div>
          {w.blocked && <p className="font-bold text-error">Closed{w.reason ? `: ${w.reason}` : ''}</p>}
          {asking?.weekend === w.weekend && asking.slot === '*' && ask(w.weekend, '*')}
          <ul className="mt-2 divide-y divide-line">
            {w.slots.map((s) => {
              const label = data.slots.find((x) => x.id === s.id)?.label
              return (
                <li key={s.id} className="py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <span className="font-bold">{label}</span> <span className="t-small text-brown-2">· {seatsText(s)}</span>
                      {s.blocked && !w.blocked && <span className="t-small font-bold text-error"> · Closed{s.reason ? `: ${s.reason}` : ''}</span>}
                      {!s.blocked && s.seatsLeft === 0 && <span className="t-small font-bold"> · Full</span>}
                    </span>
                    {!w.blocked &&
                      (s.blocked ? (
                        <Btn tone="go" onClick={() => setBlock(w.weekend, s.id, false)} disabled={save.status === 'saving'}>
                          Open
                        </Btn>
                      ) : (
                        <Btn tone="light" onClick={() => setAsking({ weekend: w.weekend, slot: s.id })} data-admin-block-slot={s.id}>
                          Close
                        </Btn>
                      ))}
                  </div>
                  {asking?.weekend === w.weekend && asking.slot === s.id && ask(w.weekend, s.id)}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Fees() {
  const { data, error, setData } = useAdminData(() => adminCall('schedule'), [])
  const [form, setForm] = useState(null)
  const save = useSave()
  useEffect(() => {
    if (data && !form)
      setForm({
        fees: Object.fromEntries(data.classes.map((c) => [c.id, String(c.price)])),
        slots: Object.fromEntries(data.slots.map((s) => [s.id, { start: s.start, end: s.end }])),
        seats: data.seats == null ? '' : String(data.seats),
      })
  }, [data, form])
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data || !form) return <Loading />
  const err = (k) => (save.fields?.[k] ? 'Please check this.' : undefined)
  const submit = () =>
    save.run(async () => {
      const r = await adminCall('updateClassSettings', {
        fees: Object.fromEntries(Object.entries(form.fees).map(([k, v]) => [k, Number(v)])),
        slots: form.slots,
        seats: form.seats === '' ? null : Number(form.seats),
      })
      if (r.ok) setData(r.data)
      return r
    })
  return (
    <div className="space-y-5">
      <section className={`${card} space-y-3`}>
        <h2 className="t-h3">Class fees (₹)</h2>
        {data.classes.map((c) => (
          <Field key={c.id} label={`${c.name}${c.beginnerFriendly ? ' (beginner friendly)' : ''}`} error={err(`fee.${c.id}`)}>
            <input className={input} inputMode="numeric" value={form.fees[c.id]} onChange={(e) => setForm({ ...form, fees: { ...form.fees, [c.id]: e.target.value.replace(/\D/g, '') } })} data-admin-fee={c.id} />
          </Field>
        ))}
      </section>
      <section className={`${card} space-y-3`}>
        <h2 className="t-h3">Time slots</h2>
        <p className="t-small text-brown-2">The same on Saturday and Sunday.</p>
        {data.slots.map((s, i) => (
          <div key={s.id}>
            <p className="font-bold">Slot {i + 1}</p>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <Field label="Starts" error={err(`slot.${s.id}`)}>
                <input className={input} type="time" value={form.slots[s.id].start} onChange={(e) => setForm({ ...form, slots: { ...form.slots, [s.id]: { ...form.slots[s.id], start: e.target.value } } })} />
              </Field>
              <Field label="Ends">
                <input className={input} type="time" value={form.slots[s.id].end} onChange={(e) => setForm({ ...form, slots: { ...form.slots, [s.id]: { ...form.slots[s.id], end: e.target.value } } })} />
              </Field>
            </div>
          </div>
        ))}
      </section>
      <section className={`${card} space-y-3`}>
        <h2 className="t-h3">Seats per slot</h2>
        <Field label="How many people per slot" hint="Leave it empty for no limit; the website then shows no seat count." error={err('seats')}>
          <input className={input} inputMode="numeric" value={form.seats} onChange={(e) => setForm({ ...form, seats: e.target.value.replace(/\D/g, '') })} data-admin-seats />
        </Field>
      </section>
      <div className="sticky bottom-20 rounded-card bg-cream/95 py-2">
        <Btn tone="gold" className="w-full" onClick={submit} disabled={save.status === 'saving'} data-admin-save-classes>
          Save class settings
        </Btn>
        <div className="mt-2 text-center">
          <SaveMessage save={save} />
        </div>
      </div>
    </div>
  )
}
