import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { adminCall } from './api'
import { Btn, day, ErrorText, formatINR, input, Loading, PageTitle, PAYMENT_WORDS, paymentTone, Pill, STATUS_WORDS, Tabs, useAdminData, when } from './ui'
import { SearchIcon } from '../components/icons'

const TABS = [
  ['new', 'New'],
  ['paid', 'Paid'],
  ['preparing', 'Preparing'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['cancelled', 'Cancelled'],
]
const HINTS = {
  new: 'Not paid yet, or a UPI payment to check.',
  paid: 'Paid. Make these next (soonest dispatch first).',
  preparing: 'Being made. Mark “Shipped” when they leave.',
  today: 'Every order placed today.',
}

/** Orders, newest first, in tabs by status, with search by order ID, name or phone */
export default function Orders() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const tab = [...TABS.map(([k]) => k), 'today'].includes(params.get('tab')) ? params.get('tab') : 'new'
  const [typed, setTyped] = useState(q)
  const { data, error, busy, reload } = useAdminData(() => adminCall('orders', q ? { q } : { tab }), [tab, q], { every: 60_000 })

  const search = (e) => {
    e.preventDefault()
    setParams(typed.trim() ? { q: typed.trim() } : {})
  }
  return (
    <div>
      <PageTitle
        action={
          <Btn tone="light" onClick={reload} disabled={busy}>
            {busy ? 'Checking…' : 'Refresh'}
          </Btn>
        }
      >
        Orders
      </PageTitle>
      <form role="search" onSubmit={search} className="mt-3 flex gap-2">
        <label className="sr-only" htmlFor="order-search">
          Search orders
        </label>
        <input id="order-search" className={`${input} flex-1`} type="search" placeholder="Order ID, name or phone" value={typed} onChange={(e) => setTyped(e.target.value)} />
        <Btn type="submit" aria-label="Search">
          <SearchIcon className="h-5 w-5" /> Search
        </Btn>
      </form>
      {q ? (
        <p className="mt-3 flex flex-wrap items-center gap-2">
          Results for <strong>“{q}”</strong>
          <button
            type="button"
            className="inline-flex min-h-12 items-center font-bold underline underline-offset-4"
            onClick={() => {
              setTyped('')
              setParams({})
            }}
          >
            Clear search
          </button>
        </p>
      ) : (
        <div className="mt-3">
          <Tabs tabs={tab === 'today' ? [['today', 'Today'], ...TABS] : TABS} value={tab} onChange={(k) => setParams(k === 'new' ? {} : { tab: k })} label="Order lists" counts={data?.counts} />
          {HINTS[tab] && <p className="t-small mt-2 text-brown-2">{HINTS[tab]}</p>}
        </div>
      )}

      <ErrorText>{error}</ErrorText>
      {!data && !error && <Loading />}
      {data && data.orders.length === 0 && <p className="mt-6 text-brown-2">{q ? 'No order matches.' : 'No orders here.'}</p>}

      <ul className="mt-4 space-y-3">
        {data?.orders.map((o) => (
          <li key={o.code}>
            <Link to={`/orders/${o.code}`} className="block rounded-card border border-line bg-[#fffcf5] p-4 hover:border-ink" data-admin-order={o.code}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[1.125rem] font-bold tabular-nums">{o.code}</p>
                <p className="t-price">{formatINR(o.total)}</p>
              </div>
              <p className="mt-1">
                {o.name}, {o.city}
              </p>
              <p className="t-small text-brown-2">{o.itemsText}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={paymentTone(o.paymentStatus)}>{PAYMENT_WORDS[o.paymentStatus]}</Pill>
                {(q || tab === 'today') && <Pill tone={o.status === 'cancelled' ? 'bad' : 'plain'}>{STATUS_WORDS[o.status]}</Pill>}
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
