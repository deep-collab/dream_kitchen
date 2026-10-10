import { useState } from 'react'
import { adminCall, problem } from './api'
import { Btn, card, downloadText, ErrorText, Field, formatINR, input, Loading, PageTitle, useAdminData } from './ui'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
const monthStart = (d) => `${d.slice(0, 7)}-01`
const monthName = (m) => new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${m}-01T00:00:00Z`))
const shiftMonth = (m, n) => {
  const [y, mo] = m.split('-').map(Number)
  const d = new Date(Date.UTC(y, mo - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Reports: the month in numbers (orders, money, top 5 products, classes) and CSV downloads for any dates */
export default function Reports() {
  const [month, setMonth] = useState(today().slice(0, 7))
  const { data, error } = useAdminData(() => adminCall('monthly', { month }), [month])
  const [range, setRange] = useState({ from: monthStart(today()), to: today() })
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  const download = async (kind) => {
    setBusy(kind)
    setMsg('')
    const r = await adminCall('report', { kind, ...range })
    setBusy('')
    if (!r.ok) return setMsg(r.error === 'fields' ? 'The “From” date must be on or before the “To” date.' : problem(r))
    downloadText(r.data.filename, r.data.csv)
    setMsg(`Downloaded ${r.data.count} ${kind === 'bookings' ? 'class bookings' : 'orders'}. Open the file in Excel or Google Sheets.`)
  }

  return (
    <div className="space-y-5">
      <PageTitle>Reports</PageTitle>
      <section className={card}>
        <div className="flex items-center justify-between gap-2">
          <Btn tone="light" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="min-w-12 text-xl">
            ‹
          </Btn>
          <h2 className="t-h3 text-center">{monthName(month)}</h2>
          <Btn tone="light" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= today().slice(0, 7)} aria-label="Next month" className="min-w-12 text-xl">
            ›
          </Btn>
        </div>
        <ErrorText>{error}</ErrorText>
        {!data && !error && <Loading />}
        {data && (
          <div className="mt-3 space-y-4" data-admin-monthly>
            <dl className="grid grid-cols-2 gap-3">
              {[
                ['Paid orders', data.orders],
                ['Order money', formatINR(data.revenue)],
                ['Class bookings', data.bookings],
                ['Class money', formatINR(data.bookingRevenue)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-control bg-ink p-3 text-cream">
                  <dt className="t-small text-cream/80">{label}</dt>
                  <dd className="text-[1.5rem] font-bold text-gold-light tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="t-small text-brown-2">
              Order money includes {formatINR(data.courier)} courier charges. {data.unpaid} unpaid and {data.cancelled} cancelled orders are not counted.
            </p>
            <div>
              <h3 className="font-bold">Top 5 products</h3>
              {data.top.length === 0 ? (
                <p className="text-brown-2">No paid orders this month yet.</p>
              ) : (
                <ol className="mt-1 divide-y divide-line">
                  {data.top.map((t, i) => (
                    <li key={t.name} className="flex justify-between gap-3 py-2">
                      <span>
                        {i + 1}. {t.name}
                      </span>
                      <span className="font-bold tabular-nums">
                        {t.qty} sold · {formatINR(t.revenue)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        )}
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="t-h3">Download (CSV)</h2>
        <p className="t-small text-brown-2">Every order or class booking made between these dates, with all the details. Opens in Excel or Google Sheets.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="From">
            <input className={input} type="date" value={range.from} max={range.to} onChange={(e) => setRange({ ...range, from: e.target.value })} />
          </Field>
          <Field label="To">
            <input className={input} type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => download('orders')} disabled={Boolean(busy)} data-admin-download="orders">
            {busy === 'orders' ? 'Preparing…' : 'Download orders'}
          </Btn>
          <Btn onClick={() => download('bookings')} disabled={Boolean(busy)} data-admin-download="bookings">
            {busy === 'bookings' ? 'Preparing…' : 'Download class bookings'}
          </Btn>
        </div>
        {msg && (
          <p role="status" className="font-bold">
            {msg}
          </p>
        )}
      </section>
    </div>
  )
}
