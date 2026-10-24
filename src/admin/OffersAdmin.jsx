import { useState } from 'react'
import { adminCall } from './api'
import { Btn, card, day, ErrorText, Field, input, Loading, PageTitle, Pill, SaveMessage, useAdminData, useSave } from './ui'
import { CountedField, fieldError, PhotoButton, photoDataUrl } from './MenuAdmin'
import { addDaysISO } from '../lib/dates'
import { ImageIcon } from '../components/icons'

const STATUS = {
  live: ['Live now', 'good'],
  scheduled: ['Starts later', 'warn'],
  ended: ['Ended', 'plain'],
  off: ['Off', 'bad'],
}
const DATE_WORDS = { date: 'Pick a date.', beforeStart: 'The end date is before the start date.' }

/** An offer banner photo from Hema's phone: wide (2 : 1), 1200 × 600 */
const bannerDataUrl = (file) => photoDataUrl(file, { width: 1200, height: 600 })

/**
 * Hema's offers: a banner at the top of the home page (they take turns when there are several)
 * and a slim strip on the menu page, between the start and end dates (Indian time, both days
 * included). Display only: an offer never changes a price; the button just takes customers to a
 * category or a product.
 */
export default function OffersAdmin() {
  const { data, error, setData } = useAdminData(() => adminCall('offers'), [])
  const [editing, setEditing] = useState(null) // null | 'new' | offer id
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  const onSaved = (next) => {
    setData(next)
    setEditing(null)
  }
  return (
    <div>
      <PageTitle
        action={
          editing !== 'new' && (
            <Btn tone="gold" onClick={() => setEditing('new')} data-admin-add-offer>
              + Add new offer
            </Btn>
          )
        }
      >
        Offers
      </PageTitle>
      <p className="t-small text-brown-2">
        Offers show at the top of the home page and on the menu page, from the start date to the end date (Indian time). They don’t change any price.
      </p>
      {editing === 'new' && <OfferForm data={data} onSaved={onSaved} onCancel={() => setEditing(null)} />}
      {data.offers.length === 0 && editing !== 'new' && <p className={`${card} mt-4`}>No offers yet. Tap “+ Add new offer” to make one.</p>}
      <ul className="mt-4 space-y-3">
        {data.offers.map((o) => (
          <li key={o.id}>{editing === o.id ? <OfferForm data={data} offer={o} onSaved={onSaved} onCancel={() => setEditing(null)} /> : <OfferCard offer={o} data={data} onEdit={() => setEditing(o.id)} onSaved={setData} />}</li>
        ))}
      </ul>
    </div>
  )
}

const targetName = (link, targets) => {
  const [type, id] = link.split(':')
  const list = type === 'category' ? targets.categories : targets.products
  return list.find((x) => x.id === id)?.name || id
}

function OfferCard({ offer: o, data, onEdit, onSaved }) {
  const save = useSave()
  const [confirming, setConfirming] = useState(false)
  const [label, tone] = STATUS[o.status]
  const run = (action, body, text) =>
    save.run(async () => {
      const r = await adminCall(action, body)
      if (r.ok) onSaved(r.data)
      return r
    }, text)
  return (
    <div className={card} data-admin-offer={o.id}>
      <div className="flex gap-3">
        {o.photo ? (
          <img src={o.photo} alt="" width="96" height="48" className="h-12 w-24 shrink-0 rounded-control bg-ink object-cover" />
        ) : (
          <span className="flex h-12 w-24 shrink-0 items-center justify-center rounded-control bg-ink text-gold">
            <ImageIcon className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold [overflow-wrap:anywhere]">{o.titleEn}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Pill tone={tone}>{label}</Pill>
            <span className="t-small text-brown-2">
              {day(o.startsOn)} – {day(o.endsOn)}
            </span>
          </div>
        </div>
      </div>
      {o.messageEn && <p className="t-small mt-2">{o.messageEn}</p>}
      {o.link && (
        <p className="t-small mt-1 text-brown-2">
          Button “{o.buttonEn}” → {targetName(o.link, data.targets)}
          {!o.linkOk && <strong className="text-error"> (hidden from the menu, so the button doesn’t show)</strong>}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <Btn tone="light" onClick={onEdit} data-admin-offer-edit>
          Edit
        </Btn>
        <Btn tone="light" onClick={() => run('saveOffer', { id: o.id, active: !o.active }, o.active ? 'Turned off' : 'Turned on')} disabled={save.status === 'saving'} data-admin-offer-toggle>
          {o.active ? 'Turn off' : 'Turn on'}
        </Btn>
        {!confirming && (
          <Btn tone="danger" onClick={() => setConfirming(true)} data-admin-offer-delete>
            Delete
          </Btn>
        )}
      </div>
      {confirming && (
        <div role="alertdialog" aria-label="Delete this offer?" className="mt-3 rounded-control border-[1.5px] border-error bg-error-bg p-3">
          <p className="font-bold">Delete “{o.titleEn}”? This can’t be undone.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn tone="danger" onClick={() => run('deleteOffer', { id: o.id }, 'Deleted')} disabled={save.status === 'saving'} data-admin-offer-delete-yes>
              Yes, delete it
            </Btn>
            <Btn tone="light" onClick={() => setConfirming(false)}>
              No, keep it
            </Btn>
          </div>
        </div>
      )}
      <div className="mt-2">
        <SaveMessage save={save} />
      </div>
    </div>
  )
}

function OfferForm({ data, offer, onSaved, onCancel }) {
  const [f, setF] = useState(() => ({
    titleEn: offer?.titleEn || '',
    titleKn: offer?.titleKn || '',
    messageEn: offer?.messageEn || '',
    messageKn: offer?.messageKn || '',
    buttonEn: offer?.buttonEn || 'Order now',
    buttonKn: offer?.buttonKn || '',
    link: offer?.link || '',
    startsOn: offer?.startsOn || data.today,
    endsOn: offer?.endsOn || addDaysISO(data.today, 7),
    active: offer ? offer.active : true,
    photo: offer?.photo || null, // what shows now
    image: undefined, // undefined = keep, null = remove, data URL = new
    photoError: false,
  }))
  const save = useSave()
  const set = (patch) => setF((x) => ({ ...x, ...patch }))
  const onPhoto = async (file) => {
    const image = await bannerDataUrl(file)
    if (image) set({ image, photo: image, photoError: false })
    else set({ photoError: true })
  }
  const submit = () =>
    save.run(async () => {
      const { photo, image, photoError, ...fields } = f
      const r = await adminCall('saveOffer', { ...(offer ? { id: offer.id } : {}), ...fields, ...(f.link ? {} : { buttonEn: '', buttonKn: '' }), ...(image !== undefined ? { image } : {}) })
      if (r.ok) onSaved(r.data)
      return r
    }, 'Saved')

  const shown = (key, words = {}) => (save.status === 'error' && save.fields?.[key] ? words[save.fields[key]] || fieldError(save, key) : '')
  return (
    <div className="mt-4 space-y-4 rounded-card border-2 border-gold-mid bg-[#fffcf5] p-4" data-admin-offer-form>
      <h2 className="t-h3">{offer ? 'Edit offer' : 'New offer'}</h2>
      <CountedField label="Title in English" value={f.titleEn} onChange={(v) => set({ titleEn: v })} max={60} hint="e.g. Diwali gift boxes" error={shown('titleEn')} data-admin-offer-title-en />
      <CountedField label="Title in Kannada (ಕನ್ನಡ)" value={f.titleKn} onChange={(v) => set({ titleKn: v })} max={60} lang="kn" hint="Optional" error={shown('titleKn')} />
      <CountedField label="Short message in English" value={f.messageEn} onChange={(v) => set({ messageEn: v })} max={160} multiline hint="Optional" error={shown('messageEn')} data-admin-offer-message-en />
      <CountedField label="Short message in Kannada (ಕನ್ನಡ)" value={f.messageKn} onChange={(v) => set({ messageKn: v })} max={160} multiline lang="kn" hint="Optional" error={shown('messageKn')} />

      <div className="flex flex-wrap items-center gap-3">
        {f.photo ? (
          <img src={f.photo} alt="" width="192" height="96" className="h-24 w-48 rounded-control bg-ink object-cover" />
        ) : (
          <span className="flex h-24 w-48 items-center justify-center rounded-control bg-ink text-gold">
            <ImageIcon className="h-8 w-8" />
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <PhotoButton onFile={onPhoto} label={f.photo ? 'Change photo' : 'Add a banner photo'} data-admin-offer-photo />
          {f.photo && (
            <Btn tone="light" onClick={() => set({ image: null, photo: null })}>
              Remove photo
            </Btn>
          )}
        </div>
        <p className="t-small w-full text-brown-2">Optional. A wide photo works best. Without one, the banner is black and gold.</p>
        {(f.photoError || shown('photo')) && <p className="t-small font-bold text-error">That file isn’t a photo the website can use. Try another one.</p>}
      </div>

      <Field label="Button goes to" error={shown('link', { invalid: 'Pick a category or product from the list.', required: 'Pick where the button goes, or remove the button text.' })}>
        <select className={input} value={f.link} onChange={(e) => set({ link: e.target.value })} data-admin-offer-link>
          <option value="">No button</option>
          <optgroup label="A category">
            {data.targets.categories.map((c) => (
              <option key={c.id} value={`category:${c.id}`}>
                {c.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="A product">
            {data.targets.products.map((p) => (
              <option key={p.id} value={`product:${p.id}`}>
                {p.name}
                {p.forSale ? '' : ' (not for sale now)'}
              </option>
            ))}
          </optgroup>
        </select>
      </Field>
      {f.link && (
        <>
          <CountedField label="Button text in English" value={f.buttonEn} onChange={(v) => set({ buttonEn: v })} max={30} error={shown('buttonEn')} data-admin-offer-button-en />
          <CountedField label="Button text in Kannada (ಕನ್ನಡ)" value={f.buttonKn} onChange={(v) => set({ buttonKn: v })} max={30} lang="kn" hint="Optional" error={shown('buttonKn')} />
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Start date" hint="Shows from the start of this day (Indian time)" error={shown('startsOn', DATE_WORDS)}>
          <input type="date" className={input} value={f.startsOn} onChange={(e) => set({ startsOn: e.target.value })} data-admin-offer-start />
        </Field>
        <Field label="End date" hint="Shows until the end of this day" error={shown('endsOn', DATE_WORDS)}>
          <input type="date" className={input} value={f.endsOn} min={f.startsOn} onChange={(e) => set({ endsOn: e.target.value })} data-admin-offer-end />
        </Field>
      </div>

      <label className="flex min-h-12 items-center gap-3 font-bold">
        <input type="checkbox" className="h-6 w-6 accent-ink" checked={f.active} onChange={(e) => set({ active: e.target.checked })} data-admin-offer-active />
        On (show it between these dates)
      </label>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <Btn tone="gold" onClick={submit} disabled={save.status === 'saving'} data-admin-offer-save>
          {offer ? 'Save offer' : 'Add offer'}
        </Btn>
        <Btn tone="light" onClick={onCancel}>
          Cancel
        </Btn>
      </div>
      <SaveMessage save={save} />
    </div>
  )
}
