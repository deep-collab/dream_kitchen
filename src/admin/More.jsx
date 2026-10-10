import { Link } from 'react-router-dom'
import { isDemo, logout } from './api'
import { Btn, PageTitle } from './ui'
import { ContactIcon, FaqIcon, InfoIcon, WalletIcon } from '../components/icons'

/** Everything that doesn't fit in the bottom bar */
export default function More({ email }) {
  const row = 'flex min-h-16 items-center gap-4 rounded-card border border-line bg-[#fffcf5] p-4 font-bold hover:border-ink'
  const links = [
    ['/enquiries', 'Enquiries', 'Messages from the website: reply on WhatsApp', ContactIcon],
    ['/settings', 'Settings', 'Courier, dispatch time, banner, shop open or closed, emails, UPI', WalletIcon],
    ['/reports', 'Reports', 'This month in numbers, and downloads for Excel', FaqIcon],
    ['/setup', 'Setup check', 'Is everything connected? Green or red for each part', InfoIcon],
  ]
  return (
    <div className="space-y-4">
      <PageTitle>More</PageTitle>
      <ul className="space-y-3">
        {links.map(([to, label, text, Icon]) => (
          <li key={to}>
            <Link to={to} className={row} data-admin-more={to.slice(1)}>
              <Icon className="h-7 w-7 shrink-0 text-gold-deep" />
              <span>
                <span className="block">{label}</span>
                <span className="t-small block font-normal text-brown-2">{text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!isDemo() && (
        <div className="border-t border-line pt-4">
          {email && <p className="t-small text-brown-2">Logged in as {email}</p>}
          <Btn tone="light" className="mt-2 w-full" onClick={logout}>
            Log out
          </Btn>
        </div>
      )}
    </div>
  )
}
