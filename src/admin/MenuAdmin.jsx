import { useEffect, useState } from 'react'
import { adminCall } from './api'
import { Btn, card, ErrorText, Field, formatINR, input, Loading, PageTitle, Pill, SaveMessage, useAdminData, useSave } from './ui'
import { ImageIcon } from '../components/icons'
import { smallPhoto } from '../lib/productPhoto'
import { PRODUCT_TEXT_MAX } from '../lib/pricing'
import { Counter, PhotoButtons, productPhotoFiles } from './photos'

const CATEGORY_WORDS = { 'brownie-tubs': 'Brownie Tubs', 'delight-boxes': 'Delight Boxes', brownies: 'Brownies', chocolates: 'Chocolates', customize: 'Customize page' }
// Where Hema can add her own products (the Customize page's items stay as they are)
const ADDABLE = ['brownie-tubs', 'delight-boxes', 'brownies', 'chocolates']

// Courier charge groups in Hema's words (the six rates themselves are in Settings)
const TIER_WORDS = {
  small: 'Small parcel: like a 250 g box, a bar or a brownie box',
  large: 'Medium parcel: like a 500 g or 700 g Delight Box',
  xl: 'Large parcel: 750 g or more',
}
const NAME_MAX = PRODUCT_TEXT_MAX.name
const DESCRIPTION_MAX = PRODUCT_TEXT_MAX.description
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

/** Name in English and Kannada (the Kannada may stay empty: Kannada readers then see the English) */
function NameFields({ value, set, error, required }) {
  return (
    <div className="space-y-3">
      <Field label={`Name in English${required ? '' : ' (empty = the original name)'}`} error={error === 'required' ? 'Write the name in English.' : ''}>
        <input className={input} maxLength={NAME_MAX} value={value.nameEn} onChange={(e) => set({ ...value, nameEn: e.target.value })} data-admin-name-en />
        <Counter value={value.nameEn} max={NAME_MAX} />
      </Field>
      <Field label="Name in Kannada (optional)" hint="Empty: Kannada readers see the English name.">
        <input className={input} maxLength={NAME_MAX} value={value.nameKn} onChange={(e) => set({ ...value, nameKn: e.target.value })} lang="kn" data-admin-name-kn />
        <Counter value={value.nameKn} max={NAME_MAX} />
      </Field>
    </div>
  )
}

/** The short text on the website's product sheet, above the options */
function DescriptionFields({ value, set, error }) {
  return (
    <div className="space-y-3">
      <Field label="Description in English" hint="One or two short sentences. Empty = no description." error={error === 'required' ? 'Write the description in English too.' : ''}>
        <textarea className={input} rows={3} maxLength={DESCRIPTION_MAX} value={value.descEn} onChange={(e) => set({ ...value, descEn: e.target.value })} data-admin-desc-en />
        <Counter value={value.descEn} max={DESCRIPTION_MAX} />
      </Field>
      <Field label="Description in Kannada (optional)">
        <textarea className={input} rows={3} maxLength={DESCRIPTION_MAX} value={value.descKn} onChange={(e) => set({ ...value, descKn: e.target.value })} lang="kn" data-admin-desc-kn />
        <Counter value={value.descKn} max={DESCRIPTION_MAX} />
      </Field>
    </div>
  )
}

/** "Is there a ragi version?" and its extra price */
function RagiFields({ on, setOn, price, setPrice, error, name }) {
  return (
    <fieldset>
      <legend className="font-bold">Ragi version</legend>
      <p className="t-small text-brown-2">Customers can choose “Make it ragi” for this extra price.</p>
      {[
        [false, 'No ragi version'],
        [true, 'Yes, it can be made with ragi'],
      ].map(([v, words]) => (
        <label key={String(v)} className="flex min-h-12 items-center gap-3">
          <input type="radio" name={name} className="h-6 w-6 accent-ink" checked={on === v} onChange={() => setOn(v)} data-admin-ragi={v ? 'yes' : 'no'} />
          {words}
        </label>
      ))}
      {on && (
        <div className="mt-1 flex items-center gap-2">
          <span className="font-bold">Ragi extra</span>
          <span aria-hidden="true">₹</span>
          <input className={`${input} w-28`} inputMode="numeric" aria-label="Ragi extra price in rupees" value={price} onChange={(e) => setPrice(priceDigits(e.target.value))} data-admin-ragi-price />
        </div>
      )}
      {error && <p className="t-small font-bold text-error">Write the extra price for ragi, in rupees.</p>}
    </fieldset>
  )
}

const EMPTY_NEW = { nameEn: '', nameKn: '', descEn: '', descKn: '', priced: 'one', price: '', sizes: [{ id: 'size-1', label: '', price: '' }], tier: '', ragi: false, ragiPrice: '' }

/**
 * "+ Add new product", at the bottom of each menu section: category (that section, can be
 * changed), names, description, one price or sizes, a ragi version, the courier group and a photo.
 * It goes on the website menu at once (after her other products in that category). There is no
 * delete: Hide from menu takes a product off the website and keeps old orders whole.
 */
function AddProduct({ category, onAdded }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_NEW, category })
  const [photo, setPhoto] = useState(null) // a File
  const [photoProblem, setPhotoProblem] = useState(false)
  const save = useSave()
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))
  const close = () => {
    setForm({ ...EMPTY_NEW, category })
    setPhoto(null)
    setOpen(false)
  }
  const errors = save.fields || {}

  const submit = () =>
    save.run(async () => {
      const body = {
        category: form.category,
        name: { en: form.nameEn, kn: form.nameKn },
        description: { en: form.descEn, kn: form.descKn },
        courierTier: form.tier,
        ...(form.priced === 'sizes' ? { sizes: form.sizes.map((s) => ({ label: s.label, price: num(s.price) })) } : { price: num(form.price) }),
        ...(form.ragi ? { ragiPrice: num(form.ragiPrice) } : {}),
      }
      const r = await adminCall('addProduct', body)
      if (!r.ok) return r
      // The product is saved; a photo that can't be used doesn't undo it (she can add one later)
      let products = r.data.products
      let photoOk = true
      if (photo) {
        const files = await productPhotoFiles(photo)
        const p = files ? await adminCall('productPhoto', { id: r.data.id, ...files }) : null
        if (p?.ok) products = p.data.products
        else photoOk = false
      }
      setPhotoProblem(!photoOk)
      onAdded(products, r.data.id)
      close()
      return r
    }, 'Added. It is on the website menu now.')

  if (!open)
    return (
      <div className="mt-3">
        <Btn
          tone="gold"
          className="min-h-14 w-full text-lg"
          onClick={() => {
            save.reset()
            setPhotoProblem(false)
            setOpen(true)
          }}
          data-admin-add-product={category}
        >
          + Add new product
        </Btn>
        <div className="mt-2">
          {save.status === 'saved' && <SaveMessage save={save} />}
          {save.status === 'saved' && photoProblem && <p className="t-small font-bold text-error">The photo could not be used. Find the product above and tap Change photo to try another one.</p>}
        </div>
      </div>
    )

  const fileId = `new-photo-${category}`
  return (
    <section aria-labelledby={`add-title-${category}`} className={`${card} mt-3 space-y-4 border-gold-mid`} data-admin-add-form={category}>
      <h3 id={`add-title-${category}`} className="t-h3">
        Add a new product
      </h3>
      <Field label="Where on the menu" error={errors.category ? 'Choose where it goes on the menu.' : ''}>
        <select className={input} value={form.category} onChange={(e) => set({ category: e.target.value })} data-admin-new-category>
          <option value="">Choose…</option>
          {ADDABLE.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_WORDS[c]}
            </option>
          ))}
        </select>
      </Field>
      <NameFields value={form} set={setForm} error={errors.name} required />
      <DescriptionFields value={form} set={setForm} error={errors.description} />

      <fieldset>
        <legend className="mb-1 font-bold">Price</legend>
        {[
          ['one', 'One price'],
          ['sizes', 'Different sizes, each with its price'],
        ].map(([v, words]) => (
          <label key={v} className="flex min-h-12 items-center gap-3">
            <input type="radio" name={`priced-${category}`} className="h-6 w-6 accent-ink" checked={form.priced === v} onChange={() => set({ priced: v })} data-admin-priced={v} />
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

      <RagiFields name={`ragi-${category}`} on={form.ragi} setOn={(ragi) => set({ ragi })} price={form.ragiPrice} setPrice={(ragiPrice) => set({ ragiPrice })} error={errors.ragiPrice} />

      <fieldset>
        <legend className="font-bold">Courier charge</legend>
        <p className="t-small text-brown-2">Which parcel is it most like? The customer pays that courier charge (the rates are in Settings).</p>
        {Object.entries(TIER_WORDS).map(([tier, words]) => (
          <label key={tier} className="flex min-h-12 items-center gap-3">
            <input type="radio" name={`tier-${category}`} className="h-6 w-6 shrink-0 accent-ink" checked={form.tier === tier} onChange={() => set({ tier })} data-admin-new-tier={tier} />
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
          <input id={fileId} type="file" accept="image/*" className="sr-only" onChange={(e) => setPhoto(e.target.files?.[0] || null)} data-admin-new-photo />
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

/** "Edit name": English and Kannada; Save puts it on the website at once. The product's ID stays. */
function NameEditor({ product: p, onSaved, onClose }) {
  const [value, setValue] = useState({ nameEn: p.name, nameKn: p.nameKn === p.name ? '' : p.nameKn })
  const save = useSave()
  const send = () =>
    save.run(async () => {
      const r = await adminCall('updateProduct', { id: p.id, name: { en: value.nameEn, kn: value.nameKn } })
      if (r.ok) onSaved(r.data.products)
      return r
    }, 'Name saved. It is on the website now.')
  return (
    <div className="mt-3 space-y-3 rounded-control border border-gold-mid bg-cream p-3" data-admin-name-editor>
      <p className="font-bold">Edit name</p>
      <NameFields value={value} set={setValue} error={save.fields?.name} required={p.custom} />
      <div className="flex flex-wrap gap-2">
        <Btn onClick={send} disabled={save.status === 'saving'} data-admin-save-name>
          Save name
        </Btn>
        <Btn tone="light" onClick={onClose}>
          Close
        </Btn>
      </div>
      <SaveMessage save={save} />
    </div>
  )
}

/** "Description": the short text on the product sheet, English and Kannada, at most 200 letters */
function DescriptionEditor({ product: p, onSaved, onClose }) {
  const [value, setValue] = useState({ descEn: p.description, descKn: p.descriptionKn })
  const save = useSave()
  const send = () =>
    save.run(async () => {
      const r = await adminCall('updateProduct', { id: p.id, description: { en: value.descEn, kn: value.descKn } })
      if (r.ok) onSaved(r.data.products)
      return r
    }, 'Description saved. It is on the website now.')
  return (
    <div className="mt-3 space-y-3 rounded-control border border-gold-mid bg-cream p-3" data-admin-desc-editor>
      <p className="font-bold">Description</p>
      <p className="t-small text-brown-2">Customers see it when they tap the product, above the choices.</p>
      <DescriptionFields value={value} set={setValue} error={save.fields?.description} />
      <div className="flex flex-wrap gap-2">
        <Btn onClick={send} disabled={save.status === 'saving'} data-admin-save-desc>
          Save description
        </Btn>
        <Btn tone="light" onClick={onClose}>
          Close
        </Btn>
      </div>
      <SaveMessage save={save} />
    </div>
  )
}

/** The photos of the Customize page's tiles and Home's Customize tile (not the products' own photos) */
function PageTiles() {
  const { data, error, setData } = useAdminData(() => adminCall('pagePhotos'), [])
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  return (
    <ul className="mt-2 space-y-3">
      {data.photos.map((tile) => (
        <li key={tile.id} className="rounded-card border border-line bg-[#fffcf5] p-4" data-admin-tile={tile.id}>
          <div className="flex gap-3">
            {tile.photo ? (
              <img src={smallPhoto(tile.photo)} alt="" width="80" height="80" className="h-20 w-20 shrink-0 rounded-control bg-ink object-cover" />
            ) : (
              <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-control bg-ink text-gold">
                <ImageIcon className="h-8 w-8" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold">{tile.name}</p>
              <p className="t-small mt-1 text-brown-2">{tile.ownPhoto ? 'Your own photo for this tile.' : 'Shows the product photo for now.'}</p>
            </div>
          </div>
          <div className="mt-3">
            <PhotoButtons action="pagePhoto" id={tile.id} testId={`tile-${tile.id}`} hasOwn={tile.ownPhoto} removeText="Use the product photo again" onSaved={(d) => setData({ photos: d.photos })} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Hema's menu: prices per size, Sold out, Hidden, the tubs' sizes and prices (which turns on their
 * Add to cart, e.g. the Dream Cake Tub), each product's photo, name and description, her own new
 * products (at the bottom of each section) and the Customize page's photos. Changes reach the
 * website at once; "Saved" shows only once the server has saved.
 */
export default function MenuAdmin() {
  const { data, error, setData } = useAdminData(() => adminCall('menu'), [])
  if (error) return <ErrorText>{error}</ErrorText>
  if (!data) return <Loading />
  const products = data.products
  const onSaved = (next) => setData({ products: next })
  return (
    <div>
      <PageTitle>Menu</PageTitle>
      <p className="t-small text-brown-2">Prices in rupees. Tap Save under a product to change it. The website shows changes straight away. To add a product, scroll to its section and tap “+ Add new product”.</p>
      <nav aria-label="Menu sections" className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {Object.entries(CATEGORY_WORDS).map(([c, words]) => (
          <a key={c} href={`#admin-${c}`} className="inline-flex min-h-12 shrink-0 items-center rounded-full border border-line bg-[#fffcf5] px-4 font-bold">
            {words}
          </a>
        ))}
      </nav>
      {Object.keys(CATEGORY_WORDS).map((c) => (
        <section key={c} id={`admin-${c}`} aria-labelledby={`admin-${c}-title`} className="mt-6 scroll-mt-16">
          <h2 id={`admin-${c}-title`} className="t-h3">
            {CATEGORY_WORDS[c]}
          </h2>
          {c === 'customize' && (
            <>
              <p className="t-small mt-1 text-brown-2">The photos on the website’s Customize page, and the Customize tile on the Home page. Change photo puts your photo there at once.</p>
              <PageTiles />
              <p className="mt-4 font-bold">Product on the Customize page</p>
            </>
          )}
          <ul className="mt-2 space-y-3">
            {products
              .filter((p) => p.category === c)
              .map((p) => (
                <li key={p.id}>
                  <ProductEditor product={p} onSaved={onSaved} />
                </li>
              ))}
          </ul>
          {ADDABLE.includes(c) && (
            <AddProduct
              category={c}
              onAdded={(next, id) => {
                onSaved(next)
                requestAnimationFrame(() => document.querySelector(`[data-admin-product="${id}"]`)?.scrollIntoView({ block: 'center' }))
              }}
            />
          )}
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
  const [ragiOn, setRagiOn] = useState(p.ragiPrice != null)
  const [live, setLive] = useState(p.priceStatus === 'live')
  const [panel, setPanel] = useState(null) // 'name' | 'description' | null
  const save = useSave()
  // After a save (or "Back to original") show what the server now has, keeping the "Saved" message
  const saved = JSON.stringify([p.sizes, p.price, p.ragiPrice, p.priceStatus])
  useEffect(() => {
    setSizes(p.sizes.map((s) => ({ ...s, price: String(s.price) })))
    setPrice(p.price != null ? String(p.price) : '')
    setRagi(p.ragiPrice != null ? String(p.ragiPrice) : '')
    setRagiOn(p.ragiPrice != null)
    setLive(p.priceStatus === 'live')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved])
  const send = (body) =>
    save.run(async () => {
      const r = await adminCall('updateProduct', { id: p.id, ...body })
      if (r.ok) onSaved(r.data.products)
      return r
    })

  const savePrices = () => {
    const body = {}
    if (p.sizes.length || namedSizes) body.sizes = sizes.map((s) => ({ id: s.id, label: s.label, price: num(s.price), ...(s.grams ? { grams: s.grams } : {}) }))
    if (!p.sizes.length && !namedSizes) body.price = num(price)
    // Her own products: the ragi version can be switched on and off; the standard brownies keep theirs
    if (p.custom) body.ragiPrice = ragiOn ? num(ragi) : null
    else if (p.ragiPrice != null) body.ragiPrice = num(ragi)
    if (isTub && !p.custom) body.priceStatus = live ? 'live' : 'coming-soon'
    if (body.sizes && !body.sizes.length) delete body.sizes
    return send(body)
  }
  const toggle = (which) => setPanel((now) => (now === which ? null : which))

  return (
    <div className={`rounded-card border p-4 ${p.active ? 'border-line bg-[#fffcf5]' : 'border-dashed border-control-line bg-cream opacity-80'}`} data-admin-product={p.id}>
      <div className="flex gap-3">
        {p.photo ? (
          <img src={smallPhoto(p.photo)} alt="" width="80" height="80" className="h-20 w-20 shrink-0 rounded-control bg-ink object-cover" />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-control bg-ink text-gold">
            <ImageIcon className="h-8 w-8" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-bold" data-admin-product-name>
            {p.name}
          </p>
          {Boolean(p.nameKn) && p.nameKn !== p.name && (
            <p className="t-small text-brown-2" lang="kn">
              {p.nameKn}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {p.soldOut && <Pill tone="bad">Sold out</Pill>}
            {!p.active && <Pill tone="bad">Hidden</Pill>}
            {p.priceStatus !== 'live' && <Pill tone="warn">Price coming soon</Pill>}
            {p.changed && <Pill>Changed by you</Pill>}
            {p.custom && <Pill>Added by you</Pill>}
          </div>
        </div>
      </div>
      {p.description ? <p className="t-small mt-2 text-brown-2">{p.description}</p> : null}
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
        {p.custom ? (
          <RagiFields name={`ragi-${p.id}`} on={ragiOn} setOn={setRagiOn} price={ragi} setPrice={setRagi} error={save.fields?.ragi_price} />
        ) : (
          p.ragiPrice != null && (
            <div className="flex items-center gap-2">
              <span className="w-24 font-bold">Ragi extra</span>
              <span aria-hidden="true">₹</span>
              <input className={`${input} w-28`} inputMode="numeric" aria-label="Ragi extra" value={ragi} onChange={(e) => setRagi(e.target.value.replace(/\D/g, ''))} />
            </div>
          )
        )}
        {isTub && !p.custom && (
          <label className="flex min-h-12 items-center gap-3 font-bold">
            <input type="checkbox" className="h-6 w-6 accent-ink" checked={live} onChange={(e) => setLive(e.target.checked)} />
            Show prices and allow ordering
          </label>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Btn onClick={savePrices} disabled={save.status === 'saving'} data-admin-save-product>
          Save
        </Btn>
        <Btn tone="light" onClick={() => send({ soldOut: !p.soldOut })} disabled={save.status === 'saving'} data-admin-soldout>
          {p.soldOut ? 'Back in stock' : 'Mark sold out'}
        </Btn>
        <Btn tone="light" onClick={() => toggle('name')} aria-expanded={panel === 'name'} data-admin-edit-name>
          Edit name
        </Btn>
        <Btn tone="light" onClick={() => toggle('description')} aria-expanded={panel === 'description'} data-admin-edit-desc>
          Description
        </Btn>
        <Btn tone="light" className="col-span-2 sm:col-auto" onClick={() => send({ active: !p.active })} disabled={save.status === 'saving'}>
          {p.active ? 'Hide from menu' : 'Show on menu'}
        </Btn>
        {p.changed && (
          <Btn tone="light" className="col-span-2 sm:col-auto" onClick={() => send({ reset: true })} disabled={save.status === 'saving'}>
            Back to original
          </Btn>
        )}
      </div>
      <div className="mt-2">
        <SaveMessage save={save} />
        {save.status === 'error' && !namedSizes && save.fields?.sizes && <p className="t-small text-error">{SIZE_ERRORS[save.fields.sizes]}</p>}
      </div>
      {/* Keyed, so a change above (e.g. the first description appearing) never rebuilds them and loses "Saved" */}
      {panel === 'name' && <NameEditor key="name-editor" product={p} onSaved={onSaved} onClose={() => setPanel(null)} />}
      {panel === 'description' && <DescriptionEditor key="description-editor" product={p} onSaved={onSaved} onClose={() => setPanel(null)} />}
      {p.sizes.length === 0 && p.price != null && <p className="t-small mt-1 text-brown-2">Now: {formatINR(p.price)}</p>}
      {p.custom && <p className="t-small mt-1 text-brown-2">Courier: {TIER_WORDS[p.courierTier]?.split(':')[0]}</p>}

      <div className="mt-3 border-t border-line pt-3">
        <PhotoButtons action="productPhoto" id={p.id} hasOwn={p.ownPhoto} removeText={p.custom ? 'Remove photo' : 'Use the old photo'} onSaved={(d) => onSaved(d.products)} />
      </div>
    </div>
  )
}
