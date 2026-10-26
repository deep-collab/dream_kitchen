import { useState } from 'react'
import { adminCall } from './api'
import { Btn, card, day, ErrorText, Field, formatINR, input, Loading, PageTitle, Pill, SaveMessage, useAdminData, useSave } from './ui'
import { ImageIcon, InfoIcon, TagIcon } from '../components/icons'
import { smallPhoto } from '../lib/productPhoto'
import { OFFER_MAX } from '../lib/offers'
import { addDaysISO } from '../lib/dates'
import { Counter } from './photos'
import CropPhoto from './CropPhoto'

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
  badge: 'Write the badge in English too.',
  link: 'Choose where the button goes.',
  items: 'Some of the chosen products are no longer on the menu. Choose again.',
  deal: {
    invalid: 'Check the special price: a whole number, and less than the regular price.',
    noItems: 'Choose the products first: a special price is for products in the offer.',
    notInOffer: 'An exact price is set for a product that is not in this offer.',
  },
  startsOn: 'Choose the start date.',
  endsOn: { required: 'Choose the end date.', beforeStart: 'The end date is before the start date.', past: 'The end date has already passed. Choose today or a later day.' },
}
const errorText = (fields, key) => {
  const e = fields?.[key]
  if (!e) return ''
  const words = FIELD_ERRORS[key]
  return typeof words === 'string' ? words : words[e] || Object.values(words)[0]
}

const NO_ITEMS = { categories: [], products: [] }
const blank = (today) => ({
  titleEn: '',
  titleKn: '',
  messageEn: '',
  messageKn: '',
  buttonEn: '',
  buttonKn: '',
  badgeEn: '',
  badgeKn: '',
  link: '',
  items: NO_ITEMS,
  dealKind: 'none',
  dealValue: '',
  dealPrices: {},
  startsOn: today,
  endsOn: addDaysISO(today, 7),
  active: true,
})

/** The saved offer -> the form's fields */
function toForm(o) {
  const deal = o.deal
  const prices = {}
  if (deal?.kind === 'prices')
    for (const [id, p] of Object.entries(deal.prices)) prices[id] = typeof p === 'number' ? String(p) : Object.fromEntries(Object.entries(p).map(([s, v]) => [s, String(v)]))
  return { ...o, items: o.items || NO_ITEMS, dealKind: deal?.kind || 'none', dealValue: deal && deal.kind !== 'prices' ? String(deal.value) : '', dealPrices: prices }
}

/** "24 Oct – 31 Oct" (both days included, Indian dates) */
const dates = (o) => (o.startsOn === o.endsOn ? day(o.startsOn) : `${day(o.startsOn)} – ${day(o.endsOn)}`)
const shortDay = (iso) => new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00Z`))

/** The products an offer holds: its single products and every product of its sections */
const heldProducts = (items, choices) => choices.products.filter((p) => items.all || items.products.includes(p.id) || items.categories.includes(p.category))

function dealWords(deal) {
  if (!deal) return 'No special price (badge only)'
  if (deal.kind === 'percent') return `${deal.value}% off`
  if (deal.kind === 'amount') return `${formatINR(deal.value)} off each item`
  return 'Exact offer prices'
}

/** The offer price of one regular price, for the previews (the website and server use src/lib/offers.js) */
function offerPrice(form, productId, sizeId, price) {
  let next = null
  const v = Number(form.dealValue)
  if (form.dealKind === 'percent' && v > 0) next = Math.round((price * (100 - v)) / 100)
  if (form.dealKind === 'amount' && v > 0) next = price - v
  if (form.dealKind === 'prices') {
    const p = form.dealPrices[productId]
    const raw = typeof p === 'object' ? p?.[sizeId] : sizeId ? undefined : p
    if (raw) next = Number(raw)
  }
  if (next == null || !Number.isFinite(next)) return null
  next = Math.max(1, next)
  return next < price ? next : null
}

/**
 * Admin -> Offers: Hema's offer banners on the website (the first thing on Home, a slim strip on
 * the Menu page). Each has a title, a short message, an optional photo (cut wide for computers
 * and 16:9 for phones), start and end dates (Indian time, both days included) and an On/Off switch.
 * It can hold products (whole menu sections or single products): the banner's button then opens
 * the menu with only those, each with the offer's badge. With a special price, those products
 * cost less on the offer's dates only (on the website and in the orders).
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
        choices={data.choices}
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
              <OfferCard
                offer={o}
                linkName={linkName}
                choices={data.choices}
                onEdit={() => {
                  setFlash('')
                  setEditing(o)
                }}
                onChanged={(next, message) => {
                  setData(next)
                  setFlash(message)
                }}
              />
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
          An offer shows a banner at the top of the website. It changes prices <strong>only</strong> if you give it a special price, and only on its dates. Your regular prices stay as they are in Menu.
        </span>
      </p>
    </div>
  )
}

function OfferCard({ offer: o, linkName, choices, onEdit, onChanged }) {
  const save = useSave()
  const [confirming, setConfirming] = useState(false)
  const [label, tone, meaning] = STATUS[o.status]
  const held = heldProducts(o.items, choices)
  const run = (action, body, message) =>
    save.run(async () => {
      const r = await adminCall(action, { id: o.id, ...body })
      if (r.ok) onChanged(r.data, message)
      return r
    }, message)
  return (
    <div className={`${card} ${o.status === 'live' ? 'border-[#1a6b3a]' : ''}`} data-admin-offer={o.id} data-admin-offer-status={o.status}>
      <div className="flex gap-3">
        {o.photo || o.photoPhone ? (
          <img src={smallPhoto(o.photoPhone || o.photo)} alt="" width="96" height="54" className="h-[54px] w-24 shrink-0 rounded-control bg-ink object-cover" />
        ) : (
          <span className="flex h-[54px] w-24 shrink-0 items-center justify-center rounded-control bg-ink text-gold">
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
        {held.length > 0 ? (
          <>
            <dt className="font-bold">Products</dt>
            <dd data-admin-offer-items>
              {o.items.all ? 'Every product on the website' : `${held.length} on the menu`}, with the badge “{o.badgeEn || 'Offer'}”
            </dd>
            <dt className="font-bold">Price</dt>
            <dd data-admin-offer-deal>{dealWords(o.deal)}</dd>
            <dt className="font-bold">Button</dt>
            <dd>{o.buttonEn || 'Shop the offer'} → the menu with only these products</dd>
          </>
        ) : (
          <>
            <dt className="font-bold">Button</dt>
            <dd>{o.link ? `${o.buttonEn || 'See offer'} → ${linkName[o.link] || 'a product no longer on the menu'}` : 'No button'}</dd>
          </>
        )}
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

/** Sends the cut photos: the wide one, then the phone one. -> the offers list, or null if one failed */
async function uploadCrops(id, crops) {
  let last = null
  for (const variant of ['wide', 'phone']) {
    const r = await adminCall('offerPhoto', { id, variant, ...crops[variant] })
    if (!r.ok) return null
    last = r.data
  }
  return last
}

/** One offer's form: a new one, or an offer to change */
function OfferForm({ offer, today, links, choices, onDone, onCancel }) {
  const [form, setForm] = useState(() => (offer ? toForm(offer) : blank(today)))
  const [pickedFile, setPickedFile] = useState(null) // a photo being cut
  const [crops, setCrops] = useState(null) // { wide, phone } ready to send with a new offer
  const [current, setCurrent] = useState(offer)
  const save = useSave()
  const photoSave = useSave()
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const fields = save.fields || {}
  const held = heldProducts(form.items, choices)
  const hasItems = Boolean(form.items.all) || form.items.categories.length > 0 || form.items.products.length > 0
  const text = (key, max, props = {}) => {
    const Tag = props.rows ? 'textarea' : 'input'
    return (
      <>
        <Tag className={input} maxLength={max} value={form[key]} onChange={(e) => set({ [key]: e.target.value })} {...props} />
        <Counter value={form[key]} max={max} />
      </>
    )
  }

  const deal = () => {
    if (!hasItems || form.dealKind === 'none') return null
    if (form.dealKind === 'prices') {
      const prices = {}
      for (const p of held) {
        const v = form.dealPrices[p.id]
        if (p.sizes.length) {
          const sizes = Object.fromEntries(
            Object.entries(v && typeof v === 'object' ? v : {})
              .filter(([, x]) => x !== '')
              .map(([s, x]) => [s, Number(x)]),
          )
          if (Object.keys(sizes).length) prices[p.id] = sizes
        } else if (v !== undefined && v !== '' && typeof v !== 'object') prices[p.id] = Number(v)
      }
      return { kind: 'prices', prices }
    }
    return { kind: form.dealKind, value: Number(form.dealValue) }
  }

  const submit = () =>
    save.run(async () => {
      const r = await adminCall('saveOffer', {
        id: offer?.id,
        title: { en: form.titleEn, kn: form.titleKn },
        message: { en: form.messageEn, kn: form.messageKn },
        button: { en: form.buttonEn, kn: form.buttonKn },
        badge: { en: form.badgeEn, kn: form.badgeKn },
        link: hasItems ? '' : form.link,
        items: hasItems ? form.items : null,
        deal: deal(),
        startsOn: form.startsOn,
        endsOn: form.endsOn,
        active: form.active,
      })
      if (!r.ok) return r
      let next = r.data
      let message = offer ? 'Offer saved.' : 'Offer added.'
      if (crops) {
        const p = await uploadCrops(r.data.id, crops)
        if (p) next = p
        else message += ' The photo was not uploaded: tap Edit and choose it again.'
      }
      const saved = next.offers.find((o) => o.id === r.data.id)
      if (saved) message += ` ${STATUS[saved.status][2]}.`
      onDone(next, message)
      return r
    })

  // A new photo on an offer that already exists goes up at once; on a new offer, with the offer
  const onCropped = (files) => {
    setPickedFile(null)
    if (!current) return setCrops(files)
    photoSave.run(async () => {
      const next = await uploadCrops(current.id, files)
      if (!next) return { ok: false, error: 'server' }
      setCurrent(next.offers.find((o) => o.id === current.id) || current)
      return { ok: true }
    }, 'Photo saved. It is on the website now.')
  }
  const removePhoto = () =>
    photoSave.run(async () => {
      const r = await adminCall('offerPhoto', { id: current.id, image: null })
      if (r.ok) setCurrent(r.data.offers.find((o) => o.id === current.id) || current)
      return r
    }, 'Photo removed.')

  const groups = [...new Set(links.map((l) => l.group))]
  const previewPhoto = { wide: crops?.wide.image || current?.photo || null, phone: crops?.phone.image || current?.photoPhone || current?.photo || null }
  return (
    <div>
      <PageTitle>{offer ? 'Change offer' : 'New offer'}</PageTitle>
      <PriceNote />
      <div className={`${card} mt-4 space-y-4`} data-admin-offer-form>
        <Field label="Title in English" hint="Big and short, e.g. “Rajyotsava special: 10% off Delight Boxes”." error={errorText(fields, 'title')}>
          {text('titleEn', OFFER_MAX.title, { 'data-admin-offer-title': '' })}
        </Field>
        <Field label="Title in Kannada (optional)" hint="Empty: Kannada readers see the English.">
          {text('titleKn', OFFER_MAX.title, { lang: 'kn' })}
        </Field>
        <Field label="Offer line in English (optional)" hint="One short line, e.g. “Order by Sunday for Diwali delivery.”" error={errorText(fields, 'message')}>
          {text('messageEn', OFFER_MAX.message, { rows: 2, 'data-admin-offer-message': '' })}
        </Field>
        <Field label="Offer line in Kannada (optional)">{text('messageKn', OFFER_MAX.message, { rows: 2, lang: 'kn' })}</Field>

        <ItemsPicker choices={choices} items={form.items} onChange={(items) => set({ items })} error={errorText(fields, 'items')} />

        {hasItems ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Badge on these products (optional)" hint="Empty: “Offer”." error={errorText(fields, 'badge')}>
                {text('badgeEn', OFFER_MAX.badge, { placeholder: 'Offer', 'data-admin-offer-badge': '' })}
              </Field>
              <Field label="Badge in Kannada (optional)">{text('badgeKn', OFFER_MAX.badge, { lang: 'kn', placeholder: 'ಆಫರ್' })}</Field>
            </div>
            <DealPicker form={form} set={set} held={held} error={errorText(fields, 'deal')} />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Button text in English (optional)" hint="Empty: “Shop the offer”. It opens the menu with only these products." error={errorText(fields, 'button')}>
                {text('buttonEn', OFFER_MAX.button, { placeholder: 'Shop the offer', 'data-admin-offer-button': '' })}
              </Field>
              <Field label="Button text in Kannada (optional)">{text('buttonKn', OFFER_MAX.button, { lang: 'kn', placeholder: 'ಆಫರ್ ಖರೀದಿಸಿ' })}</Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Where the button goes" hint="Customers tap the banner to go there. (Or choose products above: the button then shows only them.)" error={errorText(fields, 'link')}>
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
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Button text in English (optional)" hint="Empty: “See offer”." error={errorText(fields, 'button')}>
                  {text('buttonEn', OFFER_MAX.button, { placeholder: 'See offer', 'data-admin-offer-button': '' })}
                </Field>
                <Field label="Button text in Kannada (optional)">{text('buttonKn', OFFER_MAX.button, { lang: 'kn', placeholder: 'ಆಫರ್ ನೋಡಿ' })}</Field>
              </div>
            )}
          </>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Start date" hint="Shows from the start of this day (India time)." error={errorText(fields, 'startsOn')}>
            <input type="date" className={input} value={form.startsOn} onChange={(e) => set({ startsOn: e.target.value })} data-admin-offer-start />
          </Field>
          <Field label="End date" hint="Shows until the end of this day, then goes away by itself." error={errorText(fields, 'endsOn')}>
            <input type="date" className={input} value={form.endsOn} min={today} onChange={(e) => set({ endsOn: e.target.value })} data-admin-offer-end />
          </Field>
        </div>

        <label className="flex min-h-12 items-center gap-3 font-bold">
          <input type="checkbox" className="h-6 w-6 accent-ink" checked={form.active} onChange={(e) => set({ active: e.target.checked })} data-admin-offer-active />
          On: show this offer on its dates
        </label>

        <div>
          <p className="font-bold">Banner photo (optional)</p>
          <p className="t-small text-brown-2">A wide photo works best. You choose how it is cut for computers (3:1) and for phones (16:9). No photo: the banner shows only the words, in black and gold.</p>
          {pickedFile ? (
            <div className="mt-2">
              <CropPhoto file={pickedFile} onDone={onCropped} onCancel={() => setPickedFile(null)} />
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label htmlFor="offer-photo" className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-control border-[1.5px] border-brown px-4 font-bold">
                <ImageIcon className="h-5 w-5" /> {previewPhoto.wide ? 'Change photo' : 'Choose a photo'}
              </label>
              <input
                id="offer-photo"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  setPickedFile(e.target.files?.[0] || null)
                  e.target.value = ''
                }}
                data-admin-offer-photo
              />
              {current?.photo && (
                <Btn tone="light" onClick={removePhoto} disabled={photoSave.status === 'saving'}>
                  Remove photo
                </Btn>
              )}
              {crops && !current && <span className="t-small font-bold text-[#1a6b3a]">Photo ready: it is saved with the offer.</span>}
            </div>
          )}
          <div className="mt-1">
            <SaveMessage save={photoSave} />
          </div>
        </div>

        <Preview form={form} photo={previewPhoto} hasItems={hasItems} />

        <div className="flex flex-wrap gap-2">
          <Btn tone="gold" onClick={submit} disabled={save.status === 'saving' || Boolean(pickedFile)} data-admin-offer-save>
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

/** Whole menu sections and/or single products, as big checkboxes */
function ItemsPicker({ choices, items, onChange, error }) {
  const toggle = (key, id, on) => onChange({ ...items, [key]: on ? [...items[key], id] : items[key].filter((x) => x !== id) })
  const box = 'h-6 w-6 shrink-0 accent-ink'
  return (
    <fieldset className="rounded-control border border-line p-3" data-admin-offer-items-picker>
      <legend className="px-1 font-bold">Products in this offer (optional)</legend>
      <p className="t-small text-brown-2">Choose whole menu sections or single products. The banner’s button then opens the menu with only these, each with your badge.</p>
      {error && <p className="t-small mt-1 font-bold text-error">{error}</p>}
      <label className="mt-2 flex min-h-12 items-center gap-3 rounded-control bg-champagne px-3 font-bold">
        <input type="checkbox" className={box} checked={Boolean(items.all)} onChange={(e) => onChange(e.target.checked ? { all: true, categories: [], products: [] } : { categories: [], products: [] })} data-admin-offer-all />
        Every product on the website
      </label>
      {items.all ? (
        <p className="t-small mt-1 text-brown-2">All products, now and any you add later. E.g. choose “A percentage off” below and type 50 for 50% off everything.</p>
      ) : (
      <div className="mt-2 space-y-3">
        {choices.categories.map((c) => {
          const whole = items.categories.includes(c.id)
          const products = choices.products.filter((p) => p.category === c.id)
          return (
            <div key={c.id}>
              <label className="flex min-h-12 items-center gap-3 font-bold">
                <input type="checkbox" className={box} checked={whole} onChange={(e) => toggle('categories', c.id, e.target.checked)} data-admin-offer-category={c.id} />
                All of {c.name}
              </label>
              {!whole && (
                <ul className="ml-4 grid gap-x-4 sm:grid-cols-2">
                  {products.map((p) => (
                    <li key={p.id}>
                      <label className="flex min-h-12 items-center gap-3">
                        <input type="checkbox" className={box} checked={items.products.includes(p.id)} onChange={(e) => toggle('products', p.id, e.target.checked)} data-admin-offer-product={p.id} />
                        {p.name}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>
      )}
    </fieldset>
  )
}

/** No special price, % off, ₹ off, or an exact price per product (and size) */
function DealPicker({ form, set, held, error }) {
  const kinds = [
    ['none', 'No special price: just the badge'],
    ['percent', 'A percentage off'],
    ['amount', 'Rupees off each item'],
    ['prices', 'An exact offer price for each product'],
  ]
  const setPrice = (id, sizeId, value) => {
    const v = value.replace(/\D/g, '').slice(0, 6)
    set({ dealPrices: { ...form.dealPrices, [id]: sizeId ? { ...(typeof form.dealPrices[id] === 'object' ? form.dealPrices[id] : {}), [sizeId]: v } : v } })
  }
  const lines = held.flatMap((p) => (p.sizes.length ? p.sizes.map((s) => ({ p, s, regular: s.price })) : p.price ? [{ p, s: null, regular: p.price }] : []))
  return (
    <fieldset className="rounded-control border border-line p-3" data-admin-offer-deal-picker>
      <legend className="px-1 font-bold">Special price (optional)</legend>
      <p className="t-small text-brown-2">Only on the offer’s dates, then the regular prices come back by themselves. Customers see the regular price crossed out. Extras (ragi, a drawing) keep their price.</p>
      {error && <p className="t-small mt-1 font-bold text-error">{error}</p>}
      <div className="mt-2 space-y-1">
        {kinds.map(([k, label]) => (
          <label key={k} className="flex min-h-12 items-center gap-3">
            <input type="radio" name="deal-kind" className="h-6 w-6 accent-ink" checked={form.dealKind === k} onChange={() => set({ dealKind: k })} data-admin-offer-deal-kind={k} />
            {label}
          </label>
        ))}
      </div>
      {(form.dealKind === 'percent' || form.dealKind === 'amount') && (
        <label className="mt-2 flex items-center gap-2">
          {form.dealKind === 'amount' && <span className="font-bold">₹</span>}
          <input
            className={`${input} w-28`}
            inputMode="numeric"
            value={form.dealValue}
            onChange={(e) => set({ dealValue: e.target.value.replace(/\D/g, '').slice(0, form.dealKind === 'percent' ? 2 : 6) })}
            aria-label={form.dealKind === 'percent' ? 'Percent off' : 'Rupees off each item'}
            data-admin-offer-deal-value
          />
          {form.dealKind === 'percent' && <span className="font-bold">% off</span>}
        </label>
      )}
      {form.dealKind !== 'none' && lines.length > 0 && (
        <table className="t-small mt-3 w-full" data-admin-offer-prices>
          <thead>
            <tr className="text-left text-brown-2">
              <th className="py-1 font-bold">Product</th>
              <th className="py-1 font-bold">Regular</th>
              <th className="py-1 font-bold">Offer price</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ p, s, regular }) => {
              const now = offerPrice(form, p.id, s?.id, regular)
              const key = `${p.id}:${s?.id || ''}`
              return (
                <tr key={key} className="border-t border-line">
                  <td className="py-1.5 pr-2">
                    {p.name}
                    {s ? ` (${s.label})` : ''}
                  </td>
                  <td className="py-1.5 pr-2 tabular-nums">{formatINR(regular)}</td>
                  <td className="py-1.5 tabular-nums">
                    {form.dealKind === 'prices' ? (
                      <span className="flex items-center gap-1">
                        ₹
                        <input
                          className={`${input} w-24 !py-2`}
                          inputMode="numeric"
                          value={(s ? form.dealPrices[p.id]?.[s.id] : typeof form.dealPrices[p.id] === 'object' ? '' : form.dealPrices[p.id]) || ''}
                          placeholder={String(regular)}
                          onChange={(e) => setPrice(p.id, s?.id, e.target.value)}
                          aria-label={`Offer price for ${p.name}${s ? ` ${s.label}` : ''}`}
                          data-admin-offer-price={key}
                        />
                      </span>
                    ) : now != null ? (
                      <strong className="text-[#1a6b3a]">{formatINR(now)}</strong>
                    ) : (
                      <span className="text-brown-2">no change</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </fieldset>
  )
}

/** How the banner will look on a phone and on a computer (English) */
function Preview({ form, photo, hasItems }) {
  if (!form.titleEn.trim()) return null
  const cta = form.buttonEn || (hasItems ? 'Shop the offer' : form.link ? 'See offer' : '')
  const body = (big) => (
    <div className={`relative flex flex-col gap-1 p-3 ${big ? 'max-w-[60%] justify-center' : 'mt-auto'}`}>
      <p className={`flex items-start gap-1.5 font-bold text-gold-light ${big ? 'text-xl' : ''}`}>
        <TagIcon className="mt-1 h-4 w-4 shrink-0 text-gold" />
        <span className="line-clamp-2">{form.titleEn}</span>
      </p>
      {form.messageEn && <p className="t-small line-clamp-1 text-cream">{form.messageEn}</p>}
      <div className="flex flex-wrap items-center gap-2">
        {cta && <span className="inline-flex min-h-9 items-center rounded-control bg-[linear-gradient(180deg,#ebd27a,#d4af37_55%,#b8901e)] px-3 text-sm font-bold text-ink">{cta} ›</span>}
        <span className="rounded-full border border-gold/50 px-2 py-0.5 text-sm font-bold text-champagne">Ends {shortDay(form.endsOn || form.startsOn)}</span>
      </div>
    </div>
  )
  const frame = (src, aspect, big) =>
    src ? (
      <div className={`relative flex overflow-hidden rounded-card border border-gold/50 bg-ink ${big ? 'flex-row' : 'flex-col'}`} style={{ aspectRatio: aspect }}>
        <img src={src.startsWith('data:') ? src : smallPhoto(src)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div
          aria-hidden="true"
          className={`absolute inset-0 ${big ? 'bg-[linear-gradient(to_right,rgb(15_15_15/0.92),rgb(15_15_15/0.72)_45%,transparent_75%)]' : 'bg-[linear-gradient(to_top,rgb(15_15_15/0.94),rgb(15_15_15/0.78)_42%,transparent_78%)]'}`}
        />
        {body(big)}
      </div>
    ) : (
      <div className="overflow-hidden rounded-card border border-gold/50 bg-[#1b1612]">{body(false)}</div>
    )
  return (
    <div aria-hidden="true" data-admin-offer-preview>
      <p className="font-bold">How it looks on the website</p>
      <p className="t-small mb-1 text-brown-2">Phone</p>
      <div className="max-w-[360px]">{frame(photo.phone, '16 / 9', false)}</div>
      <p className="t-small mt-2 mb-1 text-brown-2">Computer</p>
      {frame(photo.wide, '3 / 1', true)}
    </div>
  )
}
