import { useRef, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useMenu } from '../../context/MenuProvider'
import { site, telLink } from '../../config/site'
import { defaultSelection, formatINR, nameCharged, optionGroup, priceForSelection } from '../../lib/pricing'
import { makeProductLine, MAX_QTY } from '../../lib/cart'
import RadioCardGroup from '../ui/RadioCard'
import ChipRadioGroup from '../ui/ChipRadioGroup'
import Toggle from '../ui/Toggle'
import TextField from '../ui/TextField'
import Chip from '../ui/Chip'
import QuantityStepper from '../ui/QuantityStepper'
import Button from '../ui/Button'
import 'virtual:dk-strings/customise'

export const NAME_MAX = 20
export const NOTE_MAX = 120

/**
 * State for customising one product. `initialLine` prefills it when editing a cart line.
 * submit() validates (a required flavour must be chosen) and returns a cart line or null.
 */
export function useCustomise(product, initialLine) {
  const menu = useMenu()
  const [selection, setSelection] = useState(() => (initialLine ? { ...initialLine.selection } : defaultSelection(product)))
  const [qty, setQty] = useState(initialLine?.qty || 1)
  const [flavourError, setFlavourError] = useState(false)
  const flavourRef = useRef(null)

  const set = (patch) => {
    setSelection((s) => ({ ...s, ...patch }))
    if (patch.flavour) setFlavourError(false)
  }
  const unitPrice = priceForSelection(product, selection)
  const total = unitPrice * qty
  const needsFlavour = Boolean(optionGroup(product, 'flavour')?.required) && !selection.flavour

  const submit = () => {
    if (needsFlavour) {
      setFlavourError(true)
      const el = flavourRef.current
      if (el) {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
        el.querySelector('input')?.focus({ preventScroll: true })
      }
      return null
    }
    return makeProductLine(product, selection, qty, { sections: menu?.sections || [], occasions: menu?.occasions || [] })
  }

  return { product, selection, set, qty, setQty, unitPrice, total, flavourError, flavourRef, submit, editing: Boolean(initialLine) }
}

/** The choices: size, flavour, name on box, occasion, note, quantity. */
export function CustomiseFields({ c }) {
  const { t, pick } = useI18n()
  const menu = useMenu()
  const { product, selection, set } = c
  const sizes = optionGroup(product, 'size')
  const flavours = optionGroup(product, 'flavour')
  const byWeight = Boolean(product.pricePerKg)

  return (
    <div className="space-y-8">
      {sizes && (
        <div>
          <RadioCardGroup
            legend={t(byWeight ? 'customise.weight' : 'customise.size')}
            value={selection.size}
            onChange={(size) => set({ size })}
            options={sizes.choices.map((ch) => ({ value: ch.id, label: pick(ch.label), price: ch.price }))}
          />
          {byWeight && <p className="t-small mt-2 text-brown-2">{t('customise.perKg', { price: formatINR(product.pricePerKg) })}</p>}
        </div>
      )}

      {flavours && (
        <ChipRadioGroup
          ref={c.flavourRef}
          legend={t('customise.flavour')}
          hint={t('customise.flavourHint')}
          options={flavours.choices.map((ch) => ({ value: ch.id, label: pick(ch.label) }))}
          value={selection.flavour}
          onChange={(flavour) => set({ flavour })}
          error={c.flavourError ? t('customise.flavourError') : null}
        />
      )}

      {product.nameCustomisation && (
        <div className="space-y-4">
          <Toggle
            label={t('customise.nameToggle', { price: formatINR(product.nameCustomisationPrice) })}
            checked={selection.nameOn}
            onChange={(nameOn) => set({ nameOn })}
            onText={t('customise.on')}
            offText={t('customise.off')}
          />
          {selection.nameOn && (
            <div>
              <TextField
                label={t('customise.nameLabel')}
                hint={t('customise.count', { count: selection.name.length, max: NAME_MAX })}
                value={selection.name}
                maxLength={NAME_MAX}
                autoComplete="off"
                onChange={(e) => set({ name: e.target.value.slice(0, NAME_MAX) })}
              />
              <p className="mt-3 rounded-control bg-ink px-4 py-3 text-muted" aria-live="polite">
                {t('customise.namePreview')}{' '}
                <span className="font-heading text-[1.375rem] font-semibold text-gold-light">{selection.name.trim() || '___'}</span>
              </p>
              {!selection.name.trim() && <p className="t-small mt-2 text-brown-2">{t('customise.nameEmpty')}</p>}
            </div>
          )}
        </div>
      )}

      <fieldset>
        <legend className="mb-1 text-[1.125rem] font-bold">
          {t('customise.occasion')} <span className="t-small font-normal text-brown-2">({t('common.optional')})</span>
        </legend>
        <p className="t-small mb-3 text-brown-2">{t('customise.occasionHint')}</p>
        <div className="flex flex-wrap gap-2">
          {(menu?.occasions || []).map((o) => (
            <Chip key={o.id} selected={selection.occasion === o.id} onClick={() => set({ occasion: selection.occasion === o.id ? null : o.id })}>
              {pick(o.label)}
            </Chip>
          ))}
        </div>
      </fieldset>

      <TextField
        as="textarea"
        rows={2}
        optional
        label={t('customise.note')}
        placeholder={t('customise.notePlaceholder')}
        hint={t('customise.count', { count: selection.note.length, max: NOTE_MAX })}
        maxLength={NOTE_MAX}
        value={selection.note}
        onChange={(e) => set({ note: e.target.value.slice(0, NOTE_MAX) })}
      />

      <div>
        <p className="mb-3 text-[1.125rem] font-bold" id={`qty-${product.id}`}>
          {t('common.quantity')}
        </p>
        <QuantityStepper value={c.qty} onChange={c.setQty} max={MAX_QTY} label={t('common.quantity')} />
      </div>
    </div>
  )
}

/** Live total + main button + call line. Sticky footer in the sheet, inline on the product page. */
export function AddBar({ c, onAdd }) {
  const { t } = useI18n()
  const extra = nameCharged(c.product, c.selection)
  return (
    <div>
      <p className="mb-2 flex items-baseline justify-between gap-3" aria-live="polite" aria-atomic="true">
        <span className="t-small text-brown-2">
          {c.qty > 1 ? t('customise.totalFor', { qty: c.qty, unit: formatINR(c.unitPrice) }) : t('customise.total')}
          {extra && ` ${t('customise.includesName', { price: formatINR(c.product.nameCustomisationPrice) })}`}
        </span>
        <span className="t-price">{formatINR(c.total)}</span>
      </p>
      <Button size="lg" fullWidth onClick={onAdd}>
        {t(c.editing ? 'customise.save' : 'customise.add', { price: formatINR(c.total) })}
      </Button>
      <p className="mt-1 text-center">
        <a href={telLink} className="t-small inline-flex min-h-12 items-center text-brown-2 underline underline-offset-4 hover:text-brown">
          {t('customise.call', { phone: site.phone.short })}
        </a>
      </p>
    </div>
  )
}
