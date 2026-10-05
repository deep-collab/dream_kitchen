import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adminCall, problem } from './api'
import { day, formatINR, PAYMENT_WORDS, paymentTone, Pill, STATUS_WORDS, when } from './ui'

const TABS = [
  ['new', 'New'],
  ['payment', 'Payment to check'],
  ['preparing', 'Preparing'],
  ['shipped', 'Shipped'],
  ['done', 'Done'],
]

/** Orders, newest first, in five tabs. Each card: code, name, total, payment and dispatch date. */
export default function Orders() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'new'
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setError('')
    adminCall('orders', { tab }).then((r) => {
      if (!alive) return
      if (r.ok) setData(r.data)
      else setError(problem(r))
    })
    return () => {
      alive = false
    }
  }, [tab])

  return (
    <div>
      <h1 className="t-h2">Orders</h1>
      <div role="tablist" aria-label="Order lists" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setParams(k === 'new' ? {} : { tab: k })}
            className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 font-bold ${tab === k ? 'bg-ink text-gold-light' : 'border border-line bg-[#fffcf5]'}`}
          >
            {label}
            {data?.counts?.[k] > 0 && <span className={`rounded-full px-2 text-sm ${tab === k ? 'bg-gold-mid text-ink' : 'bg-champagne'}`}>{data.counts[k]}</span>}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 font-bold text-error">{error}</p>}
      {!data && !error && <p className="mt-6 text-brown-2">Loading…</p>}
      {data && data.orders.length === 0 && <p className="mt-6 text-brown-2">No orders here.</p>}

      <ul className="mt-4 space-y-3">
        {data?.orders.map((o) => (
          <li key={o.code}>
            <Link to={`/orders/${o.code}`} className="block rounded-card border border-line bg-[#fffcf5] p-4 hover:border-ink" data-admin-order={o.code}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[1.125rem] font-bold tabular-nums">{o.code}</p>
                <p className="t-price">{formatINR(o.total)}</p>
              </div>
              <p className="mt-1">
                {o.name}, {o.city} · {o.itemCount} {o.itemCount === 1 ? 'item' : 'items'}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={paymentTone(o.paymentStatus)}>{PAYMENT_WORDS[o.paymentStatus]}</Pill>
                <Pill>{STATUS_WORDS[o.status]}</Pill>
                {o.hasDrawing && <Pill tone="warn">Drawing</Pill>}
                <span className="t-small text-brown-2">Dispatch {day(o.dispatchDate)}</span>
              </div>
              <p className="t-small mt-1 text-brown-2">Ordered {when(o.createdAt)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
