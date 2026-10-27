// Small building blocks for Hema's admin: big buttons (48px or more), clear labels, the black and
// gold look of the website, and a save message that only says "Saved" once the server confirmed.
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { problem } from './api'
import { AlertIcon, CheckIcon } from '../components/icons'

export const formatINR = (n) => `₹${new Intl.NumberFormat('en-IN').format(n || 0)}`

export const STATUS_WORDS = {
  placed: 'New',
  payment_confirmed: 'Paid',
  preparing: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
export const PAYMENT_WORDS = { pending: 'Not paid yet', submitted: 'Payment to check', confirmed: 'Paid' }
export const BOOKING_WORDS = { pending: 'Not paid yet', confirmed: 'Confirmed', cancelled: 'Cancelled' }

/** "5 Oct, 3:40 pm" in Indian time */
export const when = (iso) =>
  iso ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : ''
/** "Mon, 12 Oct" for a calendar date */
export const day = (isoDate) => (isoDate ? new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${isoDate}T00:00:00Z`)) : '')
/** "Sat 17 – Sun 18 Oct" for the Saturday of a class weekend */
export function weekendLabel(sat) {
  if (!sat) return ''
  const d = new Date(`${sat}T00:00:00Z`)
  const e = new Date(d.getTime() + 86_400_000)
  const f = (x, o) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', ...o }).format(x)
  return d.getUTCMonth() === e.getUTCMonth() ? `Sat ${d.getUTCDate()} – Sun ${e.getUTCDate()} ${f(e, { month: 'short' })}` : `Sat ${d.getUTCDate()} ${f(d, { month: 'short' })} – Sun ${e.getUTCDate()} ${f(e, { month: 'short' })}`
}

/** A WhatsApp chat with the customer, with the message typed in */
export const whatsappTo = (phone, text) => `https://wa.me/91${phone}${text ? `?text=${encodeURIComponent(text)}` : ''}`

/** Saves text as a file on the phone or computer (CSV reports) */
export function downloadText(filename, text, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

/**
 * run(async () => adminCall(...)) -> shows "Saving…", then "Saved" or the problem in plain words.
 * state: { status: 'idle' | 'saving' | 'saved' | 'error', message, fields }
 */
export function useSave() {
  const [state, setState] = useState({ status: 'idle', message: '', fields: {} })
  const run = useCallback(async (fn, savedText = 'Saved') => {
    setState({ status: 'saving', message: '', fields: {} })
    const r = await fn()
    if (r.ok) setState({ status: 'saved', message: savedText, fields: {} })
    else setState({ status: 'error', message: problem(r, { saving: true }), fields: r.fields || {} })
    return r
  }, [])
  const reset = useCallback(() => setState({ status: 'idle', message: '', fields: {} }), [])
  return { ...state, run, reset }
}

/**
 * Loads an admin action, again when Hema comes back to the app, and every `every` ms while the
 * page is open (new orders show up by themselves). -> { data, error, busy, reload, setData }
 */
export function useAdminData(load, deps, { every = 0 } = {}) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reload = useCallback(async () => {
    setBusy(true)
    const r = await load()
    setBusy(false)
    if (r.ok) {
      setData(r.data)
      setError('')
    } else setError(problem(r))
    return r
  }, deps)
  useEffect(() => {
    reload()
    if (!every) return undefined
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => document.visibilityState === 'visible' && reload(), every)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [reload, every])
  return { data, error, busy, reload, setData }
}

export function SaveMessage({ save }) {
  if (save.status === 'saved')
    return (
      <p role="status" className="flex items-center gap-2 font-bold text-[#1a6b3a]">
        <CheckIcon className="h-5 w-5" /> {save.message}
      </p>
    )
  if (save.status === 'error')
    return (
      <p role="alert" className="flex items-start gap-2 font-bold text-error">
        <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" /> {save.message}
      </p>
    )
  if (save.status === 'saving') return <p className="font-bold text-brown-2">Saving…</p>
  return null
}

export function Field({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block font-bold">{label}</span>
      {children}
      {hint && <span className="t-small mt-1 block text-brown-2">{hint}</span>}
      {error && <span className="t-small mt-1 block font-bold text-error">{error}</span>}
    </label>
  )
}

export const input = 'field-control'

const TONES = {
  dark: 'bg-ink text-gold-light hover:bg-[#262320]',
  gold: 'bg-[linear-gradient(180deg,#ebd27a,#d4af37_55%,#b8901e)] text-ink shadow-[0_1px_0_rgba(0,0,0,0.25)] hover:brightness-105',
  light: 'border-[1.5px] border-brown bg-cream text-brown hover:bg-champagne',
  danger: 'border-[1.5px] border-error bg-cream text-error hover:bg-error-bg',
  go: 'bg-[#1a6b3a] text-white hover:bg-[#145a30]',
  whatsapp: 'bg-whatsapp text-white hover:bg-whatsapp-dark',
}
const BTN = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-4 font-bold disabled:opacity-50'

/** The button look, for things that aren't a <button> (e.g. the <label> of a photo picker) */
export const btnClass = (tone = 'dark') => `${BTN} ${TONES[tone]}`

export function Btn({ tone = 'dark', className = '', ...props }) {
  return <button type="button" className={`${BTN} ${TONES[tone]} ${className}`} {...props} />
}
/** A link that looks like a button (to = in the admin; href = outside, opens a new tab) */
export function LinkBtn({ tone = 'dark', className = '', to, href, children, ...props }) {
  if (href)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={`${BTN} ${TONES[tone]} ${className}`} {...props}>
        {children}
      </a>
    )
  return (
    <Link to={to} className={`${BTN} ${TONES[tone]} ${className}`} {...props}>
      {children}
    </Link>
  )
}

export function Pill({ children, tone = 'plain' }) {
  const tones = { plain: 'bg-champagne', warn: 'bg-[#fdf0c8] text-[#6b4b00]', good: 'bg-[#dcefe2] text-[#1a6b3a]', bad: 'bg-error-bg text-error', dark: 'bg-ink text-gold-light' }
  return <span className={`t-small inline-flex items-center rounded-full px-2.5 py-0.5 font-bold ${tones[tone]}`}>{children}</span>
}

export const paymentTone = (s) => (s === 'confirmed' ? 'good' : s === 'submitted' ? 'warn' : 'plain')

export const card = 'rounded-card border border-line bg-[#fffcf5] p-4'

/** Big tab buttons that scroll sideways on a phone */
export function Tabs({ tabs, value, onChange, label, counts }) {
  return (
    <div role="tablist" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {tabs.map(([k, text]) => (
        <button
          key={k}
          type="button"
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          data-admin-tab={k}
          className={`inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full px-4 font-bold ${value === k ? 'bg-ink text-gold-light' : 'border border-line bg-[#fffcf5]'}`}
        >
          {text}
          {counts?.[k] > 0 && <span className={`rounded-full px-2 text-sm ${value === k ? 'bg-gold-mid text-ink' : 'bg-champagne'}`}>{counts[k]}</span>}
        </button>
      ))}
    </div>
  )
}

export const Loading = () => (
  <p role="status" className="mt-6 text-brown-2">
    Loading…
  </p>
)
export const ErrorText = ({ children }) =>
  children ? (
    <p role="alert" className="mt-4 flex items-start gap-2 font-bold text-error">
      <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" /> {children}
    </p>
  ) : null

export function PageTitle({ children, action }) {
  return (
    <div className="flex min-h-12 flex-wrap items-center justify-between gap-3">
      <h1 className="t-h2">{children}</h1>
      {action}
    </div>
  )
}
