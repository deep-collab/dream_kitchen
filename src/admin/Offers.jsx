import { useState } from 'react'
import { adminCall } from './api'
import { Btn, card, day, ErrorText, Field, input, LinkBtn, Loading, PageTitle, Pill, SaveMessage, useAdminData, useSave } from './ui'
import { ImageIcon, InfoIcon } from '../components/icons'
import { smallPhoto } from '../lib/productPhoto'
import { OFFER_MAX } from '../lib/offers'
import { addDaysISO } from '../lib/dates'
import { Counter, PhotoButtons, productPhotoFiles } from './photos'

const STATUS = {
  live: ['Live', 'good', 'On the website now'],
  scheduled: ['Scheduled', 'warn', 'Shows from its start date'],
  ended: ['Ended', 'plain', 'Its end date has passed'],
  off: ['Off', 'bad', 'Switched off: not on the website'],
}

const FIELD_ERRORS = {
  title: 'Write the title in English.',
  message: 'Write the message in English too.',
  button: 'Write the button text in English too.',
  link: 'Choose where the button goes.',
  startsOn: 'Choose the start date.',
  endsOn: { required: 'Choose the end date.', beforeStart: 'The end date is before the start date.', past: 'The end date has already passed. Choose today or a later day.' },
}
const errorText = (fields, key) => {
  const e = fields?.[key]
  if (!e) return ''
  const words = FIELD_ERRORS[key]
  return typeof words === 'string' ? words : words[e] || words.required
}

const blank = (today) => ({ titleEn: '', titleKn: '', messageEn: '', messageKn: '', buttonEn: '', buttonKn: '', link: '', startsOn: today, endsOn: addDaysISO(today, 7), active: true })

/** "24 Oct – 31 Oct" (both days included, Indian dates) */
const dates = (o) => (o.startsOn === o.endsOn ? day(o.startsOn) : `${day(o.startsOn)} – ${day(o.endsOn)}`)

/**
 * Admin -> Offers: Hema's offer banners on the website (top of Home, a slim strip on the Menu
 * page). Each has a title, a short message, an optional photo, one button to a product or a menu
 * section, start and end dates (Indian time, both days included) and an On/Off switch. Offers
 * only show a banner: they never change a price.
 */
export default function Offers() {
  const { data, error, setData } = useAdminData(() => adminCall('offers'), [])
  const [editing, setEditing] = useState(null) // null | 'new' | an offer
  const [flash, setFlash] = useState('')
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  const linkName = Object.fromEntries(data.links.map((l) => [l.value, l.label]))
  const done = (next, message) => {
    setData(next)
    setEditing(null)
    setFlash(message)
    requestAnimationFrame(() => window.scrollTo({ top: 0 }))
  }

  if (editing)
    return (
      <OfferForm
        key={editing === 'new' ? 'new' : editing.id}
        offer={editing === 'new' ? null : editing}
        today={data.today}
        links={data.links}
        onDone={done}
        onCancel={() => setEditing(null)}
      />
    )

  return (
    <div>
      <PageTitle>Offers</PageTitle>
      <PriceNote />
      <Btn
        tone="gold"
        className="mt-4 min-h-14 w-full text-lg"
        onClick={() => {
          setFlash('')
          setEditing('new')
        }}
        data-admin-add-offer
      >
        + Add new offer
      </Btn>
      {flash && (
        <p role="status" className="mt-3 font-bold text-[#1a6b3a]" data-admin-offer-flash>
          {flash}
        </p>
      )}
      {data.offers.length === 0 ? (
        <p className="mt-6 text-brown-2">No offers yet. When there is no live offer, the website shows no banner.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {data.offers.map((o) => (
            <li key={o.id}>
              <OfferCard offer={o} linkName={linkName} onEdit={() => {
                  setFlash('')
                  setEditing(o)
                }}
                onChanged={(next, message) => {
                  setData(next)
                  setFlash(message)
                }} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PriceNote() {
  return (
    <div className="mt-2 rounded-card bg-champagne p-3" data-admin-offer-note>
      <p className="flex items-start gap-2">
        <InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          Offers only show a banner on the website. They do <strong>not</strong> change prices. To change a price, go to Menu.
        </span>
      </p>
      <LinkBtn tone="light" to="/menu" className="mt-2">
        Go to Menu
      </LinkBtn>
    </div>
  )
}

function OfferCard({ offer: o, linkName, onEdit, onChanged }) {
  const save = useSave()
  const [confirming, setConfirming] = useState(false)
  const [label, tone, meaning] = STATUS[o.status]
  const run = (action, body, message) =>
    save.run(async () => {
      const r = await adminCall(action, { id: o.id, ...body })
      if (r.ok) onChanged(r.data, message)
      return r
    }, message)
  return (
    <div className={`${card} ${o.status === 'live' ? 'border-[#1a6b3a]' : ''}`} data-admin-offer={o.id} data-admin-offer-status={o.status}>
      <div className="flex gap-3">
        {o.photo ? (
          <img src={smallPhoto(o.photo)} alt="" width="64" height="64" className="h-16 w-16 shrink-0 rounded-control bg-ink object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-control bg-ink text-gold">
            <ImageIcon className="h-7 w-7" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={tone}>{label}</Pill>
            <span className="t-small text-brown-2">{meaning}</span>
          </div>
          <p className="mt-1 font-bold">{o.titleEn}</p>
          {o.messageEn && <p className="t-small text-brown-2">{o.messageEn}</p>}
        </div>
      </div>
      <dl className="t-small mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="font-bold">Dates</dt>
        <dd>{dates(o)}</dd>
        <dt className="font-bold">Button</dt>
        <dd>{o.link ? `${o.buttonEn || 'See offer'} → ${linkName[o.link] || 'a product no longer on the menu'}` : 'No button'}</dd>
      </dl>
      {confirming ? (
        <div className="mt-3 rounded-control border-[1.5px] border-error bg-error-bg p-3" role="alert">
          <p className="font-bold">Delete “{o.titleEn}”? This cannot be undone.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Btn tone="danger" onClick={() => run('deleteOffer', {}, 'Offer deleted.')} disabled={save.status === 'saving'} data-admin-offer-delete-yes>
              Yes, delete it
            </Btn>
            <Btn tone="light" onClick={() => setConfirming(false)}>
              No, keep it
            </Btn>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Btn onClick={onEdit} data-admin-offer-edit>
            Edit
          </Btn>
          <Btn
            tone="light"
            onClick={() => run('setOfferActive', { active: !o.active }, o.active ? 'Offer turned off. It is no longer on the website.' : 'Offer turned on.')}
            disabled={save.status === 'saving'}
            data-admin-offer-toggle
          >
            {o.active ? 'Turn off' : 'Turn on'}
          </Btn>
          <Btn tone="danger" onClick={() => setConfirming(true)} data-admin-offer-delete>
            Delete
          </Btn>
        </div>
      )}
      {save.status === 'error' && (
        <div className="mt-2">
          <SaveMessage save={save} />
        </div>
      )}
    </div>
  )
}

/** One offer's form: a new one, or an offer to change */
function OfferForm({ offer, today, links, onDone, onCancel }) {
  const [form, setForm] = useState(() => (offer ? { ...offer } : blank(today)))
  const [photo, setPhoto] = useState(null) // a File, for a new offer
  const [current, setCurrent] = useState(offer)
  const save = useSave()
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const fields = save.fields || {}
  const text = (key, max, props = {}) => {
    const Tag = props.rows ? 'textarea' : 'input'
    return (
      <>
        <Tag className={input} maxLength={max} value={form[key]} onChange={(e) => set({ [key]: e.target.value })} {...props} />
        <Counter value={form[key]} max={max} />
      </>
    )
  }

  const submit = () =>
    save.run(async () => {
      const r = await adminCall('saveOffer', {
        id: offer?.id,
        title: { en: form.titleEn, kn: form.titleKn },
        message: { en: form.messageEn, kn: form.messageKn },
        button: { en: form.buttonEn, kn: form.buttonKn },
        link: form.link,
        startsOn: form.startsOn,
        endsOn: form.endsOn,
        active: form.active,
      })
      if (!r.ok) return r
      let next = r.data
      let message = offer ? 'Offer saved.' : 'Offer added.'
      if (photo) {
        const files = await productPhotoFiles(photo)
        const p = files ? await adminCall('offerPhoto', { id: r.data.id, ...files }) : null
        if (p?.ok) next = p.data
        else message += ' The photo could not be used: tap Edit and Change photo to try another one.'
      }
      const saved = next.offers.find((o) => o.id === r.data.id)
      if (saved) message += ` ${STATUS[saved.status][2]}.`
      onDone(next, message)
      return r
    })

  const groups = [...new Set(links.map((l) => l.group))]
  return (
    <div>
      <PageTitle>{offer ? 'Change offer' : 'New offer'}</PageTitle>
      <PriceNote />
      <div className={`${card} mt-4 space-y-4`} data-admin-offer-form>
        <Field label="Title in English" error={errorText(fields, 'title')}>
          {text('titleEn', OFFER_MAX.title, { 'data-admin-offer-title': '' })}
        </Field>
        <Field label="Title in Kannada (optional)" hint="Empty: Kannada readers see the English.">
          {text('titleKn', OFFER_MAX.title, { lang: 'kn' })}
        </Field>
        <Field label="Short message in English (optional)" hint="One short line, e.g. “Order by Sunday for Diwali delivery.”" error={errorText(fields, 'message')}>
          {text('messageEn', OFFER_MAX.message, { rows: 2, 'data-admin-offer-message': '' })}
        </Field>
        <Field label="Short message in Kannada (optional)">{text('messageKn', OFFER_MAX.message, { rows: 2, lang: 'kn' })}</Field>

        <Field label="Where the button goes" hint="Customers tap the banner to go there." error={errorText(fields, 'link')}>
          <select className={input} value={form.link} onChange={(e) => set({ link: e.target.value })} data-admin-offer-link>
            <option value="">No button</option>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {links
                  .filter((l) => l.group === g)
                  .map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
              </optgroup>
            ))}
            {form.link && !links.some((l) => l.value === form.link) && <option value={form.link}>(no longer on the menu: choose another)</option>}
          </select>
        </Field>
        {form.link && (
          <>
            <Field label="Button text in English (optional)" hint="Empty: “See offer”." error={errorText(fields, 'button')}>
              {text('buttonEn', OFFER_MAX.button, { placeholder: 'See offer', 'data-admin-offer-button': '' })}
            </Field>
            <Field label="Button text in Kannada (optional)">{text('buttonKn', OFFER_MAX.button, { lang: 'kn', placeholder: 'ಆಫರ್ ನೋಡಿ' })}</Field>
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start date" hint="Shows from the start of this day (India time)." error={errorText(fields, 'startsOn')}>
            <input type="date" className={input} value={form.startsOn} onChange={(e) => set({ startsOn: e.target.value })} data-admin-offer-start />
          </Field>
          <Field label="End date" hint="Shows until the end of this day." error={errorText(fields, 'endsOn')}>
            <input type="date" className={input} value={form.endsOn} min={today} onChange={(e) => set({ endsOn: e.target.value })} data-admin-offer-end />
          </Field>
        </div>

        <label className="flex min-h-12 items-center gap-3 font-bold">
          <input type="checkbox" className="h-6 w-6 accent-ink" checked={form.active} onChange={(e) => set({ active: e.target.checked })} data-admin-offer-active />
          On: show this offer on its dates
        </label>

        <div>
          <p className="font-bold">Banner photo (optional)</p>
          {current ? (
            <div className="mt-2 flex gap-3">
              {current.photo && <img src={smallPhoto(current.photo)} alt="" width="64" height="64" className="h-16 w-16 shrink-0 rounded-control bg-ink object-cover" />}
              <div className="min-w-0 flex-1">
                <PhotoButtons
                  action="offerPhoto"
                  id={current.id}
                  testId={`offer-${current.id}`}
                  hasOwn={Boolean(current.photo)}
                  onSaved={(d) => setCurrent(d.offers.find((o) => o.id === current.id) || current)}
                />
              </div>
            </div>
          ) : (
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <label htmlFor="offer-photo" className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-control border-[1.5px] border-brown px-4 font-bold">
                <ImageIcon className="h-5 w-5" /> {photo ? 'Change photo' : 'Choose a photo'}
              </label>
              <input id="offer-photo" type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] || null)} data-admin-offer-photo />
              {photo && <span className="t-small break-all">{photo.name}</span>}
            </div>
          )}
          <p className="t-small mt-1 text-brown-2">No photo: the banner shows only the words, in black and gold.</p>
        </div>

        <Preview form={form} photo={current?.photo} />

        <div className="flex flex-wrap gap-2">
          <Btn tone="gold" onClick={submit} disabled={save.status === 'saving'} data-admin-offer-save>
            {save.status === 'saving' ? 'Saving…' : offer ? 'Save offer' : 'Add offer'}
          </Btn>
          <Btn tone="light" onClick={onCancel} disabled={save.status === 'saving'}>
            Cancel
          </Btn>
        </div>
        {save.status === 'error' && <SaveMessage save={save} />}
      </div>
    </div>
  )
}

/** How the banner will look on a phone (English) */
function Preview({ form, photo }) {
  if (!form.titleEn.trim()) return null
  return (
    <div>
      <p className="font-bold">How it looks on the website</p>
      <div className="mt-1 rounded-card border border-gold/45 bg-[#1b1612] p-3 text-cream" aria-hidden="true">
        <div className="flex items-center gap-3">
          {photo && <img src={smallPhoto(photo)} alt="" width="56" height="56" className="h-14 w-14 shrink-0 rounded-control object-cover" />}
          <div className="min-w-0">
            <p className="font-bold text-gold-light">{form.titleEn}</p>
            {form.messageEn && <p className="t-small">{form.messageEn}</p>}
          </div>
        </div>
        {form.link && <span className="mt-2 inline-flex min-h-10 items-center rounded-control border-[1.5px] border-gold px-4 font-bold text-cream">{form.buttonEn || 'See offer'} ›</span>}
      </div>
    </div>
  )
}
