import { useCallback, useEffect, useState } from 'react'
import { isDemo, adminCall } from './api'
import { Btn, card, ErrorText, Loading, PageTitle } from './ui'
import { AlertIcon, CheckIcon } from '../components/icons'

// What to do for each problem, in plain words. "Step N" = docs/SETUP-BACKEND.md.
const FIX = {
  supabase: {
    noUrl: 'SUPABASE_URL is missing in Netlify. Setup guide, steps 2–5.',
    noServiceKey: 'The Supabase secret key is missing in Netlify. Setup guide, step 5.',
    keyRefused: 'Supabase refused the secret key. Copy it again (setup guide, step 3) into Netlify, then redeploy.',
    unreachable: 'Supabase doesn’t answer. Check SUPABASE_URL. If Supabase emailed you that the project is paused, open it and tap Restore.',
    noTables: 'The database setup hasn’t been run yet. Setup guide, step 4: run supabase/setup-all.sql.',
    noUpdate: 'Run supabase/setup-all.sql again (setup guide, step 4). It adds the newest parts and is safe to run twice.',
    noBucket: 'Run supabase/setup-all.sql again (setup guide, step 4): it makes the photo storage.',
    noAnonKey: 'SUPABASE_ANON_KEY (the publishable key) is missing in Netlify. The admin login needs it. Setup guide, step 5.',
    noAdmin: 'No admin login yet. Setup guide, step 6: make the login.',
  },
  resend: {
    noKey: 'The Resend key is missing in Netlify, so no emails are sent. Setup guide, step 7.',
    badKey: 'The Resend key doesn’t look right: it starts with re_. Copy it again from Resend (step 7).',
    noFrom: 'Emails still come from Resend’s test sender, which only reaches the Resend account’s own inbox: customers get no emails. Verify the domain in Resend and set EMAIL_FROM (setup guide, step 7).',
  },
  razorpay: {
    noKeys: 'Not set up yet. Until it is, customers pay by UPI (if set below) or order on WhatsApp. Setup guide, step 9.',
    oneKey: 'Only one of the two Razorpay keys is in Netlify. Add both (setup guide, step 9).',
    noWebhook: 'The keys are set, but the webhook isn’t. Setup guide, step 9.3: add the webhook and its secret.',
  },
  email: { noEmail: 'No address for order alerts. Add it in Settings, or HEMA_EMAIL in Netlify.' },
  upi: { noUpi: 'Neither Razorpay nor UPI is set, so the website says “Online ordering opens soon – WhatsApp us”. Add the UPI ID in Settings, or set up Razorpay.' },
  keepAlive: {
    never: 'It hasn’t run yet. It runs every morning at 9:00. To run it now: Netlify → Logs → Functions → keep-alive → Run now (setup guide, step 8).',
    late: 'It hasn’t run for over 2 days. Open Netlify → Logs → Functions → keep-alive to see why, and tap Run now.',
    noDatabase: 'Needs the database first (Supabase, above).',
  },
  address: { mismatch: 'Netlify’s main address is not the one in the website’s code (site.url in src/config/site.js). Links in Google, the sitemap and shared links use the code’s one. Setup guide, step 1.' },
}

const DEMO = {
  mode: 'demo',
  supabase: { ok: true, problem: null },
  resend: { ok: true, problem: null },
  razorpay: { ok: false, problem: 'noKeys' },
  email: { ok: true, problem: null },
  upi: { ok: true, set: true, problem: null },
  keepAlive: { ok: true, lastRunAt: new Date().toISOString(), problem: null },
  address: { ok: true, url: 'https://your-domain.in', problem: null },
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

  const rows = data && [
    ['supabase', 'Supabase (database, logins, photos)', data.supabase],
    ['resend', 'Resend (emails)', data.resend],
    ['razorpay', 'Razorpay (online payments)', data.razorpay],
    ['email', 'Order alert email', data.email],
    ['upi', 'UPI (backup payment)', data.upi],
    ['keepAlive', 'Daily keep-alive (stops the free database pausing)', data.keepAlive],
    ['address', 'Website address', data.address],
  ].filter(([, , x]) => x)
  const note = (k, x) => {
    if (k === 'supabase' && x.practice) return 'Practice database on this computer (not the live one).'
    if (k === 'razorpay' && x.ok && x.testMode) return 'TEST keys: everything works, but real customers can’t pay. Swap in the live keys (step 9.5) when ready.'
    if (k === 'razorpay' && x.ok) return 'Live. Payments are confirmed automatically.'
    if (k === 'upi' && x.notNeeded) return 'Not needed: Razorpay is on.'
    if (k === 'upi' && x.set) return 'Set. Used only while Razorpay isn’t set up.'
    if (k === 'keepAlive' && x.lastRunAt) return `Last run: ${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(x.lastRunAt))}${x.runs ? ` (${x.runs} runs so far)` : ''}.`
    if (k === 'address') return x.served && !x.ok ? `Code: ${x.url}. Netlify: ${x.served}.` : `${x.url}`
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
      <p className="text-brown-2">Each part of the website, and what to do if it isn’t ready. The steps are in the setup guide (docs/SETUP-BACKEND.md). After changing anything in Netlify, redeploy, then check again.</p>
      <ErrorText>{error}</ErrorText>
      {!data && !error && <Loading />}
      {rows && (
        <ul className="space-y-3" data-admin-setup>
          {rows.map(([k, label, x]) => (
            <li key={k} className={`${card} flex gap-3 ${x.ok ? '' : 'border-error'}`} data-admin-setup-row={k} data-ok={x.ok ? 'yes' : 'no'}>
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${x.ok ? 'bg-[#1a6b3a] text-white' : 'bg-error text-white'}`} aria-hidden="true">
                {x.ok ? <CheckIcon className="h-6 w-6" /> : <AlertIcon className="h-6 w-6" />}
              </span>
              <div className="min-w-0">
                <p className="font-bold">
                  {label}: <span className={x.ok ? 'text-[#1a6b3a]' : 'text-error'}>{x.ok ? 'OK' : 'Not ready'}</span>
                </p>
                {x.problem && <p className="mt-1">{FIX[k]?.[x.problem] || x.problem}</p>}
                {note(k, x) && <p className="t-small mt-1 text-brown-2">{note(k, x)}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {data?.mode === 'demo' && <p className="t-small text-brown-2">In the demo this list is an example.</p>}
    </div>
  )
}
