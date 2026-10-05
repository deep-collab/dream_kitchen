// The product sheet. Loaded on first open (ShopSheets.jsx lazy-loads this file, and src/routes.js
// fetches it ahead of time on an idle phone). Only the options the product needs: size, ragi,
// name on the box, drawing. Live price, one big Add to cart.
import { useEffect, useId, useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useCart } from '../../context/CartProvider'
import { useShopStatus } from '../../context/MenuProvider'
import { brownieInfo, categories, limits, optionPrices } from '../../config/shop'
import { site, telLink } from '../../config/site'
import {
  courierFrom,
  defaultSelection,
  drawingIncluded,
  formatINR,
  hasNameOption,
  hasRagi,
  hasSizes,
  isForSale,
  selectionErrors,
  unitPrice,
} from '../../lib/pricing'
import { makeLine } from '../../lib/cart'
import { sizeLabel } from '../../lib/weights'
import { prepareImage, uploadImage } from '../../lib/images'
import Sheet from '../ui/Sheet'
import Toggle from '../ui/Toggle'
import TextField from '../ui/TextField'
import Button from '../ui/Button'
import ProductPhoto from './ProductPhoto'
import { useAddedToast } from './ShopSheets'
import { AlertIcon, ChevronDownIcon, CloseIcon, ImageIcon } from '../icons'
import 'virtual:dk-strings/sheet'

const ORDER = ['size', 'name', 'drawingText', 'drawingRef']
// e.g. Brownies: "5 pieces in every box"
const categoryNote = (product) => categories.find((c) => c.id === product.category)?.note || null

export function ProductSheet({ open, product, line, focus, onClose }) {
  const { t, pick } = useI18n()
  const cart = useCart()
  const added = useAddedToast()
  const { settings } = useShopStatus()
  const [selection, setSelection] = useState(() => (line ? { ...line.selection } : defaultSelection(product)))
  const [thumb, setThumb] = useState(line?.refThumb || null)
  const [uploading, setUploading] = useState(false)
  const [tried, setTried] = useState(false)
  const customRef = useRef(null)
  const set = (patch) => setSelection((s) => ({ ...s, ...patch }))

  const forSale = isForSale(product)
  const price = forSale ? unitPrice(product, selection) : null
  const errors = forSale ? selectionErrors(product, selection) : {}
  delete errors.product
  const shown = tried ? errors : {}

  // From the Customize page: start with the name and drawing options in view
  useEffect(() => {
    if (focus !== 'custom' || !open) return
    const id = setTimeout(() => customRef.current?.scrollIntoView({ block: 'start' }), 350)
    return () => clearTimeout(id)
  }, [focus, open])

  const onAdd = () => {
    setTried(true)
    const first = ORDER.find((k) => errors[k])
    if (first) {
      const el = document.getElementById(`ps-${first}`)
      el?.scrollIntoView({ block: 'center' })
      el?.focus({ preventScroll: true })
      return
    }
    const next = makeLine(product, selection, 1, { refThumb: thumb })
    if (line) cart.update(line.id, next)
    else cart.add(next)
    onClose()
    added(Boolean(line))
  }

  const footer = forSale ? (
    <div>
      <p className="mb-2 flex items-baseline justify-between gap-3" aria-live="polite" aria-atomic="true">
        <span className="t-small text-brown-2">{t('sheet.courierFrom', { price: formatINR(courierFrom(settings.courier)) })}</span>
        <span className="t-price">{formatINR(price ?? 0)}</span>
      </p>
      <Button size="lg" fullWidth onClick={onAdd} disabled={uploading} data-dk-add>
        {uploading ? t('sheet.photoUploading') : t(line ? 'sheet.update' : 'sheet.add', { price: formatINR(price ?? 0) })}
      </Button>
      <p className="mt-1 text-center">
        <a href={telLink} className="t-small inline-flex min-h-12 items-center text-brown-2 underline underline-offset-4 hover:text-brown">
          {t('sheet.call', { phone: site.phone.short })}
        </a>
      </p>
    </div>
  ) : (
    <div>
      <Button size="lg" fullWidth disabled data-dk-add>
        {product.soldOut ? t('sheet.soldOut') : t('sheet.priceSoon')}
      </Button>
      <p className="mt-1 text-center">
        <a href={telLink} className="t-small inline-flex min-h-12 items-center text-brown-2 underline underline-offset-4 hover:text-brown">
          {t('sheet.call', { phone: site.phone.short })}
        </a>
      </p>
    </div>
  )

  return (
    <Sheet open={open} onClose={onClose} title={pick(product.name)} footer={footer}>
      <div className="flex gap-4">
        <ProductPhoto slug={product.slug} art={product.art} eager rounded="rounded-card" sizes="128px" className="h-28 w-28 shrink-0 sm:h-32 sm:w-32" />
        <div className="min-w-0 flex-1">
          {forSale ? (
            <p className="t-price">
              {formatINR(price ?? 0)}
              {product.showWeight && product.grams && <span className="t-small ml-2 font-normal text-brown-2">{t('sheet.weight', { grams: product.grams })}</span>}
            </p>
          ) : (
            <p className="font-bold">{product.soldOut ? t('sheet.soldOut') : t('sheet.priceSoon')}</p>
          )}
          {product.description && <p className="t-small mt-1 text-brown-2">{pick(product.description)}</p>}
          {categoryNote(product) && <p className="t-small mt-1 text-brown-2">{pick(categoryNote(product))}</p>}
        </div>
      </div>

      {!forSale && <p className="mt-5">{t(product.soldOut ? 'sheet.soldOutText' : 'sheet.priceSoonText', { phone: site.phone.display })}</p>}

      {forSale && (
        <div className="mt-6 space-y-6">
          {hasSizes(product) && <SizeChoice product={product} value={selection.size} onChange={(size) => set({ size })} />}

          {hasRagi(product) && (
            <Toggle
              label={t('sheet.ragi')}
              description={t('sheet.ragiExtra', { price: formatINR(product.ragiPrice) })}
              checked={selection.ragi}
              onChange={(ragi) => set({ ragi })}
              onText={t('sheet.on')}
              offText={t('sheet.off')}
            />
          )}

          {(hasNameOption(product) || product.options?.drawing) && (
            <div ref={customRef} className="scroll-mt-4 space-y-6">
              {hasNameOption(product) && <NameField value={selection.name} onChange={(name) => set({ name })} error={shown.name} />}
              <DrawingFields
                product={product}
                selection={selection}
                set={set}
                errors={shown}
                thumb={thumb}
                setThumb={setThumb}
                uploading={uploading}
                setUploading={setUploading}
                drawingPrice={optionPrices.drawing}
              />
            </div>
          )}

          {product.category === 'brownies' && <Ingredients product={product} ragi={selection.ragi} />}
        </div>
      )}
    </Sheet>
  )
}

/** Sizes as a compact row of choices, each with its price (real radio inputs underneath) */
function SizeChoice({ product, value, onChange }) {
  const { t, pick } = useI18n()
  const name = useId()
  return (
    <fieldset>
      <legend className="mb-2 font-bold">{t('sheet.size')}</legend>
      <div id="ps-size" tabIndex={-1} className={`grid gap-2 ${product.sizes.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {product.sizes.map((s) => (
          <label key={s.id} className="relative block cursor-pointer">
            <input type="radio" name={name} value={s.id} checked={value === s.id} onChange={() => onChange(s.id)} className="peer sr-only" />
            <span className="flex min-h-16 flex-col items-center justify-center rounded-control border-[1.5px] border-control-line bg-[#fffdf8] px-1 py-2 text-center transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-cream peer-focus-visible:shadow-[0_0_0_3px_var(--color-ink)] peer-focus-visible:outline-3 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-gold hover:border-brown-2">
              <span className="leading-tight font-bold">{pick(sizeLabel(s))}</span>
              <span className="t-small tabular-nums">{formatINR(s.price)}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

/** Name on the box: free, up to 20 letters, with a live preview of how it reads */
function NameField({ value, onChange, error }) {
  const { t } = useI18n()
  const { errorText } = useErrorText()
  return (
    <div>
      <TextField
        id="ps-name"
        label={t('sheet.name')}
        optional
        hint={t('sheet.nameHint', { max: limits.nameOnBoxMax })}
        value={value}
        maxLength={limits.nameOnBoxMax}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value.slice(0, limits.nameOnBoxMax))}
        error={error ? errorText('name', error) : undefined}
      />
      {value.trim() && (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2 rounded-control bg-ink px-4 py-2.5 text-muted" aria-live="polite">
          {t('sheet.namePreview')}
          <span className="font-heading text-[1.375rem] font-semibold break-all text-gold-light">{value.trim()}</span>
        </p>
      )}
    </div>
  )
}

const useErrorText = () => {
  const { t } = useI18n()
  return {
    errorText: (field, code) => t(`sheet.errors.${field}.${code}`, { max: field === 'name' ? limits.nameOnBoxMax : limits.drawingTextMax }),
  }
}

/** Add a drawing (+₹450): describe it, and optionally add a reference photo. The drawing bar always has it. */
function DrawingFields({ product, selection, set, errors, thumb, setThumb, uploading, setUploading, drawingPrice }) {
  const { t } = useI18n()
  const { errorText } = useErrorText()
  const included = drawingIncluded(product)
  if (!product.options?.drawing) return null
  const on = included || selection.drawing
  return (
    <div className="space-y-4">
      {!included && (
        <Toggle
          label={t('sheet.drawing')}
          description={t('sheet.drawingNote')}
          checked={selection.drawing}
          onChange={(drawing) => set({ drawing })}
          onText={t('sheet.drawingExtra', { price: formatINR(drawingPrice) })}
          offText={t('sheet.drawingExtra', { price: formatINR(drawingPrice) })}
        />
      )}
      {included && <p className="t-small text-brown-2">{t('sheet.drawingNote')}</p>}
      {on && (
        <>
          <TextField
            id="ps-drawingText"
            as="textarea"
            rows={3}
            label={included ? t('sheet.drawingTextBar') : t('sheet.drawingText')}
            hint={t('sheet.drawingTextHint', { count: selection.drawingText.length, max: limits.drawingTextMax })}
            maxLength={limits.drawingTextMax}
            value={selection.drawingText}
            onChange={(e) => set({ drawingText: e.target.value.slice(0, limits.drawingTextMax) })}
            error={errors.drawingText ? errorText('drawingText', errors.drawingText) : undefined}
          />
          <PhotoField
            path={selection.drawingRef}
            thumb={thumb}
            uploading={uploading}
            onUploading={setUploading}
            onChange={(path, nextThumb) => {
              set({ drawingRef: path })
              setThumb(nextThumb)
            }}
          />
        </>
      )}
    </div>
  )
}

/** Optional reference photo: shrunk on the phone, uploaded privately, previewed here */
function PhotoField({ path, thumb, uploading, onUploading, onChange }) {
  const { t } = useI18n()
  const inputId = useId()
  const [error, setError] = useState(null)

  const onPick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    onUploading(true)
    const prepared = await prepareImage(file)
    if (prepared.error) {
      onUploading(false)
      return setError(prepared.error)
    }
    const r = await uploadImage('drawing', prepared)
    onUploading(false)
    if (!r.ok) return setError(r.error === 'notImage' ? 'notImage' : r.error === 'tooLarge' ? 'tooLarge' : 'failed')
    onChange(r.data.path, prepared.thumb)
  }

  return (
    <div id="ps-drawingRef" tabIndex={-1}>
      <p className="font-bold">
        {t('sheet.photo')} <span className="t-small font-normal text-brown-2">({t('common.optional')})</span>
      </p>
      <p className="t-small text-brown-2">{t('sheet.photoHint')}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {path && thumb && <img src={thumb} alt={t('sheet.photoAdded')} width="64" height="64" className="h-16 w-16 rounded-control object-cover" />}
        <label htmlFor={inputId} className={`btn btn-secondary cursor-pointer ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
          <ImageIcon />
          <span>{uploading ? t('sheet.photoUploading') : path ? t('sheet.photoChange') : t('sheet.photoAdd')}</span>
        </label>
        <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp,image/*" onChange={onPick} className="sr-only" disabled={uploading} />
        {path && !uploading && (
          <button type="button" onClick={() => onChange(null, null)} className="inline-flex min-h-12 items-center gap-1.5 rounded-control px-3 font-bold text-brown-2 hover:bg-champagne">
            <CloseIcon className="h-5 w-5" />
            {t('sheet.photoRemove')}
          </button>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {uploading ? t('sheet.photoUploading') : path ? t('sheet.photoAdded') : ''}
      </p>
      {error && (
        <p className="t-small mt-2 flex items-start gap-2 font-bold text-error" role="alert">
          <AlertIcon className="mt-[0.15em] h-5 w-5 shrink-0" />
          {t(`sheet.errors.photo.${error}`)}
        </p>
      )}
    </div>
  )
}

/** Brownies: ingredient names (never quantities), folded away, and the allergen line */
function Ingredients({ product, ragi }) {
  const { t, pick } = useI18n()
  const list = brownieInfo.base.map((i) => (ragi && i.en === brownieInfo.ragiSwap.from ? brownieInfo.ragiSwap.to : i))
  if (product.topping) list.push(product.topping)
  return (
    <details className="group rounded-control border border-line bg-[#fffdf8]">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 font-bold [&::-webkit-details-marker]:hidden">
        {t('sheet.ingredients')}
        <ChevronDownIcon className="h-5 w-5 transition-transform group-open:rotate-180" />
      </summary>
      <div className="t-small space-y-2 px-4 pb-4">
        <p>{list.map((i) => pick(i)).join(', ')}.</p>
        <p className="font-bold">{t('sheet.contains')}</p>
        {ragi && brownieInfo.ragiGlutenFree !== true && <p className="text-brown-2">{t('sheet.ragiGluten')}</p>}
      </div>
    </details>
  )
}
