import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { addLine, cartCount, CART_STORAGE_KEY, LEGACY_CART_KEYS, parseStoredCart, removeLine, restoreLine, serialiseCart, setLineQty, updateLine } from '../lib/cart'
import { repriceCart } from '../lib/reprice'
import { useMenu, useShopStatus } from './MenuProvider'

const CartContext = createContext(null)

function readCart() {
  try {
    LEGACY_CART_KEYS.forEach((k) => localStorage.removeItem(k))
    return parseStoredCart(localStorage.getItem(CART_STORAGE_KEY))
  } catch {
    return []
  }
}

/**
 * The cart, always checked against today's menu (src/lib/reprice.js):
 * lines carry today's price, `priceWas` when it changed and `unavailable` when they can't be
 * ordered. The stored cart keeps what the customer saw, so a price notice stays visible.
 */
export function CartProvider({ children }) {
  const menu = useMenu()
  const { remoteLoaded } = useShopStatus()
  const [stored, setStored] = useState(readCart)

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, serialiseCart(stored))
    } catch {
      /* storage full or blocked: the cart still works for this visit */
    }
  }, [stored])

  // Keep several open tabs in step
  useEffect(() => {
    const onStorage = (e) => e.key === CART_STORAGE_KEY && setStored(parseStoredCart(e.newValue))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback((line) => setStored((prev) => addLine(prev, line)), [])
  const update = useCallback((id, line) => setStored((prev) => updateLine(prev, id, line)), [])
  const setQty = useCallback((id, qty) => setStored((prev) => setLineQty(prev, id, qty)), [])
  const clear = useCallback(() => setStored([]), [])
  /** Removes lines and returns an undo function */
  const removeMany = useCallback((ids) => {
    let removed = []
    setStored((prev) => {
      removed = []
      let next = prev
      for (const id of ids) {
        const r = removeLine(next, id)
        if (r.removed) removed.unshift({ line: r.removed, index: r.index })
        next = r.lines
      }
      return next
    })
    return () => setStored((prev) => removed.reduce((acc, r) => restoreLine(acc, r.line, r.index), prev))
  }, [])
  const remove = useCallback((id) => removeMany([id]), [removeMany])
  /** After the server said prices changed: store today's prices so the notice can go */
  const acceptPrices = useCallback((lines) => setStored(lines.map(({ priceWas: _p, unavailable: _u, ...l }) => l)), [])

  const checked = useMemo(() => {
    if (!menu) return null
    const r = repriceCart(stored, menu.productsById)
    if (remoteLoaded) return r
    // Until Hema's changes arrive, a product she added herself isn't known yet: that is not "removed"
    return { ...r, lines: r.lines.map((l, i) => (l.unavailable === 'removed' && !menu.productsById[l.productId] ? stored[i] : l)) }
  }, [stored, menu, remoteLoaded])
  const value = useMemo(() => {
    const lines = checked ? checked.lines : stored
    const available = lines.filter((l) => !l.unavailable)
    return {
      lines,
      count: cartCount(lines),
      subtotal: available.reduce((sum, l) => sum + (l.unitPrice || 0) * l.qty, 0),
      checked: Boolean(checked),
      priceChanged: checked?.priceChanged || false,
      unavailableIds: lines.filter((l) => l.unavailable).map((l) => l.id),
      add,
      update,
      setQty,
      remove,
      removeMany,
      clear,
      acceptPrices,
    }
  }, [checked, stored, add, update, setQty, remove, removeMany, clear, acceptPrices])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
