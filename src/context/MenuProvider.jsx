import { createContext, useContext, useEffect, useState } from 'react'
import { getMenu } from '../services'

const MenuContext = createContext(null)

// Loads the whole menu once (it is small) and shares it with the shop, sheets and cart.
// Stage B: getMenu() reads Supabase; nothing here changes.
export function MenuProvider({ children }) {
  const [menu, setMenu] = useState(null)
  useEffect(() => {
    let alive = true
    getMenu().then((m) => alive && setMenu({ ...m, sections: m.categories.flatMap((c) => c.sections) }))
    return () => {
      alive = false
    }
  }, [])
  return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>
}

/** null while loading, then { categories, sections, products, productsById, combos, occasions } */
export function useMenu() {
  return useContext(MenuContext)
}
