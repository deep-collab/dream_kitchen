import { useEffect, useState } from 'react'
import { adminCall, problem } from './api'
import { Btn, formatINR, input, Pill, SaveMessage, useSave } from './ui'

const CATEGORY_WORDS = { 'brownie-tubs': 'Brownie Tubs', 'delight-boxes': 'Delight Boxes', brownies: 'Brownies', chocolates: 'Chocolates', customize: 'Customize page' }

/**
 * Hema's menu: change prices, mark Sold out or Hidden, and give the tubs their sizes and prices
 * (that also turns on Add to cart for them). Changes apply to the website and to new orders at once.
 */
export default function MenuAdmin() {
  const [products, setProducts] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    adminCall('menu').then((r) => (r.ok ? setProducts(r.data.products) : setError(problem(r))))
  }, [])
  if (error) return <p className="font-bold text-error">{error}</p>
  if (!products) return <p className="text-brown-2">Loading…</p>

  const groups = Object.keys(CATEGORY_WORDS).map((c) => [c, products.filter((p) => p.category === c)])
  return (
    <div>
      <h1 className="t-h2">Menu</h1>
      <p className="t-small text-brown-2">Prices in rupees. Tap Save under a product to change it.</p>
      {groups.map(([c, list]) => (
        <section key={c} className="mt-5">
          <h2 className="t-h3">{CATEGORY_WORDS[c]}</h2>
          <ul className="mt-2 space-y-3">
            {list.map((p) => (
              <li key={p.id}>
                <ProductEditor product={p} onSaved={setProducts} />
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

  const send = (body) =>
    save.run(async () => {
      const r = await adminCall('updateProduct', { id: p.id, ...body })
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

  return (
    <div className={`rounded-card border p-4 ${p.active ? 'border-line bg-[#fffcf5]' : 'border-dashed border-control-line bg-cream opacity-80'}`} data-admin-product={p.id}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{p.name}</p>
        <div className="flex flex-wrap gap-1.5">
          {p.soldOut && <Pill tone="bad">Sold out</Pill>}
          {!p.active && <Pill tone="bad">Hidden</Pill>}
          {p.priceStatus !== 'live' && <Pill tone="warn">Price coming soon</Pill>}
          {p.changed && <Pill>Changed by you</Pill>}
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
        <Btn onClick={savePrices} disabled={save.status === 'saving'}>
          Save
        </Btn>
        <Btn tone="light" onClick={() => send({ soldOut: !p.soldOut })} disabled={save.status === 'saving'}>
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
    </div>
  )
}
