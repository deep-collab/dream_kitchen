import { useEffect, useState } from 'react'
import { adminCall } from './api'
import { Btn, card, ErrorText, Field, input, Loading, PageTitle, SaveMessage, useAdminData, useSave } from './ui'

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

const TIER_HINT = { small: 'Everything up to 250 g', large: 'Delight Box 500 g and 700 g', xl: '750 g tubs' }

/**
 * Settings: courier rates, time before dispatch, the announcement banner, the shop open/closed
 * switch with a "back on" message, where order emails go, and the UPI fallback (ID + QR), which
 * is used only while Razorpay isn't set up.
 */
export default function SettingsAdmin({ onSaved }) {
  const { data, error } = useAdminData(() => adminCall('settings'), [])
  const [s, setS] = useState(null)
  const save = useSave()
  const qrSave = useSave()
  useEffect(() => {
    if (data && !s) setS(data.settings)
  }, [data, s])
  if (error) return <ErrorText>{error}</ErrorText>
  if (!s) return <Loading />

  const set = (k) => (e) => setS({ ...s, [k]: e.target.value })
  const rate = (tier, zone) => (e) => setS({ ...s, courierRates: { ...s.courierRates, [tier]: { ...s.courierRates[tier], [zone]: e.target.value.replace(/\D/g, '') } } })
  const err = (k) => (save.fields?.[k] ? 'Please check this.' : undefined)

  const submit = (patch, which = save, text) =>
    which.run(async () => {
      const r = await adminCall('updateSettings', patch)
      if (r.ok) {
        setS(r.data.settings)
        onSaved?.()
      }
      return r
    }, text)

  const saveAll = () =>
    submit({
      upiId: s.upiId,
      upiName: s.upiName,
      alertEmail: s.alertEmail,
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
      submit({ upiQr: await qrDataUrl(file) }, qrSave, 'QR saved')
    } catch {
      qrSave.run(async () => ({ ok: false, error: 'fields', fields: { upiQr: 'image' } }))
    }
  }

  return (
    <div className="space-y-6">
      <PageTitle>Settings</PageTitle>

      <section className={`${card} space-y-3`}>
        <h2 className="t-h3">Shop open or closed</h2>
        <label className="flex min-h-12 items-center gap-3 font-bold">
          <input type="checkbox" className="h-6 w-6 accent-ink" checked={s.storeOpen} onChange={(e) => setS({ ...s, storeOpen: e.target.checked })} data-admin-store-open />
          Taking orders
        </label>
        <Field label="“Back on” message while closed" hint="For example: Back on 2 November. Shown on every page while closed.">
          <input className={input} value={s.closedMessage} onChange={set('closedMessage')} maxLength={200} />
        </Field>
        <Field label="Announcement banner (optional)" hint="A short line under the header on every page, e.g. Diwali orders close on 25 Oct. Leave empty for none.">
          <input className={input} value={s.announcement} onChange={set('announcement')} maxLength={200} data-admin-announcement />
        </Field>
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="t-h3">Courier charges (₹)</h2>
        <p className="t-small text-brown-2">One charge per order: the highest one among its items.</p>
        {err('courierRates') && <p className="t-small font-bold text-error">Each charge must be a number from 0 to 2000.</p>}
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] items-end gap-2">
          <span />
          <span className="t-small font-bold">Karnataka</span>
          <span className="t-small font-bold">Outside</span>
          {Object.keys(s.courierRates).map((tier) => [
            <span key={tier}>
              <span className="block font-bold">{s.tierNames?.[tier] || tier}</span>
              <span className="t-small block leading-tight text-brown-2">{TIER_HINT[tier]}</span>
            </span>,
            <input key={`${tier}k`} className={input} inputMode="numeric" aria-label={`${s.tierNames?.[tier]}, Karnataka`} value={s.courierRates[tier].karnataka} onChange={rate(tier, 'karnataka')} />,
            <input key={`${tier}o`} className={input} inputMode="numeric" aria-label={`${s.tierNames?.[tier]}, outside Karnataka`} value={s.courierRates[tier].outside} onChange={rate(tier, 'outside')} />,
          ])}
        </div>
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="t-h3">Time needed before dispatch</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Normal orders (working days)" error={err('leadStandard')}>
            <input className={input} inputMode="numeric" value={s.leadStandard} onChange={(e) => setS({ ...s, leadStandard: e.target.value.replace(/\D/g, '') })} />
          </Field>
          <Field label="Extra for drawings (days)" error={err('leadDrawingExtra')}>
            <input className={input} inputMode="numeric" value={s.leadDrawingExtra} onChange={(e) => setS({ ...s, leadDrawingExtra: e.target.value.replace(/\D/g, '') })} />
          </Field>
        </div>
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="t-h3">Order alert emails</h2>
        <Field
          label="Send new orders, class bookings and messages to"
          hint={s.alertEmailFromEnv && !s.alertEmail ? `Now going to ${s.alertEmailFromEnv} (the standard address). Type another address to change it.` : 'Use the email you signed up to Resend with (see the setup guide).'}
          error={err('alertEmail') && 'Please type a full email address, like name@gmail.com.'}
        >
          <input className={input} type="email" inputMode="email" autoCapitalize="none" value={s.alertEmail} onChange={set('alertEmail')} data-admin-alert-email />
        </Field>
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className="t-h3">UPI (only while Razorpay isn’t set up)</h2>
        <p className={`t-small font-bold ${s.razorpayOn ? 'text-[#1a6b3a]' : 'text-brown-2'}`}>
          {s.razorpayOn ? 'Razorpay is on, so customers pay through Razorpay and these UPI details are not shown.' : 'Razorpay isn’t set up yet. Until it is, customers pay to this UPI ID and you check each payment by hand.'}
        </p>
        <Field label="Your UPI ID" hint={s.upiIdFromEnv ? `Now using ${s.effectiveUpiId} from Netlify. Type one here to change it.` : 'For example: dreamkitchen@okaxis'} error={err('upiId')}>
          <input className={input} value={s.upiId} onChange={set('upiId')} autoCapitalize="none" autoComplete="off" />
        </Field>
        <Field label="Name customers see in their UPI app">
          <input className={input} value={s.upiName} onChange={set('upiName')} maxLength={40} />
        </Field>
        <div>
          <p className="font-bold">Your UPI QR code</p>
          {s.qrUrl ? <img src={s.qrUrl} alt="Your current UPI QR" className="mt-2 h-40 w-40 rounded-control border border-line bg-white object-contain p-1" /> : <p className="t-small text-brown-2">None yet. Customers then see your UPI ID and a “Pay with UPI app” button.</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <label className="inline-flex min-h-12 cursor-pointer items-center rounded-control border-[1.5px] border-brown px-4 font-bold">
              {s.qrUrl ? 'Change QR photo' : 'Add QR photo'}
              <input type="file" accept="image/*" className="sr-only" onChange={onQr} />
            </label>
            {s.hasQr && (
              <Btn tone="light" onClick={() => submit({ upiQr: null }, qrSave, 'QR removed')}>
                Remove QR
              </Btn>
            )}
          </div>
          <SaveMessage save={qrSave} />
          {qrSave.fields?.upiQr && <p className="t-small font-bold text-error">That photo could not be used. Try a clear screenshot of your QR.</p>}
        </div>
      </section>

      <div className="sticky bottom-20 rounded-card bg-cream/95 py-2">
        <Btn tone="gold" className="w-full" onClick={saveAll} disabled={save.status === 'saving'} data-admin-save-settings>
          Save settings
        </Btn>
        <div className="mt-2 text-center">
          <SaveMessage save={save} />
        </div>
      </div>
    </div>
  )
}
