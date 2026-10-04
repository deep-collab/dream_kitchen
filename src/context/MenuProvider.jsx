import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { getMenu, menuWasRequested } from '../services'

const MenuContext = createContext(null)

// Loads the whole menu once, the first time a page asks for it (useMenu), and shares it with
// the shop, sheets and cart. Pages that never show the menu never download it.
// Stage B: getMenu() reads Supabase; nothing here changes.
export function MenuProvider({ children }) {
  const [menu, setMenu] = useState(null)
  const [wanted, setWanted] = useState(false)
  // A menu page starting to load asks for the data at once (src/routes.js). Start preparing the
  // menu right away too, in parallel with the page's code, instead of after its first render.
  useEffect(() => {
    if (menuWasRequested()) setWanted(true)
  }, [])
  useEffect(() => {
    if (!wanted) return
    let alive = true
    getMenu().then((m) => alive && setMenu({ ...m, sections: m.categories.flatMap((c) => c.sections) }))
    return () => {
      alive = false
    }
  }, [wanted])
  const want = useCallback(() => setWanted(true), [])
  const value = useMemo(() => ({ menu, want }), [menu, want])
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

/** For pages that show the menu: starts loading it. null while loading, then
 *  { categories, sections, products, productsById, combos, occasions } */
export function useMenu() {
  const ctx = useContext(MenuContext)
  const want = ctx.want
  useEffect(() => want(), [want])
  return ctx.menu
}

/** The menu if a page has already loaded it, else null. Never starts a download
 *  (the cart uses it to re-check prices, but the cart count in the header doesn't need it). */
export function useLoadedMenu() {
  return useContext(MenuContext).menu
}
