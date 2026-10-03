import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'dk_cart'
const MAX_QTY = 99
const CartContext = createContext(null)

function readCart() {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(v) ? v.filter((i) => i && i.productId && i.qty > 0) : []
  } catch {
    return []
  }
}

const clampQty = (q) => Math.max(1, Math.min(MAX_QTY, Math.round(q) || 1))

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }, [items])

  const add = useCallback((product, qty = 1) => {
    setItems((prev) => {
      const found = prev.find((i) => i.productId === product.id)
      if (found) return prev.map((i) => (i.productId === product.id ? { ...i, qty: clampQty(i.qty + qty) } : i))
      return [
        ...prev,
        { productId: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image, qty: clampQty(qty) },
      ]
    })
  }, [])
  const setQty = useCallback((productId, qty) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, qty: clampQty(qty) } : i)))
  }, [])
  const remove = useCallback((productId) => setItems((prev) => prev.filter((i) => i.productId !== productId)), [])
  const clear = useCallback(() => setItems([]), [])

  const value = useMemo(() => {
    const pieces = items.reduce((s, i) => s + i.qty, 0)
    const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
    return { items, pieces, subtotal, add, setQty, remove, clear, maxQty: MAX_QTY }
  }, [items, add, setQty, remove, clear])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
