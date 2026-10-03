import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { addLine, CART_STORAGE_KEY, LEGACY_CART_KEYS, parseStoredCart, removeLine, restoreLine, serialiseCart, setLineQty, updateLine } from '../lib/cart'
import { cartCount, cartSubtotal } from '../lib/pricing'

const CartContext = createContext(null)

// Cart schema v2 in localStorage. Old sample carts (v1) are dropped silently.
function readCart() {
  try {
    LEGACY_CART_KEYS.forEach((k) => localStorage.removeItem(k))
    return parseStoredCart(localStorage.getItem(CART_STORAGE_KEY))
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState(readCart)

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, serialiseCart(lines))
    } catch {
      /* storage full or blocked: the cart still works for this visit */
    }
  }, [lines])

  // Keep several open tabs in step
  useEffect(() => {
    const onStorage = (e) => e.key === CART_STORAGE_KEY && setLines(parseStoredCart(e.newValue))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const add = useCallback((line) => setLines((prev) => addLine(prev, line)), [])
  const update = useCallback((id, line) => setLines((prev) => updateLine(prev, id, line)), [])
  const setQty = useCallback((id, qty) => setLines((prev) => setLineQty(prev, id, qty)), [])
  const clear = useCallback(() => setLines([]), [])
  /** Removes a line and returns an undo function */
  const remove = useCallback((id) => {
    let removed = null
    let index = -1
    setLines((prev) => {
      const r = removeLine(prev, id)
      removed = r.removed
      index = r.index
      return r.lines
    })
    return () => removed && setLines((prev) => restoreLine(prev, removed, index))
  }, [])

  const value = useMemo(
    () => ({ lines, count: cartCount(lines), subtotal: cartSubtotal(lines), add, update, setQty, remove, clear }),
    [lines, add, update, setQty, remove, clear],
  )
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
