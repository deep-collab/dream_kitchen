import { useCallback, useEffect, useState } from 'react'
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { adminCall, forgotPassword, isDemo, loadSession, login, logout, problem, setLoggedOutHandler, setPassword, takeExpired } from './api'
import { Btn, Field, input, SaveMessage, useSave } from './ui'
import Home from './Home'
import Orders from './Orders'
import OrderDetail from './OrderDetail'
import PackingSlip from './PackingSlip'
import Classes from './Classes'
import BookingDetail from './BookingDetail'
import MenuAdmin from './MenuAdmin'
import SettingsAdmin from './SettingsAdmin'
import Enquiries from './Enquiries'
import Reports from './Reports'
import More from './More'
import SetupCheck from './SetupCheck'
import { AlertIcon, ClassesIcon, HomeIcon, MenuIcon, ShopIcon, TruckIcon } from '../components/icons'

const WARNINGS = {
  paymentsOff: { text: 'Customers can’t pay online yet: add the Razorpay keys (see Setup check), or your UPI ID in Settings.', to: '/setup' },
  razorpayTest: { text: 'Razorpay is in TEST mode: real customers can’t pay yet. Swap in the live keys when ready.', to: '/setup' },
  emailMissing: { text: 'Order emails are off: add your order-alert email in Settings.', to: '/settings' },
  mockBackend: { text: 'Practice mode: this is the practice database on this computer, not the real one.' },
}

export default function AdminApp() {
  const [session, setSession] = useState(loadSession)
  const [me, setMe] = useState(null)

  useEffect(() => setLoggedOutHandler(() => setSession(null)), [])
  const refreshMe = useCallback(async () => {
    const r = await adminCall('me')
    if (r.ok) setMe(r.data)
  }, [])
  useEffect(() => {
    if (session) refreshMe()
  }, [session, refreshMe])

  if (!session)
    return (
      <Routes>
        <Route path="setup" element={<Bare><SetupCheck /></Bare>} />
        <Route path="reset" element={<Reset />} />
        <Route path="*" element={<Login onDone={setSession} />} />
      </Routes>
    )

  return (
    <Routes>
      {/* The packing slip prints on its own, without the admin's bars */}
      <Route path="orders/:code/slip" element={<PackingSlip />} />
      <Route path="*" element={<Shell me={me} refreshMe={refreshMe} />} />
    </Routes>
  )
}

function Shell({ me, refreshMe }) {
  const demo = isDemo()
  const tab = 'flex h-full flex-col items-center justify-center gap-0.5 text-[0.875rem] font-bold leading-tight'
  return (
    <div className="flex min-h-dvh flex-col bg-cream [&_.t-h2]:font-bold [&_.t-h3]:font-bold [&_:is(h1,h2,h3)]:font-body">
      <header className="on-dark sticky top-0 z-30 border-b border-gold/45 bg-ink text-cream">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex min-h-12 items-center gap-2 font-wordmark text-gold-light">
            Dream Kitchen
            {demo ? <span data-admin-demo-badge className="rounded bg-gold-mid px-2 py-0.5 font-body text-sm font-bold text-ink">DEMO</span> : <span className="font-body text-sm text-cream/80">Admin</span>}
          </Link>
          {demo ? (
            <a href="/admin" className="inline-flex min-h-12 items-center rounded-control border border-gold/60 px-3 font-bold text-cream" data-admin-leave>
              Leave demo
            </a>
          ) : (
            <Btn tone="light" className="!border-gold/60 !bg-transparent px-3 !text-cream" onClick={logout} data-admin-logout>
              Log out
            </Btn>
          )}
        </div>
      </header>
      {demo && (
        <p className="bg-gold-mid px-4 py-2 text-center font-bold text-ink" data-admin-demo>
          DEMO: sample orders and customers, nothing here is real. Changes vanish when you close this page.
        </p>
      )}
      {!demo && me?.warnings?.length > 0 && (
        <div className="bg-error text-white" data-admin-warnings>
          {me.warnings.map((w) => (
            <p key={w} className="mx-auto flex max-w-3xl items-start gap-2 px-4 py-2 font-bold">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
              {WARNINGS[w]?.to ? (
                <Link to={WARNINGS[w].to} className="underline underline-offset-2">
                  {WARNINGS[w].text}
                </Link>
              ) : (
                WARNINGS[w]?.text || w
              )}
            </p>
          ))}
        </div>
      )}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-28">
        <Routes>
          <Route index element={<Home />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:code" element={<OrderDetail />} />
          <Route path="classes" element={<Classes />} />
          <Route path="classes/bookings/:code" element={<BookingDetail />} />
          <Route path="menu" element={<MenuAdmin />} />
          <Route path="more" element={<More email={me?.email} />} />
          <Route path="settings" element={<SettingsAdmin onSaved={refreshMe} />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="reports" element={<Reports />} />
          <Route path="setup" element={<SetupCheck />} />
          <Route path="reset" element={<Reset />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-30 border-t border-gold/45 bg-ink pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid h-16 max-w-3xl grid-cols-5">
          {[
            ['/', 'Home', HomeIcon],
            ['/orders', 'Orders', TruckIcon],
            ['/classes', 'Classes', ClassesIcon],
            ['/menu', 'Menu', ShopIcon],
            ['/more', 'More', MenuIcon],
          ].map(([to, label, Icon]) => (
            <li key={to}>
              <NavLink to={to} end={to === '/'} className={({ isActive }) => `${tab} ${isActive ? 'text-gold-light' : 'text-cream'}`}>
                {({ isActive }) => (
                  <>
                    <Icon className={`h-6 w-6 ${isActive ? 'text-gold-light' : 'text-gold'}`} />
                    <span className={isActive ? 'border-b-2 border-gold-light' : ''}>{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

/** A page without the admin's bars (login, reset, setup check before logging in) */
function Bare({ children }) {
  return (
    <div className="min-h-dvh bg-cream [&_.t-h2]:font-bold [&_.t-h3]:font-bold [&_:is(h1,h2,h3)]:font-body">
      <header className="on-dark border-b border-gold/45 bg-ink">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-4">
          <Link to="/" className="flex min-h-12 items-center font-wordmark text-gold-light">
            Dream Kitchen <span className="ml-2 font-body text-sm text-cream/80">Admin</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6">{children}</main>
    </div>
  )
}

function Login({ onDone }) {
  const [email, setEmail] = useState('')
  const [password, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(() => (takeExpired() ? problem({ error: 'expired' }) : ''))
  const [mode, setMode] = useState('login') // 'login' | 'forgot' | 'sent'
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    if (mode === 'forgot') {
      const r = await forgotPassword(email.trim())
      setBusy(false)
      if (r.ok) setMode('sent')
      else setError(problem(r))
      return
    }
    const r = await login(email.trim(), password)
    setBusy(false)
    if (r.ok) onDone(r.data)
    else setError(problem(r))
  }
  return (
    <Bare>
      <div className="mx-auto max-w-sm space-y-5 pt-4">
        <h1 className="t-h2">{mode === 'login' ? 'Log in' : 'Forgot your password?'}</h1>
        {mode === 'sent' ? (
          <div role="status" className="space-y-4">
            <p className="rounded-card bg-champagne p-4">
              If <strong>{email.trim()}</strong> has an admin account, an email with a link to make a new password is on its way. Open it on this phone. Check the spam folder too.
            </p>
            <Btn tone="light" className="w-full" onClick={() => setMode('login')}>
              Back to log in
            </Btn>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            {mode === 'forgot' && <p>Type your email. We’ll send you a link to make a new password.</p>}
            <Field label="Email">
              <input className={input} type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            {mode === 'login' && (
              <Field label="Password">
                <input className={input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPw(e.target.value)} required />
              </Field>
            )}
            {error && (
              <p role="alert" className="flex items-start gap-2 font-bold text-error">
                <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" /> {error}
              </p>
            )}
            <Btn type="submit" tone="gold" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Send me the link'}
            </Btn>
            <button
              type="button"
              className="inline-flex min-h-12 w-full items-center justify-center font-bold underline underline-offset-4"
              onClick={() => {
                setMode(mode === 'login' ? 'forgot' : 'login')
                setError('')
              }}
              data-admin-forgot
            >
              {mode === 'login' ? 'Forgot password?' : 'Back to log in'}
            </button>
          </form>
        )}
        <p className="flex flex-wrap justify-center gap-x-6 border-t border-line pt-3">
          <Link to="/setup" className="inline-flex min-h-12 items-center font-bold text-brown-2 underline underline-offset-4">
            Setup check
          </Link>
          <a href="/admin/demo" className="inline-flex min-h-12 items-center font-bold text-brown-2 underline underline-offset-4">
            See the demo
          </a>
        </p>
      </div>
    </Bare>
  )
}

/** /admin/reset: opened from the "reset your password" email (Supabase puts the login in the address) */
function Reset() {
  const navigate = useNavigate()
  const { hash } = useLocation()
  const [token] = useState(() => new URLSearchParams(hash.slice(1)).get('access_token') || '')
  const linkError = new URLSearchParams(hash.slice(1)).get('error_description')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [done, setDone] = useState(false)
  const [mismatch, setMismatch] = useState('')
  const save = useSave()
  // Don't leave the one-time login in the address bar or the history
  useEffect(() => {
    if (hash) window.history.replaceState(null, '', window.location.pathname)
  }, [hash])
  const submit = async (e) => {
    e.preventDefault()
    setMismatch('')
    if (pw.length < 8) return setMismatch('Use at least 8 letters or numbers.')
    if (pw !== pw2) return setMismatch('The two passwords are not the same.')
    const r = await save.run(() => setPassword(token, pw), 'Password changed')
    if (r.ok) setDone(true)
  }
  return (
    <Bare>
      <div className="mx-auto max-w-sm space-y-5 pt-4">
        <h1 className="t-h2">Make a new password</h1>
        {!token ? (
          <p role="alert" className="font-bold text-error">
            {linkError ? 'This link has expired or was already used.' : 'Open this page from the link in the “reset your password” email.'} You can ask for a new link on the log in page.
          </p>
        ) : done ? (
          <div role="status" className="space-y-4">
            <p className="flex items-center gap-2 font-bold text-[#1a6b3a]">Your password is changed.</p>
            <Btn tone="gold" className="w-full" onClick={() => navigate('/', { replace: true })}>
              Log in with the new password
            </Btn>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <Field label="New password" hint="At least 8 letters or numbers.">
              <input className={input} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required />
            </Field>
            <Field label="The same password again">
              <input className={input} type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required />
            </Field>
            {mismatch && (
              <p role="alert" className="font-bold text-error">
                {mismatch}
              </p>
            )}
            <SaveMessage save={save} />
            <Btn type="submit" tone="gold" className="w-full" disabled={save.status === 'saving'}>
              Save new password
            </Btn>
          </form>
        )}
      </div>
    </Bare>
  )
}
