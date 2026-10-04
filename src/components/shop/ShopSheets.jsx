import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useToast } from '../ui/Toast'

const SheetsContext = createContext(null)

// The sheets themselves load on first open (ShopSheetBodies.jsx), not with every page
export const loadSheetBodies = () => import('./ShopSheetBodies')
const CustomiseSheet = lazy(() => loadSheetBodies().then((m) => ({ default: m.CustomiseSheet })))
const ComboSheet = lazy(() => loadSheetBodies().then((m) => ({ default: m.ComboSheet })))

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
      <Suspense fallback={null}>
        {state.kind === 'product' && state.item && <CustomiseSheet key={state.key} open={state.open} product={state.item} line={state.line} onClose={close} />}
        {state.kind === 'combo' && state.item && <ComboSheet key={state.key} open={state.open} combo={state.item} line={state.line} onClose={close} />}
      </Suspense>
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
