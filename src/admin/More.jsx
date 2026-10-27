import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { isDemo, logout } from './api'
import { Btn, PageTitle } from './ui'
import { devUnlocked, setDevUnlocked, TAPS_TO_UNLOCK } from './devUnlock'
import { DEV_TOOLS } from './devTools'
import { ContactIcon, FaqIcon, InfoIcon, WalletIcon } from '../components/icons'
import { version } from '../../package.json'

const row = 'flex min-h-16 items-center gap-4 rounded-card border border-line bg-[#fffcf5] p-4 font-bold hover:border-ink'

function Rows({ links, testKey = 'data-admin-more' }) {
  return (
    <ul className="space-y-3">
      {links.map(([to, label, text, Icon]) => (
        <li key={to}>
          <Link to={to} className={row} {...{ [testKey]: to.split('/').pop() }}>
            <Icon className="h-7 w-7 shrink-0 text-gold-deep" />
            <span>
              <span className="block">{label}</span>
              <span className="t-small block font-normal text-brown-2">{text}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/**
 * Everything that doesn't fit in the bottom bar. At the very bottom, the admin's version: tapping
 * it 7 times shows the hidden developer options on this device, for an account the server allows
 * (the developer; Hema too once the developer switched that on, and then without tapping).
 */
export default function More({ me }) {
  const [unlocked, setUnlocked] = useState(devUnlocked)
  const [note, setNote] = useState('')
  const taps = useRef({ n: 0, at: 0 })
  const links = [
    ['/enquiries', 'Enquiries', 'Messages from the website: reply on WhatsApp', ContactIcon],
    ['/settings', 'Settings', 'Courier, dispatch time, banner, shop open or closed, emails, UPI', WalletIcon],
    ['/reports', 'Reports', 'This month in numbers, and downloads for Excel', FaqIcon],
    ['/setup', 'Setup check', 'Is everything connected? Green or red for each part', InfoIcon],
  ]
  const showDev = Boolean(me?.dev) && (unlocked || me.role !== 'developer')

  const tap = () => {
    const now = Date.now()
    const t = taps.current
    t.n = now - t.at < 1500 ? t.n + 1 : 1
    t.at = now
    if (unlocked || t.n < TAPS_TO_UNLOCK) {
      if (!unlocked && t.n >= 3) setNote(`${TAPS_TO_UNLOCK - t.n} more…`)
      return
    }
    t.n = 0
    setDevUnlocked(true)
    setUnlocked(true)
    setNote(me?.dev ? 'Developer options unlocked' : 'Developer options unlocked on this device, but this account is not allowed to use them.')
  }

  return (
    <div className="space-y-4">
      <PageTitle>More</PageTitle>
      <Rows links={links} />
      {showDev && (
        <section aria-labelledby="dev-title" className="space-y-3 border-t border-line pt-4" data-admin-dev-section>
          <h2 id="dev-title" className="t-h3">
            Developer options
          </h2>
          <Rows links={DEV_TOOLS.map((tool) => [`/dev/${tool.id}`, tool.name, tool.text, tool.icon])} testKey="data-admin-dev" />
          {unlocked && me.role === 'developer' && (
            <Btn
              tone="light"
              className="w-full"
              onClick={() => {
                setDevUnlocked(false)
                setUnlocked(false)
                setNote('Developer options hidden again on this device.')
              }}
            >
              Hide developer options on this device
            </Btn>
          )}
        </section>
      )}
      {!isDemo() && (
        <div className="border-t border-line pt-4">
          {me?.email && <p className="t-small text-brown-2">Logged in as {me.email}</p>}
          <Btn tone="light" className="mt-2 w-full" onClick={logout}>
            Log out
          </Btn>
        </div>
      )}
      <div className="pt-2 text-center">
        {/* A plain line of text to everyone; 7 quick taps unlock the developer options */}
        <button type="button" onClick={tap} className="t-small min-h-12 px-4 text-brown-2" data-admin-version>
          Dream Kitchen admin · version {version}
        </button>
        {note && (
          <p role="status" className="t-small font-bold text-[#1a6b3a]" data-admin-dev-note>
            {note}
          </p>
        )}
      </div>
    </div>
  )
}
