import { useEffect, useState } from 'react'
import { adminCall, problem } from './api'
import { Btn, Field, input, SaveMessage, useSave } from './ui'

/** Shrinks Hema's QR photo to at most 600px (a QR stays sharp) and returns a PNG data URL */
async function qrDataUrl(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const png = canvas.toDataURL('image/png')
  return png.length < 400_000 ? png : canvas.toDataURL('image/jpeg', 0.9)
}

/**
 * Settings: UPI ID and QR, lead times, courier rates, the store open/closed switch with a
 * "back on" message, and an announcement banner for every page.
 */
export default function SettingsAdmin({ onSaved }) {
  const [s, setS] = useState(null)
  const [error, setError] = useState('')
  const save = useSave()
  useEffect(() => {
    adminCall('settings').then((r) => (r.ok ? setS(r.data.settings) : setError(problem(r))))
  }, [])
  if (error) return <p className="font-bold text-error">{error}</p>
  if (!s) return <p className="text-brown-2">Loading…</p>

  const set = (k) => (e) => setS({ ...s, [k]: e.target.value })
  const rate = (tier, zone) => (e) => setS({ ...s, courierRates: { ...s.courierRates, [tier]: { ...s.courierRates[tier], [zone]: e.target.value.replace(/\D/g, '') } } })
  const err = (k) => (save.fields?.[k] ? 'Please check this.' : undefined)

  const submit = (patch) =>
    save.run(async () => {
      const r = await adminCall('updateSettings', patch)
      if (r.ok) {
        setS(r.data.settings)
        onSaved?.()
      }
      return r
    })

  const saveAll = () =>
    submit({
      upiId: s.upiId,
      upiName: s.upiName,
      leadStandard: Number(s.leadStandard),
      leadDrawingExtra: Number(s.leadDrawingExtra),
      courierRates: Object.fromEntries(Object.entries(s.courierRates).map(([t, z]) => [t, { karnataka: Number(z.karnataka), outside: Number(z.outside) }])),
      storeOpen: s.storeOpen,
      closedMessage: s.closedMessage,
      announcement: s.announcement,
    })

  const onQr = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      submit({ upiQr: await qrDataUrl(file) })
    } catch {
      save.run(async () => ({ ok: false, error: 'fields', fields: { upiQr: 'image' } }))
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="t-h2">Settings</h1>

      <section className="space-y-3 rounded-card border border-line bg-[#fffcf5] p-4">
        <h2 className="t-h3">Payment (UPI)</h2>
        <Field label="Your UPI ID" hint={s.upiIdFromEnv ? `Now using ${s.effectiveUpiId} from Netlify. Type one here to change it.` : 'For example: dreamkitchen@okaxis'} error={err('upiId')}>
          <input className={input} value={s.upiId} onChange={set('upiId')} autoCapitalize="none" autoComplete="off" />
        </Field>
        <Field label="Name customers see in their UPI app">
          <input className={input} value={s.upiName} onChange={set('upiName')} maxLength={40} />
        </Field>
        <div>
          <p className="font-bold">Your UPI QR code</p>
          {s.qrUrl ? <img src={s.qrUrl} alt="Your current UPI QR" className="mt-2 h-40 w-40 rounded-control border border-line bg-white object-contain p-1" /> : <p className="t-small text-brown-2">None yet. Customers then see your UPI ID and a "Pay with UPI app" button.</p>}
          <label className="mt-2 inline-flex min-h-12 cursor-pointer items-center rounded-control border-[1.5px] border-brown px-4 font-bold">
            {s.qrUrl ? 'Change QR photo' : 'Add QR photo'}
            <input type="file" accept="image/*" className="sr-only" onChange={onQr} />
          </label>
          {s.hasQr && (
            <Btn tone="light" className="ml-2" onClick={() => submit({ upiQr: null })}>
              Remove QR
            </Btn>
          )}
          {err('upiQr') && <p className="t-small font-bold text-error">That photo could not be used. Try a clear screenshot of your QR.</p>}
        </div>
      </section>

      <section className="space-y-3 rounded-card border border-line bg-[#fffcf5] p-4">
        <h2 className="t-h3">Shop open or closed</h2>
        <label className="flex min-h-12 items-center gap-3 font-bold">
          <input type="checkbox" className="h-6 w-6 accent-ink" checked={s.storeOpen} onChange={(e) => setS({ ...s, storeOpen: e.target.checked })} />
          Taking orders
        </label>
        <Field label="Message while closed" hint="For example: Back on 2 November. Shown on every page while closed.">
          <input className={input} value={s.closedMessage} onChange={set('closedMessage')} maxLength={200} />
        </Field>
        <Field label="Announcement (optional)" hint="A short line under the header on every page, e.g. Diwali orders close on 25 Oct. Leave empty for none.">
          <input className={input} value={s.announcement} onChange={set('announcement')} maxLength={200} />
        </Field>
      </section>

      <section className="space-y-3 rounded-card border border-line bg-[#fffcf5] p-4">
        <h2 className="t-h3">Time needed before dispatch</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Every order (working days)" error={err('leadStandard')}>
            <input className={input} inputMode="numeric" value={s.leadStandard} onChange={(e) => setS({ ...s, leadStandard: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label="Extra for drawings (days)" error={err('leadDrawingExtra')}>
            <input className={input} inputMode="numeric" value={s.leadDrawingExtra} onChange={(e) => setS({ ...s, leadDrawingExtra: e.target.value.replace(/\D/g, '') })} />
          </Field>
        </div>
      </section>

      <section className="space-y-3 rounded-card border border-line bg-[#fffcf5] p-4">
        <h2 className="t-h3">Courier charges (₹)</h2>
        <p className="t-small text-brown-2">Small = every order without a 500 g or 700 g Delight Box. Large = with one. One charge per order.</p>
        {err('courierRates') && <p className="t-small font-bold text-error">Each rate must be a number from 0 to 2000.</p>}
        <div className="grid grid-cols-3 items-center gap-2">
          <span />
          <span className="t-small font-bold">Karnataka</span>
          <span className="t-small font-bold">Outside</span>
          {['small', 'large'].map((tier) => [
            <span key={tier} className="font-bold capitalize">
              {tier}
            </span>,
            <input key={`${tier}k`} className={input} inputMode="numeric" aria-label={`${tier}, Karnataka`} value={s.courierRates[tier].karnataka} onChange={rate(tier, 'karnataka')} />,
            <input key={`${tier}o`} className={input} inputMode="numeric" aria-label={`${tier}, outside Karnataka`} value={s.courierRates[tier].outside} onChange={rate(tier, 'outside')} />,
          ])}
        </div>
      </section>

      <div className="sticky bottom-20 rounded-card bg-cream/95 py-2">
        <Btn className="w-full" onClick={saveAll} disabled={save.status === 'saving'} data-admin-save-settings>
          Save settings
        </Btn>
        <div className="mt-2 text-center">
          <SaveMessage save={save} />
        </div>
      </div>
    </div>
  )
}
