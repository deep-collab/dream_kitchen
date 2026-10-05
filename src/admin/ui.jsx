// Small building blocks for Hema's admin: big buttons, clear labels, and a save message that only
// says "Saved" once the server has confirmed it.
import { useCallback, useState } from 'react'
import { problem } from './api'
import { AlertIcon, CheckIcon } from '../components/icons'

export const formatINR = (n) => `₹${new Intl.NumberFormat('en-IN').format(n)}`

export const STATUS_WORDS = {
  placed: 'New',
  payment_confirmed: 'Paid',
  preparing: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
export const PAYMENT_WORDS = { pending: 'Not paid yet', submitted: 'Payment to check', confirmed: 'Payment received' }

/** "5 Oct, 3:40 pm" in Indian time */
export const when = (iso) =>
  iso
    ? new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
    : ''
export const day = (isoDate) => (isoDate ? new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${isoDate}T00:00:00Z`)) : '')

/**
 * run(async () => adminCall(...)) -> shows "Saving…", then "Saved" or the problem in plain words.
 * state: { status: 'idle' | 'saving' | 'saved' | 'error', message, fields }
 */
export function useSave() {
  const [state, setState] = useState({ status: 'idle', message: '', fields: {} })
  const run = useCallback(async (fn) => {
    setState({ status: 'saving', message: '', fields: {} })
    const r = await fn()
    if (r.ok) setState({ status: 'saved', message: 'Saved', fields: {} })
    else setState({ status: 'error', message: problem(r), fields: r.fields || {} })
    return r
  }, [])
  const reset = useCallback(() => setState({ status: 'idle', message: '', fields: {} }), [])
  return { ...state, run, reset }
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

export function Btn({ tone = 'dark', className = '', ...props }) {
  const tones = {
    dark: 'bg-ink text-gold-light hover:bg-[#262320]',
    light: 'border-[1.5px] border-brown bg-cream text-brown hover:bg-champagne',
    danger: 'border-[1.5px] border-error bg-cream text-error hover:bg-error-bg',
    go: 'bg-[#1a6b3a] text-white hover:bg-[#145a30]',
  }
  return <button type="button" className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-4 font-bold disabled:opacity-50 ${tones[tone]} ${className}`} {...props} />
}

export function Pill({ children, tone = 'plain' }) {
  const tones = { plain: 'bg-champagne', warn: 'bg-[#fdf0c8] text-[#6b4b00]', good: 'bg-[#dcefe2] text-[#1a6b3a]', bad: 'bg-error-bg text-error' }
  return <span className={`t-small inline-flex items-center rounded-full px-2.5 py-0.5 font-bold ${tones[tone]}`}>{children}</span>
}

export const paymentTone = (s) => (s === 'confirmed' ? 'good' : s === 'submitted' ? 'warn' : 'plain')
