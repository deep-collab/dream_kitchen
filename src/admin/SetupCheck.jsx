import { useCallback, useEffect, useState } from 'react'
import { isDemo, adminCall } from './api'
import { Btn, card, ErrorText, Loading, PageTitle } from './ui'
import { AlertIcon, CheckIcon } from '../components/icons'

// What to do for each problem, in plain words. "Step N" = docs/SETUP-BACKEND.md.
const FIX = {
  database: {
    noTables: 'The database setup hasn’t been run yet. Run: npm run d1:setup',
    noAdmin: 'No admin login yet. Run: npm run d1:admin',
    unreachable: 'Cloudflare D1 is unreachable. Check your wrangler.toml DB binding.',
    notConfigured: 'Database is not configured yet.',
    noUrl: 'Database credentials missing. Run: npm run d1:setup',
    noServiceKey: 'Database secret key missing.',
    keyRefused: 'Database refused the secret key.',
    noUpdate: 'Run the database migrations again.',
    noBucket: 'Photo storage is missing.',
    noAnonKey: 'Anonymous key missing.',
  },
  supabase: {
    noUrl: 'SUPABASE_URL is missing. Setup guide, steps 1–4.',
    noServiceKey: 'The Supabase secret key is missing. Setup guide, step 4.',
    keyRefused: 'Supabase refused the secret key. Copy it again (setup guide, step 2).',
    unreachable: 'Supabase doesn’t answer. Check SUPABASE_URL.',
    noTables: 'The database setup hasn’t been run yet. Run: npm run d1:setup or setup-all.sql.',
    noUpdate: 'Run database migrations again.',
    noBucket: 'Run database migrations again: it makes the photo storage.',
    noAnonKey: 'SUPABASE_ANON_KEY (the publishable key) is missing.',
    noAdmin: 'No admin login yet. Run: npm run d1:admin',
  },
  resend: {
    noKey: 'The Resend key is missing, so no emails are sent. Setup guide, step 6.',
    badKey: 'The Resend key doesn’t look right: it starts with re_. Copy it again from Resend (step 6).',
  },
  razorpay: {
    noKeys: 'Not set up yet. Until it is, customers pay by UPI (if set below) or order on WhatsApp. Setup guide, step 8, once Hema’s Razorpay account is approved.',
    oneKey: 'Only one of the two Razorpay keys is set. Add both (setup guide, step 8).',
    noWebhook: 'The keys are set, but the webhook isn’t. Setup guide, step 8: add the webhook and its secret.',
  },
  email: { noEmail: 'No address for order alerts. Add it in Settings, or HEMA_EMAIL.' },
  upi: { noUpi: 'Neither Razorpay nor UPI is set, so the website says “Online ordering opens soon – WhatsApp us”. Add the UPI ID in Settings, or set up Razorpay.' },
}

const DEMO = {
  mode: 'demo',
  database: { ok: true, d1: true, problem: null },
  supabase: { ok: true, problem: null },
  resend: { ok: true, problem: null },
  razorpay: { ok: false, problem: 'noKeys' },
  email: { ok: true, problem: null },
  upi: { ok: true, set: true, problem: null },
}

/**
 * Setup check: a green tick or a red cross for each part the website needs, and what to do next.
 * Works before anyone can log in. It shows no keys and no data, only whether each part is ready.
 */
export default function SetupCheck() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    if (isDemo()) {
      await adminCall('me')
      setData(DEMO)
      setBusy(false)
      return
    }
    try {
      const res = await fetch('/api/setup-check', { cache: 'no-store' })
      const json = await res.json()
      if (res.ok) setData(json)
      else setError(json?.error === 'tooMany' ? 'Checked too often. Wait a few minutes.' : 'The check didn’t work. Try again in a minute.')
    } catch {
      setError('No internet connection, or the website’s server isn’t running. Try again.')
    }
    setBusy(false)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  const dbInfo = data ? (data.database || data.supabase) : null
  const dbLabel = dbInfo?.d1 ? 'Cloudflare D1 (database, logins)' : 'Database (logins, orders)'

  const rows = data && [
    ['database', dbLabel, dbInfo],
    ['resend', 'Resend (emails)', data.resend],
    ['razorpay', 'Razorpay (online payments)', data.razorpay],
    ['email', 'Order alert email', data.email],
    ['upi', 'UPI (backup payment)', data.upi],
  ]
  const note = (k, x) => {
    if (k === 'database' && x.d1) return 'Cloudflare D1 database.'
    if ((k === 'database' || k === 'supabase') && x.practice) return 'Practice database on this computer (not the live one).'
    if (k === 'razorpay' && x.ok && x.testMode) return 'TEST keys: everything works, but real customers can’t pay. Swap in the live keys when ready.'
    if (k === 'razorpay' && x.ok) return 'Live. Payments are confirmed automatically.'
    if (k === 'upi' && x.notNeeded) return 'Not needed: Razorpay is on.'
    if (k === 'upi' && x.set) return 'Set. Used only while Razorpay isn’t set up.'
    return x.ok ? 'Ready.' : null
  }
  return (
    <div className="space-y-4">
      <PageTitle
        action={
          <Btn tone="light" onClick={load} disabled={busy}>
            {busy ? 'Checking…' : 'Check again'}
          </Btn>
        }
      >
        Setup check
      </PageTitle>
      <p className="text-brown-2">Each part of the website, and what to do if it isn’t ready. The steps are in the setup guide (docs/SETUP-BACKEND.md). After changing configuration, redeploy or restart, then check again.</p>
      <ErrorText>{error}</ErrorText>
      {!data && !error && <Loading />}
      {data && (
        <div className="space-y-3">
          <div className="rounded-xl border border-gold-subtle bg-gold-subtle/30 p-3 text-xs text-brown-2">
            Mode:{' '}
            <span className="font-semibold text-brown-1">
              {data.database?.d1 ? 'Cloudflare Workers + D1 database' : data.mode === 'supabase' ? 'Supabase' : data.mode === 'mock' ? 'Practice' : data.mode}
            </span>
            {data.allGood && <span className="ml-2 font-medium text-emerald-800">– Everything is set up.</span>}
          </div>

          <div className="space-y-2">
            {rows.map(([k, label, x]) => {
              const ok = x?.ok
              const fix = (!ok && FIX[k]?.[x?.problem]) || (!ok && FIX.supabase?.[x?.problem])
              const sub = note(k, x)
              return (
                <div key={k} className={card('flex items-start gap-3 p-3 text-xs sm:text-sm')}>
                  <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                    {ok ? <CheckIcon className="h-3 w-3 stroke-[3]" /> : <AlertIcon className="h-3 w-3 stroke-[3]" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-brown-1">{label}</div>
                    {sub && <div className="text-brown-2">{sub}</div>}
                    {fix && <div className="mt-1 font-medium text-rose-800">{fix}</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
