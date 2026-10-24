import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState } from 'react'
import { useI18n } from '../../i18n/I18nProvider'
import { useToast } from '../ui/Toast'
import { MenuContext } from '../../context/MenuProvider'
import 'virtual:dk-strings/cart'

const SheetsContext = createContext(null)

// The sheet itself loads on first open (ShopSheetBodies.jsx), not with every page
export const loadSheetBodies = () => import('./ShopSheetBodies')
const ProductSheet = lazy(() => loadSheetBodies().then((m) => ({ default: m.ProductSheet })))

/**
 * Owns the product sheet for the whole app, so the menu, the Customize page and the cart (Edit)
 * all open the same one.
 *   openProduct(product, { line, focus })   line = cart line to edit; focus = 'custom' opens with
 *                                            the name and drawing options in view (Customize page)
 */
export function ShopSheetsProvider({ children }) {
  const [state, setState] = useState({ open: false, product: null, line: null, focus: null, key: 0 })
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), [])
  const openProduct = useCallback((product, { line = null, focus = null } = {}) => setState((s) => ({ open: true, product, line, focus, key: s.key + 1 })), [])
  const value = useMemo(() => ({ openProduct, close }), [openProduct, close])
  // Always the product as it is now: a sheet opened before Hema's menu changes arrived (e.g. from a
  // link) shows her name, description and prices as soon as they do
  const latest = useContext(MenuContext)?.menu.productsById[state.product?.id] || state.product

  return (
    <SheetsContext.Provider value={value}>
      {children}
      <Suspense fallback={null}>
        {state.product && <ProductSheet key={state.key} open={state.open} product={latest} line={state.line} focus={state.focus} onClose={close} />}
      </Suspense>
    </SheetsContext.Provider>
  )
}

export function useShopSheets() {
  const ctx = useContext(SheetsContext)
  if (!ctx) throw new Error('useShopSheets must be used inside ShopSheetsProvider')
  return ctx
}

/** "Added to cart · View cart" (or "Cart updated") after the sheet saves; the page stays put */
export function useAddedToast() {
  const { t } = useI18n()
  const toast = useToast()
  return (editing) => toast.show({ message: t(editing ? 'cart.updated' : 'cart.added'), action: editing ? null : { label: t('cart.view'), to: '/cart' } })
}
