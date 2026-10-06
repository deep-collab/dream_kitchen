import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { categories as CATEGORIES, products as PRODUCTS } from '../config/shop'
import { applyOverrides, applySettings } from '../lib/pricing'
import { loadRemoteMenu } from '../services'

const MenuContext = createContext(null)

/**
 * The menu and Hema's settings, shared by every page:
 *   src/config/shop.js (small, English only in the browser build; Kannada comes with the Kannada
 *   file), with Hema's admin changes and settings from /api/menu on top, combined by the shared
 *   pricing module exactly as the server does it. The remote part is fetched once, after the first
 *   page has painted; until it arrives the config prices show and ordering waits.
 */
export function MenuProvider({ children }) {
  const [remote, setRemote] = useState(undefined) // undefined = loading, null = unavailable

  const fetchRemote = useCallback((fresh = false) => loadRemoteMenu({ fresh }).then((r) => setRemote(r)), [])
  useEffect(() => {
    const go = () => fetchRemote()
    if (window.__dkReady) go()
    else window.addEventListener('dk:ready', go, { once: true })
    return () => window.removeEventListener('dk:ready', go)
  }, [fetchRemote])
  const refresh = useCallback(() => fetchRemote(true), [fetchRemote])

  const value = useMemo(() => {
    const all = applyOverrides(PRODUCTS, remote?.overrides || [])
    const settings = applySettings(remote?.settings || {})
    return {
      menu: {
        categories: CATEGORIES.filter((c) => !c.hidden).sort((a, b) => a.sort - b.sort),
        products: all.filter((p) => p.active !== false).sort((a, b) => a.sort - b.sort),
        productsById: Object.fromEntries(all.map((p) => [p.id, p])),
      },
      settings,
      refresh,
      remoteLoaded: remote !== undefined,
      // The database is connected (/api/menu says ready). Until then, forms that need it are hidden
      backendReady: remote?.ready === true,
      // Orders can be placed: the server is set up, the shop is open, and there is a way to pay
      canOrder: Boolean(remote?.ready && settings.store.open && (settings.payment.upiId || remote?.razorpay?.enabled)),
      razorpay: remote?.razorpay || { enabled: false },
    }
  }, [remote, refresh])
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

/** { categories, products (on the menu, in order), productsById (all, for the cart check) } */
export const useMenu = () => useContext(MenuContext).menu

/** Hema's settings (courier rates, lead times, UPI, store open, banner), whether the database is connected, and whether ordering is open */
export function useShopStatus() {
  const { settings, refresh, remoteLoaded, backendReady, canOrder, razorpay } = useContext(MenuContext)
  return { settings, refresh, remoteLoaded, backendReady, canOrder, razorpay }
}
