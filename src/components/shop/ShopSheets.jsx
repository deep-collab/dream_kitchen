import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useCart } from '../../context/CartProvider'
import { useToast } from '../ui/Toast'
import Sheet from '../ui/Sheet'
import ProductArt from '../art/ProductArt'
import { AddBar, CustomiseFields, useCustomise } from './Customise'
import { ComboBody, ComboFooter, useComboActions, useComboBuilder } from './ComboBuilder'

const SheetsContext = createContext(null)

/**
 * Owns the customise sheet and the bars combo builder for the whole app, so the
 * shop, the product page and the cart (Edit) all open the same sheets.
 *   openProduct(product, line?)  line = cart line to edit
 *   openCombo(combo, line?)
 */
export function ShopSheetsProvider({ children }) {
  const [state, setState] = useState({ open: false, kind: null, item: null, line: null, key: 0 })
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const openProduct = useCallback((item, line = null) => setState((s) => ({ open: true, kind: 'product', item, line, key: s.key + 1 })), [])
  const openCombo = useCallback((item, line = null) => setState((s) => ({ open: true, kind: 'combo', item, line, key: s.key + 1 })), [])
  const value = useMemo(() => ({ openProduct, openCombo, close }), [openProduct, openCombo, close])

  return (
    <SheetsContext.Provider value={value}>
      {children}
      {state.kind === 'product' && state.item && <CustomiseSheet key={state.key} open={state.open} product={state.item} line={state.line} onClose={close} />}
      {state.kind === 'combo' && state.item && <ComboSheet key={state.key} open={state.open} combo={state.item} line={state.line} onClose={close} />}
    </SheetsContext.Provider>
  )
}

export function useShopSheets() {
  const ctx = useContext(SheetsContext)
  if (!ctx) throw new Error('useShopSheets must be used inside ShopSheetsProvider')
  return ctx
}

/** Shared "added / updated" feedback after a sheet saves */
export function useAddedToast() {
  const { t } = useI18n()
  const toast = useToast()
  return (editing) => toast.show({ message: t(editing ? 'cart.updated' : 'cart.added'), action: editing ? null : { label: t('cart.view'), to: '/cart' } })
}

function CustomiseSheet({ open, product, line, onClose }) {
  const { t, pick } = useI18n()
  const cart = useCart()
  const added = useAddedToast()
  const c = useCustomise(product, line)

  const onAdd = () => {
    const next = c.submit()
    if (!next) return
    if (line) cart.update(line.id, next)
    else cart.add(next)
    onClose()
    added(Boolean(line))
  }

  return (
    <Sheet open={open} onClose={onClose} title={pick(product.name)} footer={<AddBar c={c} onAdd={onAdd} />}>
      <ProductIntro product={product} />
      <div className="mt-8">
        <CustomiseFields c={c} />
      </div>
      <p className="sr-only">{t('customise.sheetHelp')}</p>
    </Sheet>
  )
}

/** Illustration beside the description at the top of the sheet */
function ProductIntro({ product }) {
  return (
    <div className="flex flex-wrap gap-4 sm:block">
      <ProductArt kind={product.image} variant={product.sort} rounded="rounded-card" className="h-28 w-28 shrink-0 sm:h-auto sm:max-h-56 sm:w-full" />
      <div className="min-w-0 flex-1 sm:mt-4">
        <ProductDetails product={product} />
      </div>
    </div>
  )
}

/** Her description, the stated weight for fixed items, and what's inside (if listed) */
export function ProductDetails({ product, large = false }) {
  const { t, pick } = useI18n()
  const fixedWeight = product.grams && !product.optionGroups.some((grp) => grp.id === 'size')
  return (
    <>
      {product.description && <p className={large ? 't-lead' : ''}>{pick(product.description)}</p>}
      {fixedWeight && <p className="t-small mt-2 text-brown-2">{t('customise.weighs', { grams: product.grams })}</p>}
      {product.includes && (
        <div className="mt-4">
          <p className="font-bold">{t('customise.includes')}</p>
          <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {product.includes.map((it) => (
              <li key={it.en} className="flex gap-2">
                <span aria-hidden="true" className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                {pick(it)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

function ComboSheet({ open, combo, line, onClose }) {
  const { pick } = useI18n()
  const added = useAddedToast()
  const b = useComboBuilder(combo, line)
  const { onAdd, onAddIndividually } = useComboActions(b, onClose, added)
  return (
    <Sheet open={open} onClose={onClose} title={pick(combo.name)} footer={<ComboFooter b={b} onAdd={onAdd} />}>
      <ComboBody b={b} onAddIndividually={onAddIndividually} />
    </Sheet>
  )
}
