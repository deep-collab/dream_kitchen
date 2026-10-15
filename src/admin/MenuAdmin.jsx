import { useEffect, useId, useState } from 'react'
import { adminCall } from './api'
import { Btn, card, ErrorText, Field, formatINR, input, Loading, PageTitle, Pill, SaveMessage, useAdminData, useSave } from './ui'
import { ImageIcon } from '../components/icons'

const CATEGORY_WORDS = { 'brownie-tubs': 'Brownie Tubs', 'delight-boxes': 'Delight Boxes', brownies: 'Brownies', chocolates: 'Chocolates', customize: 'Customize page' }

/**
 * A photo from Hema's phone (camera or gallery), made ready for the website on the phone itself:
 * cut to a square from the middle, 1000 × 1000, WebP (or JPEG on older phones), shrunk until it is
 * under about 300 KB. -> a data URL, or null when the file isn't a picture.
 */
export async function productPhotoDataUrl(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return null
  }
  const side = Math.min(bitmap.width, bitmap.height)
  const out = Math.min(1000, side)
  const canvas = document.createElement('canvas')
  canvas.width = out
  canvas.height = out
  canvas.getContext('2d').drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out)
  bitmap.close?.()
  const webp = canvas.toDataURL('image/webp', 0.8).startsWith('data:image/webp')
  for (const q of [0.8, 0.7, 0.6, 0.5, 0.4]) {
    const url = canvas.toDataURL(webp ? 'image/webp' : 'image/jpeg', q)
    if (url.length < 400_000) return url
  }
  return null
}

// Courier charge groups in Hema's words (the six rates themselves are in Settings)
const TIER_WORDS = {
  small: 'Small parcel: like a 250 g box, a bar or a brownie box',
  large: 'Medium parcel: like a 500 g or 700 g Delight Box',
  xl: 'Large parcel: 750 g or more',
}
const NAME_MAX = 60
const DESCRIPTION_MAX = 300
const priceDigits = (v) => v.replace(/\D/g, '').slice(0, 6)
const num = (v) => (String(v).trim() === '' ? NaN : Number(v))

/** Sizes with a name and a price each (a new product, a tub, or a product Hema added) */
function SizeRows({ sizes, setSizes, error }) {
  return (
    <div className="space-y-2">
      {sizes.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <input className={`${input} min-w-0 flex-1`} aria-label="Size name" placeholder="Size, e.g. 250 g" maxLength={24} value={s.label || ''} onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <span aria-hidden="true">₹</span>
          <input
            className={`${input} w-28`}
            inputMode="numeric"
            aria-label={`Price for ${s.label || 'this size'}`}
            value={s.price}
            onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, price: priceDigits(e.target.value) } : x)))}
          />
          {sizes.length > 1 && (
            <Btn tone="light" className="px-3" onClick={() => setSizes(sizes.filter((_, j) => j !== i))} aria-label="Remove this size">
              ✕
            </Btn>
          )}
        </div>
      ))}
      {sizes.length < 6 && (
        <Btn tone="light" onClick={() => setSizes([...sizes, { id: `size-${Date.now().toString(36)}`, label: '', price: '' }])}>
          + Add a size
        </Btn>
      )}
      {error && <p className="t-small font-bold text-error">{error}</p>}
    </div>
  )
}

const SIZE_ERRORS = { price: 'Give every size a price.', needLabels: 'Give every size a name, like “250 g”.', duplicate: 'Two sizes have the same name.', needPrices: 'Give every size a name and a price first.' }

/** Name and description, in English and Kannada (the Kannada may stay empty: the English shows) */
function TextFields({ value, set, errors = {}, required }) {
  const field = (key) => (e) => set({ ...value, [key]: e.target.value })
  return (
    <div className="space-y-3">
      <Field label={`Name in English${required ? '' : ' (empty = the original name)'}`} error={errors.name === 'required' ? 'Write the name in English.' : ''}>
        <input className={input} maxLength={NAME_MAX} value={value.nameEn} onChange={field('nameEn')} data-admin-name-en />
      </Field>
      <Field label="Name in Kannada (optional)" hint="Empty: Kannada readers see the English name.">
        <input className={input} maxLength={NAME_MAX} value={value.nameKn} onChange={field('nameKn')} lang="kn" />
      </Field>
      <Field label="Description in English (optional)" hint="One or two short sentences." error={errors.description === 'required' ? 'Write the description in English too.' : ''}>
        <textarea className={input} rows={2} maxLength={DESCRIPTION_MAX} value={value.descEn} onChange={field('descEn')} />
      </Field>
      <Field label="Description in Kannada (optional)">
        <textarea className={input} rows={2} maxLength={DESCRIPTION_MAX} value={value.descKn} onChange={field('descKn')} lang="kn" />
      </Field>
    </div>
  )
}

const textBody = (v) => ({ name: { en: v.nameEn, kn: v.nameKn }, description: { en: v.descEn, kn: v.descKn } })
const EMPTY_NEW = { category: '', nameEn: '', nameKn: '', descEn: '', descKn: '', priced: 'one', price: '', sizes: [{ id: 'size-1', label: '', price: '' }], tier: '' }

/**
 * "Add a new product": category, names, description, one price or sizes, the courier group and
 * a photo. It goes on the website menu at once (after her other products in that category).
 * There is no delete: Hide from menu takes a product off the website and keeps old orders whole.
 */
function AddProduct({ onAdded }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_NEW)
  const [photo, setPhoto] = useState(null) // a File
  const [photoProblem, setPhotoProblem] = useState(false)
  const save = useSave()
  const fileId = useId()
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const close = () => {
    setForm(EMPTY_NEW)
    setPhoto(null)
    setOpen(false)
  }
  const errors = save.fields || {}

  const submit = () =>
    save.run(async () => {
      const body = {
        category: form.category,
        ...textBody(form),
        courierTier: form.tier,
        ...(form.priced === 'sizes' ? { sizes: form.sizes.map((s) => ({ label: s.label, price: num(s.price) })) } : { price: num(form.price) }),
      }
      const r = await adminCall('addProduct', body)
      if (!r.ok) return r
      // The product is saved; a photo that can't be used doesn't undo it (she can add one later)
      let products = r.data.products
      let photoOk = true
      if (photo) {
        const image = await productPhotoDataUrl(photo)
        const p = image ? await adminCall('productPhoto', { id: r.data.id, image }) : null
        if (p?.ok) products = p.data.products
        else photoOk = false
      }
      setPhotoProblem(!photoOk)
      onAdded(products, r.data.id)
      close()
      return r
    }, 'Added. It shows on the website menu within a minute.')

  if (!open)
    return (
      <div className="mt-4">
        <Btn
          onClick={() => {
            save.reset()
            setPhotoProblem(false)
            setOpen(true)
          }}
          data-admin-add-product
        >
          + Add a new product
        </Btn>
        <div className="mt-2">
          {save.status === 'saved' && <SaveMessage save={save} />}
          {save.status === 'saved' && photoProblem && <p className="t-small font-bold text-error">The photo could not be used. Find the product below and tap Change photo to try another one.</p>}
        </div>
      </div>
    )

  return (
    <section aria-labelledby="add-title" className={`${card} mt-4 space-y-4`} data-admin-add-form>
      <h2 id="add-title" className="t-h3">
        Add a new product
      </h2>
      <Field label="Where on the menu" error={errors.category ? 'Choose where it goes on the menu.' : ''}>
        <select className={input} value={form.category} onChange={(e) => set({ category: e.target.value })} data-admin-new-category>
          <option value="">Choose…</option>
          {Object.entries(CATEGORY_WORDS)
            .filter(([c]) => c !== 'customize')
            .map(([c, words]) => (
              <option key={c} value={c}>
                {words}
              </option>
            ))}
        </select>
      </Field>
      <TextFields value={form} set={(v) => setForm(v)} errors={errors} required />

      <fieldset>
        <legend className="mb-1 font-bold">Price</legend>
        {[
          ['one', 'One price'],
          ['sizes', 'Different sizes, each with its price'],
        ].map(([v, words]) => (
          <label key={v} className="flex min-h-12 items-center gap-3">
            <input type="radio" name="priced" className="h-6 w-6 accent-ink" checked={form.priced === v} onChange={() => set({ priced: v })} />
            {words}
          </label>
        ))}
        <div className="mt-2">
          {form.priced === 'one' ? (
            <div className="flex items-center gap-2">
              <span aria-hidden="true">₹</span>
              <input className={`${input} w-32`} inputMode="numeric" aria-label="Price in rupees" value={form.price} onChange={(e) => set({ price: priceDigits(e.target.value) })} data-admin-new-price />
              {errors.price && <span className="t-small font-bold text-error">Write the price in rupees.</span>}
            </div>
          ) : (
            <SizeRows sizes={form.sizes} setSizes={(sizes) => set({ sizes })} error={SIZE_ERRORS[errors.sizes]} />
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-bold">Courier charge</legend>
        <p className="t-small text-brown-2">Which parcel is it most like? The customer pays that courier charge (the rates are in Settings).</p>
        {Object.entries(TIER_WORDS).map(([tier, words]) => (
          <label key={tier} className="flex min-h-12 items-center gap-3">
            <input type="radio" name="tier" className="h-6 w-6 shrink-0 accent-ink" checked={form.tier === tier} onChange={() => set({ tier })} data-admin-new-tier={tier} />
            {words}
          </label>
        ))}
        {errors.courierTier && <p className="t-small font-bold text-error">Choose the parcel size.</p>}
      </fieldset>

      <div>
        <p className="font-bold">Photo (optional)</p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <label htmlFor={fileId} className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-control border-[1.5px] border-brown px-4 font-bold">
            <ImageIcon className="h-5 w-5" /> {photo ? 'Change photo' : 'Choose a photo'}
          </label>
          <input id={fileId} type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          {photo && <span className="t-small break-all">{photo.name}</span>}
        </div>
        <p className="t-small mt-1 text-brown-2">No photo: the website shows a gold drawing. You can add one later.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Btn onClick={submit} disabled={save.status === 'saving'} data-admin-add-save>
          {save.status === 'saving' ? 'Adding…' : 'Add to menu'}
        </Btn>
        <Btn
          tone="light"
          onClick={() => {
            close()
            save.reset()
          }}
          disabled={save.status === 'saving'}
        >
          Cancel
        </Btn>
      </div>
      {save.status === 'error' && <SaveMessage save={save} />}
    </section>
  )
}

/** A product's name and description (folded away under the prices) */
function TextEditor({ product: p, onSaved }) {
  const from = () => ({ nameEn: p.name, nameKn: p.nameKn === p.name ? '' : p.nameKn, descEn: p.description, descKn: p.descriptionKn })
  const [value, setValue] = useState(from)
  const save = useSave()
  const saved = JSON.stringify([p.name, p.nameKn, p.description, p.descriptionKn])
  useEffect(() => {
    setValue(from())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved])
  const send = () =>
    save.run(async () => {
      const r = await adminCall('updateProduct', { id: p.id, ...textBody(value) })
      if (r.ok) onSaved(r.data.products)
      return r
    })
  return (
    <details className="mt-3 border-t border-line pt-3">
      <summary className="flex min-h-12 cursor-pointer items-center font-bold">Edit name and description</summary>
      <div className="mt-2 space-y-3">
        <TextFields value={value} set={setValue} errors={save.fields} required={p.custom} />
        <Btn onClick={send} disabled={save.status === 'saving'} data-admin-save-text>
          Save name and description
        </Btn>
        <SaveMessage save={save} />
      </div>
    </details>
  )
}

/**
 * Hema's menu: prices per size, Sold out, Hidden, the tubs' sizes and prices (which turns on their
 * Add to cart, e.g. the Dream Cake Tub), each product's photo, name and description, and her own
 * new products. Changes reach the website within a minute; "Saved" shows only once the server has saved.
 */
export default function MenuAdmin() {
  const { data, error, setData } = useAdminData(() => adminCall('menu'), [])
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  const products = data.products
  const groups = Object.keys(CATEGORY_WORDS).map((c) => [c, products.filter((p) => p.category === c)])
  return (
    <div>
      <PageTitle>Menu</PageTitle>
      <p className="t-small text-brown-2">Prices in rupees. Tap Save under a product to change it. The website shows changes within a minute.</p>
      <AddProduct
        onAdded={(next, id) => {
          setData({ products: next })
          requestAnimationFrame(() => document.querySelector(`[data-admin-product="${id}"]`)?.scrollIntoView({ block: 'center' }))
        }}
      />
      {groups.map(([c, list]) => (
        <section key={c} className="mt-5">
          <h2 className="t-h3">{CATEGORY_WORDS[c]}</h2>
          <ul className="mt-2 space-y-3">
            {list.map((p) => (
              <li key={p.id}>
                <ProductEditor product={p} onSaved={(next) => setData({ products: next })} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function ProductEditor({ product: p, onSaved }) {
  const isTub = p.category === 'brownie-tubs'
  // Sizes she can name, add and remove: the tubs (sizes still to confirm) and her own products with sizes
  const namedSizes = (isTub && !p.custom) || (p.custom && p.sizes.length > 0)
  const [sizes, setSizes] = useState(p.sizes.map((s) => ({ ...s, price: String(s.price) })))
  const [price, setPrice] = useState(p.price != null ? String(p.price) : '')
  const [ragi, setRagi] = useState(p.ragiPrice != null ? String(p.ragiPrice) : '')
  const [live, setLive] = useState(p.priceStatus === 'live')
  const save = useSave()
  const photoSave = useSave()
  const fileId = useId()
  // After a save (or "Back to original") show what the server now has, keeping the "Saved" message
  const saved = JSON.stringify([p.sizes, p.price, p.ragiPrice, p.priceStatus])
  useEffect(() => {
    setSizes(p.sizes.map((s) => ({ ...s, price: String(s.price) })))
    setPrice(p.price != null ? String(p.price) : '')
    setRagi(p.ragiPrice != null ? String(p.ragiPrice) : '')
    setLive(p.priceStatus === 'live')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved])
  const send = (body, s = save) =>
    s.run(async () => {
      const r = await adminCall(body.image !== undefined ? 'productPhoto' : 'updateProduct', { id: p.id, ...body })
      if (r.ok) onSaved(r.data.products)
      return r
    })

  const savePrices = () => {
    const body = {}
    if (p.sizes.length || namedSizes) body.sizes = sizes.map((s) => ({ id: s.id, label: s.label, price: num(s.price), ...(s.grams ? { grams: s.grams } : {}) }))
    if (!p.sizes.length && !namedSizes) body.price = num(price)
    if (p.ragiPrice != null) body.ragiPrice = num(ragi)
    if (isTub && !p.custom) body.priceStatus = live ? 'live' : 'coming-soon'
    if (body.sizes && !body.sizes.length) delete body.sizes
    return send(body)
  }

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    photoSave.run(async () => {
      const image = await productPhotoDataUrl(file)
      if (!image) return { ok: false, error: 'fields', fields: { photo: 'image' } }
      const r = await adminCall('productPhoto', { id: p.id, image })
      if (r.ok) onSaved(r.data.products)
      return r
    }, 'Photo saved. It shows on the website within a minute.')
  }

  return (
    <div className={`rounded-card border p-4 ${p.active ? 'border-line bg-[#fffcf5]' : 'border-dashed border-control-line bg-cream opacity-80'}`} data-admin-product={p.id}>
      <div className="flex gap-3">
        {p.photo ? (
          <img src={p.photo} alt="" width="80" height="80" className="h-20 w-20 shrink-0 rounded-control bg-ink object-cover" />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-control bg-ink text-gold">
            <ImageIcon className="h-8 w-8" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold">{p.name}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {p.soldOut && <Pill tone="bad">Sold out</Pill>}
            {!p.active && <Pill tone="bad">Hidden</Pill>}
            {p.priceStatus !== 'live' && <Pill tone="warn">Price coming soon</Pill>}
            {p.changed && <Pill>Changed by you</Pill>}
            {p.custom && <Pill>Added by you</Pill>}
          </div>
        </div>
      </div>
      {p.toConfirm && <p className="t-small mt-1 text-[#6b4b00]">To confirm: {p.toConfirm}</p>}

      <div className="mt-3 space-y-2">
        {namedSizes && <SizeRows sizes={sizes} setSizes={setSizes} error={SIZE_ERRORS[save.fields?.sizes]} />}
        {!namedSizes &&
          p.sizes.length > 0 &&
          sizes.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-24 font-bold">{s.label}</span>
              <span aria-hidden="true">₹</span>
              <input
                className={`${input} w-28`}
                inputMode="numeric"
                aria-label={`Price for ${s.label || 'this size'}`}
                value={s.price}
                onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/\D/g, '') } : x)))}
              />
            </div>
          ))}
        {!p.sizes.length && !namedSizes && (
          <div className="flex items-center gap-2">
            <span className="w-24 font-bold">Price</span>
            <span aria-hidden="true">₹</span>
            <input className={`${input} w-28`} inputMode="numeric" aria-label="Price" value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} />
          </div>
        )}
        {p.ragiPrice != null && (
          <div className="flex items-center gap-2">
            <span className="w-24 font-bold">Ragi extra</span>
            <span aria-hidden="true">₹</span>
            <input className={`${input} w-28`} inputMode="numeric" aria-label="Ragi extra" value={ragi} onChange={(e) => setRagi(e.target.value.replace(/\D/g, ''))} />
          </div>
        )}
        {isTub && !p.custom && (
          <label className="flex min-h-12 items-center gap-3 font-bold">
            <input type="checkbox" className="h-6 w-6 accent-ink" checked={live} onChange={(e) => setLive(e.target.checked)} />
            Show prices and allow ordering
          </label>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn onClick={savePrices} disabled={save.status === 'saving'} data-admin-save-product>
          Save
        </Btn>
        <Btn tone="light" onClick={() => send({ soldOut: !p.soldOut })} disabled={save.status === 'saving'} data-admin-soldout>
          {p.soldOut ? 'Back in stock' : 'Mark sold out'}
        </Btn>
        <Btn tone="light" onClick={() => send({ active: !p.active })} disabled={save.status === 'saving'}>
          {p.active ? 'Hide from menu' : 'Show on menu'}
        </Btn>
        {p.changed && (
          <Btn tone="light" onClick={() => send({ reset: true })} disabled={save.status === 'saving'}>
            Back to original
          </Btn>
        )}
      </div>
      <div className="mt-2">
        <SaveMessage save={save} />
        {save.status === 'error' && !namedSizes && save.fields?.sizes && <p className="t-small text-error">{SIZE_ERRORS[save.fields.sizes]}</p>}
      </div>
      {p.sizes.length === 0 && p.price != null && <p className="t-small mt-1 text-brown-2">Now: {formatINR(p.price)}</p>}
      {p.custom && <p className="t-small mt-1 text-brown-2">Courier: {TIER_WORDS[p.courierTier]?.split(':')[0]}</p>}

      <TextEditor product={p} onSaved={onSaved} />

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label htmlFor={fileId} className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-control border-[1.5px] border-brown px-4 font-bold ${photoSave.status === 'saving' ? 'pointer-events-none opacity-60' : ''}`}>
          <ImageIcon className="h-5 w-5" /> {photoSave.status === 'saving' ? 'Uploading…' : 'Change photo'}
        </label>
        <input id={fileId} type="file" accept="image/*" className="sr-only" onChange={onPhoto} data-admin-photo={p.id} />
        {p.ownPhoto && (
          <Btn tone="light" onClick={() => send({ image: null }, photoSave)} disabled={photoSave.status === 'saving'}>
            {p.custom ? 'Remove photo' : 'Use the old photo'}
          </Btn>
        )}
        <div className="w-full">
          <SaveMessage save={photoSave} />
          {photoSave.fields?.photo && <p className="t-small text-error">That file isn’t a photo the website can use. Try another one.</p>}
        </div>
      </div>
    </div>
  )
}
