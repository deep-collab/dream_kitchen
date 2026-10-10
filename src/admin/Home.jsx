import { Link } from 'react-router-dom'
import { adminCall } from './api'
import { ErrorText, formatINR, Loading, PageTitle, Btn, useAdminData, weekendLabel } from './ui'
import { AlertIcon } from '../components/icons'

/**
 * Home: the day at a glance, in big cards Hema can tap. Each opens the matching list. Refreshes by
 * itself every minute and when she comes back to the app.
 */
export default function Home() {
  const { data, error, busy, reload } = useAdminData(() => adminCall('summary'), [], { every: 60_000 })
  const s = data?.summary
  const cards = s && [
    { to: '/orders?tab=today', big: s.newOrdersToday, label: 'New orders today', small: s.unpaidToday ? `+ ${s.unpaidToday} not paid yet` : 'Paid or payment to check', key: 'newOrders' },
    { to: '/reports', big: formatINR(s.paymentsToday), label: 'Payments received today', small: 'Orders and classes', key: 'payments' },
    { to: '/orders?tab=paid', big: s.toPack, label: 'Orders to pack', small: 'Paid, not started yet', key: 'toPack' },
    { to: '/orders?tab=preparing', big: s.toShip, label: 'Orders to ship', small: 'Preparing, not shipped yet', key: 'toShip' },
    { to: `/classes?weekend=${s.weekend}`, big: s.weekendBookings, label: 'This weekend’s class bookings', small: weekendLabel(s.weekend), key: 'weekend' },
    { to: '/enquiries', big: s.newEnquiries, label: 'New enquiries', small: 'Messages from the website', key: 'enquiries' },
  ]
  return (
    <div className="space-y-4">
      <PageTitle
        action={
          <Btn tone="light" onClick={reload} disabled={busy}>
            {busy ? 'Checking…' : 'Refresh'}
          </Btn>
        }
      >
        Today
      </PageTitle>
      <ErrorText>{error}</ErrorText>
      {!s && !error && <Loading />}
      {s?.toCheck > 0 && (
        <Link to="/orders?tab=new" className="flex min-h-12 items-center gap-3 rounded-card border-2 border-[#c99a00] bg-[#fdf6dc] p-4 font-bold" data-admin-card="toCheck">
          <AlertIcon className="h-6 w-6 shrink-0" />
          {s.toCheck === 1 ? '1 UPI payment to check' : `${s.toCheck} UPI payments to check`}
        </Link>
      )}
      {cards && (
        <ul className="grid grid-cols-2 gap-3">
          {cards.map((c) => (
            <li key={c.key}>
              <Link to={c.to} data-admin-card={c.key} className="flex h-full min-h-32 flex-col justify-between rounded-card border border-gold/50 bg-ink p-4 text-cream shadow-sm hover:border-gold-light">
                <span className="text-[2rem] leading-none font-bold text-gold-light tabular-nums">{c.big}</span>
                <span>
                  <span className="block leading-snug font-bold">{c.label}</span>
                  <span className="t-small block text-cream/75">{c.small}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
