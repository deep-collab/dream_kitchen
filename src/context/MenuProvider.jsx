import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { categories as CATEGORIES, products as PRODUCTS } from '../config/shop'
import { applyOverrides, applySettings, hasPrice } from '../lib/pricing'
import { allLiveOffers, applyOfferPrices, cleanPagePhotos, istToday, MAX_LIVE_OFFERS, rajyotsavaLive } from '../lib/offers'
import { publicConfig } from '../lib/siteConfig'
import { loadRemoteMenu } from '../services'

export const MenuContext = createContext(null)

// The last offers this phone saw, so a returning visitor's banner is there in the first paint
// (no jump when /api/menu arrives). Only the dates decide what shows; the fresh list replaces it.
const OFFERS_KEY = 'dk_offers'
const savedOffers = () => {
  try {
    return JSON.parse(localStorage.getItem(OFFERS_KEY)) || []
  } catch {
    return []
  }
}
const saveOffers = (list) => {
  try {
    if (list.length) localStorage.setItem(OFFERS_KEY, JSON.stringify(list))
    else localStorage.removeItem(OFFERS_KEY)
  } catch {
    /* storage blocked: the banner just comes with the menu */
  }
}

/**
 * The menu and Hema's settings, shared by every page:
 *   src/config/shop.js (small, English only in the browser build; Kannada comes with the Kannada
 *   file), with Hema's admin changes and settings from /api/menu on top, combined by the shared
 *   pricing module exactly as the server does it. The remote part is fetched once, after the first
 *   page has painted; until it arrives the config prices show and ordering waits.
 */
export function MenuProvider({ children }) {
  const [remote, setRemote] = useState(undefined) // undefined = loading, null = unavailable
  const [cachedOffers] = useState(savedOffers)
  const [today, setToday] = useState(istToday)

  const fetchRemote = useCallback(
    (fresh = false) =>
      loadRemoteMenu({ fresh }).then((r) => {
        if (r) saveOffers(r.ready && Array.isArray(r.offers) ? r.offers : [])
        setRemote(r)
      }),
    [],
  )
  useEffect(() => {
    const go = () => fetchRemote()
    if (window.__dkReady) go()
    else window.addEventListener('dk:ready', go, { once: true })
    return () => window.removeEventListener('dk:ready', go)
  }, [fetchRemote])
  const refresh = useCallback(() => fetchRemote(true), [fetchRemote])

  // An offer (and a festival background) starts and ends at midnight, Indian time, even on a page left open
  const offerList = remote === undefined ? cachedOffers : remote?.offers
  useEffect(() => {
    const timer = setInterval(() => setToday(istToday()), 60_000)
    return () => clearInterval(timer)
  }, [])

  const value = useMemo(() => {
    // Hema's offers live today: their special prices are applied exactly as the server applies
    // them (netlify/lib/catalog.mjs), so the cart shows the price that will be charged
    const live = allLiveOffers(offerList, today)
    const all = applyOfferPrices(applyOverrides(PRODUCTS, remote?.overrides || []), live)
    const settings = applySettings(remote?.settings || {})
    // Every product customers see has a clear price: one without (e.g. "price coming soon") stays
    // off the menu until Hema sets its price in the admin
    const products = all.filter((p) => p.active !== false && hasPrice(p)).sort((a, b) => a.sort - b.sort)
    return {
      menu: {
        // A section that only Hema fills (Cookie Tins) gets its tab and Home tile once it has a product
        categories: CATEGORIES.filter((c) => !c.hidden && (!c.whenStocked || products.some((p) => p.category === c.id && p.menu !== false))).sort((a, b) => a.sort - b.sort),
        products,
        productsById: Object.fromEntries(all.map((p) => [p.id, p])),
      },
      settings,
      // Hema's offers showing today (the banner shows the first few; the menu filter knows them all),
      // and the Customize tiles' photos she changed
      offers: live.slice(0, MAX_LIVE_OFFERS),
      allOffers: live,
      // Kannada Rajyotsava (src/lib/offers.js RAJYOTSAVA): the offer while it is live, else null.
      // `fresh`: known from /api/menu itself, not the phone's copy (the popup waits for that, so an
      // offer Hema just turned off never pops up)
      rajyotsava: rajyotsavaLive(live),
      rajyotsavaFresh: remote !== undefined,
      today,
      // The developer options' settings (src/lib/siteConfig.js), defaults until /api/menu arrives
      config: publicConfig(remote?.config || {}),
      pagePhotos: cleanPagePhotos(remote?.pagePhotos),
      refresh,
      remoteLoaded: remote !== undefined,
      // The database is connected (/api/menu says ready). Until then, forms that need it are hidden
      backendReady: remote?.ready === true,
      // Orders can be placed: the server is set up, the shop is open, and there is a way to pay
      canOrder: Boolean(remote?.ready && settings.store.open && (settings.payment.upiId || remote?.razorpay?.enabled)),
      razorpay: remote?.razorpay || { enabled: false },
    }
  }, [remote, refresh, offerList, today])
  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>
}

/** { categories, products (on the menu, in order), productsById (all, for the cart check) } */
export const useMenu = () => useContext(MenuContext).menu

/** The offers to show now (src/lib/offers.js liveOffers), [] when none */
export const useOffers = () => useContext(MenuContext).offers

/** The Rajyotsava offer while it is live ({ ...offer, fresh }), else null */
export function useRajyotsava() {
  const { rajyotsava, rajyotsavaFresh } = useContext(MenuContext)
  return rajyotsava ? { ...rajyotsava, percent: rajyotsava.deal.value, fresh: rajyotsavaFresh } : null
}

/** Every offer live today (for the menu's offer filter and badges), [] when none */
export const useAllOffers = () => useContext(MenuContext).allOffers

/** The developer options' public settings (src/lib/siteConfig.js publicConfig) and today's Indian date */
export function useSiteConfig() {
  const { config, today } = useContext(MenuContext)
  return { config, today }
}

/** The Customize tiles' photos Hema changed: { [tile id]: address } (src/lib/offers.js PAGE_PHOTOS) */
export const usePagePhotos = () => useContext(MenuContext).pagePhotos

/** Hema's settings (courier rates, lead times, UPI, store open, banner), whether the database is connected, and whether ordering is open */
export function useShopStatus() {
  const { settings, refresh, remoteLoaded, backendReady, canOrder, razorpay } = useContext(MenuContext)
  return { settings, refresh, remoteLoaded, backendReady, canOrder, razorpay }
}
