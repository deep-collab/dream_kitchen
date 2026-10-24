import { useEffect, useId, useState } from 'react'
import { adminCall } from './api'
import { Btn, ErrorText, Field, formatINR, input, Loading, PageTitle, Pill, SaveMessage, useAdminData, useSave } from './ui'
import { ImageIcon } from '../components/icons'

/**
 * A photo from Hema's phone (camera or gallery), made ready for the website on the phone itself:
 * cut from the middle to the shape asked for (a square for products, wide for offer banners), at
 * most `width` pixels wide, WebP (or JPEG on older phones), shrunk until it is under about 300 KB.
 * -> a data URL, or null when the file isn't a picture.
 */
export async function photoDataUrl(file, { width = 1000, height = 1000 } = {}) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return null
  }
  const ratio = width / height
  const sw = Math.min(bitmap.width, bitmap.height * ratio)
  const sh = sw / ratio
  const outW = Math.round(Math.min(width, sw))
  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = Math.round(outW / ratio)
  canvas.getContext('2d').drawImage(bitmap, (bitmap.width - sw) / 2, (bitmap.height - sh) / 2, sw, sh, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const webp = canvas.toDataURL('image/webp', 0.8).startsWith('data:image/webp')
  for (const q of [0.8, 0.7, 0.6, 0.5, 0.4]) {
    const url = canvas.toDataURL(webp ? 'image/webp' : 'image/jpeg', q)
    if (url.length < 400_000) return url
  }
  return null
}

/** A product photo: square, 1000 × 1000 */
export const productPhotoDataUrl = (file) => photoDataUrl(file)

const NAME_MAX = 80
const DESCRIPTION_MAX = 200

/** A text box with a "12 / 200" counter under it */
export function CountedField({ label, value, onChange, max, multiline = false, lang, error, hint, ...props }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <Field label={label} error={error}>
      <Tag className={`${input} ${multiline ? 'min-h-24 py-2' : ''}`} value={value} onChange={(e) => onChange(e.target.value)} maxLength={max} lang={lang} rows={multiline ? 3 : undefined} {...props} />
      <span className={`t-small mt-1 flex justify-between gap-2 ${value.length >= max ? 'font-bold text-[#6b4b00]' : 'text-brown-2'}`}>
        <span>{hint}</span>
        <span className="shrink-0" data-admin-counter>
          {value.length} / {max}
        </span>
      </span>
    </Field>
  )
}

/** "Change photo" / "Add a photo": opens the camera or the gallery */
export function PhotoButton({ onFile, busy, label = 'Change photo', ...props }) {
  const fileId = useId()
  const onChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onFile(file)
  }
  return (
    <>
      <label htmlFor={fileId} className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-control border-[1.5px] border-brown px-4 font-bold ${busy ? 'pointer-events-none opacity-60' : ''}`}>
        <ImageIcon className="h-5 w-5" /> {busy ? 'Uploading…' : label}
      </label>
      <input id={fileId} type="file" accept="image/*" className="sr-only" onChange={onChange} {...props} />
    </>
  )
}

const FIELD_WORDS = {
  required: 'Please fill this in.',
  long: 'Too long: please make it shorter.',
  price: 'Type a price in rupees (numbers only).',
  label: 'Give every size a name, e.g. 250 g.',
  duplicate: 'Two sizes have the same name.',
  image: 'That file isn’t a photo the website can use. Try another one.',
}
export const fieldError = (save, key) => (save.status === 'error' && save.fields?.[key] ? FIELD_WORDS[save.fields[key]] || FIELD_WORDS.required : '')
const digits = (v) => v.replace(/\D/g, '')
const num = (v) => (String(v).trim() === '' ? NaN : Number(v))

/**
 * Hema's menu: names and descriptions (English and Kannada), prices per size, Sold out, Hidden,
 * the tubs' sizes and prices (which turns on their Add to cart, e.g. the Dream Cake Tub), each
 * product's photo, her own new products ("+ Add new product" under each category) and the
 * Customize page tiles' photos. Changes reach the website within a minute; "Saved" shows only
 * once the server has saved. A product's ID never changes, so photos, prices and old orders stay right.
 */
export default function MenuAdmin() {
  const { data, error, setData } = useAdminData(() => adminCall('menu'), [])
  const [justAdded, setJustAdded] = useState(null)
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  const groups = data.categories.map((c) => [c, data.products.filter((p) => p.category === c.id)])
  return (
    <div>
      <PageTitle>Menu</PageTitle>
      <p className="t-small text-brown-2">Prices in rupees. Tap Save under a product to change it. The website shows changes within a minute.</p>
      {groups.map(([c, list]) => (
        <section key={c.id} className="mt-5" data-admin-category={c.id}>
          <h2 className="t-h3">{c.name}</h2>
          {c.id === 'customize' && <TileEditors tiles={data.tiles} onSaved={setData} />}
          <ul className="mt-2 space-y-3">
            {list.map((p) => (
              <li key={p.id}>
                <ProductEditor product={p} tiers={data.tiers} onSaved={setData} justAdded={justAdded === p.id} />
              </li>
            ))}
          </ul>
          <AddProduct
            category={c}
            categories={data.categories}
            tiers={data.tiers}
            onAdded={(next) => {
              setData(next)
              setJustAdded(next.addedId)
            }}
          />
        </section>
      ))}
    </div>
  )
}

/** Name or description in English and Kannada, opened from the product's "Edit name" / "Description" button */
function TextEditor({ kind, product: p, onSaved, onClose }) {
  const isName = kind === 'name'
  const max = isName ? NAME_MAX : DESCRIPTION_MAX
  const [en, setEn] = useState(isName ? p.name : p.description.en)
  const [kn, setKn] = useState(isName ? p.nameKn : p.description.kn)
  const save = useSave()
  const submit = () =>
    save.run(
      async () => {
        const r = await adminCall('updateProduct', { id: p.id, [kind]: { en, kn } })
        if (r.ok) onSaved(r.data)
        return r
      },
      isName ? 'Name saved. The website shows it within a minute.' : 'Description saved. The website shows it within a minute.',
    )
  return (
    <div className="mt-3 space-y-3 rounded-control border border-line bg-cream p-3" data-admin-text-editor={kind}>
      <CountedField
        label={isName ? 'Name in English' : 'Description in English'}
        value={en}
        onChange={setEn}
        max={max}
        multiline={!isName}
        error={fieldError(save, isName ? 'nameEn' : 'descriptionEn')}
        hint={isName ? '' : 'Shown on the product’s page. Leave empty for none.'}
        data-admin-text-en
      />
      <CountedField
        label={isName ? 'Name in Kannada (ಕನ್ನಡ)' : 'Description in Kannada (ಕನ್ನಡ)'}
        value={kn}
        onChange={setKn}
        max={max}
        multiline={!isName}
        lang="kn"
        error={fieldError(save, isName ? 'nameKn' : 'descriptionKn')}
        hint="Optional. Empty = Kannada readers see the English."
        data-admin-text-kn
      />
      <div className="flex flex-wrap gap-2">
        <Btn onClick={submit} disabled={save.status === 'saving'} data-admin-text-save>
          {isName ? 'Save name' : 'Save description'}
        </Btn>
        <Btn tone="light" onClick={onClose}>
          Close
        </Btn>
      </div>
      <SaveMessage save={save} />
    </div>
  )
}

function ProductEditor({ product: p, tiers, onSaved, justAdded }) {
  // The menu's own tubs (their sizes and prices come later from Hema; "Show prices" turns them on)
  const isTub = p.category === 'brownie-tubs' && !p.added
  // Tubs and Hema's own products have sizes with names she types
  const namedSizes = isTub || p.added
  const [sizes, setSizes] = useState(p.sizes.map((s) => ({ ...s, price: String(s.price) })))
  const [price, setPrice] = useState(p.price != null ? String(p.price) : '')
  const [ragi, setRagi] = useState(p.ragiPrice != null ? String(p.ragiPrice) : '')
  const [live, setLive] = useState(p.priceStatus === 'live')
  const [tier, setTier] = useState(p.courierTier)
  const [open, setOpen] = useState(null) // 'name' | 'description' | null
  const save = useSave()
  const photoSave = useSave()
  // After a save (or "Back to original") show what the server now has, keeping the "Saved" message
  const saved = JSON.stringify([p.sizes, p.price, p.ragiPrice, p.priceStatus, p.courierTier])
  useEffect(() => {
    setSizes(p.sizes.map((s) => ({ ...s, price: String(s.price) })))
    setPrice(p.price != null ? String(p.price) : '')
    setRagi(p.ragiPrice != null ? String(p.ragiPrice) : '')
    setLive(p.priceStatus === 'live')
    setTier(p.courierTier)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved])

  const send = (body, s = save) =>
    s.run(async () => {
      const r = await adminCall(body.image !== undefined ? 'productPhoto' : 'updateProduct', { id: p.id, ...body })
      if (r.ok) onSaved(r.data)
      return r
    })

  const savePrices = () => {
    const body = {}
    if (p.sizes.length || isTub) body.sizes = sizes.map((s) => ({ id: s.id, label: s.label, price: num(s.price), ...(s.grams ? { grams: s.grams } : {}) }))
    if (!p.sizes.length && !isTub) body.price = num(price)
    if (p.ragiPrice != null) body.ragiPrice = num(ragi)
    if (isTub) body.priceStatus = live ? 'live' : 'coming-soon'
    if (p.added) body.courierTier = tier
    if (body.sizes && !body.sizes.length) delete body.sizes
    return send(body)
  }

  const onPhoto = (file) =>
    photoSave.run(async () => {
      const image = await productPhotoDataUrl(file)
      if (!image) return { ok: false, error: 'fields', fields: { photo: 'image' } }
      const r = await adminCall('productPhoto', { id: p.id, image })
      if (r.ok) onSaved(r.data)
      return r
    }, 'Photo saved. It shows on the website within a minute.')

  const toggle = (kind) => setOpen(open === kind ? null : kind)

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
          <p className="font-bold [overflow-wrap:anywhere]" data-admin-product-name>
            {p.name}
          </p>
          {p.nameKn && p.nameKn !== p.name && (
            <p className="t-small text-brown-2" lang="kn">
              {p.nameKn}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {justAdded && <Pill tone="good">Added. It is on the website.</Pill>}
            {p.added && !justAdded && <Pill>Added by you</Pill>}
            {p.soldOut && <Pill tone="bad">Sold out</Pill>}
            {!p.active && <Pill tone="bad">Hidden</Pill>}
            {p.priceStatus !== 'live' && <Pill tone="warn">Price coming soon</Pill>}
            {p.changed && <Pill>Changed by you</Pill>}
          </div>
        </div>
      </div>
      {p.description.en ? (
        <p className="t-small mt-2 text-brown-2" data-admin-product-description>
          {p.description.en}
        </p>
      ) : (
        <p className="t-small mt-2 text-brown-2 italic">No description yet.</p>
      )}
      {p.toConfirm && <p className="t-small mt-1 text-[#6b4b00]">To confirm: {p.toConfirm}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn tone="light" onClick={() => toggle('name')} aria-expanded={open === 'name'} data-admin-edit-name>
          Edit name
        </Btn>
        <Btn tone="light" onClick={() => toggle('description')} aria-expanded={open === 'description'} data-admin-edit-description>
          Description
        </Btn>
      </div>
      {open && <TextEditor key={open} kind={open} product={p} onSaved={onSaved} onClose={() => setOpen(null)} />}

      <div className="mt-3 space-y-2">
        {(p.sizes.length > 0 || isTub) &&
          sizes.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              {namedSizes ? (
                <input className={`${input} min-w-0 flex-1`} aria-label="Size name" placeholder="Size, e.g. 250 g" value={s.label || ''} onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              ) : (
                <span className="w-24 font-bold">{s.label}</span>
              )}
              <span aria-hidden="true">₹</span>
              <input
                className={`${input} w-28`}
                inputMode="numeric"
                aria-label={`Price for ${s.label || 'this size'}`}
                value={s.price}
                onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, price: digits(e.target.value) } : x)))}
              />
              {namedSizes && sizes.length > (p.added ? 1 : 0) && (
                <Btn tone="light" className="px-3" onClick={() => setSizes(sizes.filter((_, j) => j !== i))} aria-label="Remove this size">
                  ✕
                </Btn>
              )}
            </div>
          ))}
        {namedSizes && (p.sizes.length > 0 || isTub) && sizes.length < 6 && (
          <Btn tone="light" onClick={() => setSizes([...sizes, { id: `size-${Date.now().toString(36)}`, label: '', price: '' }])}>
            + Add a size
          </Btn>
        )}
        {!p.sizes.length && !isTub && (
          <div className="flex items-center gap-2">
            <span className="w-24 font-bold">Price</span>
            <span aria-hidden="true">₹</span>
            <input className={`${input} w-28`} inputMode="numeric" aria-label="Price" value={price} onChange={(e) => setPrice(digits(e.target.value))} />
          </div>
        )}
        {p.ragiPrice != null && (
          <div className="flex items-center gap-2">
            <span className="w-24 font-bold">Ragi extra</span>
            <span aria-hidden="true">₹</span>
            <input className={`${input} w-28`} inputMode="numeric" aria-label="Ragi extra" value={ragi} onChange={(e) => setRagi(digits(e.target.value))} />
          </div>
        )}
        {isTub && (
          <label className="flex min-h-12 items-center gap-3 font-bold">
            <input type="checkbox" className="h-6 w-6 accent-ink" checked={live} onChange={(e) => setLive(e.target.checked)} />
            Show prices and allow ordering
          </label>
        )}
        {p.added && <TierChoice tiers={tiers} value={tier} onChange={setTier} />}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn onClick={savePrices} disabled={save.status === 'saving'} data-admin-save-product>
          Save
        </Btn>
        <Btn tone="light" onClick={() => send({ soldOut: !p.soldOut })} disabled={save.status === 'saving'} data-admin-soldout>
          {p.soldOut ? 'Back in stock' : 'Mark sold out'}
        </Btn>
        <Btn tone="light" onClick={() => send({ active: !p.active })} disabled={save.status === 'saving'} data-admin-hide>
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
        {save.status === 'error' && save.fields?.sizes === 'needPrices' && <p className="t-small text-error">Give every size a name and a price first.</p>}
      </div>
      {p.sizes.length === 0 && p.price != null && <p className="t-small mt-1 text-brown-2">Now: {formatINR(p.price)}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <PhotoButton onFile={onPhoto} busy={photoSave.status === 'saving'} data-admin-photo={p.id} />
        {p.ownPhoto && (
          <Btn tone="light" onClick={() => send({ image: null }, photoSave)} disabled={photoSave.status === 'saving'}>
            {p.added ? 'Remove photo' : 'Use the old photo'}
          </Btn>
        )}
        <div className="w-full">
          <SaveMessage save={photoSave} />
          {photoSave.fields?.photo && <p className="t-small text-error">{FIELD_WORDS.image}</p>}
        </div>
      </div>
    </div>
  )
}

/** Big two-or-more-way choice (radio buttons that look like buttons) */
function Choice({ legend, options, value, onChange, ...props }) {
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-1 font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([k, label]) => (
          <label
            key={k}
            className={`inline-flex min-h-12 cursor-pointer items-center rounded-control border-[1.5px] px-4 font-bold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink ${value === k ? 'border-ink bg-ink text-gold-light' : 'border-control-line bg-cream'}`}
          >
            <input type="radio" className="sr-only" name={name} checked={value === k} onChange={() => onChange(k)} data-admin-choice={k} {...props} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Courier size for a product Hema adds: small (up to 250 g) or large (500–700 g) */
function TierChoice({ tiers, value, onChange }) {
  return <Choice legend="Courier size" options={tiers.map((t) => [t.id, `${t.id === 'small' ? 'Small' : 'Large'} (${t.name})`])} value={value} onChange={onChange} />
}

/** "+ Add new product" at the bottom of a category: a small form that puts a new product on the website */
function AddProduct({ category, categories, tiers, onAdded }) {
  const [open, setOpen] = useState(false)
  const empty = () => ({ category: category.id, nameEn: '', nameKn: '', descEn: '', descKn: '', mode: 'one', price: '', sizes: [{ label: '', price: '' }], ragi: false, ragiPrice: '', tier: 'small', image: null, photoError: false })
  const [f, setF] = useState(empty)
  const save = useSave()
  const set = (patch) => setF((x) => ({ ...x, ...patch }))

  const onPhoto = async (file) => {
    const image = await productPhotoDataUrl(file)
    set({ image, photoError: !image })
  }

  const submit = () =>
    save.run(async () => {
      const body = {
        category: f.category,
        name: { en: f.nameEn, kn: f.nameKn },
        description: { en: f.descEn, kn: f.descKn },
        courierTier: f.tier,
        ragiPrice: f.ragi ? num(f.ragiPrice) : null,
        ...(f.mode === 'sizes' ? { sizes: f.sizes.map((s) => ({ label: s.label, price: num(s.price) })) } : { price: num(f.price) }),
        ...(f.image ? { image: f.image } : {}),
      }
      const r = await adminCall('addProduct', body)
      if (r.ok) {
        onAdded(r.data)
        setF(empty())
        setOpen(false)
      }
      return r
    }, 'Added. It is on the website now.')

  if (!open)
    return (
      <div className="mt-3">
        <Btn tone="gold" className="w-full" onClick={() => setOpen(true)} data-admin-add-product={category.id}>
          + Add new product
        </Btn>
        {save.status === 'saved' && (
          <div className="mt-2">
            <SaveMessage save={save} />
          </div>
        )}
      </div>
    )

  const sizeError = fieldError(save, 'price') || fieldError(save, 'sizes')
  return (
    <div className="mt-3 space-y-4 rounded-card border-2 border-gold-mid bg-[#fffcf5] p-4" data-admin-add-form={category.id}>
      <h3 className="t-h3">New product</h3>
      <Field label="Category" error={fieldError(save, 'category')}>
        <select className={input} value={f.category} onChange={(e) => set({ category: e.target.value })} data-admin-new-category>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <CountedField label="Name in English" value={f.nameEn} onChange={(v) => set({ nameEn: v })} max={NAME_MAX} error={fieldError(save, 'nameEn')} data-admin-new-name-en />
      <CountedField label="Name in Kannada (ಕನ್ನಡ)" value={f.nameKn} onChange={(v) => set({ nameKn: v })} max={NAME_MAX} lang="kn" hint="Optional" error={fieldError(save, 'nameKn')} data-admin-new-name-kn />
      <CountedField label="Description in English" value={f.descEn} onChange={(v) => set({ descEn: v })} max={DESCRIPTION_MAX} multiline hint="Optional" error={fieldError(save, 'descriptionEn')} data-admin-new-desc-en />
      <CountedField label="Description in Kannada (ಕನ್ನಡ)" value={f.descKn} onChange={(v) => set({ descKn: v })} max={DESCRIPTION_MAX} multiline lang="kn" hint="Optional" error={fieldError(save, 'descriptionKn')} data-admin-new-desc-kn />

      <div>
        <Choice
          legend="Price"
          options={[
            ['one', 'One price'],
            ['sizes', 'Sizes with prices'],
          ]}
          value={f.mode}
          onChange={(mode) => set({ mode })}
        />
        {f.mode === 'one' ? (
          <div className="mt-2 flex items-center gap-2">
            <span aria-hidden="true">₹</span>
            <input className={`${input} w-32`} inputMode="numeric" aria-label="Price in rupees" value={f.price} onChange={(e) => set({ price: digits(e.target.value) })} data-admin-new-price />
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            {f.sizes.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className={`${input} min-w-0 flex-1`} aria-label="Size name" placeholder="Size, e.g. 250 g" value={s.label} onChange={(e) => set({ sizes: f.sizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} data-admin-new-size-label={i} />
                <span aria-hidden="true">₹</span>
                <input className={`${input} w-28`} inputMode="numeric" aria-label={`Price for ${s.label || 'this size'}`} value={s.price} onChange={(e) => set({ sizes: f.sizes.map((x, j) => (j === i ? { ...x, price: digits(e.target.value) } : x)) })} data-admin-new-size-price={i} />
                {f.sizes.length > 1 && (
                  <Btn tone="light" className="px-3" onClick={() => set({ sizes: f.sizes.filter((_, j) => j !== i) })} aria-label="Remove this size">
                    ✕
                  </Btn>
                )}
              </div>
            ))}
            {f.sizes.length < 6 && (
              <Btn tone="light" onClick={() => set({ sizes: [...f.sizes, { label: '', price: '' }] })} data-admin-new-add-size>
                + Add a size
              </Btn>
            )}
          </div>
        )}
        {sizeError && <p className="t-small mt-1 font-bold text-error">{sizeError}</p>}
      </div>

      <div>
        <Choice
          legend="Can it be made with ragi?"
          options={[
            ['no', 'No'],
            ['yes', 'Yes, ragi too'],
          ]}
          value={f.ragi ? 'yes' : 'no'}
          onChange={(v) => set({ ragi: v === 'yes' })}
        />
        {f.ragi && (
          <div className="mt-2 flex items-center gap-2">
            <span className="font-bold">Ragi extra</span>
            <span aria-hidden="true">₹</span>
            <input className={`${input} w-28`} inputMode="numeric" aria-label="Ragi extra in rupees" value={f.ragiPrice} onChange={(e) => set({ ragiPrice: digits(e.target.value) })} data-admin-new-ragi-price />
          </div>
        )}
        {fieldError(save, 'ragiPrice') && <p className="t-small mt-1 font-bold text-error">{fieldError(save, 'ragiPrice')}</p>}
      </div>

      <TierChoice tiers={tiers} value={f.tier} onChange={(tier) => set({ tier })} />

      <div className="flex flex-wrap items-center gap-3">
        {f.image ? (
          <img src={f.image} alt="" width="80" height="80" className="h-20 w-20 rounded-control bg-ink object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-control bg-ink text-gold">
            <ImageIcon className="h-8 w-8" />
          </span>
        )}
        <PhotoButton onFile={onPhoto} label={f.image ? 'Change photo' : 'Add a photo'} data-admin-new-photo />
        <p className="t-small w-full text-brown-2">Optional. Without a photo the website shows a gold drawing.</p>
        {(f.photoError || fieldError(save, 'photo')) && <p className="t-small font-bold text-error">{FIELD_WORDS.image}</p>}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <Btn tone="gold" onClick={submit} disabled={save.status === 'saving'} data-admin-new-save>
          Add to the menu
        </Btn>
        <Btn
          tone="light"
          onClick={() => {
            setOpen(false)
            save.reset()
          }}
        >
          Cancel
        </Btn>
      </div>
      <SaveMessage save={save} />
    </div>
  )
}

/** The Customize page tiles: their photo (or the product photo they show until she picks one) */
function TileEditors({ tiles, onSaved }) {
  return (
    <div className="mt-2 rounded-card border border-line bg-champagne/50 p-4">
      <h3 className="font-bold">Customize page tiles</h3>
      <p className="t-small text-brown-2">The photos on the Customize page. Products you add to “Customize page” show there too, with their own photo.</p>
      <ul className="mt-3 space-y-4">
        {tiles.map((t) => (
          <li key={t.id}>
            <TileEditor tile={t} onSaved={onSaved} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function TileEditor({ tile: t, onSaved }) {
  const save = useSave()
  const send = (getImage) =>
    save.run(async () => {
      const image = await getImage()
      if (image === undefined) return { ok: false, error: 'fields', fields: { photo: 'image' } }
      const r = await adminCall('tilePhoto', { tile: t.id, image })
      if (r.ok) onSaved(r.data)
      return r
    }, 'Photo saved. It shows on the website within a minute.')
  return (
    <div className="flex flex-wrap items-center gap-3" data-admin-tile={t.id}>
      {t.photo ? (
        <img src={t.photo} alt="" width="64" height="64" className="h-16 w-16 shrink-0 rounded-control bg-ink object-cover" />
      ) : (
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-control bg-ink text-gold">
          <ImageIcon className="h-7 w-7" />
        </span>
      )}
      <p className="min-w-0 flex-1 font-bold">{t.name}</p>
      <div className="flex w-full flex-wrap gap-2">
        <PhotoButton onFile={(file) => send(async () => (await productPhotoDataUrl(file)) || undefined)} busy={save.status === 'saving'} data-admin-tile-photo={t.id} />
        {t.ownPhoto && (
          <Btn tone="light" onClick={() => send(async () => null)} disabled={save.status === 'saving'}>
            Use the old photo
          </Btn>
        )}
      </div>
      <div className="w-full">
        <SaveMessage save={save} />
        {save.fields?.photo && <p className="t-small text-error">{FIELD_WORDS.image}</p>}
      </div>
    </div>
  )
}
