import { useCallback, useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { adminCall, loadSession, login, logout, problem, setLoggedOutHandler } from './api'
import { Btn, Field, input } from './ui'
import Orders from './Orders'
import OrderDetail from './OrderDetail'
import MenuAdmin from './MenuAdmin'
import SettingsAdmin from './SettingsAdmin'
import Enquiries from './Enquiries'
import { AlertIcon, ClassesIcon, ShopIcon, TruckIcon, WalletIcon } from '../components/icons'

const WARNINGS = {
  upiMissing: { text: 'Customers cannot pay yet: add your UPI ID in Settings.', to: '/settings' },
  emailMissing: { text: 'Order emails are off: HEMA_EMAIL is not set in Netlify (docs/SETUP-BACKEND.md).' },
  mockBackend: { text: 'Test mode: this is the practice database on this computer, not the real one.' },
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

  if (!session) return <Login onDone={setSession} />

  const tab = 'flex h-full flex-col items-center justify-center gap-0.5 text-[0.9375rem] font-bold'
  return (
    <div className="flex min-h-dvh flex-col bg-cream [&_.t-h2]:font-body [&_.t-h2]:font-bold [&_.t-h3]:font-body [&_.t-h3]:font-bold">
      <header className="on-dark sticky top-0 z-30 border-b border-gold/45 bg-ink text-cream">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4">
          <p className="font-wordmark text-gold-light">Dream Kitchen · Admin</p>
          <Btn tone="light" className="min-h-10 !border-gold/60 !bg-transparent px-3 !text-cream" onClick={logout}>
            Log out
          </Btn>
        </div>
      </header>
      {me?.warnings?.length > 0 && (
        <div className="bg-error text-white">
          {me.warnings.map((w) => (
            <p key={w} className="mx-auto flex max-w-3xl items-start gap-2 px-4 py-2 font-bold">
              <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
              {WARNINGS[w]?.text || w}
            </p>
          ))}
        </div>
      )}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-4 pb-28">
        <Routes>
          <Route index element={<Orders />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:code" element={<OrderDetail />} />
          <Route path="menu" element={<MenuAdmin />} />
          <Route path="settings" element={<SettingsAdmin onSaved={refreshMe} />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="*" element={<Orders />} />
        </Routes>
      </main>
      <nav aria-label="Admin" className="fixed inset-x-0 bottom-0 z-30 border-t border-gold/45 bg-ink pb-[env(safe-area-inset-bottom)]">
        <ul className="mx-auto grid h-16 max-w-3xl grid-cols-4">
          {[
            ['/', 'Orders', TruckIcon],
            ['/menu', 'Menu', ShopIcon],
            ['/settings', 'Settings', WalletIcon],
            ['/enquiries', 'Classes', ClassesIcon],
          ].map(([to, label, Icon]) => (
            <li key={to}>
              <NavLink to={to} end={to === '/'} className={({ isActive }) => `${tab} ${isActive ? 'text-gold-light' : 'text-cream'}`}>
                <Icon className="h-6 w-6 text-gold" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function Login({ onDone }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const r = await login(email.trim(), password)
    setBusy(false)
    if (r.ok) onDone(r.data)
    else setError(problem(r))
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-4">
      <h1 className="t-h2">Dream Kitchen admin</h1>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <input className={input} type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Password">
          <input className={input} type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        {error && (
          <p role="alert" className="font-bold text-error">
            {error}
          </p>
        )}
        <Btn type="submit" className="w-full" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </Btn>
      </form>
    </main>
  )
}
