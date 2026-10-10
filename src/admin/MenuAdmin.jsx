import { useEffect, useId, useState } from 'react'
import { adminCall } from './api'
import { Btn, ErrorText, formatINR, input, Loading, PageTitle, Pill, SaveMessage, useAdminData, useSave } from './ui'
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

/**
 * Hema's menu: prices per size, Sold out, Hidden, the tubs' sizes and prices (which turns on their
 * Add to cart, e.g. the Dream Cake Tub), and each product's photo. Changes reach the website
 * within a minute; "Saved" shows only once the server has saved.
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
  const num = (v) => (String(v).trim() === '' ? NaN : Number(v))

  const send = (body, s = save) =>
    s.run(async () => {
      const r = await adminCall(body.image !== undefined ? 'productPhoto' : 'updateProduct', { id: p.id, ...body })
      if (r.ok) onSaved(r.data.products)
      return r
    })

  const savePrices = () => {
    const body = {}
    if (p.sizes.length || isTub) body.sizes = sizes.map((s) => ({ id: s.id, label: s.label, price: num(s.price), ...(s.grams ? { grams: s.grams } : {}) }))
    if (!p.sizes.length && !isTub) body.price = num(price)
    if (p.ragiPrice != null) body.ragiPrice = num(ragi)
    if (isTub) body.priceStatus = live ? 'live' : 'coming-soon'
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
          </div>
        </div>
      </div>
      {p.toConfirm && <p className="t-small mt-1 text-[#6b4b00]">To confirm: {p.toConfirm}</p>}

      <div className="mt-3 space-y-2">
        {(p.sizes.length > 0 || isTub) &&
          sizes.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              {isTub ? (
                <input className={`${input} flex-1`} aria-label="Size name" placeholder="Size, e.g. 250 g" value={s.label || ''} onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              ) : (
                <span className="w-24 font-bold">{s.label}</span>
              )}
              <span aria-hidden="true">₹</span>
              <input
                className={`${input} w-28`}
                inputMode="numeric"
                aria-label={`Price for ${s.label || 'this size'}`}
                value={s.price}
                onChange={(e) => setSizes(sizes.map((x, j) => (j === i ? { ...x, price: e.target.value.replace(/\D/g, '') } : x)))}
              />
              {isTub && (
                <Btn tone="light" className="px-3" onClick={() => setSizes(sizes.filter((_, j) => j !== i))} aria-label="Remove this size">
                  ✕
                </Btn>
              )}
            </div>
          ))}
        {isTub && sizes.length < 6 && (
          <Btn tone="light" onClick={() => setSizes([...sizes, { id: `size-${Date.now().toString(36)}`, label: '', price: '' }])}>
            + Add a size
          </Btn>
        )}
        {!p.sizes.length && !isTub && (
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
        {isTub && (
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
        {save.status === 'error' && save.fields?.sizes === 'needPrices' && <p className="t-small text-error">Give every size a name and a price first.</p>}
      </div>
      {p.sizes.length === 0 && p.price != null && <p className="t-small mt-1 text-brown-2">Now: {formatINR(p.price)}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <label htmlFor={fileId} className={`inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-control border-[1.5px] border-brown px-4 font-bold ${photoSave.status === 'saving' ? 'pointer-events-none opacity-60' : ''}`}>
          <ImageIcon className="h-5 w-5" /> {photoSave.status === 'saving' ? 'Uploading…' : 'Change photo'}
        </label>
        <input id={fileId} type="file" accept="image/*" className="sr-only" onChange={onPhoto} data-admin-photo={p.id} />
        {p.ownPhoto && (
          <Btn tone="light" onClick={() => send({ image: null }, photoSave)} disabled={photoSave.status === 'saving'}>
            Use the old photo
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
